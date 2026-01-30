import SwiftUI
import UniformTypeIdentifiers

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

struct MobileSubscriptionResponse: Decodable {
    let status: String
    let plan: String?
    let endsAt: String?
    let synced: Bool?
    let message: String?
}

struct SettingsView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var data: MobileSettings?
    @State private var error: String?

    @State private var isSaving = false
    @State private var isUploading = false
    @State private var showingPicker = false

    @State private var ownerName: String = ""
    @State private var slug: String = ""
    @State private var emailSignature: String = ""

    @State private var subscription: MobileSubscriptionResponse?
    @State private var isLoadingPortal = false

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
                        // Email
                        fieldCard(title: "Email address") {
                            Text(s.userEmail)
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        // Avatar
                        fieldCard(title: "Profile image") {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(TribeTheme.textPrimary.opacity(0.06))
                                    .frame(width: 52, height: 52)
                                    .overlay(
                                        Group {
                                            if let url = s.ownerAvatar, let u = URL(string: url) {
                                                AsyncImage(url: u) { img in
                                                    img.resizable().scaledToFill()
                                                } placeholder: {
                                                    Color.clear
                                                }
                                                .clipShape(Circle())
                                            } else {
                                                Text(initials(ownerName.isEmpty ? s.ownerName : ownerName))
                                                    .font(.system(size: 14, weight: .semibold))
                                                    .foregroundStyle(TribeTheme.textSecondary)
                                            }
                                        }
                                    )

                                Button {
                                    showingPicker = true
                                } label: {
                                    Text(isUploading ? "UPLOADING…" : "UPLOAD")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(2)
                                        .foregroundStyle(TribeTheme.textPrimary)
                                        .padding(.vertical, 10)
                                        .padding(.horizontal, 14)
                                        .background(TribeTheme.textPrimary.opacity(0.08))
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                }
                                .disabled(isUploading)

                                Spacer()
                            }
                        }

                        // Owner name
                        fieldCard(title: "Your name") {
                            TextField("", text: $ownerName)
                                .textInputAutocapitalization(.words)
                                .foregroundStyle(TribeTheme.textPrimary)
                        }

                        // Slug
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

                        // Signature
                        fieldCard(title: "Email signature") {
                            TextEditor(text: $emailSignature)
                                .frame(minHeight: 120)
                                .scrollContentBackground(.hidden)
                                .foregroundStyle(TribeTheme.textPrimary)
                                .padding(.top, 6)
                        }

                        // Subscription
                        fieldCard(title: "Subscription") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(subscriptionLine())
                                    .font(.system(size: 13))
                                    .foregroundStyle(TribeTheme.textSecondary)

                                HStack {
                                    Button {
                                        Task { await syncSubscription() }
                                    } label: {
                                        Text("SYNC")
                                            .font(.system(size: 10, weight: .semibold))
                                            .tracking(2)
                                            .foregroundStyle(TribeTheme.textPrimary)
                                            .padding(.vertical, 10)
                                            .padding(.horizontal, 14)
                                            .background(TribeTheme.textPrimary.opacity(0.08))
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    }

                                    Button {
                                        Task { await openPortal() }
                                    } label: {
                                        Text(isLoadingPortal ? "OPENING…" : "MANAGE")
                                            .font(.system(size: 10, weight: .semibold))
                                            .tracking(2)
                                            .foregroundStyle(TribeTheme.textPrimary)
                                            .padding(.vertical, 10)
                                            .padding(.horizontal, 14)
                                            .background(TribeTheme.textPrimary.opacity(0.08))
                                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    }
                                    .disabled(isLoadingPortal)

                                    Spacer()
                                }
                            }
                        }

                        // Save
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
        .task {
            await load()
            await syncSubscription()
        }
        .fileImporter(
            isPresented: $showingPicker,
            allowedContentTypes: [UTType.image],
            allowsMultipleSelection: false
        ) { result in
            switch result {
            case .success(let urls):
                guard let url = urls.first else { return }
                Task { await uploadAvatar(url: url) }
            case .failure(let err):
                toast.show(err.localizedDescription)
            }
        }
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

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ")
        let first = parts.first?.first.map(String.init) ?? ""
        let last = parts.dropFirst().first?.first.map(String.init) ?? ""
        let out = (first + last).uppercased()
        return out.isEmpty ? "T" : out
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
                ownerName: ownerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Anonymous" : ownerName,
                slug: slug,
                emailSignature: emailSignature
            )
            toast.show("Settings saved")
            await load()
        } catch {
            toast.show("Failed to save")
        }
    }

    private func uploadAvatar(url: URL) async {
        guard let token = session.token else { return }
        isUploading = true
        defer { isUploading = false }

        do {
            let newUrl = try await APIClient.shared.uploadAvatar(token: token, fileURL: url)
            toast.show("Image uploaded")
            // update in-memory data
            if var s = data {
                s = MobileSettings(userEmail: s.userEmail, ownerName: s.ownerName, slug: s.slug, ownerAvatar: newUrl, emailSignature: s.emailSignature, joinDescription: s.joinDescription)
                data = s
            }
        } catch {
            toast.show("Upload failed")
        }
    }

    private func subscriptionLine() -> String {
        guard let subscription else { return "Loading…" }
        var parts: [String] = [subscription.status]
        if let plan = subscription.plan { parts.append(plan) }
        if let ends = subscription.endsAt { parts.append("ends \(ends.prefix(10))") }
        return parts.joined(separator: " • ")
    }

    private func syncSubscription() async {
        guard let token = session.token else { return }
        do {
            let resp = try await APIClient.shared.verifySubscription(token: token)
            subscription = resp
            if resp.synced == true {
                toast.show("Subscription updated")
            }
        } catch {
            // ignore
        }
    }

    private func openPortal() async {
        guard let token = session.token else { return }
        isLoadingPortal = true
        defer { isLoadingPortal = false }

        do {
            let url = try await APIClient.shared.createPortal(token: token)
            if let u = URL(string: url) {
                await UIApplication.shared.open(u)
            }
        } catch {
            toast.show("No subscription")
        }
    }
}
