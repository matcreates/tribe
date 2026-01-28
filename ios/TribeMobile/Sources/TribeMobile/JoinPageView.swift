import SwiftUI

struct JoinPageView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 40, weight: .regular))
                    .foregroundStyle(.secondary)

                Text("Join page")
                    .font(.title2.weight(.semibold))

                Text("Next: mirror the web Join page editor/preview.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiColor: .systemBackground))
            .navigationTitle("Join page")
        }
    }
}
