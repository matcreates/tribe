import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var session: SessionStore

    @State private var data: MobileDashboardResponse?
    @State private var error: String?
    @State private var period: MobileDashboardPeriod = .sevenDays

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        header
                        periodPicker

                        if let data {
                            VStack(spacing: 12) {
                                statsGrid(data)
                                if !data.recentEmails.isEmpty {
                                    recentEmailsCard(data)
                                }
                            }
                        } else if let error {
                            Text("Couldn’t load dashboard")
                                .font(.headline)
                                .foregroundStyle(TribeTheme.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(error)
                                .font(.subheadline)
                                .foregroundStyle(TribeTheme.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            ProgressView("Loading…")
                                .tint(TribeTheme.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.top, 24)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(TribeTheme.textSecondary)
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .onChange(of: period) { _, _ in
                Task { await load() }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Dashboard")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)

            Text("Quick overview")
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(TribeTheme.textSecondary)
        }
        .padding(.bottom, 2)
    }

    private var periodPicker: some View {
        Picker("Period", selection: $period) {
            Text("24H").tag(MobileDashboardPeriod.twentyFourHours)
            Text("7D").tag(MobileDashboardPeriod.sevenDays)
            Text("30D").tag(MobileDashboardPeriod.thirtyDays)
        }
        .pickerStyle(.segmented)
        .padding(.bottom, 4)
        .colorScheme(.dark)
    }

    private func statsGrid(_ data: MobileDashboardResponse) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                statCard(title: "Your tribe", value: String(data.verifiedSubscribers), subtitle: "Verified")
                statCard(title: "New", value: plus(data.periodSubscribers), subtitle: period.label)
            }
            HStack(spacing: 12) {
                statCard(title: "Emails sent", value: String(data.totalEmailsSent), subtitle: "Total")
                statCard(title: "Open rate", value: data.openRate > 0 ? "\(data.openRate)%" : "—", subtitle: "\(data.periodOpens) opens")
            }
            HStack(spacing: 12) {
                statCard(title: "Replies", value: String(data.totalReplies), subtitle: "Total")
                statCard(title: "Replies", value: plus(data.periodReplies), subtitle: period.label)
            }
        }
    }

    private func recentEmailsCard(_ data: MobileDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent emails")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            VStack(spacing: 10) {
                ForEach(data.recentEmails) { e in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(e.subject ?? "Untitled")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(TribeTheme.textPrimary)
                                .lineLimit(1)
                            Text("\(e.recipient_count) recipients")
                                .font(.system(size: 12))
                                .foregroundStyle(TribeTheme.textTertiary)
                        }
                        Spacer()
                    }
                    if e.id != data.recentEmails.last?.id {
                        Divider().overlay(Color.white.opacity(0.06))
                    }
                }
            }
        }
        .tribeCard()
    }

    private func statCard(title: String, value: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)

            Text(value)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)

            Text(subtitle)
                .font(.system(size: 11))
                .foregroundStyle(TribeTheme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(Color.white.opacity(0.03))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func plus(_ v: Int) -> String {
        v > 0 ? "+\(v)" : "0"
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            data = try await APIClient.shared.dashboard(token: token, period: period)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

enum MobileDashboardPeriod: String, CaseIterable {
    case twentyFourHours = "24h"
    case sevenDays = "7d"
    case thirtyDays = "30d"

    var label: String {
        switch self {
        case .twentyFourHours: return "Last 24h"
        case .sevenDays: return "Last 7d"
        case .thirtyDays: return "Last 30d"
        }
    }
}

struct MobileDashboardResponse: Decodable {
    let period: String
    let totalSubscribers: Int
    let verifiedSubscribers: Int
    let periodSubscribers: Int
    let totalEmailsSent: Int
    let periodEmailsSent: Int
    let openRate: Double
    let periodOpens: Int
    let totalReplies: Int
    let periodReplies: Int
    let recentEmails: [RecentEmail]

    struct RecentEmail: Decodable, Identifiable {
        let id: String
        let subject: String?
        let recipient_count: Int
        let sent_at: Date?
    }
}
