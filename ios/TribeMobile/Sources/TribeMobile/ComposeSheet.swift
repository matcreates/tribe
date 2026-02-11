import SwiftUI

struct ComposeSheet: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter
    @Environment(\.dismiss) var dismiss

    let verifiedCount: Int
    var signature: String = ""
    var onSent: (() -> Void)?

    @State private var subject = ""
    @State private var bodyText = ""
    @State private var allowReplies = true
    @State private var isSubmitting = false

    // Schedule
    @State private var sendMode: SendMode = .now
    @State private var scheduledAt = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()

    // Test email
    @State private var showingTest = false
    @State private var testEmail = ""
    @State private var isSendingTest = false

    enum SendMode: String, CaseIterable, Identifiable {
        case now = "Send"
        case schedule = "Schedule"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // To
                        recipientRow
                        divider

                        // Subject
                        subjectRow
                        divider

                        // Body
                        bodyRow
                        divider

                        // Signature
                        if !signature.isEmpty {
                            signatureRow
                            divider
                        }

                        // Allow replies toggle
                        repliesToggle

                        // Send button
                        sendButton
                            .padding(18)

                        // Secondary actions
                        secondaryActions
                            .padding(.horizontal, 18)
                    }
                }
            }
            .navigationTitle("New Message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(.primary.opacity(0.5))
                }
            }
            .sheet(isPresented: $showingTest) {
                testEmailSheet
                    .presentationDetents([.medium])
            }
        }
    }

    // MARK: - Rows

    private var recipientRow: some View {
        HStack {
            Text("To")
                .font(.system(size: 15))
                .foregroundStyle(.primary.opacity(0.4))

            Spacer()

            Text("All verified members (\(verifiedCount))")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.primary.opacity(0.05))
                .clipShape(Capsule())
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
    }

    private var subjectRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Subject")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.primary.opacity(0.3))

            TextField("Hello Tribe", text: $subject)
                .font(TribeTheme.pageTitle(size: 20))
                .textInputAutocapitalization(.sentences)
                .foregroundStyle(.primary)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
    }

    private var bodyRow: some View {
        TextEditor(text: $bodyText)
            .font(.system(size: 15))
            .frame(minHeight: 180)
            .scrollContentBackground(.hidden)
            .foregroundStyle(.primary)
            .overlay(alignment: .topLeading) {
                if bodyText.isEmpty {
                    Text("Write your message…")
                        .font(.system(size: 15))
                        .foregroundStyle(.primary.opacity(0.25))
                        .padding(.top, 8)
                        .padding(.leading, 5)
                        .allowsHitTesting(false)
                }
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
    }

    private var signatureRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SIGNATURE")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.primary.opacity(0.25))

            Text(signature)
                .font(.system(size: 14))
                .foregroundStyle(.primary.opacity(0.45))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
    }

    private var repliesToggle: some View {
        HStack {
            Image(systemName: "arrowshape.turn.up.left")
                .font(.system(size: 14))
                .foregroundStyle(.primary.opacity(0.4))

            Text("Allow replies")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.primary)

            Spacer()

            Toggle("", isOn: $allowReplies)
                .labelsHidden()
                .tint(.primary.opacity(0.6))
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
    }

    private var sendButton: some View {
        Button {
            Task { await submit() }
        } label: {
            HStack {
                Spacer()
                Text(isSubmitting ? "SENDING…" : (sendMode == .now ? "SEND" : "SCHEDULE"))
                    .font(.system(size: 13, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(Color(uiColor: .systemBackground))
                Spacer()
            }
            .padding(.vertical, 14)
            .background(Color.primary)
            .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
        }
        .disabled(isSubmitting)
        .opacity(isSubmitting ? 0.6 : 1)
    }

    private var secondaryActions: some View {
        HStack {
            Button("Send test") { showingTest = true }
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.primary.opacity(0.4))

            Spacer()

            Menu {
                Picker("Delivery", selection: $sendMode) {
                    ForEach(SendMode.allCases) { m in
                        Text(m.rawValue).tag(m)
                    }
                }
                if sendMode == .schedule {
                    DatePicker("Schedule", selection: $scheduledAt, displayedComponents: [.date, .hourAndMinute])
                }
            } label: {
                HStack(spacing: 4) {
                    Text(sendMode == .now ? "Send now" : "Schedule")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.primary.opacity(0.4))
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.primary.opacity(0.25))
                }
            }
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(.primary.opacity(0.06))
            .frame(height: 1)
    }

    // MARK: - Test Email Sheet

    private var testEmailSheet: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("Send test")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.primary)

                TextField("Your email", text: $testEmail)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(.primary.opacity(0.05))
                    .clipShape(Capsule())

                Button {
                    Task { await sendTest() }
                } label: {
                    HStack {
                        Spacer()
                        Text(isSendingTest ? "SENDING…" : "SEND TEST")
                            .font(.system(size: 12, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(.primary)
                        Spacer()
                    }
                    .padding(.vertical, 12)
                    .background(.primary.opacity(0.06))
                    .clipShape(Capsule())
                }
                .disabled(isSendingTest || testEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                Spacer()
            }
            .padding(18)
        }
    }

    // MARK: - Actions

    private func submit() async {
        guard let token = session.token else {
            toast.show("Not logged in")
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
                try await APIClient.shared.sendEmail(token: token, subject: subject, body: bodyText, allowReplies: allowReplies)
                toast.show("Queued to send")
            } else {
                try await APIClient.shared.scheduleEmail(token: token, subject: subject, body: bodyText, scheduledAt: scheduledAt, allowReplies: allowReplies)
                toast.show("Scheduled")
            }
            onSent?()
            dismiss()
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
            toast.show("Test sent")
            showingTest = false
        } catch {
            toast.show("Failed to send test")
        }
    }
}
