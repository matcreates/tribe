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
                        .font(TribeTheme.pageTitle())
                        .foregroundStyle(.primary)

                    if let data {
                        // Metrics row
                        HStack(spacing: 10) {
                            metric("Recipients", "\(data.recipient_count)")
                            metric("Opens", "\(data.open_count)")
                            metric("Open rate", openRate(data))
                        }

                        if let body = data.body, !body.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("BODY")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(.primary.opacity(0.25))

                                Text(body)
                                    .font(.system(size: 14))
                                    .foregroundStyle(.primary.opacity(0.6))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .tribeCard()
                        }

                        repliesSection
                    } else if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(.primary.opacity(0.5))
                    } else {
                        ProgressView("Loading…")
                            .tint(.primary.opacity(0.3))
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
            Text("REPLIES")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.primary.opacity(0.25))

            if replies.isEmpty {
                Text("No replies yet")
                    .font(.system(size: 13))
                    .foregroundStyle(.primary.opacity(0.35))
            } else {
                VStack(spacing: 8) {
                    ForEach(replies) { r in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(r.subscriber_email)
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.primary.opacity(0.6))
                            Text(r.reply_text)
                                .font(.system(size: 14))
                                .foregroundStyle(.primary.opacity(0.5))
                        }
                        .tribeCard()
                    }

                    if repliesPage < repliesTotalPages {
                        Button("Load more") {
                            Task { await loadMoreReplies() }
                        }
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.primary.opacity(0.5))
                        .padding(.top, 4)
                    }
                }
            }
        }
    }

    private func metric(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(.primary.opacity(0.35))
            Text(value)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(TribeTheme.fieldBg)
        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                .stroke(TribeTheme.fieldStroke)
        )
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
        } catch { }
    }
}
