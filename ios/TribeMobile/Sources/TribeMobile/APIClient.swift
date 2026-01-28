import Foundation

final class APIClient {
    static let shared = APIClient()
    private init() {}

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

    func dashboard(token: String) async throws -> DashboardResponse {
        let url = Config.baseURL.appendingPathComponent("/api/mobile/dashboard")
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, resp) = try await URLSession.shared.data(for: req)
        try Self.assertOK(resp, data)
        return try Self.decoder.decode(DashboardResponse.self, from: data)
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
