import SwiftUI

@main
struct TribeMobileApp: App {
    @StateObject private var session = SessionStore()
    @StateObject private var toast = ToastCenter()

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(session)
                .environmentObject(toast)
                .environment(\.toastCenter, toast)
                .withToastOverlay()
        }
    }
}


private struct AppRootView: View {
    @EnvironmentObject var session: SessionStore

    @State private var showSplash = true

    var body: some View {
        ZStack {
            RootView()
                .opacity(showSplash ? 0.0 : 1.0)

            if showSplash {
                SplashView()
                    .transition(.opacity)
            }
        }
        .task {
            // Brief splash while app loads; also gives time for initial network calls to start.
            let start = Date()
            if session.isAuthenticated {
                async let dash = APIClient.shared.dashboard(token: session.token!, period: .sevenDays)
                async let settings = APIClient.shared.settings(token: session.token!)
                _ = try? await (dash, settings)
            }
            // minimum duration so it feels intentional
            let elapsed = Date().timeIntervalSince(start)
            if elapsed < 1.0 {
                try? await Task.sleep(nanoseconds: UInt64((1.0 - elapsed) * 1_000_000_000))
            }
            withAnimation(.easeOut(duration: 0.25)) {
                showSplash = false
            }
        }
    }
}
