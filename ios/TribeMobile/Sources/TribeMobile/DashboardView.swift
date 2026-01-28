import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var session: SessionStore
    @State private var data: DashboardResponse?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        header

                        if let data {
                            VStack(spacing: 12) {
                                subscribersCard(data)
                                emailCard(data)
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

    private func subscribersCard(_ data: DashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Subscribers")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            HStack {
                metric("Total", String(data.totalSubscribers))
                Spacer()
                metric("Verified", String(data.verifiedSubscribers))
            }
        }
        .tribeCard()
    }

    private func emailCard(_ data: DashboardResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Email")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            VStack(spacing: 10) {
                row("Total emails sent", String(data.totalEmailsSent))
                row("Last 7d opens", String(data.last7d.opens))
                row("Last 7d sent", String(data.last7d.sent))
            }
        }
        .tribeCard()
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)
            Text(value)
                .font(.system(size: 22, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textPrimary)
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            data = try await APIClient.shared.dashboard(token: token)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

