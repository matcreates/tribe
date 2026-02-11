import SwiftUI

enum SettingsTab: String, CaseIterable {
    case members = "Members"
    case account = "Your account"
    case joinPage = "Join page"
    case gifts = "Gifts"
}

struct TribeSettingsOverlay: View {
    var dismiss: () -> Void
    var memberCount: Int

    @EnvironmentObject var session: SessionStore
    @State private var selectedTab: SettingsTab = .members
    @State private var dragOffset: CGFloat = 0
    @State private var resolvedMemberCount: Int?

    /// The count to display – prefer the freshly loaded value from the API.
    private var displayMemberCount: Int { resolvedMemberCount ?? memberCount }

    var body: some View {
        ZStack {
            // Translucent blur background (liquid glass)
            Color.clear
                .background(.ultraThinMaterial)
                .ignoresSafeArea()
                .onTapGesture { dismiss() }

            VStack(spacing: 0) {
                // Drag indicator
                dragHandle
                    .padding(.top, 12)

                overlayHeader
                tabBar
                    .padding(.top, 10)
                    .padding(.bottom, 8)

                // Swipeable tab content
                TabView(selection: $selectedTab) {
                    SubscribersView(embedded: true)
                        .tag(SettingsTab.members)

                    SettingsView(embedded: true)
                        .tag(SettingsTab.account)

                    JoinPageView(embedded: true)
                        .tag(SettingsTab.joinPage)

                    GiftsView(embedded: true)
                        .tag(SettingsTab.gifts)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.spring(response: 0.35, dampingFraction: 0.82), value: selectedTab)
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .task { await loadVerifiedCount() }
        .offset(y: dragOffset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    if value.translation.height > 0 {
                        dragOffset = value.translation.height
                    }
                }
                .onEnded { value in
                    if value.translation.height > 120 || value.predictedEndTranslation.height > 300 {
                        dismiss()
                    } else {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                            dragOffset = 0
                        }
                    }
                }
        )
    }

    // MARK: - Drag Handle

    private var dragHandle: some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(.primary.opacity(0.15))
            .frame(width: 36, height: 5)
    }

    // MARK: - Header

    private var overlayHeader: some View {
        ZStack(alignment: .topTrailing) {
            // Centered sphere + member count
            VStack(spacing: 10) {
                TribeSphereView(memberCount: displayMemberCount)
                    .frame(height: 200)

                Text("Your Tribe is made of \(displayMemberCount) members")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.primary.opacity(0.4))
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 12)

            // X button in top-right
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color(uiColor: .systemGray))
                    .frame(width: 32, height: 32)
                    .background(Color(uiColor: .systemGray5))
                    .clipShape(Circle())
            }
            .padding(.trailing, 18)
            .padding(.top, 8)
        }
    }

    // MARK: - Tab Bar (light background for selected)

    private var tabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(SettingsTab.allCases, id: \.self) { tab in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedTab = tab
                        }
                    } label: {
                        Text(tab.rawValue)
                            .font(.system(size: 14, weight: selectedTab == tab ? .semibold : .regular))
                            .foregroundStyle(selectedTab == tab ? Color.primary : Color.primary.opacity(0.35))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(
                                Capsule()
                                    .fill(selectedTab == tab ? Color(uiColor: .systemBackground).opacity(0.8) : Color.clear)
                            )
                            .overlay(
                                Capsule()
                                    .stroke(Color.primary.opacity(selectedTab == tab ? 0.10 : 0), lineWidth: 0.5)
                            )
                    }
                }
            }
            .padding(.horizontal, 18)
        }
    }

    // MARK: - Load real verified count

    private func loadVerifiedCount() async {
        guard let token = session.token else { return }
        // Use the same source as the Members tab (subscribers endpoint)
        if let resp = try? await APIClient.shared.subscribersPaged(
            token: token, page: 1, pageSize: 1,
            filter: "verified", sort: "newest", search: ""
        ) {
            resolvedMemberCount = resp.totalVerified
        }
    }
}
