import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Login") {
                    TextField("Email", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()

                    SecureField("Password", text: $password)
                }

                if let error {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }

                Button(isLoading ? "Signing in…" : "Sign in") {
                    Task { await signIn() }
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)
            }
            .navigationTitle("Tribe")
        }
    }

    private func signIn() async {
        isLoading = true
        error = nil
        do {
            let resp = try await APIClient.shared.login(email: email, password: password)
            session.setToken(resp.token)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
