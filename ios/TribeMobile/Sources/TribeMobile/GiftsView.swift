import SwiftUI

struct GiftsView: View {
    @EnvironmentObject var session: SessionStore

    @State private var gifts: [Gift] = []
    @State private var count: Int = 0
    @State private var maxGifts: Int = 5
    @State private var error: String?

    @State private var showingAdd = false

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
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
                                VStack(spacing: 10) {
                                    ForEach(gifts) { g in
                                        GiftRow(gift: g) {
                                            Task { await deleteGift(g) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAdd = true
                    } label: {
                        Image(systemName: "plus")
                            .foregroundStyle(TribeTheme.textSecondary)
                    }
                    .disabled(count >= maxGifts)
                    .accessibilityLabel("Add gift")
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddGiftSheet(maxGifts: maxGifts, count: count) { name, url, size in
                    Task { await createGift(name: name, url: url, size: size) }
                }
                .presentationDetents([.medium])
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Gifts")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)

            Text("\(count)/\(maxGifts) uploaded")
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)
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

    private func createGift(name: String, url: String, size: Int) async {
        guard let token = session.token else { return }
        do {
            try await APIClient.shared.createGift(token: token, fileName: name, fileUrl: url, fileSize: size)
            showingAdd = false
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

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white.opacity(0.06))
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

                Text("\(gift.member_count) members")
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textTertiary)

                Text("Code: \(gift.short_code)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundStyle(TribeTheme.textTertiary)
            }

            Spacer()

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

private struct AddGiftSheet: View {
    let maxGifts: Int
    let count: Int
    let onCreate: (String, String, Int) -> Void

    @Environment(\.dismiss) var dismiss

    @State private var name: String = ""
    @State private var url: String = ""
    @State private var size: String = "0"

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("New gift")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                Text("For now, paste a file URL (we’ll add native upload next).")
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textSecondary)

                field("File name", text: $name)
                field("File URL", text: $url)
                field("File size (bytes)", text: $size)

                HStack {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(TribeTheme.textSecondary)

                    Spacer()

                    Button("Create") {
                        onCreate(name, url, Int(size) ?? 0)
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .foregroundStyle(TribeTheme.textPrimary)
                }
                .padding(.top, 8)
            }
            .padding(18)
        }
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)

            TextField("", text: text)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textPrimary.opacity(0.85))
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}
