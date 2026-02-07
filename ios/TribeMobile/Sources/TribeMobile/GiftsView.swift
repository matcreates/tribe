import SwiftUI
import UniformTypeIdentifiers

struct GiftsView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var gifts: [Gift] = []
    @State private var count: Int = 0
    @State private var maxGifts: Int = 5
    @State private var error: String?

    @State private var showingPicker = false
    @State private var pickedURL: URL?
    @State private var isUploading = false

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                        header

                        if let error {
                            Text("Couldn’t load gifts")
                                .font(.headline)
                                .foregroundStyle(TribeTheme.textPrimary)
                            Text(error)
                                .font(.subheadline)
                                .foregroundStyle(TribeTheme.textSecondary)
                        } else {
                            if gifts.isEmpty {
                                Text("No gifts yet")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(TribeTheme.textSecondary)
                                    .padding(.top, 12)
                            } else {
                                VStack(spacing: 14) {
                                    ForEach(gifts) { g in
                                        GiftRow(gift: g, onDelete: {
                                            Task { await deleteGift(g) }
                                        }, toast: toast)
                                    }
                                }
                            }
                        }
                    }
                    .pagePadding()
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: 16) {
                        Button {
                            showingPicker = true
                        } label: {
                            if isUploading {
                                ProgressView()
                                    .tint(TribeTheme.textSecondary)
                            } else {
                                Image(systemName: "plus")
                                    .foregroundStyle(TribeTheme.textSecondary)
                            }
                        }
                        .disabled(isUploading || count >= maxGifts)
                        .accessibilityLabel("Upload gift")

                        NavigationLink {
                            SettingsView()
                        } label: {
                            Image(systemName: "gearshape")
                                .foregroundStyle(TribeTheme.textSecondary)
                        }
                        .accessibilityLabel("Settings")
                    }
                }
            }
            .fileImporter(
                isPresented: $showingPicker,
                allowedContentTypes: [.data],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    pickedURL = url
                    Task { await uploadGift(url: url) }
                case .failure(let err):
                    error = err.localizedDescription
                }
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Gifts")
                .font(TribeTheme.pageTitle())
                .foregroundStyle(TribeTheme.textPrimary)

            Text("Sharing is caring: gifts help you grow by rewarding new members.")
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)

            Text("\(count)/\(maxGifts) gifts uploaded")
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textTertiary)
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.gifts(token: token)
            gifts = resp.gifts
            count = resp.count
            maxGifts = resp.maxGifts
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func uploadGift(url: URL) async {
        guard let token = session.token else { return }
        isUploading = true
        defer { isUploading = false }

        do {
            error = nil
            try await APIClient.shared.uploadGift(token: token, fileURL: url)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteGift(_ gift: Gift) async {
        guard let token = session.token else { return }
        do {
            try await APIClient.shared.deleteGift(token: token, id: gift.id)
            await load()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct GiftRow: View {
    let gift: Gift
    let onDelete: () -> Void
    let toast: ToastCenter

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(TribeTheme.textPrimary.opacity(0.06))
                .frame(width: 44, height: 44)
                .overlay(
                    Image(systemName: "gift")
                        .foregroundStyle(TribeTheme.textSecondary)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(gift.file_name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(TribeTheme.textPrimary)
                    .lineLimit(1)

                Text("\(gift.member_count) members joined")
                    .font(.system(size: 12))
                    .foregroundStyle(gift.member_count > 0 ? Color.green.opacity(0.85) : TribeTheme.textTertiary)

                HStack {
                    Text("\(Config.baseURL.absoluteString)/g/\(gift.short_code)")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.green.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)

                    Spacer(minLength: 8)

                    Button {
                        let url = "\(Config.baseURL.absoluteString)/g/\(gift.short_code)"
                        UIPasteboard.general.string = url
                        toast.show("Link copied")
                    } label: {
                        Image(systemName: "doc.on.doc")
                            .foregroundStyle(Color.green.opacity(0.85))
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer()

            Button {
                if let u = URL(string: gift.file_url) {
                    UIApplication.shared.open(u)
                }
            } label: {
                Image(systemName: "arrow.down.circle")
                    .foregroundStyle(TribeTheme.textTertiary)
            }
            .buttonStyle(.plain)

            Button(role: .destructive) {
                onDelete()
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(Color.red.opacity(0.85))
            }
            .buttonStyle(.plain)
        }
        .tribeCard()
    }
}
