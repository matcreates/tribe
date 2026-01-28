import SwiftUI

struct SubscribersView: View {
    @EnvironmentObject var session: SessionStore
    @State private var subscribers: [Subscriber] = []
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your tribe")
                                .font(.system(size: 26, weight: .semibold))
                                .foregroundStyle(TribeTheme.textPrimary)

                            Text("Subscribers")
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        if !subscribers.isEmpty {
                            VStack(spacing: 10) {
                                ForEach(subscribers) { s in
                                    HStack(alignment: .top, spacing: 12) {
                                        Circle()
                                            .fill(s.verified ? TribeTheme.accentGreen.opacity(0.9) : Color.white.opacity(0.15))
                                            .frame(width: 8, height: 8)
                                            .padding(.top, 6)

                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(s.email)
                                                .font(.system(size: 14, weight: .medium))
                                                .foregroundStyle(TribeTheme.textPrimary)

                                            HStack(spacing: 8) {
                                                if let name = s.name, !name.isEmpty {
                                                    Text(name)
                                                        .foregroundStyle(TribeTheme.textSecondary)
                                                }

                                                Text(s.verified ? "Verified" : "Unverified")
                                                    .foregroundStyle(s.verified ? TribeTheme.accentGreen.opacity(0.9) : TribeTheme.textTertiary)
                                            }
                                            .font(.system(size: 12))
                                        }

                                        Spacer()
                                    }
                                    .tribeCard()
                                }
                            }
                        } else if let error {
                            Text("Couldn’t load subscribers")
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
                                .frame(maxWidth: .infinity)
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
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.subscribers(token: token)
            subscribers = resp.subscribers
        } catch {
            self.error = error.localizedDescription
        }
    }
}

