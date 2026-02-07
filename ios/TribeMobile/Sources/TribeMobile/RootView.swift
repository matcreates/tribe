import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: SessionStore

    var body: some View {
        Group {
            if session.isAuthenticated {
                TabView {
                    DashboardView()
                        .tabItem { Label("Dashboard", systemImage: "chart.bar" ) }

                    WriteView()
                        .tabItem { Label("Write", systemImage: "square.and.pencil" ) }

                    SubscribersView()
                        .tabItem { Label("Your tribe", systemImage: "person.2" ) }

                    GiftsView()
                        .tabItem { Label("Gifts", systemImage: "gift" ) }

                    JoinPageView()
                        .tabItem { Label("Join", systemImage: "person.badge.plus" ) }
                }
                .tint(Color(uiColor: .label))
            } else {
                LoginView()
            }
        }
    }
}
