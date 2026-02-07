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
                                growthChart(data)
                                statsGrid(data)
                                recentEmailsCard(data)
                            }
                        } else if let error {
                            Text("Couldn't load dashboard")
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

    // MARK: – Stats Grid (2×2)

    private func statsGrid(_ data: MobileDashboardResponse) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                statCard(
                    title: "New",
                    value: plus(data.periodSubscribers),
                    subtitle: period.label,
                    icon: "sparkles",
                    color: .green
                )
                statCard(
                    title: "Emails sent",
                    value: String(data.totalEmailsSent),
                    periodValue: data.periodEmailsSent > 0 ? "+\(data.periodEmailsSent)" : nil,
                    subtitle: period.label,
                    icon: "paperplane.fill",
                    color: .green
                )
            }
            HStack(spacing: 12) {
                statCard(
                    title: "Open rate",
                    value: data.openRate > 0 ? "\(data.openRate)%" : "—",
                    subtitle: "\(data.periodOpens) opens",
                    icon: "eye.fill",
                    color: .purple
                )
                statCard(
                    title: "Replies",
                    value: plus(data.periodReplies),
                    subtitle: period.label,
                    icon: "arrowshape.turn.up.left.fill",
                    color: .orange
                )
            }
        }
    }

    // MARK: – Growth Chart (matches web visualization)

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
                } else {
                    Text(period.label)
                        .font(.system(size: 11))
                        .foregroundStyle(TribeTheme.textTertiary)
                }
            }

            HStack(alignment: .bottom, spacing: 4) {
                let maxVal = data.chartData.max() ?? 1
                let minVal = data.chartData.min() ?? 0
                let range = max(maxVal - minVal, 1)
                ForEach(Array(data.chartData.enumerated()), id: \.offset) { idx, v in
                    let h = CGFloat(v - minVal) / CGFloat(range) * 0.8 + 0.2 // min 20% height
                    let isLast = idx == data.chartData.count - 1
                    let isSelected = tappedBarIndex == idx
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .fill(isSelected
                              ? Color.blue.opacity(0.7)
                              : isLast
                                ? Color.blue.opacity(0.6)
                                : Color.blue.opacity(0.25))
                        .frame(height: max(10, 100 * h))
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                tappedBarIndex = (tappedBarIndex == idx) ? nil : idx
                            }
                        }
                }
            }
            .frame(height: 100)

            // X-axis labels (avoid crowding)
            HStack(spacing: 0) {
                let labels = data.chartLabels
                ForEach(Array(labels.enumerated()), id: \.offset) { i, label in
                    let show: Bool = {
                        if period == .thirtyDays {
                            return i % 5 == 0 || i == labels.count - 1
                        } else if period == .twentyFourHours {
                            return i % 4 == 0 || i == labels.count - 1
                        }
                        return true
                    }()
                    Text(show ? label : "")
                        .font(.system(size: 10))
                        .foregroundStyle(TribeTheme.textTertiary.opacity(0.7))
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .tribeCard()
    }

    // MARK: – Recent Emails

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

    // MARK: – Stat Card

    private func statCard(
        title: String,
        value: String,
        periodValue: String? = nil,
        subtitle: String,
        icon: String,
        color: Color
    ) -> some View {
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

            HStack(spacing: 4) {
                Text(subtitle)
                    .font(.system(size: 11))
                    .foregroundStyle(TribeTheme.textTertiary)
                if let pv = periodValue {
                    Text(pv)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.green)
                }
            }
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
