import SwiftUI

struct EmailDetailResponse: Decodable {
    let ok: Bool?
    let email: EmailDetail
}

struct EmailDetail: Decodable {
    let id: String
    let subject: String?
    let recipient_count: Int
    let open_count: Int
    let sent_at: Date?
    let body: String?
}

struct EmailDetailView: View {
    @EnvironmentObject var session: SessionStore
    let id: String

    @State private var data: EmailDetail?
    @State private var error: String?

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text(data?.subject ?? "Email")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(TribeTheme.textPrimary)

                    if let data {
                        HStack(spacing: 12) {
                            metric("Recipients", "\(data.recipient_count)")
                            metric("Opens", "\(data.open_count)")
                        }

                        if let body = data.body, !body.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Body")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(TribeTheme.textTertiary)
                                    .textCase(.uppercase)

                                Text(body)
                                    .font(.system(size: 13))
                                    .foregroundStyle(TribeTheme.textSecondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .tribeCard()
                        }
                    } else if let error {
                        Text("Couldn’t load email")
                            .font(.headline)
                            .foregroundStyle(TribeTheme.textPrimary)
                        Text(error)
                            .font(.subheadline)
                            .foregroundStyle(TribeTheme.textSecondary)
                    } else {
                        ProgressView("Loading…")
                            .tint(TribeTheme.textPrimary)
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
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)
            Text(value)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)
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

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.emailDetails(token: token, id: id)
            data = resp.email
        } catch {
            self.error = error.localizedDescription
        }
    }
}
