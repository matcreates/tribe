import SwiftUI

enum SubscriberFilterMode: String, CaseIterable {
    case verified = "Verified"
    case unverified = "Unverified"
    case all = "All"
}

struct SubscribersView: View {
    @EnvironmentObject var session: SessionStore

    @State private var allSubscribers: [Subscriber] = []
    @State private var error: String?

    @State private var filter: SubscriberFilterMode = .verified
    @State private var search: String = ""

    var body: some View {
        NavigationStack {
            ZStack {
                TribeTheme.bg.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        header

                        Picker("Filter", selection: $filter) {
                            ForEach(SubscriberFilterMode.allCases, id: \ .self) { f in
                                Text(f.rawValue).tag(f)
                            }
                        }
                        .pickerStyle(.segmented)
                        .colorScheme(.dark)

                        searchField

                        if !filtered.isEmpty {
                            VStack(spacing: 10) {
                                ForEach(filtered) { s in
                                    SubscriberRow(subscriber: s)
                                }
                            }
                        } else if let error {
                            Text("Couldn’t load subscribers")
                                .font(.headline)
                                .foregroundStyle(TribeTheme.textPrimary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(error)
                                .font(.subheadline)
                                .foregroundStyle(TribeTheme.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        } else {
                            if allSubscribers.isEmpty {
                                Text("No subscribers")
                                    .font(.system(size: 13))
                                    .foregroundStyle(TribeTheme.textSecondary)
                                    .padding(.top, 12)
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
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Your tribe")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(TribeTheme.textPrimary)

            Text("Subscribers")
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)
        }
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(TribeTheme.textTertiary)

            TextField("Search email", text: $search)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .foregroundStyle(TribeTheme.textPrimary)

            if !search.isEmpty {
                Button {
                    search = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(TribeTheme.textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(TribeTheme.cardBg)
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(TribeTheme.stroke)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var filtered: [Subscriber] {
        var list = allSubscribers

        switch filter {
        case .verified:
            list = list.filter { $0.verified }
        case .unverified:
            list = list.filter { !$0.verified }
        case .all:
            break
        }

        let q = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty {
            list = list.filter { $0.email.lowercased().contains(q) || ($0.name?.lowercased().contains(q) ?? false) }
        }

        return list
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.subscribers(token: token)
            allSubscribers = resp.subscribers
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct SubscriberRow: View {
    let subscriber: Subscriber

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(subscriber.verified ? TribeTheme.accentGreen.opacity(0.9) : TribeTheme.textTertiary.opacity(0.5))
                .frame(width: 8, height: 8)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 4) {
                Text(subscriber.email)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(TribeTheme.textPrimary)

                HStack(spacing: 8) {
                    if let name = subscriber.name, !name.isEmpty {
                        Text(name)
                            .foregroundStyle(TribeTheme.textSecondary)
                    }

                    Text(subscriber.verified ? "Verified" : "Unverified")
                        .foregroundStyle(subscriber.verified ? TribeTheme.accentGreen.opacity(0.9) : TribeTheme.textTertiary)
                }
                .font(.system(size: 12))
            }

            Spacer()

            Button {
                UIPasteboard.general.string = subscriber.email
            } label: {
                Image(systemName: "doc.on.doc")
                    .foregroundStyle(TribeTheme.textTertiary)
            }
            .buttonStyle(.plain)
        }
        .tribeCard()
    }
}
