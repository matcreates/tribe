import Foundation

final class APIClient {
    static let shared = APIClient()

    /// Configured session with sensible timeouts.
    private let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        return URLSession(configuration: config)
    }()

    private init() {}

    // MARK: - Auth

    func signup(email: String, password: String, name: String) async throws -> LoginResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/signup")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password, "name": name])

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(LoginResponse.self, from: data)
    }


    func login(email: String, password: String) async throws -> LoginResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/login")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(LoginResponse.self, from: data)
    }

    func dashboard(token: String, period: MobileDashboardPeriod) async throws -> MobileDashboardResponse {
        var comps = URLComponents(url: Config.baseURL.appending(path: "/api/mobile/dashboard"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "period", value: period.rawValue)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(MobileDashboardResponse.self, from: data)
    }



    func subscribersPaged(token: String, page: Int, pageSize: Int, filter: String, sort: String, search: String) async throws -> PaginatedSubscribersResponse {
        var comps = URLComponents(url: Config.baseURL.appending(path: "/api/mobile/subscribers"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "pageSize", value: String(pageSize)),
            URLQueryItem(name: "filter", value: filter),
            URLQueryItem(name: "sort", value: sort),
            URLQueryItem(name: "search", value: search),
        ]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(PaginatedSubscribersResponse.self, from: data)
    }

    func removeSubscriber(token: String, id: String) async throws {
        var comps = URLComponents(url: Config.baseURL.appending(path: "/api/mobile/subscribers"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "id", value: id)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func addSubscriberManual(token: String, email: String, name: String?) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/subscribers/manual")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let email: String; let name: String? }
        req.httpBody = try JSONEncoder().encode(Body(email: email, name: name))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func previewImport(token: String, emails: [String]) async throws -> ImportPreviewResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/subscribers/import/preview")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let emails: [String] }
        req.httpBody = try JSONEncoder().encode(Body(emails: emails))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(ImportPreviewResponse.self, from: data)
    }

    func importSubscribers(token: String, emails: [String], sendVerification: Bool) async throws -> ImportRunResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/subscribers/import")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let emails: [String]; let sendVerification: Bool }
        req.httpBody = try JSONEncoder().encode(Body(emails: emails, sendVerification: sendVerification))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(ImportRunResponse.self, from: data)
    }

    func exportSubscribers(token: String) async throws -> String {
        let url = Config.baseURL.appending(path: "/api/mobile/subscribers/export")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return String(data: data, encoding: .utf8) ?? ""
    }

    func deleteAllUnverified(token: String) async throws -> DeleteUnverifiedResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/subscribers/delete-unverified")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(DeleteUnverifiedResponse.self, from: data)
    }


    // MARK: - Email Compose

    func writeMeta(token: String) async throws -> WriteMetaResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/email/meta")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(WriteMetaResponse.self, from: data)
    }

    func sendTestEmail(token: String, to: String, subject: String, body: String, allowReplies: Bool) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/email/test")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable {
            let to: String
            let subject: String
            let body: String
            let allowReplies: Bool
        }
        req.httpBody = try JSONEncoder().encode(Body(to: to, subject: subject, body: body, allowReplies: allowReplies))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }


    func sendEmail(token: String, subject: String, body: String, allowReplies: Bool = true) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/email/send")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable {
            let subject: String
            let body: String
            let allowReplies: Bool
        }
        req.httpBody = try JSONEncoder().encode(Body(subject: subject, body: body, allowReplies: allowReplies))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func scheduleEmail(token: String, subject: String, body: String, scheduledAt: Date, allowReplies: Bool = true) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/email/schedule")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let iso = ISO8601DateFormatter().string(from: scheduledAt)
        struct Body: Encodable {
            let subject: String
            let body: String
            let scheduledAt: String
            let allowReplies: Bool
        }
        req.httpBody = try JSONEncoder().encode(Body(subject: subject, body: body, scheduledAt: iso, allowReplies: allowReplies))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }



    func joinSettings(token: String) async throws -> JoinSettings {
        let url = Config.baseURL.appending(path: "/api/mobile/join")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)

        struct Resp: Decodable {
            let join: JoinSettings
        }
        return try Self.decoder.decode(Resp.self, from: data).join
    }

    func updateJoinDescription(token: String, description: String) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/join")
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["description": description])

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }



    func gifts(token: String) async throws -> GiftsResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/gifts")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(GiftsResponse.self, from: data)
    }

    func createGift(token: String, fileName: String, fileUrl: String, fileSize: Int) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/gifts")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable {
            let fileName: String
            let fileUrl: String
            let fileSize: Int
            let thumbnailUrl: String?
        }
        req.httpBody = try JSONEncoder().encode(Body(fileName: fileName, fileUrl: fileUrl, fileSize: fileSize, thumbnailUrl: nil))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func uploadGift(token: String, fileURL: URL) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/gifts/upload")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let boundary = "Boundary-\(UUID().uuidString)"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Read data (MVP: in-memory; server enforces 20MB limit)
        let fileData = try Data(contentsOf: fileURL)
        let filename = fileURL.lastPathComponent.isEmpty ? "gift.bin" : fileURL.lastPathComponent

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (respData, resp) = try await session.data(for: req)
        try Self.assertOK(resp, respData)
    }


    func deleteGift(token: String, id: String) async throws {
        var comps = URLComponents(url: Config.baseURL.appending(path: "/api/mobile/gifts"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "id", value: id)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func uploadAvatar(token: String, fileURL: URL) async throws -> String {
        let url = Config.baseURL.appending(path: "/api/mobile/upload-avatar")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let boundary = "Boundary-\(UUID().uuidString)"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        let fileData = try Data(contentsOf: fileURL)
        let filename = fileURL.lastPathComponent.isEmpty ? "avatar.png" : fileURL.lastPathComponent

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: application/octet-stream\r\n\r\n".data(using: .utf8)!)
        body.append(fileData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)

        struct R: Decodable { let url: String }
        return try Self.decoder.decode(R.self, from: data).url
    }

    func verifySubscription(token: String) async throws -> MobileSubscriptionResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/stripe/verify-subscription")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(MobileSubscriptionResponse.self, from: data)
    }

    func createPortal(token: String) async throws -> String {
        let url = Config.baseURL.appending(path: "/api/mobile/stripe/create-portal")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)

        struct R: Decodable { let url: String }
        return try Self.decoder.decode(R.self, from: data).url
    }


    func settings(token: String) async throws -> MobileSettingsResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/settings")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(MobileSettingsResponse.self, from: data)
    }

    func updateSettings(token: String, ownerName: String, slug: String, emailSignature: String) async throws {
        let url = Config.baseURL.appending(path: "/api/mobile/settings")
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable {
            let ownerName: String
            let slug: String
            let emailSignature: String
        }
        req.httpBody = try JSONEncoder().encode(Body(ownerName: ownerName, slug: slug, emailSignature: emailSignature))

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
    }

    func emailReplies(token: String, id: String, page: Int, pageSize: Int) async throws -> EmailRepliesResponse {
        var comps = URLComponents(url: Config.baseURL.appending(path: "/api/mobile/email/\(id)/replies"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "pageSize", value: String(pageSize)),
        ]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(EmailRepliesResponse.self, from: data)
    }


    func emailDetails(token: String, id: String) async throws -> EmailDetailResponse {
        let url = Config.baseURL.appending(path: "/api/mobile/email/\(id)")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await session.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(EmailDetailResponse.self, from: data)
    }


    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        // The backend (PostgreSQL/JavaScript) emits ISO 8601 dates with fractional
        // seconds (e.g. "2025-01-15T10:30:00.123Z"). The built-in .iso8601 strategy
        // does NOT handle fractional seconds, so we use a custom strategy that
        // tries both with and without milliseconds.
        let withFrac: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f
        }()
        let withoutFrac: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime]
            return f
        }()
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let str = try container.decode(String.self)
            if let date = withFrac.date(from: str) { return date }
            if let date = withoutFrac.date(from: str) { return date }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot parse date: \(str)"
            )
        }
        return d
    }()

    private static func assertOK(_ resp: URLResponse, _ data: Data) throws {
        guard let http = resp as? HTTPURLResponse else { return }
        guard (200...299).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "API", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: body])
        }
    }
}
