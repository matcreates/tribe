import SwiftUI

struct WriteView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "square.and.pencil")
                    .font(.system(size: 40, weight: .regular))
                    .foregroundStyle(.secondary)

                Text("Write")
                    .font(.title2.weight(.semibold))

                Text("Compose, schedule, and send emails from mobile.\nNext: match the web /new-email experience.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiColor: .systemBackground))
            .navigationTitle("Write")
        }
    }
}
