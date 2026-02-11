import SwiftUI
import Combine

struct ConversationView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var feedItems: [FeedItem] = []
    @State private var isLoading = true
    @State private var showSettings = false
    @State private var verifiedCount: Int = 0
    @State private var appearedItems: Set<String> = []
    @State private var expandedBundles: Set<String> = []
    @State private var deletedReplyIds: Set<String> = {
        let arr = UserDefaults.standard.stringArray(forKey: "deletedReplyIds") ?? []
        return Set(arr)
    }()

    // Weekly send limit
    @State private var canSendEmail: Bool = true
    @State private var nextResetDate: Date?

    // Inline compose state
    @State private var composeBody = ""
    @State private var composeSubject = ""
    @State private var showSubjectPrompt = false
    @State private var isSending = false
    @FocusState private var isComposeFocused: Bool

    // Schedule
    @State private var showSchedulePicker = false
    @State private var scheduledAt = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()

    // Test email
    @State private var showTestSheet = false
    @State private var testEmail = ""
    @State private var isSendingTest = false

    var body: some View {
        ZStack {
            mainContent
                .blur(radius: showSettings ? 6 : 0)
                .scaleEffect(showSettings ? 0.96 : 1)
                .allowsHitTesting(!showSettings)

            if showSettings {
                TribeSettingsOverlay(
                    dismiss: { withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) { showSettings = false } },
                    memberCount: verifiedCount
                )
                .transition(.asymmetric(
                    insertion: .scale(scale: 0.85, anchor: .top).combined(with: .opacity),
                    removal: .scale(scale: 0.85, anchor: .top).combined(with: .opacity)
                ))
                .zIndex(1)
            }
        }
        .animation(.spring(response: 0.45, dampingFraction: 0.78), value: showSettings)
        .alert("Subject", isPresented: $showSubjectPrompt) {
            TextField("Hello Tribe", text: $composeSubject)
            Button("Send") { Task { await sendMessage() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Enter a subject for your email")
        }
        .sheet(isPresented: $showTestSheet) { testEmailSheet }
        .fullScreenCover(isPresented: $showSchedulePicker) { scheduleSheet }
        .task { await loadFeed() }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
            Task { await loadFeed() }
        }
        .onReceive(NotificationCenter.default.publisher(for: .newReplyReceived)) { _ in
            Task { await loadFeed() }
        }
    }

    // MARK: - Main Content

    private var mainContent: some View {
        ZStack(alignment: .top) {
            // Background
            TribeTheme.bg.ignoresSafeArea()

            // Content layer
            VStack(spacing: 0) {
                // Spacer for header clearance
                Color.clear.frame(height: 0)

                if isLoading && feedItems.isEmpty {
                    Spacer()
                    ProgressView().tint(.primary.opacity(0.3))
                    Spacer()
                } else if feedItems.isEmpty {
                    Spacer()
                    emptyState
                    Spacer()
                } else {
                    feedScrollView
                        .safeAreaInset(edge: .bottom, spacing: 0) {
                            composeBar
                        }
                }
            }

            // Header overlay (floats on top with blur)
            VStack(spacing: 0) {
                headerBar
                Spacer()
            }
        }
    }

    // MARK: - Header (gradient + blur, member count)

    private var headerBar: some View {
        Button {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.78)) { showSettings = true }
        } label: {
            VStack(spacing: 4) {
                Image("TribeLogo")
                    .resizable()
                    .renderingMode(.template)
                    .foregroundStyle(Color(uiColor: .systemBackground))
                    .scaledToFit()
                    .frame(width: 22, height: 22)
                    .padding(12)
                    .background(Color(uiColor: .label))
                    .clipShape(Circle())

                Text("Your Tribe")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(uiColor: .label))

                Text("\(verifiedCount) members")
                    .font(.system(size: 11))
                    .foregroundColor(Color(uiColor: .secondaryLabel))
            }
            .opacity(showSettings ? 0 : 1)
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        // Extra space below so the gradient+blur extends further down
        .padding(.bottom, 70)
        .background(
            ZStack {
                // Blur layer: full blur at top, fading to no blur at bottom
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .mask(
                        LinearGradient(
                            stops: [
                                .init(color: .white, location: 0),
                                .init(color: .white, location: 0.6),
                                .init(color: .clear, location: 1.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Color gradient: opaque bg at top → transparent at bottom
                LinearGradient(
                    stops: [
                        .init(color: TribeTheme.bg, location: 0),
                        .init(color: TribeTheme.bg.opacity(0.5), location: 0.5),
                        .init(color: .clear, location: 1.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .ignoresSafeArea(edges: .top)
        )
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 44))
                .foregroundStyle(.primary.opacity(0.12))
            Text("No messages yet")
                .font(.system(size: 16, weight: .medium))
                .foregroundStyle(.primary.opacity(0.4))
            Text("Send your first email to start\nthe conversation")
                .font(.system(size: 14))
                .foregroundStyle(.primary.opacity(0.25))
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Feed

    private var feedScrollView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(Array(feedItems.enumerated()), id: \.element.id) { index, item in
                        if shouldShowDate(for: index) {
                            dateSeparator(item.date)
                                .padding(.vertical, 10)
                        }

                        feedItemView(item)
                            .id(item.id)
                            .onAppear { markAppeared(item) }
                            .opacity(appearedItems.contains(item.id) ? 1 : 0)
                            .scaleEffect(appearedItems.contains(item.id) ? 1 : 0.88)
                            .animation(
                                .spring(response: 0.35, dampingFraction: 0.7),
                                value: appearedItems.contains(item.id)
                            )
                    }

                    // Invisible anchor at the very bottom
                    Color.clear.frame(height: 1).id("bottom-anchor")
                }
                .padding(.horizontal, 12)
                .padding(.top, 120) // clearance for floating header
                .padding(.bottom, 8) // small gap above compose bar
            }
            .defaultScrollAnchor(.bottom)
            .scrollDismissesKeyboard(.interactively)
            .scrollBounceBehavior(.always)
            .refreshable { await loadFeed() }
            .onTapGesture { isComposeFocused = false }
            .onChange(of: feedItems.count) { _, _ in
                scrollToBottom(proxy: proxy, delay: 0.15)
            }
            .onChange(of: showSettings) { old, new in
                if old == true && new == false {
                    scrollToBottom(proxy: proxy, delay: 0.4)
                }
            }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy, delay: TimeInterval = 0.1) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo("bottom-anchor", anchor: .bottom)
            }
        }
    }

    // MARK: - Feed Items

    @ViewBuilder
    private func feedItemView(_ item: FeedItem) -> some View {
        switch item {
        case .sentEmail(let email): sentEmailBubble(email)
        case .reply(let reply): replyBubble(reply)
        case .replyBundle(let bundle): replyBundleView(bundle)
        }
    }

    private func sentEmailBubble(_ email: FeedSentEmail) -> some View {
        VStack(alignment: .trailing, spacing: 4) {
            VStack(alignment: .leading, spacing: 6) {
                if let subject = email.subject, !subject.isEmpty {
                    Text(subject)
                        .font(.system(size: 15, weight: .semibold))
                }
                if let body = email.body, !body.isEmpty {
                    Text(body)
                        .font(.system(size: 15))
                }
            }
            .multilineTextAlignment(.leading)
            .foregroundStyle(TribeTheme.sentBubbleText)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(TribeTheme.sentBubble)
            .clipShape(BubbleShape(isFromUser: true))
            .frame(maxWidth: UIScreen.main.bounds.width * 0.78, alignment: .trailing)

            Text("Delivered to \(email.recipientCount), seen by \(email.openCount)")
                .font(.system(size: 11))
                .foregroundStyle(.primary.opacity(0.40))
                .padding(.trailing, 6)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(.vertical, 2)
    }

    private func replyBubble(_ reply: FeedReply) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(reply.subscriberEmail)
                .font(.system(size: 11))
                .foregroundStyle(.primary.opacity(0.30))
                .padding(.leading, 6)

            Text(Self.cleanReplyText(reply.replyText))
                .font(.system(size: 15))
                .foregroundStyle(TribeTheme.receivedBubbleText)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(TribeTheme.receivedBubble)
                .clipShape(BubbleShape(isFromUser: false))
                .frame(maxWidth: UIScreen.main.bounds.width * 0.78, alignment: .leading)
                .contextMenu {
                    Button {
                        UIPasteboard.general.string = Self.cleanReplyText(reply.replyText)
                        toast.show("Copied")
                    } label: {
                        Label("Copy", systemImage: "doc.on.doc")
                    }
                    Button(role: .destructive) {
                        Task { await deleteReply(reply) }
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 2)
    }

    private func replyBundleView(_ bundle: ReplyBundle) -> some View {
        let isExpanded = expandedBundles.contains(bundle.emailId)

        return VStack(alignment: .leading, spacing: 4) {
            if isExpanded {
                // Show all replies
                ForEach(bundle.replies) { reply in
                    replyBubble(reply)
                }

                // Collapse button
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        _ = expandedBundles.remove(bundle.emailId)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.up")
                            .font(.system(size: 10, weight: .semibold))
                        Text("Collapse")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(.primary.opacity(0.35))
                    .padding(.leading, 6)
                    .padding(.top, 4)
                }
            } else {
                // Show first 2 replies
                ForEach(bundle.replies.prefix(2)) { reply in
                    replyBubble(reply)
                }

                // "X more replies" expand button
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        _ = expandedBundles.insert(bundle.emailId)
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                        Text("\(bundle.replies.count - 2) more replies")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundStyle(.primary.opacity(0.4))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(TribeTheme.receivedBubble)
                    .clipShape(Capsule())
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.leading, 6)
                .padding(.top, 2)
            }
        }
    }

    private func dateSeparator(_ date: Date) -> some View {
        Text(formatDate(date))
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(.primary.opacity(0.40))
            .frame(maxWidth: .infinity)
    }

    // MARK: - Inline Compose Bar (Messages-style)

    /// Countdown string like "12 hours" or "2 hours 30 min"
    private var countdownText: String? {
        guard !canSendEmail, let reset = nextResetDate else { return nil }
        let remaining = reset.timeIntervalSince(Date())
        guard remaining > 0 else { return nil }
        let hours = Int(remaining) / 3600
        let minutes = (Int(remaining) % 3600) / 60
        if hours > 0 && minutes > 0 {
            return "\(hours)h \(minutes)min"
        } else if hours > 0 {
            return "\(hours) hours"
        } else {
            return "\(minutes) min"
        }
    }

    private var composeBar: some View {
        VStack(spacing: 0) {
            // Weekly limit countdown
            if !canSendEmail, let countdown = countdownText {
                Text("You will be able to send your next message in \(countdown)")
                    .font(.system(size: 12))
                    .foregroundStyle(.primary.opacity(0.4))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 6)
            }

            HStack(alignment: .bottom, spacing: 8) {
                // Text input – capsule when idle, rounded rect when active
                HStack(alignment: .bottom, spacing: 0) {
                    TextField("Your message", text: $composeBody, axis: .vertical)
                        .font(.system(size: 16))
                        .lineLimit(1...6)
                        .focused($isComposeFocused)
                        .disabled(!canSendEmail)
                        .padding(.horizontal, isComposeFocused ? 16 : 14)
                        .padding(.vertical, 10)
                }
                .modifier(LiquidGlassModifier(
                    shape: RoundedRectangle(
                        cornerRadius: isComposeFocused ? 18 : 50,
                        style: .continuous
                    )
                ))
                .opacity(canSendEmail ? 1 : 0.4)

                // Send button (only visible when typing and allowed)
                if canSendEmail && !composeBody.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button {
                        showSubjectPrompt = true
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 36))
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(.white, .blue)
                    }
                    .contextMenu {
                        Button {
                            showTestSheet = true
                        } label: {
                            Label("Send test", systemImage: "paperplane")
                        }
                        Button {
                            showSchedulePicker = true
                        } label: {
                            Label("Schedule", systemImage: "clock")
                        }
                    }
                    .transition(.scale.combined(with: .opacity))
                }
            }
        }
        .padding(.horizontal, isComposeFocused ? 16 : 34)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .animation(.spring(response: 0.4, dampingFraction: 0.75), value: isComposeFocused)
        .background(
            ZStack {
                // Blur layer that fades out (masked so blur goes from full to none, bottom→top)
                Rectangle()
                    .fill(.ultraThinMaterial)
                    .mask(
                        LinearGradient(
                            stops: [
                                .init(color: .clear, location: 0),
                                .init(color: .white, location: 0.5),
                                .init(color: .white, location: 1.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                // Color gradient: transparent → solid bg, top → bottom (= solid at bottom)
                LinearGradient(
                    stops: [
                        .init(color: .clear, location: 0),
                        .init(color: TribeTheme.bg.opacity(0.6), location: 0.6),
                        .init(color: TribeTheme.bg, location: 1.0)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .ignoresSafeArea(edges: .bottom)
        )
        .animation(.spring(response: 0.25, dampingFraction: 0.8), value: composeBody.isEmpty)
    }

    // MARK: - Test Email Sheet

    private var testEmailSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text("Send a test email to yourself")
                    .font(.system(size: 14))
                    .foregroundStyle(.primary.opacity(0.5))

                TextField("Your email", text: $testEmail)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .textContentType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(TribeTheme.fieldBg)
                    .clipShape(Capsule())
                    .overlay(Capsule().stroke(Color.primary.opacity(0.08)))

                Button {
                    Task { await sendTest() }
                } label: {
                    HStack {
                        Spacer()
                        Text(isSendingTest ? "SENDING…" : "SEND TEST")
                            .font(.system(size: 12, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(Color(uiColor: .systemBackground))
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .background(Color.primary)
                    .clipShape(Capsule())
                }
                .disabled(isSendingTest || testEmail.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                Spacer()
            }
            .padding(18)
            .navigationTitle("Send test")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { showTestSheet = false }
                        .foregroundStyle(.primary.opacity(0.5))
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Schedule Sheet

    private var scheduleSheet: some View {
        NavigationStack {
            VStack(spacing: 20) {
                DatePicker("Send at", selection: $scheduledAt, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                    .datePickerStyle(.graphical)

                Button {
                    composeSubject = ""
                    showSchedulePicker = false
                    showSubjectPrompt = true
                } label: {
                    HStack {
                        Spacer()
                        Text("SCHEDULE")
                            .font(.system(size: 12, weight: .semibold))
                            .tracking(2)
                            .foregroundStyle(Color(uiColor: .systemBackground))
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .background(Color.primary)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 18)

                Spacer()
            }
            .padding(.top, 10)
            .navigationTitle("Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { showSchedulePicker = false }
                        .foregroundStyle(.primary.opacity(0.5))
                }
            }
        }
    }

    // MARK: - Reply Text Cleanup

    static func cleanReplyText(_ text: String) -> String {
        var result = text

        // Strip any HTML tags first
        result = result.replacingOccurrences(of: "<br\\s*/?>", with: "\n", options: .regularExpression)
        result = result.replacingOccurrences(of: "</p>", with: "\n", options: .caseInsensitive)
        result = result.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "&amp;", with: "&")
        result = result.replacingOccurrences(of: "&lt;", with: "<")
        result = result.replacingOccurrences(of: "&gt;", with: ">")
        result = result.replacingOccurrences(of: "&quot;", with: "\"")
        result = result.replacingOccurrences(of: "&#39;", with: "'")
        result = result.replacingOccurrences(of: "&nbsp;", with: " ")

        // Remove "On ... wrote:" and everything after (handles multiline "On" headers)
        if let range = result.range(of: #"\n\s*On\s+.+?wrote:\s*"#, options: [.regularExpression, .caseInsensitive]) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "Le ... a écrit :" (French email clients)
        if let range = result.range(of: #"\n\s*Le\s+.+?a écrit\s*:"#, options: [.regularExpression, .caseInsensitive]) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "-----Original Message-----"
        if let range = result.range(of: "-----Original Message-----", options: .caseInsensitive) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "---------- Forwarded message"
        if let range = result.range(of: "---------- Forwarded message", options: .caseInsensitive) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "From:" header blocks
        if let range = result.range(of: #"\n\s*From:\s+"#, options: [.regularExpression, .caseInsensitive]) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "Sent from my iPhone" / "Sent from my iPad" etc.
        if let range = result.range(of: #"\n\s*Sent from my\s+"#, options: [.regularExpression, .caseInsensitive]) {
            result = String(result[..<range.lowerBound])
        }

        // Remove "Get Outlook for" footer
        if let range = result.range(of: #"\n\s*Get Outlook for"#, options: [.regularExpression, .caseInsensitive]) {
            result = String(result[..<range.lowerBound])
        }

        // Remove date-like headers: "Date: ..." or "Subject: ..." blocks at end
        if let range = result.range(of: #"\n\s*Date:\s+.+"#, options: [.regularExpression, .caseInsensitive]) {
            let afterDate = result[range.lowerBound...]
            // Only strip if near end of message (within last 30% of text)
            if range.lowerBound >= result.index(result.startIndex, offsetBy: result.count * 7 / 10, limitedBy: result.endIndex) ?? result.endIndex {
                result = String(result[..<range.lowerBound])
            } else if afterDate.contains("Subject:") || afterDate.contains("From:") {
                result = String(result[..<range.lowerBound])
            }
        }

        // Remove trailing ">" quoted lines
        let lines = result.components(separatedBy: "\n")
        var endIndex = lines.count
        while endIndex > 0 {
            let line = lines[endIndex - 1].trimmingCharacters(in: .whitespaces)
            if line.hasPrefix(">") || line.isEmpty {
                endIndex -= 1
            } else {
                break
            }
        }
        result = lines.prefix(endIndex).joined(separator: "\n")

        // Clean up excessive whitespace
        result = result.replacingOccurrences(of: #"\n{3,}"#, with: "\n\n", options: .regularExpression)

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Helpers

    private func shouldShowDate(for index: Int) -> Bool {
        guard index > 0 else { return true }
        let prev = feedItems[index - 1].date
        let curr = feedItems[index].date
        return !Calendar.current.isDate(prev, inSameDayAs: curr)
    }

    private func formatDate(_ date: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(date) {
            let f = DateFormatter()
            f.dateFormat = "HH:mm"
            return "Today \(f.string(from: date))"
        } else if cal.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let f = DateFormatter()
            f.dateFormat = "EEEE HH:mm"
            return f.string(from: date)
        }
    }

    private func markAppeared(_ item: FeedItem) {
        guard !appearedItems.contains(item.id) else { return }
        DispatchQueue.main.async {
            withAnimation { _ = appearedItems.insert(item.id) }
        }
    }

    // MARK: - Delete Reply

    private func persistDeletedIds() {
        UserDefaults.standard.set(Array(deletedReplyIds), forKey: "deletedReplyIds")
    }

    private func deleteReply(_ reply: FeedReply) async {
        // Remember this reply as deleted so it stays hidden across reloads
        deletedReplyIds.insert(reply.id)
        persistDeletedIds()

        // Optimistic: remove from UI immediately
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            var updated: [FeedItem] = []
            for item in feedItems {
                switch item {
                case .reply(let r):
                    if r.id != reply.id { updated.append(item) }
                case .replyBundle(let bundle):
                    let remaining = bundle.replies.filter { $0.id != reply.id }
                    if remaining.isEmpty {
                        // skip entirely
                    } else if remaining.count <= 5 {
                        for r in remaining { updated.append(.reply(r)) }
                    } else {
                        updated.append(.replyBundle(ReplyBundle(emailId: bundle.emailId, replies: remaining)))
                    }
                default:
                    updated.append(item)
                }
            }
            feedItems = updated
        }

        // Call backend to permanently delete
        guard let token = session.token else {
            toast.show("Reply deleted")
            return
        }
        do {
            try await APIClient.shared.deleteReply(token: token, emailId: reply.emailId, replyId: reply.id)
            toast.show("Reply deleted")
            // On success, we could remove from local cache but keep it to be safe
        } catch {
            // Even if backend fails, keep it hidden locally
            print("[DeleteReply] API error: \(error)")
            toast.show("Reply hidden (offline)")
        }
    }

    // MARK: - Send Actions

    private func sendMessage() async {
        guard let token = session.token else { return }
        let body = composeBody.trimmingCharacters(in: .whitespacesAndNewlines)
        let subject = composeSubject.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty else { return }

        let finalSubject = subject.isEmpty ? "Update" : subject

        // Immediately add a local bubble with bouncy animation (like Messages)
        let tempId = "temp-\(UUID().uuidString)"
        let localEmail = FeedSentEmail(
            id: tempId,
            subject: finalSubject == "Update" ? nil : finalSubject,
            body: body,
            recipientCount: verifiedCount,
            openCount: 0,
            sentAt: Date()
        )
        let localItem = FeedItem.sentEmail(localEmail)

        // Clear input first for snappy feel
        composeBody = ""
        composeSubject = ""
        isComposeFocused = false

        // Animate the new bubble in with a bouncy spring
        withAnimation(.spring(response: 0.4, dampingFraction: 0.65)) {
            feedItems.append(localItem)
            _ = appearedItems.insert(localItem.id)
        }

        isSending = true
        defer { isSending = false }

        do {
            try await APIClient.shared.sendEmail(token: token, subject: finalSubject, body: body, allowReplies: true)
            toast.show("Queued to send")
            // Reload feed to get the real item (replaces our temp one)
            await loadFeed()
        } catch {
            toast.show("Failed to send")
            // Remove temp item on failure
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                feedItems.removeAll { $0.id == tempId }
            }
        }
    }

    private func sendTest() async {
        guard let token = session.token else { return }
        let body = composeBody.trimmingCharacters(in: .whitespacesAndNewlines)
        let email = testEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !body.isEmpty, !email.isEmpty else { return }

        isSendingTest = true
        defer { isSendingTest = false }

        do {
            try await APIClient.shared.sendTestEmail(token: token, to: email, subject: composeSubject.isEmpty ? "Test" : composeSubject, body: body, allowReplies: true)
            toast.show("Test sent")
            showTestSheet = false
        } catch {
            toast.show("Failed to send test")
        }
    }

    // MARK: - Data Loading

    /// Groups consecutive replies to the same email when there are >5, collapsing them into a `.replyBundle`.
    private func bundleReplies(_ items: [FeedItem]) -> [FeedItem] {
        var result: [FeedItem] = []
        var i = 0
        while i < items.count {
            guard case .reply(let firstReply) = items[i] else {
                result.append(items[i])
                i += 1
                continue
            }

            // Collect consecutive replies to the same emailId
            let emailId = firstReply.emailId
            var run: [FeedReply] = [firstReply]
            var j = i + 1
            while j < items.count, case .reply(let r) = items[j], r.emailId == emailId {
                run.append(r)
                j += 1
            }

            if run.count > 5 {
                result.append(.replyBundle(ReplyBundle(emailId: emailId, replies: run)))
            } else {
                for reply in run { result.append(.reply(reply)) }
            }
            i = j
        }
        return result
    }

    private func loadFeed() async {
        guard let token = session.token else { return }

        // Try dedicated feed endpoint first
        do {
            let resp = try await APIClient.shared.feed(token: token)
            var items: [FeedItem] = []
            for email in resp.emails { items.append(.sentEmail(email)) }
            for reply in resp.replies where !deletedReplyIds.contains(reply.id) {
                items.append(.reply(reply))
            }
            items.sort { $0.date < $1.date }
            let bundled = bundleReplies(items)
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                feedItems = bundled
                isLoading = false
            }
            print("[Feed] Loaded \(resp.emails.count) emails, \(resp.replies.count) replies via /feed")
            await loadMeta(token: token)
            return
        } catch {
            print("[Feed] /feed failed: \(error) – using fallback")
        }

        // Fallback: build feed from dashboard + individual email endpoints
        do {
            let dash = try await APIClient.shared.dashboard(token: token, period: .thirtyDays)
            verifiedCount = dash.verifiedSubscribers

            var items: [FeedItem] = []
            let recentEmails = dash.recentEmails.prefix(20)

            await withTaskGroup(of: ([FeedItem]).self) { group in
                for email in recentEmails {
                    group.addTask {
                        var emailItems: [FeedItem] = []

                        if let detail = try? await APIClient.shared.emailDetails(token: token, id: email.id) {
                            let sent = FeedSentEmail(
                                id: detail.email.id,
                                subject: detail.email.subject,
                                body: detail.email.body,
                                recipientCount: detail.email.recipient_count,
                                openCount: detail.email.open_count,
                                sentAt: detail.email.sent_at ?? email.sent_at ?? Date()
                            )
                            emailItems.append(.sentEmail(sent))
                        } else {
                            let sent = FeedSentEmail(
                                id: email.id,
                                subject: email.subject,
                                body: nil,
                                recipientCount: email.recipient_count,
                                openCount: 0,
                                sentAt: email.sent_at ?? Date()
                            )
                            emailItems.append(.sentEmail(sent))
                        }

                        do {
                            let deletedIds = await self.deletedReplyIds
                            let rep = try await APIClient.shared.emailReplies(token: token, id: email.id, page: 1, pageSize: 50)
                            for r in rep.replies where !deletedIds.contains(r.id) {
                                let reply = FeedReply(
                                    id: r.id,
                                    emailId: r.email_id,
                                    subscriberEmail: r.subscriber_email,
                                    replyText: r.reply_text,
                                    receivedAt: r.received_at ?? Date()
                                )
                                emailItems.append(.reply(reply))
                            }
                        } catch {
                            print("[Feed] Failed to load replies for email \(email.id): \(error)")
                        }

                        return emailItems
                    }
                }
                for await emailItems in group {
                    items.append(contentsOf: emailItems)
                }
            }

            items.sort { $0.date < $1.date }
            let bundled = bundleReplies(items)
            print("[Feed] Fallback loaded \(items.count) items total")
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                feedItems = bundled
                isLoading = false
            }
            await loadMeta(token: token)
        } catch {
            print("[Feed] Fallback failed: \(error)")
            isLoading = false
        }
    }

    private func loadMeta(token: String) async {
        // Load weekly status
        if let meta = try? await APIClient.shared.writeMeta(token: token) {
            if let weekly = meta.weeklyStatus {
                canSendEmail = weekly.canSendEmail
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                nextResetDate = formatter.date(from: weekly.nextResetDate)
                    ?? ISO8601DateFormatter().date(from: weekly.nextResetDate)
            }
        }

        // Load verified count from same source as Members tab for consistency
        if let resp = try? await APIClient.shared.subscribersPaged(
            token: token, page: 1, pageSize: 1,
            filter: "verified", sort: "newest", search: ""
        ) {
            verifiedCount = resp.totalVerified
        }
    }
}

// MARK: - Bubble Shape

struct BubbleShape: Shape {
    let isFromUser: Bool

    func path(in rect: CGRect) -> Path {
        let r: CGFloat = 18
        let t: CGFloat = 4

        if isFromUser {
            return UnevenRoundedRectangle(
                topLeadingRadius: r,
                bottomLeadingRadius: r,
                bottomTrailingRadius: t,
                topTrailingRadius: r
            ).path(in: rect)
        } else {
            return UnevenRoundedRectangle(
                topLeadingRadius: r,
                bottomLeadingRadius: t,
                bottomTrailingRadius: r,
                topTrailingRadius: r
            ).path(in: rect)
        }
    }
}
