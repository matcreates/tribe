import SwiftUI

// Uses semantic system colors so the UI follows iOS Light/Dark mode automatically.
enum TribeTheme {
    static let bg = Color(uiColor: .systemBackground)
    static let bgElevated = Color(uiColor: .secondarySystemBackground)

    static let cardBg = Color(uiColor: .secondarySystemBackground)
    static let stroke = Color.primary.opacity(0.10)

    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let textTertiary = Color.secondary.opacity(0.75)

    static let accentGold = Color(red: 232/255, green: 184/255, blue: 74/255)
    static let accentGreen = Color(red: 52/255, green: 211/255, blue: 153/255)
}

struct TribeCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(TribeTheme.cardBg)
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
