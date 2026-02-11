import Foundation
import UserNotifications
import BackgroundTasks
import UIKit

extension Notification.Name {
    static let newReplyReceived = Notification.Name("newReplyReceived")
}

/// Delegate that allows notifications to appear even when the app is in the foreground.
class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner + sound even when app is active
        completionHandler([.banner, .sound, .badge])
    }
}

/// Manages local notifications for new replies. Polls while the app is in the
/// foreground and uses BGAppRefreshTask when backgrounded so notifications
/// still arrive when the app is closed.
@MainActor
final class NotificationManager: ObservableObject {
    static let shared = NotificationManager()

    static let bgTaskId = "com.madewithtribe.mobile.replycheck"

    /// Delegate to allow foreground notifications – must be kept alive.
    let notificationDelegate = NotificationDelegate()

    private var pollTask: Task<Void, Never>?
    private var lastKnownReplyIds: Set<String> = []
    private var hasLoadedInitial = false
    private var currentToken: String?

    private init() {
        // Set ourselves as the delegate so notifications show while app is open
        UNUserNotificationCenter.current().delegate = notificationDelegate
    }

    // MARK: - Permission

    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            if granted {
                print("[Notifications] Permission granted")
            }
        }
    }

    // MARK: - Background Task Registration

    func registerBackgroundTask() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.bgTaskId, using: nil) { task in
            Task { @MainActor in
                await self.handleBackgroundTask(task as! BGAppRefreshTask)
            }
        }
    }

    private func handleBackgroundTask(_ task: BGAppRefreshTask) async {
        // Schedule next background fetch
        scheduleBackgroundFetch()

        guard let token = currentToken else {
            task.setTaskCompleted(success: true)
            return
        }

        task.expirationHandler = { task.setTaskCompleted(success: false) }

        let replies = await fetchAllReplies(token: token)
        let currentIds = Set(replies.map { $0.id })

        if hasLoadedInitial {
            let newReplies = replies.filter { !lastKnownReplyIds.contains($0.id) }
            for reply in newReplies {
                await scheduleNotification(reply: reply)
            }
        }

        lastKnownReplyIds = currentIds
        hasLoadedInitial = true
        task.setTaskCompleted(success: true)
    }

    func scheduleBackgroundFetch() {
        let request = BGAppRefreshTaskRequest(identifier: Self.bgTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 5 * 60) // 5 minutes
        do {
            try BGTaskScheduler.shared.submit(request)
            print("[Notifications] Background fetch scheduled")
        } catch {
            print("[Notifications] Failed to schedule background fetch: \(error)")
        }
    }

    // MARK: - Foreground Polling

    func startPolling(token: String) {
        currentToken = token
        stopPolling()

        pollTask = Task { [weak self] in
            // Initial load – just record current reply IDs, don't notify
            print("[Notifications] Starting polling, loading initial reply IDs...")
            await self?.loadAndNotify(token: token, silent: true)
            print("[Notifications] Tracking \(self?.lastKnownReplyIds.count ?? 0) existing replies")

            // Poll every 20 seconds
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 20_000_000_000) // 20s
                guard !Task.isCancelled else { break }
                print("[Notifications] Polling for new replies...")
                await self?.loadAndNotify(token: token, silent: false)
            }
        }

        // Also schedule background fetch for when app goes to background
        scheduleBackgroundFetch()
    }

    func stopPolling() {
        pollTask?.cancel()
        pollTask = nil
    }

    // MARK: - Load & Notify

    private func loadAndNotify(token: String, silent: Bool) async {
        let replies = await fetchAllReplies(token: token)
        let currentIds = Set(replies.map { $0.id })

        print("[Notifications] Fetched \(replies.count) replies (silent=\(silent), hasLoadedInitial=\(hasLoadedInitial))")

        if !silent && hasLoadedInitial {
            let newReplies = replies.filter { !lastKnownReplyIds.contains($0.id) }
            if !newReplies.isEmpty {
                print("[Notifications] Found \(newReplies.count) NEW replies, sending notifications")
                for reply in newReplies {
                    await scheduleNotification(reply: reply)
                }
                // Tell the conversation view to refresh
                NotificationCenter.default.post(name: .newReplyReceived, object: nil)
            } else {
                print("[Notifications] No new replies")
            }
        }

        lastKnownReplyIds = currentIds
        hasLoadedInitial = true
    }

    /// Try the dedicated /feed endpoint first; fall back to dashboard + per-email replies.
    private func fetchAllReplies(token: String) async -> [FeedReply] {
        // Primary: /api/mobile/feed
        do {
            let resp = try await APIClient.shared.feed(token: token)
            print("[Notifications] Feed returned \(resp.replies.count) replies")
            return resp.replies
        } catch {
            print("[Notifications] Feed endpoint failed: \(error), trying fallback")
        }

        // Fallback: dashboard → individual email replies
        do {
            let dash = try await APIClient.shared.dashboard(token: token, period: .thirtyDays)
            var allReplies: [FeedReply] = []

            for email in dash.recentEmails.prefix(10) {
                do {
                    let rep = try await APIClient.shared.emailReplies(token: token, id: email.id, page: 1, pageSize: 50)
                    for r in rep.replies {
                        allReplies.append(FeedReply(
                            id: r.id,
                            emailId: r.email_id,
                            subscriberEmail: r.subscriber_email,
                            replyText: r.reply_text,
                            receivedAt: r.received_at ?? Date()
                        ))
                    }
                } catch { }
            }
            return allReplies
        } catch {
            return []
        }
    }

    private func scheduleNotification(reply: FeedReply) async {
        let content = UNMutableNotificationContent()
        content.title = "New reply"
        content.body = "\(reply.subscriberEmail): \(cleanPreview(reply.replyText))"
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "reply-\(reply.id)",
            content: content,
            trigger: nil // deliver immediately
        )

        do {
            try await UNUserNotificationCenter.current().add(request)
            print("[Notifications] Scheduled notification for reply \(reply.id) from \(reply.subscriberEmail)")
        } catch {
            print("[Notifications] Failed to schedule notification: \(error)")
        }
    }

    private func cleanPreview(_ text: String) -> String {
        var result = text
        result = result.replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "&nbsp;", with: " ")
        result = result.replacingOccurrences(of: "&amp;", with: "&")
        result = result.trimmingCharacters(in: .whitespacesAndNewlines)
        if result.count > 100 { result = String(result.prefix(100)) + "…" }
        return result
    }
}
