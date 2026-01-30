import SwiftUI

struct SplashView: View {
    @State private var animate = false

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack {
                Image("TribeLogo")
                    .resizable()
                    .renderingMode(.template)
                    .foregroundStyle(TribeTheme.textPrimary)
                    .scaledToFit()
                    .frame(height: 34)
                    .scaleEffect(animate ? 1.0 : 0.92)
                    .opacity(animate ? 1.0 : 0.6)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // subtle glow
            Circle()
                .fill(TribeTheme.textPrimary.opacity(0.12))
                .frame(width: 180, height: 180)
                .blur(radius: 22)
                .scaleEffect(animate ? 1.0 : 0.7)
                .opacity(animate ? 1.0 : 0.0)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                animate = true
            }
        }
    }
}
