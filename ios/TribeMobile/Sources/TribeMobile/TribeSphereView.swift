import SwiftUI

/// A 3-D rotating sphere of dots that represents the number of people in a tribe.
/// Faithfully ported from the web `TribeVisualization` component (Canvas 2D).
struct TribeSphereView: View {
    let memberCount: Int

    // MARK: - State

    @State private var particles: [Particle] = []
    @State private var rotationX: Double = 0
    @State private var rotationY: Double = 0
    @State private var targetRotX: Double = 0
    @State private var targetRotY: Double = 0
    @State private var displayLink: Timer?
    @State private var dragOffset: CGSize = .zero
    @State private var isDragging = false

    @Environment(\.colorScheme) private var colorScheme

    private var isLight: Bool { colorScheme == .light }

    // MARK: - Body

    var body: some View {
        Canvas { context, size in
            draw(context: context, size: size)
        }
        .frame(height: 260)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    isDragging = true
                    let cx = size220 / 2
                    let cy: CGFloat = 110
                    targetRotY = Double(value.location.x - cx) * 0.006
                    targetRotX = Double(value.location.y - cy) * 0.004
                }
                .onEnded { _ in
                    isDragging = false
                }
        )
        .onAppear {
            particles = Self.generateParticles(count: memberCount)
            startAnimation()
        }
        .onDisappear { stopAnimation() }
        .onChange(of: memberCount) { _, newCount in
            particles = Self.generateParticles(count: newCount)
        }
    }

    // Fallback width (Canvas provides size inside draw)
    private let size220: CGFloat = 400

    // MARK: - Particle generation (golden spiral on sphere)

    private struct Particle {
        var baseX: Double
        var baseY: Double
        var baseZ: Double
        var size: Double
        var opacity: Double
    }

    private static func generateParticles(count: Int) -> [Particle] {
        let n = min(max(count, 20), 400)
        var out: [Particle] = []
        out.reserveCapacity(n)

        for i in 0..<n {
            let phi = acos(1 - 2 * (Double(i) + 0.5) / Double(n))
            let theta = Double.pi * (1 + sqrt(5)) * Double(i)
            let radius = 0.7 + Double.random(in: 0...0.3)

            let x = radius * sin(phi) * cos(theta)
            let y = radius * sin(phi) * sin(theta)
            let z = radius * cos(phi)

            out.append(Particle(
                baseX: x, baseY: y, baseZ: z,
                size: 1 + Double.random(in: 0...2),
                opacity: 0.3 + Double.random(in: 0...0.7)
            ))
        }
        return out
    }

    // MARK: - Rotation helpers

    private func rotatePoint(x: Double, y: Double, z: Double, rX: Double, rY: Double) -> (x: Double, y: Double, z: Double) {
        // Y-axis rotation
        let nx = x * cos(rY) - z * sin(rY)
        var nz = x * sin(rY) + z * cos(rY)
        // X-axis rotation
        let ny = y * cos(rX) - nz * sin(rX)
        nz = y * sin(rX) + nz * cos(rX)
        return (nx, ny, nz)
    }

    // MARK: - Drawing

    private func draw(context: GraphicsContext, size: CGSize) {
        let cx = size.width / 2
        let cy = size.height / 2
        let scale = min(size.width, size.height) * 0.40

        let time = Date.now.timeIntervalSinceReferenceDate

        // Build transformed particles sorted back-to-front
        struct Transformed {
            var screenX: CGFloat
            var screenY: CGFloat
            var depth: Double
            var size: Double
            var opacity: Double
        }

        var sorted: [Transformed] = []
        sorted.reserveCapacity(particles.count)

        for (i, p) in particles.enumerated() {
            let floatX = p.baseX + sin(time + Double(i) * 0.1) * 0.02
            let floatY = p.baseY + cos(time * 0.8 + Double(i) * 0.1) * 0.02
            let floatZ = p.baseZ + sin(time * 0.6 + Double(i) * 0.1) * 0.02

            let r = rotatePoint(x: floatX, y: floatY, z: floatZ, rX: rotationX, rY: rotationY)
            sorted.append(Transformed(
                screenX: cx + CGFloat(r.x) * scale,
                screenY: cy + CGFloat(r.y) * scale,
                depth: r.z,
                size: p.size,
                opacity: p.opacity
            ))
        }
        sorted.sort { $0.depth < $1.depth }

        // Draw particles
        let baseColor: Color = isLight ? .black : .white
        for p in sorted {
            let depthFactor = (p.depth + 1) / 2
            let sz = p.size * (0.5 + depthFactor * 0.8)
            let op = p.opacity * (0.2 + depthFactor * 0.8)

            let rect = CGRect(x: p.screenX - CGFloat(sz), y: p.screenY - CGFloat(sz),
                              width: CGFloat(sz * 2), height: CGFloat(sz * 2))
            context.fill(Path(ellipseIn: rect), with: .color(baseColor.opacity(op)))
        }

        // Central "you" node
        let youR = rotatePoint(x: 0, y: 0, z: 0, rX: rotationX, rY: rotationY)
        let youX = cx + CGFloat(youR.x) * scale
        let youY = cy + CGFloat(youR.y) * scale
        let youDepth = (youR.z + 1) / 2

        // Glow
        let glowRadius: CGFloat = 20
        let glowRect = CGRect(x: youX - glowRadius, y: youY - glowRadius,
                              width: glowRadius * 2, height: glowRadius * 2)
        context.fill(
            Path(ellipseIn: glowRect),
            with: .color(baseColor.opacity(0.15))
        )

        // Core node
        let nodeSize: CGFloat = 6
        let nodeRect = CGRect(x: youX - nodeSize, y: youY - nodeSize,
                              width: nodeSize * 2, height: nodeSize * 2)
        context.fill(
            Path(ellipseIn: nodeRect),
            with: .color(baseColor.opacity(0.6 + youDepth * 0.4))
        )

        // Arrow + "you" label
        let arrowStartX = youX + 25
        let arrowStartY = youY - 15
        let arrowEndX = youX + 10
        let arrowEndY = youY - 5

        var arrowPath = Path()
        arrowPath.move(to: CGPoint(x: arrowStartX, y: arrowStartY))
        arrowPath.addLine(to: CGPoint(x: arrowEndX, y: arrowEndY))
        context.stroke(arrowPath, with: .color(baseColor.opacity(0.5)), lineWidth: 1)

        // Arrowhead
        let angle = atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX)
        var headPath = Path()
        headPath.move(to: CGPoint(x: arrowEndX, y: arrowEndY))
        headPath.addLine(to: CGPoint(
            x: arrowEndX - 5 * cos(angle - .pi / 6),
            y: arrowEndY - 5 * sin(angle - .pi / 6)
        ))
        headPath.addLine(to: CGPoint(
            x: arrowEndX - 5 * cos(angle + .pi / 6),
            y: arrowEndY - 5 * sin(angle + .pi / 6)
        ))
        headPath.closeSubpath()
        context.fill(headPath, with: .color(baseColor.opacity(0.5)))

        // "you" text
        context.draw(
            Text("you")
                .font(.system(size: 11))
                .foregroundColor(baseColor.opacity(0.5)),
            at: CGPoint(x: arrowStartX + 14, y: arrowStartY + 2)
        )
    }

    // MARK: - Animation loop

    private func startAnimation() {
        displayLink = Timer.scheduledTimer(withTimeInterval: 1.0 / 60.0, repeats: true) { _ in
            tick()
        }
    }

    private func stopAnimation() {
        displayLink?.invalidate()
        displayLink = nil
    }

    private func tick() {
        if !isDragging {
            let time = Date.now.timeIntervalSinceReferenceDate * 0.2
            targetRotY = sin(time) * 0.5
            targetRotX = cos(time * 0.7) * 0.2
        }
        // Smooth easing
        rotationX += (targetRotX - rotationX) * 0.05
        rotationY += (targetRotY - rotationY) * 0.05
    }
}
