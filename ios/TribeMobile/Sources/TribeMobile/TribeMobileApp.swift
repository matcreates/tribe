import SwiftUI
import UserNotifications

@main
struct TribeMobileApp: App {
    @StateObject private var session = SessionStore()
    @StateObject private var toast = ToastCenter()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        NotificationManager.shared.registerBackgroundTask()
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environmentObject(session)
                .environmentObject(toast)
                .environment(\.toastCenter, toast)
                .withToastOverlay()
                .onAppear {
                    NotificationManager.shared.requestPermission()
                }
                .onChange(of: session.token) { _, newToken in
                    if let token = newToken {
                        NotificationManager.shared.startPolling(token: token)
                    } else {
                        NotificationManager.shared.stopPolling()
                    }
                }
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                // Schedule background fetch when app goes to background
                NotificationManager.shared.scheduleBackgroundFetch()
            }
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

            // Start notification polling if already logged in
            if let token = session.token {
                NotificationManager.shared.startPolling(token: token)
            }
        }
    }
}
