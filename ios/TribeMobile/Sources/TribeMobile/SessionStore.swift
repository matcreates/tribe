import Foundation
import SwiftUI

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var token: String? = Keychain.get("tribe.mobile.token")

    var isAuthenticated: Bool { token != nil }

    func setToken(_ token: String) {
        self.token = token
        Keychain.set(token, for: "tribe.mobile.token")
    }

    func logout() {
        token = nil
        Keychain.delete("tribe.mobile.token")
    }
}
