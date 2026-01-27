import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var session: SessionStore
    @State private var data: DashboardResponse?
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Group {
                if let data {
                    List {
                        Section("Subscribers") {
                            LabeledContent("Total", value: String(data.totalSubscribers))
                            LabeledContent("Verified", value: String(data.verifiedSubscribers))
                        }
                        Section("Email") {
                            LabeledContent("Total emails sent", value: String(data.totalEmailsSent))
                            LabeledContent("Last 7d opens", value: String(data.last7d.opens))
                            LabeledContent("Last 7d sent", value: String(data.last7d.sent))
                        }
                    }
                } else if let error {
                    ContentUnavailableView("Couldn’t load dashboard", systemImage: "exclamationmark.triangle", description: Text(error))
                } else {
                    ProgressView("Loading…")
                }
            }
            .navigationTitle("Dashboard")
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        guard let token = session.token else { return }
        do {
            error = nil
            data = try await APIClient.shared.dashboard(token: token)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
