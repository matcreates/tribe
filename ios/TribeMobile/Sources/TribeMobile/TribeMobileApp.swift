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
            // Show splash for a brief fixed duration so it feels intentional,
            // then reveal the app. Individual views handle their own data loading.
            try? await Task.sleep(nanoseconds: 800_000_000)
            withAnimation(.easeOut(duration: 0.25)) {
                showSplash = false
            }
        }
    }
}
