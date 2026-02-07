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
                    VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                        header
                        periodPicker

                        if let data {
                            VStack(spacing: 12) {
                                statsGrid(data)
                                growthChart(data)
                                recentEmailsCard(data)
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
                    .pagePadding()
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { SettingsToolbarItem() }
            .task { await load() }
            .refreshable { await load() }
            .onChange(of: period) { _, _ in
                Task { await load() }
            }
        }
    }

    private var header: some View {
        Text("Dashboard")
            .font(TribeTheme.pageTitle())
            .foregroundStyle(TribeTheme.textPrimary)
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
                statCard(title: "Your tribe", value: String(data.verifiedSubscribers), subtitle: "Verified", icon: "person.2.fill", color: .blue)
                statCard(title: "New", value: plus(data.periodSubscribers), subtitle: period.label, icon: "sparkles", color: .green)
            }
            HStack(spacing: 12) {
                statCard(title: "Emails sent", value: String(data.totalEmailsSent), subtitle: "Total", icon: "paperplane.fill", color: .green)
                statCard(title: "Open rate", value: data.openRate > 0 ? "\(data.openRate)%" : "—", subtitle: "\(data.periodOpens) opens", icon: "eye.fill", color: .purple)
            }
            HStack(spacing: 12) {
                statCard(title: "Replies", value: String(data.totalReplies), subtitle: "Total", icon: "arrowshape.turn.up.left.fill", color: .orange)
                statCard(title: "Replies", value: plus(data.periodReplies), subtitle: period.label, icon: "bubble.left.and.bubble.right.fill", color: .orange)
            }
        }
    }

    @State private var tappedBarIndex: Int? = nil

    private func growthChart(_ data: MobileDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Tribe growth")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(TribeTheme.textTertiary)
                    .textCase(.uppercase)

                Spacer()

                if let idx = tappedBarIndex, idx < data.chartData.count {
                    let label = idx < data.chartLabels.count ? data.chartLabels[idx] : ""
                    Text("\(label): \(data.chartData[idx])")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(TribeTheme.textPrimary)
                        .transition(.opacity)
                }
            }

            HStack(alignment: .bottom, spacing: 4) {
                let maxVal = max(data.chartData.max() ?? 1, 1)
                ForEach(Array(data.chartData.enumerated()), id: \ .offset) { idx, v in
                    let h = CGFloat(v) / CGFloat(maxVal)
                    let isSelected = tappedBarIndex == idx
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(isSelected
                              ? TribeTheme.textPrimary.opacity(0.35)
                              : TribeTheme.textPrimary.opacity(0.12))
                        .frame(height: max(10, 80 * h))
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                tappedBarIndex = (tappedBarIndex == idx) ? nil : idx
                            }
                        }
                }
            }
            .frame(height: 90)

            HStack {
                Text(data.chartLabels.first ?? "")
                Spacer()
                Text(data.chartLabels.last ?? "")
            }
            .font(.system(size: 11))
            .foregroundStyle(TribeTheme.textTertiary)
        }
        .tribeCard()
    }

    private func recentEmailsCard(_ data: MobileDashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent emails")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            if data.recentEmails.isEmpty {
                Text("No emails yet")
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)
            } else {
                VStack(spacing: 0) {
                    ForEach(data.recentEmails) { e in
                        NavigationLink {
                            EmailDetailView(id: e.id)
                        } label: {
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
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(TribeTheme.textTertiary)
                            }
                            .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)

                        if e.id != data.recentEmails.last?.id {
                            Divider().overlay(TribeTheme.stroke)
                        }
                    }
                }
            }
        }
        .tribeCard()
    }

    private func statCard(title: String, value: String, subtitle: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(color.opacity(0.16))
                    .frame(width: 34, height: 34)
                    .overlay(
                        Image(systemName: icon)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(color)
                    )

                Text(title)
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textSecondary)

                Spacer()
            }

            Text(value)
                .font(.system(size: 24, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)

            Text(subtitle)
                .font(.system(size: 11))
                .foregroundStyle(TribeTheme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(TribeTheme.cardBg)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func plus(_ v: Int) -> String { v > 0 ? "+\(v)" : "0" }

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
    let chartData: [Int]
    let chartLabels: [String]

    struct RecentEmail: Decodable, Identifiable {
        let id: String
        let subject: String?
        let recipient_count: Int
        let sent_at: Date?
    }
}
