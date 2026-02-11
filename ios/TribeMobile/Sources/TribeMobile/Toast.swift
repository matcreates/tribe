import SwiftUI

final class ToastCenter: ObservableObject {
    @Published var message: String? = nil

    func show(_ msg: String) {
        Task { @MainActor in
            message = msg
            try? await Task.sleep(nanoseconds: 1_300_000_000)
            if message == msg {
                message = nil
            }
        }
    }
}

private struct ToastCenterKey: EnvironmentKey {
    static var defaultValue: ToastCenter = ToastCenter()
}

extension EnvironmentValues {
    var toastCenter: ToastCenter {
        get { self[ToastCenterKey.self] }
        set { self[ToastCenterKey.self] = newValue }
    }
}

struct ToastOverlay: View {
    @Environment(\.toastCenter) private var toast

    var body: some View {
        Group {
            if let message = toast.message {
                VStack {
                    Spacer()
                    Text(message)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color(uiColor: .systemBackground))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(.primary)
                        .clipShape(Capsule())
                        .padding(.bottom, 22)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.easeInOut(duration: 0.2), value: toast.message)
            }
        }
        .allowsHitTesting(false)
    }
}

extension View {
    func withToastOverlay() -> some View {
        overlay { ToastOverlay() }
    }
}
