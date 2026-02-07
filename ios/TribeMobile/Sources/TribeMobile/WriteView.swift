import SwiftUI

struct WriteMetaResponse: Decodable {
    let ok: Bool?
    let recipients: RecipientCounts
    let signature: String

    struct RecipientCounts: Decodable {
        let verified: Int
        let nonVerified: Int
        let all: Int
    }
}

struct WriteView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var meta: WriteMetaResponse?

    @State private var subject: String = ""
    @State private var bodyText: String = ""
    @State private var allowReplies: Bool = true

    enum SendMode: String, CaseIterable, Identifiable {
        case now = "Send"
        case schedule = "Schedule"
        var id: String { rawValue }
    }

    @State private var sendMode: SendMode = .now
    @State private var scheduledAt: Date = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()

    @State private var isSubmitting = false

    @State private var showingTest = false
    @State private var testEmail: String = ""
    @State private var isSendingTest = false

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                        header

                        editorCard

                        bottomBar
                    }
                    .pagePadding()
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { SettingsToolbarItem() }
            .task { await loadMeta() }
            .sheet(isPresented: $showingTest) {
                testEmailSheet
                    .presentationDetents([.medium])
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Write")
                .font(TribeTheme.pageTitle())
                .foregroundStyle(TribeTheme.textPrimary)
        }
    }

    private var editorCard: some View {
        VStack(spacing: 0) {
            // To
            HStack(spacing: 10) {
                Text("To")
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)

                Spacer()

                let count = meta?.recipients.verified ?? 0
                Text("All verified members (\(count))")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(TribeTheme.textPrimary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(TribeTheme.textPrimary.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .padding(16)

            Divider().overlay(TribeTheme.stroke)

            // Subject
            VStack(alignment: .leading, spacing: 8) {
                Text("Subject")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(TribeTheme.textTertiary)

                TextField("", text: $subject)
                    .textInputAutocapitalization(.sentences)
                    .foregroundStyle(TribeTheme.textPrimary)
                    .padding(.vertical, 8)
            }
            .padding(16)

            Divider().overlay(TribeTheme.stroke)

            // Body
            VStack(alignment: .leading, spacing: 8) {
                TextEditor(text: $bodyText)
                    .frame(minHeight: 130)
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(TribeTheme.textPrimary)
                    .overlay(alignment: .topLeading) {
                        if bodyText.isEmpty {
                            Text("Write your message…")
                                .foregroundStyle(TribeTheme.textTertiary)
                                .padding(.top, 8)
                                .padding(.leading, 5)
                        }
                    }
            }
            .padding(16)

            Divider().overlay(TribeTheme.stroke)

            // Signature
            VStack(alignment: .leading, spacing: 10) {
                Text("Signature")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(TribeTheme.textTertiary)
                    .textCase(.uppercase)

                Text(meta?.signature.isEmpty == false ? meta!.signature : "")
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(16)

            Divider().overlay(TribeTheme.stroke)

            // Allow replies
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color.green.opacity(0.16))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Image(systemName: "arrowshape.turn.up.left")
                            .foregroundStyle(Color.green.opacity(0.85))
                    )

                Text("Allow replies")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(TribeTheme.textPrimary)

                Spacer()

                Toggle("", isOn: $allowReplies)
                    .labelsHidden()
                    .tint(Color.green)
            }
            .padding(16)
        }
        .background(TribeTheme.cardBg)
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var bottomBar: some View {
        VStack(spacing: 12) {
            // Full-width dark send button
            Button {
                Task { await submit() }
            } label: {
                HStack {
                    Spacer()
                    Text(isSubmitting ? "SENDING…" : (sendMode == .now ? "SEND" : "SCHEDULE"))
                        .font(.system(size: 12, weight: .semibold))
                        .tracking(2)
                        .foregroundStyle(Color(uiColor: .systemBackground))
                    Spacer()
                }
                .padding(.vertical, 14)
                .background(TribeTheme.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .disabled(isSubmitting)

            // Secondary actions row
            HStack {
                Button("Send test") { showingTest = true }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(TribeTheme.textSecondary)

                Spacer()

                Menu {
                    Picker("Delivery", selection: $sendMode) {
                        ForEach(SendMode.allCases) { m in
                            Text(m.rawValue).tag(m)
                        }
                    }

                    if sendMode == .schedule {
                        DatePicker(
                            "Schedule",
                            selection: $scheduledAt,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(sendMode == .now ? "Send now" : "Schedule")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(TribeTheme.textSecondary)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(TribeTheme.textTertiary)
                    }
                }
            }
        }
    }

    private var testEmailSheet: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("Send test")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                TextField("Your email", text: $testEmail)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(TribeTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                Button {
                    Task { await sendTest() }
                } label: {
                    HStack {
                        Spacer()
                        Text(isSendingTest ? "SENDING…" : "SEND TEST")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(TribeTheme.textPrimary)
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .background(TribeTheme.textPrimary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .disabled(isSendingTest || testEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                Spacer()
            }
            .padding(18)
        }
    }

    private func loadMeta() async {
        guard let token = session.token else { return }
        do {
            meta = try await APIClient.shared.writeMeta(token: token)
        } catch {
            // /api/mobile/email/meta may fail if the backend uses NextAuth session
            // internally. Fall back to dashboard data for the recipient count.
            do {
                let dash = try await APIClient.shared.dashboard(token: token, period: .sevenDays)
                meta = WriteMetaResponse(
                    ok: true,
                    recipients: .init(verified: dash.verifiedSubscribers, nonVerified: dash.totalSubscribers - dash.verifiedSubscribers, all: dash.totalSubscribers),
                    signature: ""
                )
            } catch {
                // keep silent
            }
        }
    }

    private func submit() async {
        guard let token = session.token else {
            toast.show("You’re not logged in")
            return
        }
        guard !subject.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            toast.show("Add a subject")
            return
        }
        guard !bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            toast.show("Write a message")
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            if sendMode == .now {
                _ = try await APIClient.shared.sendEmail(token: token, subject: subject, body: bodyText, allowReplies: allowReplies)
                toast.show("Queued to send")
            } else {
                _ = try await APIClient.shared.scheduleEmail(token: token, subject: subject, body: bodyText, scheduledAt: scheduledAt, allowReplies: allowReplies)
                toast.show("Scheduled")
            }
        } catch {
            toast.show("Failed to send")
        }
    }

    private func sendTest() async {
        guard let token = session.token else { return }
        isSendingTest = true
        defer { isSendingTest = false }

        do {
            try await APIClient.shared.sendTestEmail(token: token, to: testEmail, subject: subject, body: bodyText, allowReplies: allowReplies)
            toast.show("Test email sent")
            showingTest = false
        } catch {
            toast.show("Failed to send test")
        }
    }
}
