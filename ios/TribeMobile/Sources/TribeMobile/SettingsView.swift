import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        NavigationStack {
            List {
                Button("Log out", role: .destructive) {
                    session.logout()
                }
            }
            .navigationTitle("Settings")
        }
    }
}
