import SwiftUI

struct GiftsView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "gift")
                    .font(.system(size: 40, weight: .regular))
                    .foregroundStyle(.secondary)

                Text("Gifts")
                    .font(.title2.weight(.semibold))

                Text("Next: mirror the web Gifts section.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiColor: .systemBackground))
            .navigationTitle("Gifts")
        }
    }
}
