import SwiftUI

enum TribeTheme {
    static let bg = Color(red: 12/255, green: 12/255, blue: 12/255)
    static let bgElevated = Color(red: 18/255, green: 18/255, blue: 18/255)
    static let stroke = Color.white.opacity(0.08)
    static let textPrimary = Color.white.opacity(0.90)
    static let textSecondary = Color.white.opacity(0.45)
    static let textTertiary = Color.white.opacity(0.30)
    static let accentGold = Color(red: 232/255, green: 184/255, blue: 74/255)
    static let accentGreen = Color(red: 52/255, green: 211/255, blue: 153/255)
}

struct TribeCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(Color.white.opacity(0.03))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(TribeTheme.stroke)
            )
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

extension View {
    func tribeCard() -> some View { modifier(TribeCard()) }
}
