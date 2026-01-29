import Foundation

final class APIClient {
    static let shared = APIClient()
    private init() {}



    func signup(email: String, password: String, name: String) async throws -> LoginResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/signup")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password, "name": name])

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(LoginResponse.self, from: data)
    }


    func login(email: String, password: String) async throws -> LoginResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/login")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(LoginResponse.self, from: data)
    }

    func dashboard(token: String, period: MobileDashboardPeriod) async throws -> MobileDashboardResponse {
        var comps = URLComponents(url: Config.baseURL.appendingPathComponent("/api/mobile/dashboard"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "period", value: period.rawValue)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(MobileDashboardResponse.self, from: data)
    }



    func subscribersPaged(token: String, page: Int, pageSize: Int, filter: String, sort: String, search: String) async throws -> PaginatedSubscribersResponse {
        var comps = URLComponents(url: Config.baseURL.appendingPathComponent("/api/mobile/subscribers"), resolvingAgainstBaseURL: false)!
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

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(PaginatedSubscribersResponse.self, from: data)
    }

    func removeSubscriber(token: String, id: String) async throws {
        var comps = URLComponents(url: Config.baseURL.appendingPathComponent("/api/mobile/subscribers"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "id", value: id)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }

    func addSubscriberManual(token: String, email: String, name: String?) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers/manual")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let email: String; let name: String? }
        req.httpBody = try JSONEncoder().encode(Body(email: email, name: name))

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }

    func previewImport(token: String, emails: [String]) async throws -> ImportPreviewResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers/import/preview")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let emails: [String] }
        req.httpBody = try JSONEncoder().encode(Body(emails: emails))

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(ImportPreviewResponse.self, from: data)
    }

    func importSubscribers(token: String, emails: [String], sendVerification: Bool) async throws -> ImportRunResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers/import")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        struct Body: Encodable { let emails: [String]; let sendVerification: Bool }
        req.httpBody = try JSONEncoder().encode(Body(emails: emails, sendVerification: sendVerification))

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(ImportRunResponse.self, from: data)
    }

    func exportSubscribers(token: String) async throws -> String {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers/export")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return String(data: data, encoding: .utf8) ?? ""
    }

    func deleteAllUnverified(token: String) async throws -> DeleteUnverifiedResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers/delete-unverified")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(DeleteUnverifiedResponse.self, from: data)
    }


    func subscribers(token: String) async throws -> SubscribersResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/subscribers")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(SubscribersResponse.self, from: data)
    }

    func sendEmail(token: String, subject: String, body: String) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/email/send")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["subject": subject, "body": body])

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }

    func scheduleEmail(token: String, subject: String, body: String, scheduledAt: Date) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/email/schedule")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let iso = ISO8601DateFormatter().string(from: scheduledAt)
        req.httpBody = try JSONEncoder().encode(["subject": subject, "body": body, "scheduledAt": iso])

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }



    func joinSettings(token: String) async throws -> JoinSettings {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/join")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)

        struct Resp: Decodable {
            let join: JoinSettings
        }
        return try Self.decoder.decode(Resp.self, from: data).join
    }

    func updateJoinDescription(token: String, description: String) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/join")
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONEncoder().encode(["description": description])

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }



    func gifts(token: String) async throws -> GiftsResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/gifts")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(GiftsResponse.self, from: data)
    }

    func createGift(token: String, fileName: String, fileUrl: String, fileSize: Int) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/gifts")
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

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }

    func uploadGift(token: String, fileURL: URL) async throws {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/gifts/upload")
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

        let (respData, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, respData)
    }


    func deleteGift(token: String, id: String) async throws {
        var comps = URLComponents(url: Config.baseURL.appendingPathComponent("/api/mobile/gifts"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "id", value: id)]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
    }



    func emailDetails(token: String, id: String) async throws -> EmailDetailResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/email/\(id)")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(EmailDetailResponse.self, from: data)
    }


    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
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
