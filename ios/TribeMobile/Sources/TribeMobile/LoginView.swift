import SwiftUI

struct LoginView: View {
    @EnvironmentObject var session: SessionStore

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
                    TribeLogoView()
                        .frame(height: 26)
                        .foregroundStyle(TribeTheme.textPrimary)

                    VStack(spacing: 0) {
                        Text("Welcome back")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundStyle(TribeTheme.textPrimary)
                            .padding(.bottom, 18)

                        VStack(spacing: 14) {
                            field(label: "Email") {
                                TextField("", text: $email)
                                    .textInputAutocapitalization(.never)
                                    .keyboardType(.emailAddress)
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
                                Task { await signIn() }
                            } label: {
                                HStack {
                                    Spacer()
                                    Text(isLoading ? "SIGNING IN..." : "SIGN IN")
                                        .font(.system(size: 11, weight: .semibold))
                                        .tracking(2)
                                        .foregroundStyle(Color.black)
                                        .padding(.vertical, 14)
                                    Spacer()
                                }
                                .background(Color.white.opacity(0.9))
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .disabled(isLoading || email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || password.isEmpty)
                            .opacity(isLoading ? 0.7 : 1)
                        }
                    }
                    .padding(24)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(TribeTheme.stroke)
                    )
                    .background(Color.white.opacity(0.03))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .frame(maxWidth: 360)
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 0)
            }
        }
    }

    @ViewBuilder
    private func field(label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.system(size: 12))
                .foregroundStyle(TribeTheme.textSecondary)

            content()
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textPrimary.opacity(0.8))
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private func signIn() async {
        isLoading = true
        error = nil
        do {
            let resp = try await APIClient.shared.login(email: email, password: password)
            session.setToken(resp.token)
        } catch {
            self.error = "Invalid email or password"
        }
        isLoading = false
    }
}

private struct TribeLogoView: View {
    var body: some View {
        TribeLogo()
            .aspectRatio(contentMode: .fit)
    }
}

private struct TribeLogo: Shape {
    func path(in rect: CGRect) -> Path {
        // Minimal logo: use a simple text-like mark for now.
        // Keeping this lightweight; we can swap to exact vector later.
        var p = Path()
        p.addRoundedRect(in: rect, cornerSize: CGSize(width: rect.height * 0.2, height: rect.height * 0.2))
        return p
    }
}
