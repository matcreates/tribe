import SwiftUI

struct MobileSettingsResponse: Decodable {
    let ok: Bool?
    let settings: MobileSettings
}

struct MobileSettings: Decodable {
    let userEmail: String
    let ownerName: String
    let slug: String
    let ownerAvatar: String?
    let emailSignature: String
    let joinDescription: String
}

struct SettingsView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var data: MobileSettings?
    @State private var error: String?
    @State private var isSaving = false

    @State private var ownerName: String = ""
    @State private var slug: String = ""
    @State private var emailSignature: String = ""

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Account settings")
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(TribeTheme.textPrimary)

                    if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(.red)
                    }

                    if let s = data {
                        fieldCard(title: "Email address") {
                            Text(s.userEmail)
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        fieldCard(title: "Your name") {
                            TextField("", text: $ownerName)
                                .textInputAutocapitalization(.words)
                                .foregroundStyle(TribeTheme.textPrimary)
                        }

                        fieldCard(title: "Your username") {
                            HStack(spacing: 8) {
                                Text("madewithtribe.com/@")
                                    .font(.system(size: 13))
                                    .foregroundStyle(TribeTheme.textTertiary)
                                TextField("", text: $slug)
                                    .textInputAutocapitalization(.never)
                                    .foregroundStyle(TribeTheme.textPrimary)
                            }
                        }

                        fieldCard(title: "Email signature") {
                            TextEditor(text: $emailSignature)
                                .frame(minHeight: 120)
                                .scrollContentBackground(.hidden)
                                .foregroundStyle(TribeTheme.textPrimary)
                                .padding(.top, 6)
                        }

                        Button {
                            Task { await save() }
                        } label: {
                            HStack {
                                Spacer()
                                Text(isSaving ? "SAVING…" : "SAVE")
                                    .font(.system(size: 11, weight: .semibold))
                                    .tracking(2)
                                    .foregroundStyle(TribeTheme.textPrimary)
                                Spacer()
                            }
                            .padding(.vertical, 12)
                            .background(TribeTheme.textPrimary.opacity(0.08))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                        .disabled(isSaving)

                        Button("Log out", role: .destructive) {
                            session.logout()
                        }
                        .padding(.top, 8)
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

    private func fieldCard(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(TribeTheme.textTertiary)
                .textCase(.uppercase)

            content()
                .padding(12)
                .background(TribeTheme.cardBg)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(TribeTheme.stroke)
                )
        }
        .tribeCard()
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.settings(token: token)
            data = resp.settings
            ownerName = resp.settings.ownerName
            slug = resp.settings.slug
            emailSignature = resp.settings.emailSignature
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func save() async {
        guard let token = session.token else { return }
        isSaving = true
        defer { isSaving = false }

        do {
            try await APIClient.shared.updateSettings(
                token: token,
                ownerName: ownerName,
                slug: slug,
                emailSignature: emailSignature
            )
            toast.show("Settings saved")
            await load()
        } catch {
            toast.show("Failed to save")
        }
    }
}
