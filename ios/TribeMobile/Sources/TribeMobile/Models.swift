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
