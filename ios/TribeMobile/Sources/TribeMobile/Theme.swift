import SwiftUI

/// Tribe design system – black & white only, stock-iOS feel.
enum TribeTheme {
    // MARK: - Colors (pure black/white with opacity)

    static let bg = Color(uiColor: .systemBackground)
    static let bgElevated = Color(uiColor: .secondarySystemBackground)
    static let cardBg = Color.primary.opacity(0.04)
    static let stroke = Color.primary.opacity(0.08)
    static let divider = Color.primary.opacity(0.06)

    static let textPrimary = Color.primary
    static let textSecondary = Color.primary.opacity(0.50)
    static let textTertiary = Color.primary.opacity(0.30)

    /// Sent-message bubble (medium grey – darker in light mode)
    static let sentBubble = Color(uiColor: .systemGray4)
    static let sentBubbleText = Color.primary

    /// Received-message bubble
    static let receivedBubble = Color.primary.opacity(0.07)
    static let receivedBubbleText = Color.primary

    /// Light card/field background – transparent with subtle tint + blur
    static let fieldBg = Color.black.opacity(0.05)
    static let fieldStroke = Color.clear

    /// Button tint that ensures proper contrast in both light and dark mode.
    /// `.borderedProminent` uses this as fill and auto-picks a contrasting label.
    static let buttonTint = Color(uiColor: UIColor { traits in
        traits.userInterfaceStyle == .dark ? .white : .black
    })

    // MARK: - Radius

    static let cardRadius: CGFloat = 16
    static let inputRadius: CGFloat = 22
    static let bubbleRadius: CGFloat = 20

    // MARK: - Spacing

    static let contentSpacing: CGFloat = 16

    // MARK: - Fonts

    /// Heritage Serif page title (PostScript name "AppleGaramond").
    static func pageTitle(size: CGFloat = 24) -> Font {
        .custom("AppleGaramond", size: size)
    }
}

// MARK: - View Modifiers

struct TribeCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous)
                        .fill(Color.black.opacity(0.05))
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: TribeTheme.cardRadius, style: .continuous))
    }
}

extension View {
    func tribeCard() -> some View { modifier(TribeCard()) }
}

/// Applies liquid glass (iOS 26+) or falls back to ultraThinMaterial + subtle tint.
struct LiquidGlassModifier<S: Shape>: ViewModifier {
    let shape: S

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .glassEffect(.clear.interactive(), in: AnyShape(shape))
        } else {
            content
                .background(
                    ZStack {
                        shape.fill(.ultraThinMaterial)
                        shape.fill(Color.black.opacity(0.05))
                    }
                )
                .clipShape(shape)
        }
    }
}

extension LiquidGlassModifier where S == Capsule {
    init() {
        self.shape = Capsule()
    }
}

extension View {
    func liquidGlass<S: Shape>(in shape: S) -> some View {
        modifier(LiquidGlassModifier(shape: shape))
    }
    func liquidGlass() -> some View {
        modifier(LiquidGlassModifier(shape: Capsule()))
    }
}

extension View {
    func pagePadding() -> some View {
        self.padding(.horizontal, 18)
            .padding(.top, 12)
            .padding(.bottom, 24)
    }
}
