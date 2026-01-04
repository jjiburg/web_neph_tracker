import SwiftUI

enum DesignSystem {
    static let accent = Color(red: 0.2, green: 0.85, blue: 0.95) // More "Cyan/Water"
    static let accentSecondary = Color(red: 0.45, green: 0.35, blue: 0.95) // Purple/Deep
    static let backgroundTop = Color(red: 0.05, green: 0.05, blue: 0.08)
    static let backgroundBottom = Color(red: 0.10, green: 0.12, blue: 0.18)
    
    static let cornerRadius: CGFloat = 32
    static let cardPadding: CGFloat = 24
    
    // Typography
    static func font(_ style: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .system(style, design: .rounded).weight(weight)
    }
}

enum Units {
    static let mlPerOz: Double = 29.5735

    static func ozToMl(_ oz: Double) -> Double {
        oz * mlPerOz
    }

    static func mlToOz(_ ml: Double) -> Double {
        ml / mlPerOz
    }

    static func formatOz(_ oz: Double) -> String {
        "\(Int(oz.rounded())) oz"
    }

    static func formatOz(fromMl ml: Double) -> String {
        formatOz(mlToOz(ml))
    }

    static func formatMl(_ ml: Double) -> String {
        "\(Int(ml.rounded())) ml"
    }
}

struct LiquidBackground: View {
    @State private var phase: CGFloat = 0
    
    var body: some View {
        ZStack {
            // Deep base
            LinearGradient(
                colors: [DesignSystem.backgroundTop, DesignSystem.backgroundBottom],
                startPoint: .top,
                endPoint: .bottom
            )
            
            // Animated Orbs
            TimelineView(.animation) { timeline in
                let time = timeline.date.timeIntervalSinceReferenceDate
                
                Canvas { context, size in
                    let w = size.width
                    let h = size.height
                    
                    // Orb 1 (Cyan)
                    let x1 = w * 0.5 + cos(time * 0.3) * w * 0.3
                    let y1 = h * 0.4 + sin(time * 0.4) * h * 0.2
                    var blob1 = Path()
                    blob1.addEllipse(in: CGRect(x: x1 - 150, y: y1 - 150, width: 300, height: 300))
                    context.addFilter(.blur(radius: 60))
                    context.fill(blob1, with: .color(DesignSystem.accent.opacity(0.3)))
                    
                    // Orb 2 (Purple)
                    let x2 = w * 0.2 + sin(time * 0.5) * w * 0.2
                    let y2 = h * 0.6 + cos(time * 0.2) * h * 0.3
                    var blob2 = Path()
                    blob2.addEllipse(in: CGRect(x: x2 - 180, y: y2 - 180, width: 360, height: 360))
                    context.addFilter(.blur(radius: 80))
                    context.fill(blob2, with: .color(DesignSystem.accentSecondary.opacity(0.25)))
                    
                    // Orb 3 (White highlighting)
                    let x3 = w * 0.8 + cos(time * 0.1) * w * 0.1
                    let y3 = h * 0.2 + sin(time * 0.15) * h * 0.1
                    var blob3 = Path()
                    blob3.addEllipse(in: CGRect(x: x3 - 100, y: y3 - 100, width: 200, height: 200))
                    context.addFilter(.blur(radius: 40))
                    context.fill(blob3, with: .color(Color.white.opacity(0.05)))
                }
            }
        }
        .ignoresSafeArea()
    }
}

struct GlassCard<Content: View>: View {
    private let content: Content
    private let padding: CGFloat
    
    init(padding: CGFloat = DesignSystem.cardPadding, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .background(.thinMaterial.opacity(0.8), in: RoundedRectangle(cornerRadius: DesignSystem.cornerRadius, style: .continuous))
            .background(
                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius, style: .continuous)
                    .fill(Color.white.opacity(0.03))
            )
            .overlay(
                RoundedRectangle(cornerRadius: DesignSystem.cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                .white.opacity(0.3),
                                .white.opacity(0.05),
                                .white.opacity(0.02),
                                .white.opacity(0.1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.2), radius: 20, x: 0, y: 10)
    }
}

struct ScreenHeader: View {
    let title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(DesignSystem.font(.largeTitle, weight: .black))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.white, .white.opacity(0.8)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            
            if let subtitle {
                Text(subtitle)
                    .font(DesignSystem.font(.body, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.top, 20)
        .padding(.horizontal, 4)
    }
}

struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0

    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

struct LiquidButtonStyle: ButtonStyle {
    var color: Color = DesignSystem.accent
    var size: ControlSize = .regular
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DesignSystem.font(size == .large ? .title3 : .headline, weight: .bold))
            .foregroundStyle(.white)
            .padding(.vertical, size == .large ? 18 : 14)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity)
            .background(
                ZStack {
                    // Base fill
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(color.opacity(0.2))
                    
                    // Glossy Gradient
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .fill(
                            LinearGradient(
                                colors: [color.opacity(0.6), color.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                    
                    // Inner Highlight
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [.white.opacity(0.5), .white.opacity(0.1)],
                                startPoint: .top,
                                endPoint: .bottom
                            ),
                            lineWidth: 1
                        )
                }
            )
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.spring(response: 0.3, dampingFraction: 0.6), value: configuration.isPressed)
            .shadow(color: color.opacity(configuration.isPressed ? 0.2 : 0.4), radius: 15, x: 0, y: 10)
    }
}

struct GlassChipStyle: ButtonStyle {
    var active: Bool = false
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(DesignSystem.font(.subheadline, weight: .semibold))
            .foregroundStyle(active ? .white : .primary)
            .padding(.vertical, 10)
            .padding(.horizontal, 16)
            .background(
                Capsule()
                    .fill(active ? DesignSystem.accent.opacity(0.3) : Color.white.opacity(0.05))
            )
            .overlay(
                Capsule()
                    .strokeBorder(
                        active ? DesignSystem.accent.opacity(0.6) : Color.white.opacity(0.15),
                        lineWidth: 1
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.95 : 1)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// Reusable components
struct ChipLabel: View {
    let text: String
    
    var body: some View {
        Text(text)
            .lineLimit(1)
            .minimumScaleFactor(0.85)
    }
}
