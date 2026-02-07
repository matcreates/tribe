import SwiftUI

struct JoinPageView: View {
    private let defaultJoinDescription = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected."

    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var join: JoinSettings?
    @State private var description: String = ""
    @State private var fullJoinUrl: String = ""
    @State private var displayUrl: String = ""

    @State private var isSaving = false
    @State private var error: String?
    @State private var saveTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Join page")
                                    .font(TribeTheme.pageTitle())
                                    .foregroundStyle(TribeTheme.textPrimary)

                                Spacer()

                                if isSaving {
                                    Text("Saving…")
                                        .font(.system(size: 11))
                                        .foregroundStyle(TribeTheme.textTertiary)
                                }
                            }

                            Text("This is the public page people use to subscribe to your tribe.")
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        if let join {
                            joinPreviewCard(join)
                        } else if let error {
                            Text("Couldn't load join page")
                                .font(.headline)
                                .foregroundStyle(TribeTheme.textPrimary)
                            Text(error)
                                .font(.subheadline)
                                .foregroundStyle(TribeTheme.textSecondary)
                        } else {
                            ProgressView("Loading…")
                                .tint(TribeTheme.textPrimary)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 24)
                        }
                    }
                    .pagePadding()
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { SettingsToolbarItem() }
            .task { await load() }
        }
    }

    private func joinPreviewCard(_ join: JoinSettings) -> some View {
        VStack(spacing: 0) {
            // Browser bar – URL left-aligned
            HStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(TribeTheme.textTertiary)

                Text(displayUrl)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(TribeTheme.textSecondary)
                    .lineLimit(1)

                Spacer(minLength: 0)

                Button {
                    UIPasteboard.general.string = fullJoinUrl
                    toast.show("Link copied")
                } label: {
                    Image(systemName: "doc.on.doc")
                        .foregroundStyle(TribeTheme.textTertiary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(TribeTheme.overlayLight)

            Divider().overlay(TribeTheme.overlayDivider)

            // Page preview content
            VStack(spacing: 12) {
                // Avatar – load from URL if available, else show initials
                if let avatarUrl = join.ownerAvatar, let url = URL(string: avatarUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(width: 56, height: 56)
                                .clipShape(Circle())
                        default:
                            initialsCircle(join.ownerName)
                        }
                    }
                    .padding(.top, 18)
                } else {
                    initialsCircle(join.ownerName)
                        .padding(.top, 18)
                }

                Text(join.ownerName)
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)

                Text("Join my tribe")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                // Editable description – directly in the preview
                TextEditor(text: $description)
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 60, maxHeight: 120)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, 28)
                    .onChange(of: description) { _, newValue in
                        debouncedSave(newValue)
                    }

                // Email field placeholder
                HStack {
                    Text("your email address")
                        .font(.system(size: 13))
                        .foregroundStyle(TribeTheme.textTertiary)
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(TribeTheme.overlayLight)
                .overlay(
                    RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous)
                        .stroke(TribeTheme.overlayDivider)
                )
                .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
                .padding(.horizontal, 28)

                // JOIN button – same border-radius as email field
                HStack {
                    Spacer()
                    Text("JOIN")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(2)
                        .foregroundStyle(Color(uiColor: .systemBackground))
                    Spacer()
                }
                .padding(.vertical, 12)
                .background(TribeTheme.textPrimary)
                .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
                .padding(.horizontal, 28)
                .padding(.bottom, 16)

                HStack(spacing: 6) {
                    Text("made with")
                        .font(.system(size: 11))
                        .foregroundStyle(TribeTheme.textTertiary)
                    Text("Tribe")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(TribeTheme.textSecondary)
                }
                .padding(.bottom, 18)
            }
            .frame(maxWidth: .infinity)
        }
        .overlay(
            RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
    }

    private func initialsCircle(_ name: String) -> some View {
        Circle()
            .fill(TribeTheme.overlaySubtle)
            .frame(width: 56, height: 56)
            .overlay(
                Text(initials(name))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(TribeTheme.textSecondary)
            )
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let j = try await APIClient.shared.joinSettings(token: token)
            join = j
            description = j.description.isEmpty ? defaultJoinDescription : j.description

            let url = "\(Config.baseURL.absoluteString)/@\(j.slug)"
            fullJoinUrl = url
            displayUrl = url.replacingOccurrences(of: "https://", with: "").replacingOccurrences(of: "http://", with: "")
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func debouncedSave(_ newValue: String) {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 900_000_000)
            guard !Task.isCancelled else { return }
            await save(newValue)
        }
    }

    @MainActor
    private func save(_ newValue: String) async {
        guard let token = session.token else { return }
        guard join != nil else { return }
        isSaving = true
        defer { isSaving = false }

        do {
            try await APIClient.shared.updateJoinDescription(token: token, description: newValue)
        } catch {
            // keep silent for MVP
        }
    }

    private func initials(_ name: String) -> String {
        let parts = name.split(separator: " ")
        let first = parts.first?.first.map(String.init) ?? ""
        let last = parts.dropFirst().first?.first.map(String.init) ?? ""
        let out = (first + last).uppercased()
        return out.isEmpty ? "T" : out
    }
}

struct JoinSettings: Decodable {
    let slug: String
    let ownerName: String
    let ownerAvatar: String?
    let description: String
}
