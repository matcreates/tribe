import SwiftUI

// Uses semantic system colors so the UI follows iOS Light/Dark mode automatically.
enum TribeTheme {
    /// Warm off-white in light mode (matches web landing page), system dark in dark mode.
    static let bg = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? .systemBackground
            : UIColor(red: 252/255, green: 250/255, blue: 247/255, alpha: 1)
    })
    static let bgElevated = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? .secondarySystemBackground
            : UIColor(red: 248/255, green: 246/255, blue: 243/255, alpha: 1)
    })

    static let cardBg = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? .secondarySystemBackground
            : UIColor(red: 255/255, green: 253/255, blue: 250/255, alpha: 1)
    })
    static let stroke = Color.primary.opacity(0.10)

    static let textPrimary = Color.primary
    static let textSecondary = Color.secondary
    static let textTertiary = Color.secondary.opacity(0.75)

    static let accentGold = Color(red: 232/255, green: 184/255, blue: 74/255)
    static let accentGreen = Color(red: 52/255, green: 211/255, blue: 153/255)

    /// Adaptive overlay color that works in both light and dark mode.
    /// In dark mode this is white-ish, in light mode this is black-ish.
    static let overlaySubtle = Color.primary.opacity(0.06)
    static let overlayLight = Color.primary.opacity(0.04)
    static let overlayDivider = Color.primary.opacity(0.08)

    // MARK: - Fonts

    /// Heritage Serif page title font (matches web branding).
    /// The font file is HeritageSerif.ttf but its internal PostScript name is "AppleGaramond".
    static func pageTitle(size: CGFloat = 26) -> Font {
        .custom("AppleGaramond", size: size)
    }

    /// Standard spacing constants for consistent layout.
    static let contentSpacing: CGFloat = 16
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


extension View {
    func pagePadding() -> some View {
        self.padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 32)
    }
}

/// Reusable settings gear toolbar item (NavigationLink to SettingsView).
struct SettingsToolbarItem: ToolbarContent {
    var body: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            NavigationLink {
                SettingsView()
            } label: {
                Image(systemName: "gearshape")
                    .foregroundStyle(TribeTheme.textSecondary)
            }
            .accessibilityLabel("Settings")
        }
    }
}
