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
