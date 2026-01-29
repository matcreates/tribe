import SwiftUI

struct JoinPageView: View {
    private let defaultJoinDescription = "A tribe is a group of people who choose to follow your work, support your ideas, and stay connected."

    @EnvironmentObject var session: SessionStore

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
                    VStack(alignment: .leading, spacing: 14) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Join page")
                                .font(.system(size: 26, weight: .semibold))
                                .foregroundStyle(TribeTheme.textPrimary)

                            Text("Preview your join page")

                            Text("This is the public page people use to subscribe to your tribe.")
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textTertiary)
                                .font(.system(size: 13))
                                .foregroundStyle(TribeTheme.textSecondary)
                        }

                        if let join {
                            joinPreviewCard(join)

                            // Description editor
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text("Page description")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundStyle(TribeTheme.textTertiary)
                                        .textCase(.uppercase)

                                    Spacer()

                                    if isSaving {
                                        Text("Saving…")
                                            .font(.system(size: 11))
                                            .foregroundStyle(TribeTheme.textTertiary)
                                    }
                                }

                                TextEditor(text: $description)
                                    .frame(minHeight: 90)
                                    .scrollContentBackground(.hidden)
                                    .padding(8)
                                    .background(Color.white.opacity(0.05))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(TribeTheme.stroke)
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .foregroundStyle(TribeTheme.textPrimary)
                                    .onChange(of: description) { _, newValue in
                                        debouncedSave(newValue)
                                    }

                                Text("Changes are saved automatically")
                                    .font(.system(size: 11))
                                    .foregroundStyle(TribeTheme.textTertiary)
                            }
                            .tribeCard()
                        } else if let error {
                            Text("Couldn’t load join page")
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
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .task { await load() }
        }
    }

    private func joinPreviewCard(_ join: JoinSettings) -> some View {
        VStack(spacing: 0) {
            // Browser bar
            HStack(spacing: 10) {
                HStack(spacing: 6) {
                    Circle().fill(Color.white.opacity(0.10)).frame(width: 10, height: 10)
                    Circle().fill(Color.white.opacity(0.10)).frame(width: 10, height: 10)
                    Circle().fill(Color.white.opacity(0.10)).frame(width: 10, height: 10)
                }

                HStack(spacing: 8) {
                    Image(systemName: "lock.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(TribeTheme.textTertiary)

                    Text(displayUrl)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(TribeTheme.textSecondary)
                        .lineLimit(1)

                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color.white.opacity(0.04))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                Button {
                    UIPasteboard.general.string = fullJoinUrl
                } label: {
                    Image(systemName: "doc.on.doc")
                        .foregroundStyle(TribeTheme.textTertiary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.03))

            Divider().overlay(Color.white.opacity(0.06))

            // Page preview content
            VStack(spacing: 12) {
                Circle()
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text(initials(join.ownerName))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(TribeTheme.textSecondary)
                    )
                    .padding(.top, 18)

                Text(join.ownerName)
                    .font(.system(size: 13))
                    .foregroundStyle(TribeTheme.textSecondary)

                Text("Join my tribe")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                Text(description.isEmpty ? defaultJoinDescription : description)
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textSecondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .padding(.horizontal, 40)

                HStack {
                    Text("your email address")
                        .font(.system(size: 13))
                        .foregroundStyle(TribeTheme.textTertiary)
                    Spacer()
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(Color.white.opacity(0.06))
                )
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .padding(.horizontal, 28)

                HStack {
                    Spacer()
                    Text("JOIN")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(2)
                        .foregroundStyle(TribeTheme.textPrimary)
                    Spacer()
                }
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 999, style: .continuous))
                .padding(.horizontal, 70)
                .opacity(0.6)
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
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let j = try await APIClient.shared.joinSettings(token: token)
            join = j
            description = j.description.isEmpty ? defaultJoinDescription : j.description

            let url = "\(Config.baseURL.absoluteString)/j/\(j.slug)"
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
            // keep silent for MVP; could surface toast
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
