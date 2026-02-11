import SwiftUI
import UniformTypeIdentifiers

struct GiftsView: View {
    var embedded: Bool = false

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
        if embedded {
            ZStack(alignment: .bottomTrailing) {
                mainContent
                fabButton
            }
            .fileImporter(isPresented: $showingPicker, allowedContentTypes: [.data], allowsMultipleSelection: false) { handlePick($0) }
            .task { await load() }
        } else {
            NavigationStack {
                ZStack(alignment: .bottomTrailing) {
                    mainContent
                    fabButton
                }
                .navigationTitle("")
                .navigationBarTitleDisplayMode(.inline)
            }
            .fileImporter(isPresented: $showingPicker, allowedContentTypes: [.data], allowsMultipleSelection: false) { handlePick($0) }
            .task { await load() }
        }
    }

    // MARK: - FAB (bottom-right)

    private var fabButton: some View {
        Button { showingPicker = true } label: {
            ZStack {
                if isUploading {
                    ProgressView()
                        .tint(Color(uiColor: .systemBackground))
                } else {
                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color(uiColor: .systemBackground))
                }
            }
            .frame(width: 54, height: 54)
            .background(Color.primary)
            .clipShape(Circle())
            .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
        }
        .disabled(isUploading || count >= maxGifts)
        .padding(.trailing, 20)
        .padding(.bottom, 20)
    }

    // MARK: - Main Content

    private var mainContent: some View {
        List {
            // Header section (title only when standalone)
            if !embedded {
                Section {
                    Text("Gifts")
                        .font(TribeTheme.pageTitle())
                        .foregroundStyle(.primary)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 8, leading: 18, bottom: 4, trailing: 18))
                }
            }

            if let error {
                Section {
                    Text(error)
                        .font(.system(size: 13))
                        .foregroundStyle(.primary.opacity(0.5))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            } else if gifts.isEmpty {
                Section {
                    Text("No gifts yet")
                        .font(.system(size: 14))
                        .foregroundStyle(.primary.opacity(0.3))
                        .padding(.top, 12)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            } else {
                // Gift rows with swipe-to-delete
                Section {
                    ForEach(gifts) { g in
                        GiftRow(gift: g, toast: toast)
                            .listRowInsets(EdgeInsets(top: 6, leading: 18, bottom: 6, trailing: 18))
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            let gift = gifts[index]
                            Task { await deleteGift(gift) }
                        }
                    }
                }
            }

            // Gift count at bottom right
            Section {
                HStack {
                    Spacer()
                    Text("\(count)/\(maxGifts) gifts uploaded")
                        .font(.system(size: 12))
                        .foregroundStyle(.primary.opacity(0.3))
                }
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 4, leading: 18, bottom: 0, trailing: 18))
            }

            // Spacer for FAB clearance
            Section {
                Color.clear.frame(height: 70)
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .refreshable { await load() }
    }

    private func handlePick(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            pickedURL = url
            Task { await uploadGift(url: url) }
        case .failure(let err):
            error = err.localizedDescription
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
    let toast: ToastCenter

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(gift.file_name)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                Spacer()

                Text("\(gift.member_count) joined")
                    .font(.system(size: 11))
                    .foregroundStyle(.primary.opacity(0.4))
            }

            HStack {
                Text("\(Config.baseURL.host ?? "madewithtribe.com")/g/\(gift.short_code)")
                    .font(.system(size: 12))
                    .foregroundStyle(.primary.opacity(0.4))
                    .lineLimit(1)

                Spacer(minLength: 8)

                Button {
                    let url = "\(Config.baseURL.absoluteString)/g/\(gift.short_code)"
                    UIPasteboard.general.string = url
                    toast.show("Link copied")
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(.system(size: 13))
                        .foregroundStyle(.primary.opacity(0.3))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(.primary.opacity(0.04))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
}
