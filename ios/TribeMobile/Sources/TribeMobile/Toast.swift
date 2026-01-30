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

struct ToastOverlay: View {
    @EnvironmentObject var toast: ToastCenter

    var body: some View {
        Group {
            if let message = toast.message {
                VStack {
                    Spacer()
                    Text(message)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.black.opacity(0.85))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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
