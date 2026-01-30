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

struct EmailRepliesResponse: Decodable {
    let ok: Bool?
    let replies: [EmailReply]
    let total: Int
    let page: Int
    let pageSize: Int
    let totalPages: Int
}

struct EmailReply: Decodable, Identifiable {
    let id: String
    let email_id: String
    let subscriber_email: String
    let reply_text: String
    let received_at: Date?
}

struct EmailDetailView: View {
    @EnvironmentObject var session: SessionStore

    let id: String

    @State private var data: EmailDetail?
    @State private var replies: [EmailReply] = []
    @State private var error: String?

    @State private var repliesPage: Int = 1
    @State private var repliesTotalPages: Int = 1

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
                            metric("Open rate", openRate(data))
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

                        repliesSection
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
                .pagePadding()
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var repliesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Replies")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            if replies.isEmpty {
                Text("No replies yet")
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)
            } else {
                VStack(spacing: 10) {
                    ForEach(replies) { r in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(r.subscriber_email)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(TribeTheme.textPrimary)
                            Text(r.reply_text)
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }
                        .tribeCard()
                    }

                    if repliesPage < repliesTotalPages {
                        Button("Load more") {
                            Task { await loadMoreReplies() }
                        }
                        .foregroundStyle(TribeTheme.textPrimary)
                        .padding(.top, 4)
                    }
                }
            }
        }
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)
            Text(value)
                .font(.system(size: 18, weight: .semibold))
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

    private func openRate(_ data: EmailDetail) -> String {
        guard data.recipient_count > 0 else { return "—" }
        let pct = Double(data.open_count) / Double(data.recipient_count) * 100
        return String(format: "%.0f%%", pct)
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.emailDetails(token: token, id: id)
            data = resp.email
            // first page replies
            let rep = try await APIClient.shared.emailReplies(token: token, id: id, page: 1, pageSize: 10)
            replies = rep.replies
            repliesPage = rep.page
            repliesTotalPages = rep.totalPages
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadMoreReplies() async {
        guard let token = session.token else { return }
        let next = min(repliesTotalPages, repliesPage + 1)
        guard next > repliesPage else { return }
        do {
            let rep = try await APIClient.shared.emailReplies(token: token, id: id, page: next, pageSize: 10)
            replies.append(contentsOf: rep.replies)
            repliesPage = rep.page
            repliesTotalPages = rep.totalPages
        } catch {
            // ignore
        }
    }
}
