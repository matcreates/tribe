import SwiftUI

struct WriteView: View {
    @EnvironmentObject var session: SessionStore

    @State private var subject: String = ""
    @State private var bodyText: String = ""

    enum SendMode: String, CaseIterable, Identifiable {
        case now = "Send now"
        case schedule = "Schedule"
        var id: String { rawValue }
    }

    @State private var sendMode: SendMode = .now
    @State private var scheduledAt: Date = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()

    @State private var isSubmitting = false
    @State private var toast: String?

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Write")
                                .font(.system(size: 26, weight: .semibold))
                                .foregroundStyle(TribeTheme.textPrimary)

                            Text("Compose an email to your tribe")
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Subject")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(TribeTheme.textTertiary)
                                .textCase(.uppercase)

                            TextField("Email subject", text: $subject)
                                .textInputAutocapitalization(.sentences)
                                .autocorrectionDisabled(false)
                                .padding(12)
                                .background(TribeTheme.cardBg)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(TribeTheme.stroke)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .foregroundStyle(TribeTheme.textPrimary)
                        }
                        .tribeCard()

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Body")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(TribeTheme.textTertiary)
                                .textCase(.uppercase)

                            TextEditor(text: $bodyText)
                                .frame(minHeight: 220)
                                .scrollContentBackground(.hidden)
                                .padding(8)
                                .background(TribeTheme.cardBg)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(TribeTheme.stroke)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .foregroundStyle(TribeTheme.textPrimary)
                        }
                        .tribeCard()

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Delivery")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(TribeTheme.textTertiary)
                                .textCase(.uppercase)

                            Picker("Send", selection: $sendMode) {
                                ForEach(SendMode.allCases) { mode in
                                    Text(mode.rawValue).tag(mode)
                                }
                            }
                            .pickerStyle(.menu)
                            .tint(TribeTheme.textPrimary)

                            if sendMode == .schedule {
                                DatePicker(
                                    "",
                                    selection: $scheduledAt,
                                    displayedComponents: [.date, .hourAndMinute]
                                )
                                .labelsHidden()
                                .datePickerStyle(.compact)
                                .tint(TribeTheme.textPrimary)
                            }
                        }
                        .tribeCard()

                        Button {
                            Task { await submit() }
                        } label: {
                            HStack {
                                Spacer()
                                Text(isSubmitting ? "SENDING…" : (sendMode == .now ? "SEND" : "SCHEDULE"))
                                    .font(.system(size: 11, weight: .semibold))
                                    .tracking(2)
                                    .foregroundStyle(TribeTheme.textPrimary)
                                    .padding(.vertical, 14)
                                Spacer()
                            }
                            .background(TribeTheme.textPrimary.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 999, style: .continuous))
                        }
                        .disabled(isSubmitting)
                        .opacity(isSubmitting ? 0.6 : 1)
                        .padding(.top, 4)

                        if let toast {
                            Text(toast)
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                                .padding(.top, 6)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func submit() async {
        guard let token = session.token else {
            toast = "You’re not logged in."
            return
        }
        guard !subject.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            toast = "Please add a subject."
            return
        }
        guard !bodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            toast = "Please add a body."
            return
        }

        isSubmitting = true
        defer { isSubmitting = false }

        do {
            if sendMode == .now {
                _ = try await APIClient.shared.sendEmail(token: token, subject: subject, body: bodyText)
                toast = "Queued to send."
            } else {
                _ = try await APIClient.shared.scheduleEmail(token: token, subject: subject, body: bodyText, scheduledAt: scheduledAt)
                toast = "Scheduled."
            }
        } catch {
            toast = error.localizedDescription
        }
    }
}
