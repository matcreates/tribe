import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        Group {
            if session.isAuthenticated {
                ConversationView()
            } else {
                LoginView()
            }
        }
    }
}
