import SwiftUI

struct JoinPageView: View {
    private let defaultJoinDescription = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected."

    var embedded: Bool = false

    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var join: JoinSettings?
    @State private var description: String = ""
    @State private var fullJoinUrl: String = ""
    @State private var displayUrl: String = ""

    @State private var isSaving = false
    @State private var error: String?
    @State private var saveTask: Task<Void, Never>?
    @State private var isEditingDescription = false
    @State private var keyboardHeight: CGFloat = 0
    @FocusState private var descriptionFocused: Bool

    var body: some View {
        if embedded {
            scrollContent
                .task { await load() }
        } else {
            NavigationStack {
                scrollContent
                    .navigationTitle("")
                    .navigationBarTitleDisplayMode(.inline)
            }
            .task { await load() }
        }
    }

    private var scrollContent: some View {
        ScrollViewReader { proxy in
            ScrollView {
                VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                    if !embedded {
                        HStack {
                            Text("Join page")
                                .font(TribeTheme.pageTitle())
                                .foregroundStyle(.primary)
                            Spacer()
                            if isSaving {
                                Text("Saving…")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.primary.opacity(0.25))
                            }
                        }
                    } else if isSaving {
                        HStack {
                            Spacer()
                            Text("Saving…")
                                .font(.system(size: 11))
                                .foregroundStyle(.primary.opacity(0.25))
                        }
                    }

                    if let join {
                        joinPreviewCard(join)
                    } else if let error {
                        Text(error)
                            .font(.system(size: 13))
                            .foregroundStyle(.primary.opacity(0.5))
                    } else {
                        ProgressView("Loading…")
                            .tint(.primary.opacity(0.3))
                            .frame(maxWidth: .infinity)
                            .padding(.top, 24)
                    }

                    // Extra space when keyboard is showing so content can scroll above it
                    if keyboardHeight > 0 {
                        Color.clear.frame(height: keyboardHeight)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { notif in
                if let frame = notif.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
                    withAnimation(.easeOut(duration: 0.25)) {
                        keyboardHeight = frame.height
                        isEditingDescription = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                        withAnimation(.easeOut(duration: 0.25)) {
                            proxy.scrollTo("description-editor", anchor: .center)
                        }
                    }
                }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
                withAnimation(.easeOut(duration: 0.25)) {
                    keyboardHeight = 0
                    isEditingDescription = false
                }
            }
        }
    }

    // MARK: - Join Preview Card

    private func joinPreviewCard(_ join: JoinSettings) -> some View {
        VStack(spacing: 0) {
            // URL bar
            HStack(spacing: 8) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.primary.opacity(0.25))

                Text(displayUrl)
                    .font(.system(size: 13))
                    .foregroundStyle(.primary.opacity(0.4))
                    .lineLimit(1)

                Spacer(minLength: 0)

                Button {
                    UIPasteboard.general.string = fullJoinUrl
                    toast.show("Link copied")
                } label: {
                    Image(systemName: "doc.on.doc")
                        .foregroundStyle(.primary.opacity(0.25))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(.primary.opacity(0.03))

            Divider().opacity(0.06)

            // Preview content
            VStack(spacing: 12) {
                // Avatar
                if let avatarUrl = join.ownerAvatar, let url = URL(string: avatarUrl) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image.resizable().scaledToFill()
                                .frame(width: 56, height: 56).clipShape(Circle())
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
                    .foregroundStyle(.primary.opacity(0.5))

                Text("Join my tribe")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.primary)

                // Editable description
                VStack(spacing: 2) {
                    TextField("Describe your tribe…", text: $description, axis: .vertical)
                        .font(.system(size: 12))
                        .foregroundStyle(.primary.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .lineSpacing(3)
                        .lineLimit(2...6)
                        .focused($descriptionFocused)
                        .submitLabel(.done)
                        .onSubmit {
                            descriptionFocused = false
                            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                        }
                        .onChange(of: description) { oldValue, newValue in
                            // Intercept newline from "Done" key – dismiss keyboard instead
                            if newValue.hasSuffix("\n") && !oldValue.hasSuffix("\n") {
                                description = String(newValue.dropLast())
                                descriptionFocused = false
                                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                return
                            }
                            debouncedSave(newValue)
                        }

                    // Underline hint to show it's editable
                    Rectangle()
                        .fill(.primary.opacity(descriptionFocused ? 0.3 : 0.12))
                        .frame(height: 1)
                        .padding(.horizontal, 8)
                }
                .id("description-editor")
                .padding(.horizontal, 28)

                // Email field
                HStack {
                    Text("your email address")
                        .font(.system(size: 13))
                        .foregroundStyle(.primary.opacity(0.25))
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.primary.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
                .padding(.horizontal, 28)

                // JOIN button (compact width)
                Text("JOIN")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(2)
                    .foregroundStyle(Color(uiColor: .systemBackground))
                    .padding(.horizontal, 40)
                    .padding(.vertical, 12)
                    .background(Color.primary)
                    .clipShape(Capsule())
                    .padding(.bottom, 16)

                HStack(spacing: 6) {
                    Text("made with")
                        .font(.system(size: 11))
                        .foregroundStyle(.primary.opacity(0.2))
                    Text("Tribe")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.primary.opacity(0.4))
                }
                .padding(.bottom, 18)
            }
            .frame(maxWidth: .infinity)
        }
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

    private func initialsCircle(_ name: String) -> some View {
        Circle()
            .fill(.primary.opacity(0.06))
            .frame(width: 56, height: 56)
            .overlay(
                Text(initials(name))
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.primary.opacity(0.4))
            )
    }

    // MARK: - Data

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
        guard let token = session.token, join != nil else { return }
        isSaving = true
        defer { isSaving = false }
        do {
            try await APIClient.shared.updateJoinDescription(token: token, description: newValue)
        } catch { }
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
