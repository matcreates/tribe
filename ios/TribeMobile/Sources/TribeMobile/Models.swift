import Foundation

struct LoginResponse: Decodable {
    let token: String
    let user: User
    let tribe: Tribe
}

struct User: Decodable {
    let id: String
    let email: String
    let name: String?
}

struct Tribe: Decodable {
    let id: String
    let name: String
    let slug: String
}

struct Subscriber: Decodable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let verified: Bool
    let created_at: Date?
}


struct Gift: Identifiable, Decodable {
    let id: String
    let file_name: String
    let file_url: String
    let file_size: Int
    let thumbnail_url: String?
    let short_code: String
    let created_at: String?
    let member_count: Int
}

struct GiftsResponse: Decodable {
    let gifts: [Gift]
    let count: Int
    let maxGifts: Int
}


struct PaginatedSubscribersResponse: Decodable {
    let ok: Bool?
    let subscribers: [Subscriber]
    let total: Int
    let totalVerified: Int
    let totalNonVerified: Int
    let page: Int
    let pageSize: Int
    let totalPages: Int
}

struct ImportPreviewResponse: Decodable {
    let ok: Bool?
    let totalInFile: Int
    let duplicates: Int
    let invalid: Int
    let toImport: Int
    let emails: [String]
}

struct ImportRunResponse: Decodable {
    let ok: Bool?
    let added: Int
    let errors: [String]
}

struct DeleteUnverifiedResponse: Decodable {
    let ok: Bool?
    let deleted: Int
}


extension ImportPreviewResponse: Identifiable {
    var id: String {
        "\(totalInFile)-\(duplicates)-\(invalid)-\(toImport)"
    }
}

// MARK: - Conversation Feed

struct FeedResponse: Decodable {
    let emails: [FeedSentEmail]
    let replies: [FeedReply]
}

struct FeedSentEmail: Decodable, Identifiable {
    let id: String
    let subject: String?
    let body: String?
    let recipientCount: Int
    let openCount: Int
    let sentAt: Date
}

struct FeedReply: Decodable, Identifiable {
    let id: String
    let emailId: String
    let subscriberEmail: String
    let replyText: String
    let receivedAt: Date
}

// MARK: - Feed Item (unified timeline)

enum FeedItem: Identifiable {
    case sentEmail(FeedSentEmail)
    case reply(FeedReply)
    /// A collapsible bundle of 5+ replies to the same email
    case replyBundle(ReplyBundle)

    var id: String {
        switch self {
        case .sentEmail(let e): return "e-\(e.id)"
        case .reply(let r): return "r-\(r.id)"
        case .replyBundle(let b): return "rb-\(b.emailId)-\(b.replies.count)"
        }
    }

    var date: Date {
        switch self {
        case .sentEmail(let e): return e.sentAt
        case .reply(let r): return r.receivedAt
        case .replyBundle(let b): return b.replies.first?.receivedAt ?? Date()
        }
    }
}

struct ReplyBundle: Identifiable {
    let emailId: String
    let replies: [FeedReply]
    var id: String { "rb-\(emailId)" }
}

/// Wrapper so a plain String can be used with .sheet(item:)
struct IdentifiableString: Identifiable {
    let id: String
}

// MARK: - Dashboard

enum MobileDashboardPeriod: String, CaseIterable {
    case twentyFourHours = "24h"
    case sevenDays = "7d"
    case thirtyDays = "30d"

    var label: String {
        switch self {
        case .twentyFourHours: return "Last 24h"
        case .sevenDays: return "Last 7d"
        case .thirtyDays: return "Last 30d"
        }
    }
}

struct MobileDashboardResponse: Decodable {
    let period: String
    let totalSubscribers: Int
    let verifiedSubscribers: Int
    let periodSubscribers: Int
    let totalEmailsSent: Int
    let periodEmailsSent: Int
    let openRate: Double
    let periodOpens: Int
    let totalReplies: Int
    let periodReplies: Int
    let recentEmails: [RecentEmail]
    let chartData: [Int]
    let chartLabels: [String]

    struct RecentEmail: Decodable, Identifiable {
        let id: String
        let subject: String?
        let recipient_count: Int
        let sent_at: Date?
    }
}

// MARK: - Write Meta

struct WriteMetaResponse: Decodable {
    let ok: Bool?
    let recipients: RecipientCounts
    let signature: String
    let weeklyStatus: WeeklyStatus?

    struct RecipientCounts: Decodable {
        let verified: Int
        let nonVerified: Int
        let all: Int
    }

    struct WeeklyStatus: Decodable {
        let emailsSentThisWeek: Int
        let limit: Int
        let canSendEmail: Bool
        let nextResetDate: String
    }
}
