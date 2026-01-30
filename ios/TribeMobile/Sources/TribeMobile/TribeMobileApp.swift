import SwiftUI

@main
struct TribeMobileApp: App {
    @StateObject private var session = SessionStore()
    @StateObject private var toast = ToastCenter()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)
                .environmentObject(toast)
                .withToastOverlay()
        }
    }
}
