import SwiftUI

struct SubscribersView: View {
    @EnvironmentObject var session: SessionStore
    @State private var subscribers: [Subscriber] = []
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if !subscribers.isEmpty {
                    List(subscribers) { s in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(s.email).font(.headline)
                            HStack {
                                if let name = s.name, !name.isEmpty {
                                    Text(name)
                                }
                                Text(s.verified ? "Verified" : "Unverified")
                                    .foregroundStyle(s.verified ? .green : .secondary)
                            }
                            .font(.caption)
                        }
                    }
                } else if let error {
                    ContentUnavailableView("Couldn’t load subscribers", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ProgressView("Loading…")
                }
            }
            .navigationTitle("Subscribers")
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            let resp = try await APIClient.shared.subscribers(token: token)
            subscribers = resp.subscribers
        } catch {
            self.error = error.localizedDescription
        }
    }
}
