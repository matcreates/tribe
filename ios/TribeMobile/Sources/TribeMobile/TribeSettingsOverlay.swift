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
    @State private var resolvedMemberCount: Int?
    @State private var contentVisible = false

    /// The count to display – prefer the freshly loaded value from the API.
    private var displayMemberCount: Int { resolvedMemberCount ?? memberCount }

    var body: some View {
        ZStack {
            // Translucent blur background (liquid glass)
            Color.clear
                .background(.ultraThinMaterial)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                overlayHeader
                    .padding(.top, 12)
                    .opacity(contentVisible ? 1 : 0)
                    .offset(y: contentVisible ? 0 : 10)
                    .animation(.spring(response: 0.4, dampingFraction: 0.8), value: contentVisible)
                tabBar
                    .padding(.top, 10)
                    .padding(.bottom, 8)
                    .opacity(contentVisible ? 1 : 0)
                    .animation(.easeOut(duration: 0.3).delay(0.05), value: contentVisible)

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
                .opacity(contentVisible ? 1 : 0)
                .offset(y: contentVisible ? 0 : 20)
                .animation(.spring(response: 0.45, dampingFraction: 0.8).delay(0.1), value: contentVisible)
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .withToastOverlay()
        .task {
            await loadVerifiedCount()
            // Delay content fade-in so tabs don't flash empty
            try? await Task.sleep(nanoseconds: 50_000_000) // 50ms
            withAnimation { contentVisible = true }
        }
    }

    // MARK: - Header

    private var overlayHeader: some View {
        ZStack(alignment: .topTrailing) {
            // Centered sphere + member count
            VStack(spacing: 10) {
                TribeSphereView(memberCount: displayMemberCount)
                    .frame(height: 200)
                    .animation(.none, value: displayMemberCount)

                Text("Your Tribe is made of \(displayMemberCount) members")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.primary.opacity(0.4))
                    .animation(.none, value: displayMemberCount)
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 12)

            // X button in top-right
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color(uiColor: .systemGray))
                    .frame(width: 40, height: 40)
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
        if let resp = try? await APIClient.shared.subscribersPaged(
            token: token, page: 1, pageSize: 1,
            filter: "verified", sort: "newest", search: ""
        ) {
            resolvedMemberCount = resp.totalVerified
        }
    }
}
