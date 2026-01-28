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

struct DashboardResponse: Decodable {
    let totalSubscribers: Int
    let verifiedSubscribers: Int
    let totalEmailsSent: Int
    let last7d: Last7d

    struct Last7d: Decodable {
        let opens: Int
        let sent: Int
    }
}

struct SubscribersResponse: Decodable {
    let subscribers: [Subscriber]
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
