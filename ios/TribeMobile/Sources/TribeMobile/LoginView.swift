import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore

    @State private var isSignup = false

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""

    @State private var isLoading = false
    @State private var error: String?

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer(minLength: 0)

                VStack(spacing: 24) {
                    // Logo
                    Image("TribeLogo")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundStyle(Color(uiColor: .systemBackground))
                        .scaledToFit()
                        .frame(width: 24, height: 24)
                        .padding(14)
                        .background(Color.primary)
                        .clipShape(Circle())

                    VStack(spacing: 0) {
                        Text(isSignup ? "Create your account" : "Welcome back")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(.primary)
                            .padding(.bottom, 20)

                        VStack(spacing: 14) {
                            if isSignup {
                                field(label: "Name") {
                                    TextField("", text: $name)
                                        .textInputAutocapitalization(.words)
                                }
                            }

                            field(label: "Email") {
                                TextField("", text: $email)
                                    .textInputAutocapitalization(.never)
                                    .keyboardType(.emailAddress)
                                    .textContentType(.username)
                                    .autocorrectionDisabled()
                            }

                            field(label: "Password") {
                                SecureField("", text: $password)
                            }

                            if let error {
                                Text(error)
                                    .font(.system(size: 12))
                                    .foregroundStyle(.primary.opacity(0.5))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            Button {
                                Task { await submit() }
                            } label: {
                                Text(isLoading ? (isSignup ? "Creating…" : "Signing in…") : (isSignup ? "Create account" : "Sign in"))
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(TribeTheme.buttonTint)
                            .controlSize(.large)
                            .disabled(isLoading || !canSubmit)
                            .opacity(isLoading ? 0.6 : 1)

                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isSignup.toggle()
                                    error = nil
                                }
                            } label: {
                                Text(isSignup ? "Already have an account? Sign in" : "Don't have an account? Create one")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.primary.opacity(0.4))
                            }
                            .buttonStyle(.plain)
                            .padding(.top, 4)
                        }
                    }
                    .padding(24)
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(.primary.opacity(0.06))
                    )
                    .frame(maxWidth: 360)
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 0)
            }
        }
    }

    private var canSubmit: Bool {
        if isSignup {
            return !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                && !password.isEmpty
        }
        return !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !password.isEmpty
    }

    @ViewBuilder
    private func field(label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(.primary.opacity(0.4))

            content()
                .font(.system(size: 14))
                .foregroundStyle(.primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(.primary.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
        }
    }

    private func submit() async {
        isLoading = true
        error = nil
        do {
            let resp: LoginResponse
            if isSignup {
                resp = try await APIClient.shared.signup(email: email, password: password, name: name)
            } else {
                resp = try await APIClient.shared.login(email: email, password: password)
            }
            session.setToken(resp.token)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
