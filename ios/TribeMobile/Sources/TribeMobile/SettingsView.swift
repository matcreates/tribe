import SwiftUI
import PhotosUI

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
    let tier: String?
    let plan: String?
    let endsAt: String?
    let tribeSizeLimit: Int?
    let currentTribeSize: Int?
    let isTribeFull: Bool?
    let canSendEmails: Bool?
    let synced: Bool?
    let message: String?
}

struct SettingsView: View {
    var embedded: Bool = false

    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var data: MobileSettings?
    @State private var error: String?

    @State private var isSaving = false
    @State private var isUploading = false

    @State private var ownerName: String = ""
    @State private var slug: String = ""

    @State private var subscription: MobileSubscriptionResponse?
    @State private var isLoadingPortal = false

    // Photo picker
    @State private var selectedPhoto: PhotosPickerItem?

    var body: some View {
        if embedded {
            scrollContent
                .task { await load(); await syncSubscription() }
                .onChange(of: selectedPhoto) { _, newItem in
                    if let newItem { Task { await handlePhotoPick(newItem) } }
                }
        } else {
            NavigationStack {
                scrollContent
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
            .task { await load(); await syncSubscription() }
            .onChange(of: selectedPhoto) { _, newItem in
                if let newItem { Task { await handlePhotoPick(newItem) } }
            }
        }
    }

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if let error {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary.opacity(0.5))
                }

                if let s = data {
                    // Profile image
                    settingsField(title: "Your profile image") {
                        HStack(spacing: 12) {
                            avatarView(s)

                            PhotosPicker(
                                selection: $selectedPhoto,
                                matching: .images,
                                photoLibrary: .shared()
                            ) {
                                Text(isUploading ? "Uploading…" : "Upload")
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Color(uiColor: .systemBackground))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(Color(uiColor: .label))
                                    .clipShape(Capsule())
                            }
                            .disabled(isUploading)

                            Spacer()
                        }
                    }

                    // Username / slug
                    settingsField(title: "Your username") {
                        TextField("username", text: $slug)
                            .textInputAutocapitalization(.never)
                            .font(.system(size: 15))
                            .foregroundStyle(.primary)
                    }

                    // Name
                    settingsField(title: "Your name") {
                        TextField("Name", text: $ownerName)
                            .textInputAutocapitalization(.words)
                            .font(.system(size: 15))
                            .foregroundStyle(.primary)
                    }

                    // Email (read-only)
                    settingsField(title: "Your email address") {
                        Text(s.userEmail)
                            .font(.system(size: 15))
                            .foregroundStyle(.primary.opacity(0.5))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    // Subscription
                    subscriptionSection

                    // Save
                    Button { Task { await save() } } label: {
                        HStack {
                            Spacer()
                            Text(isSaving ? "SAVING…" : "SAVE")
                                .font(.system(size: 12, weight: .semibold))
                                .tracking(2)
                                .foregroundStyle(Color(uiColor: .systemBackground))
                            Spacer()
                        }
                        .padding(.vertical, 14)
                        .background(Color.primary)
                        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
                    }
                    .disabled(isSaving)

                    // Log out
                    Button {
                        session.logout()
                    } label: {
                        HStack {
                            Spacer()
                            Text("LOG OUT")
                                .font(.system(size: 12, weight: .semibold))
                                .tracking(2)
                            Spacer()
                        }
                        .foregroundStyle(.red)
                        .padding(.vertical, 14)
                        .background(Color.red.opacity(0.10))
                        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                                .stroke(Color.red, lineWidth: 1)
                        )
                    }
                    .padding(.top, 8)
                } else {
                    ProgressView("Loading…")
                        .tint(.primary.opacity(0.3))
                        .frame(maxWidth: .infinity)
                        .padding(.top, 24)
                }
            }
            .pagePadding()
        }
    }

    // MARK: - Settings field (lighter bg)

    private func settingsField(title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.primary.opacity(0.3))
                .textCase(.uppercase)
            content()
        }
        .padding(14)
        .background(
            ZStack {
                RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                    .fill(Color.black.opacity(0.05))
            }
        )
        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
    }

    // MARK: - Avatar

    private func avatarView(_ s: MobileSettings) -> some View {
        Group {
            if let url = s.ownerAvatar, let u = URL(string: url) {
                AsyncImage(url: u) { img in
                    img.resizable().scaledToFill()
                } placeholder: {
                    Color.primary.opacity(0.06)
                }
                .frame(width: 52, height: 52)
                .clipShape(Circle())
            } else {
                Circle()
                    .fill(.primary.opacity(0.06))
                    .frame(width: 52, height: 52)
                    .overlay(
                        Text(initials(ownerName.isEmpty ? s.ownerName : ownerName))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.primary.opacity(0.4))
                    )
            }
        }
    }

    // MARK: - Subscription

    private var subscriptionSection: some View {
        settingsField(title: "Subscription") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Circle()
                        .fill(subscriptionStatusColor())
                        .frame(width: 8, height: 8)
                    Text(subscriptionTierName())
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(subscriptionPlanLabel())
                        .font(.system(size: 12))
                        .foregroundStyle(.primary.opacity(0.3))
                }

                if let current = subscription?.currentTribeSize {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text("Tribe size")
                                .font(.system(size: 11))
                                .foregroundStyle(.primary.opacity(0.3))
                            Spacer()
                            Text(tribeSizeLabel())
                                .font(.system(size: 11))
                                .foregroundStyle(.primary.opacity(0.5))
                        }
                        if let limit = subscription?.tribeSizeLimit, limit > 0 {
                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(.primary.opacity(0.08))
                                        .frame(height: 5)
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(.primary.opacity(subscription?.isTribeFull == true ? 0.6 : 0.3))
                                        .frame(width: min(geo.size.width, geo.size.width * CGFloat(current) / CGFloat(limit)), height: 5)
                                }
                            }
                            .frame(height: 5)
                        }
                    }
                    .padding(10)
                    .background(.primary.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                if let sub = subscription {
                    Text(subscriptionEndInfo(sub))
                        .font(.system(size: 12))
                        .foregroundStyle(.primary.opacity(0.3))
                }

                HStack(spacing: 8) {
                    Button { Task { await syncSubscription() } } label: {
                        Text("SYNC")
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(.primary)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 14)
                            .background(.primary.opacity(0.06))
                            .clipShape(Capsule())
                    }

                    Button { Task { await openPortal() } } label: {
                        Text(isLoadingPortal ? "OPENING…" : "MANAGE")
                            .font(.system(size: 10, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(.primary)
                            .padding(.vertical, 10)
                            .padding(.horizontal, 14)
                            .background(.primary.opacity(0.06))
                            .clipShape(Capsule())
                    }
                    .disabled(isLoadingPortal)

                    Spacer()
                }
            }
        }
    }

    // MARK: - Helpers

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ")
        let first = parts.first?.first.map(String.init) ?? ""
        let last = parts.dropFirst().first?.first.map(String.init) ?? ""
        let out = (first + last).uppercased()
        return out.isEmpty ? "T" : out
    }

    private func handlePhotoPick(_ item: PhotosPickerItem) async {
        guard let token = session.token else { return }
        isUploading = true
        defer { isUploading = false; selectedPhoto = nil }

        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                toast.show("Could not load image")
                return
            }

            // Write to temp file
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("avatar_\(UUID().uuidString).jpg")
            try data.write(to: tempURL)

            let newUrl = try await APIClient.shared.uploadAvatar(token: token, fileURL: tempURL)
            toast.show("Image uploaded")

            try? FileManager.default.removeItem(at: tempURL)

            if let s = self.data {
                self.data = MobileSettings(
                    userEmail: s.userEmail, ownerName: s.ownerName, slug: s.slug,
                    ownerAvatar: newUrl, emailSignature: s.emailSignature, joinDescription: s.joinDescription
                )
            }
        } catch {
            toast.show("Upload failed")
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.settings(token: token)
            data = resp.settings
            ownerName = resp.settings.ownerName
            slug = resp.settings.slug
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
                emailSignature: ""
            )
            toast.show("Settings saved")
            await load()
        } catch {
            toast.show("Failed to save")
        }
    }

    private func subscriptionTierName() -> String {
        guard let tier = subscription?.tier else { return "Loading…" }
        switch tier {
        case "big": return "Big Creators"
        case "small": return "Small Creators"
        default: return "Free"
        }
    }

    private func subscriptionStatusColor() -> Color {
        guard let status = subscription?.status else { return .primary.opacity(0.2) }
        switch status {
        case "active": return .primary.opacity(0.6)
        case "canceled", "past_due": return .primary.opacity(0.3)
        default: return .primary.opacity(0.2)
        }
    }

    private func subscriptionPlanLabel() -> String {
        guard let plan = subscription?.plan else { return "" }
        if plan.contains("yearly") { return "Yearly" }
        if plan.contains("monthly") { return "Monthly" }
        return plan.capitalized
    }

    private func tribeSizeLabel() -> String {
        let current = subscription?.currentTribeSize ?? 0
        if let limit = subscription?.tribeSizeLimit, limit > 0 {
            return "\(current.formatted()) / \(limit.formatted())"
        }
        return "\(current.formatted()) / Unlimited"
    }

    private func subscriptionEndInfo(_ sub: MobileSubscriptionResponse) -> String {
        guard let ends = sub.endsAt, !ends.isEmpty else {
            if sub.status == "free" { return "Upgrade to unlock email sending" }
            return "Subscription active"
        }
        let dateStr = String(ends.prefix(10))
        if sub.status == "canceled" { return "Access until \(dateStr)" }
        return "Renews on \(dateStr)"
    }

    private func syncSubscription() async {
        guard let token = session.token else { return }
        do {
            let resp = try await APIClient.shared.verifySubscription(token: token)
            subscription = resp
        } catch { }
    }

    private func openPortal() async {
        guard let token = session.token else { return }
        isLoadingPortal = true
        defer { isLoadingPortal = false }
        do {
            let url = try await APIClient.shared.createPortal(token: token)
            if let u = URL(string: url) { await UIApplication.shared.open(u) }
        } catch {
            toast.show("No subscription")
        }
    }
}
