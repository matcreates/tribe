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
            TribeTheme.bgElevated.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer(minLength: 0)

                VStack(spacing: 22) {
                    Image("TribeLogo")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundStyle(TribeTheme.textPrimary)
                        .scaledToFit()
                        .frame(height: 26)

                    VStack(spacing: 0) {
                        Text(isSignup ? "Create your account" : "Welcome back")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(TribeTheme.textPrimary)
                            .padding(.bottom, 18)

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
                                    .foregroundStyle(Color.red.opacity(0.85))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            Button {
                                Task { await submit() }
                            } label: {
                                HStack {
                                    Spacer()
                                    Text(isLoading ? (isSignup ? "CREATING..." : "SIGNING IN...") : (isSignup ? "CREATE ACCOUNT" : "SIGN IN"))
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(2)
                                        .foregroundStyle(TribeTheme.textPrimary)
                                        .padding(.vertical, 14)
                                    Spacer()
                                }
                                .background(TribeTheme.textPrimary.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .disabled(isLoading || !canSubmit)
                            .opacity(isLoading ? 0.7 : 1)

                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isSignup.toggle()
                                    error = nil
                                }
                            } label: {
                                Text(isSignup ? "Already have an account? Sign in" : "Don’t have an account? Create one")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(TribeTheme.textSecondary)
                            }
                            .buttonStyle(.plain)
                            .padding(.top, 4)
                        }
                    }
                    .padding(24)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(TribeTheme.stroke)
                    )
                    .background(TribeTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
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
                .foregroundStyle(TribeTheme.textSecondary)

            content()
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textPrimary)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(TribeTheme.textPrimary.opacity(0.06))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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

