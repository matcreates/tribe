import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        Group {
            if session.isAuthenticated {
                TabView {
                    DashboardView()
                        .tabItem { Label("Dashboard", systemImage: "chart.bar" ) }

                    SubscribersView()
                        .tabItem { Label("Subscribers", systemImage: "person.2" ) }

                    SettingsView()
                        .tabItem { Label("Settings", systemImage: "gear" ) }
                }
            } else {
                LoginView()
            }
        }
    }
}
