import SwiftUI
import UniformTypeIdentifiers

private let EMAIL_PATTERN = try! NSRegularExpression(
    pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}",
    options: [.caseInsensitive]
)

enum SubscriberFilterMode: String, CaseIterable {
    case verified = "verified"
    case nonVerified = "non-verified"
    case all = "all"

    var label: String {
        switch self {
        case .verified: return "Verified"
        case .nonVerified: return "Unverified"
        case .all: return "All"
        }
    }
}

enum SubscriberSortMode: String, CaseIterable {
    case newest = "newest"
    case oldest = "oldest"
    case aZ = "a-z"
    case zA = "z-a"
    case verifiedFirst = "verified-first"
    case unverifiedFirst = "unverified-first"

    var label: String {
        switch self {
        case .newest: return "Newest"
        case .oldest: return "Oldest"
        case .aZ: return "A → Z"
        case .zA: return "Z → A"
        case .verifiedFirst: return "Verified first"
        case .unverifiedFirst: return "Unverified first"
        }
    }
}

struct SubscribersView: View {
    @EnvironmentObject var session: SessionStore
    @EnvironmentObject var toast: ToastCenter

    @State private var subscribers: [Subscriber] = []
    @State private var totalVerified: Int = 0
    @State private var totalNonVerified: Int = 0

    @State private var page: Int = 1
    @State private var totalPages: Int = 1
    @State private var isLoading = false

    @State private var filter: SubscriberFilterMode = .verified
    @State private var sort: SubscriberSortMode = .newest
    @State private var search: String = ""

    @State private var error: String?

    // Modals
    @State private var showingAdd = false
    @State private var addEmail = ""
    @State private var addName = ""

    @State private var showingImportChooser = false
    @State private var showingFileImporter = false
    @State private var importPreview: ImportPreviewResponse?
    @State private var importSendVerification = false
    @State private var isImporting = false

    @State private var showingDeleteUnverifiedConfirm = false

    @State private var exportedText: String = ""
    @State private var showingExportSheet = false

    private let pageSize = 50

    var body: some View {
        NavigationStack {
            content
        }
        .modifier(SubscribersLifecycleModifier(filter: filter, sort: sort, search: search, reload: { reset in
            Task { await reload(resetPage: reset) }
        }))
        .modifier(SubscribersOverlaysModifier(
            showingAdd: $showingAdd,
            addSheet: { addSheet },
            showingImportChooser: $showingImportChooser,
            showingFileImporter: $showingFileImporter,
            importPreview: $importPreview,
            importSendVerification: $importSendVerification,
            isImporting: $isImporting,
            onPasteEmails: {
                if let pasted = UIPasteboard.general.string {
                    Task { await previewImport(from: pasted) }
                }
            },
            onFileImport: { result in
                handleFileImport(result)
            },
            onRunImport: { preview in
                Task { await runImport(preview) }
            },
            showingDeleteUnverifiedConfirm: $showingDeleteUnverifiedConfirm,
            onDeleteUnverified: {
                Task { await deleteUnverified() }
            },
            showingExportSheet: $showingExportSheet,
            exportedText: exportedText
        ))
        .toolbar { toolbar }
    }

    private var content: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: TribeTheme.contentSpacing) {
                    HeaderView(totalVerified: totalVerified, totalNonVerified: totalNonVerified)

                    TopControlsView(filter: $filter, sort: $sort, search: $search)

                    if let error {
                        ErrorBlockView(error: error)
                    }

                    if !subscribers.isEmpty {
                        VStack(spacing: 12) {
                            ForEach(subscribers) { s in
                                SubscriberRow(subscriber: s, onRemove: {
                                    Task { await remove(s) }
                                }, toast: toast)
                            }
                        }
                    } else if !isLoading && error == nil {
                        Text("No subscribers")
                            .font(.system(size: 13))
                            .foregroundStyle(TribeTheme.textSecondary)
                            .padding(.top, 12)
                    }

                    PaginationView(page: page, totalPages: totalPages, isLoading: isLoading) {
                        Task { await loadPage(max(1, page - 1)) }
                    } onNext: {
                        Task { await loadPage(min(totalPages, page + 1)) }
                    }
                }
                .pagePadding()
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { SettingsToolbarItem() }
    }

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button("Add subscriber") { showingAdd = true }
                Button("Import") { showingImportChooser = true }
                Button("Export") { Task { await export() } }
                Divider()
                Button(role: .destructive) { showingDeleteUnverifiedConfirm = true } label: { Text("Delete all unverified") }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(TribeTheme.textSecondary)
            }
        }
    }

    private var addSheet: some View {
        AddSubscriberSheet(
            email: $addEmail,
            name: $addName,
            onCancel: { showingAdd = false },
            onAdd: { Task { await addManual() } }
        )
    }

    private func handleFileImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let url = urls.first else { return }
            Task {
                do {
                    let data = try Data(contentsOf: url)
                    let txt = String(data: data, encoding: .utf8) ?? ""
                    await previewImport(from: txt)
                } catch {
                    self.error = error.localizedDescription
                }
            }
        case .failure(let err):
            self.error = err.localizedDescription
        }
    }

    private func reload(resetPage: Bool) async {
        if resetPage { await loadPage(1) }
        else { await loadPage(page) }
    }

    private func loadPage(_ p: Int) async {
        guard let token = session.token else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            error = nil
            let resp = try await APIClient.shared.subscribersPaged(
                token: token,
                page: p,
                pageSize: pageSize,
                filter: filter.rawValue,
                sort: sort.rawValue,
                search: search
            )
            subscribers = resp.subscribers
            totalVerified = resp.totalVerified
            totalNonVerified = resp.totalNonVerified
            page = resp.page
            totalPages = resp.totalPages
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func remove(_ s: Subscriber) async {
        guard let token = session.token else { return }
        do {
            try await APIClient.shared.removeSubscriber(token: token, id: s.id)
            await reload(resetPage: false)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func addManual() async {
        guard let token = session.token else { return }
        do {
            try await APIClient.shared.addSubscriberManual(
                token: token,
                email: addEmail,
                name: addName.isEmpty ? nil : addName
            )
            addEmail = ""
            addName = ""
            showingAdd = false
            await reload(resetPage: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func extractEmails(from text: String) -> [String] {
        let ns = text as NSString
        let matches = EMAIL_PATTERN.matches(in: text, range: NSRange(location: 0, length: ns.length))
        return matches.map { ns.substring(with: $0.range).lowercased() }
    }

    private func previewImport(from text: String) async {
        guard let token = session.token else { return }
        let emails = extractEmails(from: text)
        if emails.isEmpty {
            self.error = "No emails found"
            return
        }
        do {
            error = nil
            importPreview = try await APIClient.shared.previewImport(token: token, emails: emails)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func runImport(_ preview: ImportPreviewResponse) async {
        guard let token = session.token else { return }
        isImporting = true
        defer { isImporting = false }

        do {
            let resp = try await APIClient.shared.importSubscribers(
                token: token,
                emails: preview.emails,
                sendVerification: importSendVerification
            )
            if !resp.errors.isEmpty {
                self.error = resp.errors.prefix(3).joined(separator: "\n")
            }
            importPreview = nil
            await reload(resetPage: true)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func export() async {
        guard let token = session.token else { return }
        do {
            let txt = try await APIClient.shared.exportSubscribers(token: token)
            exportedText = txt
            showingExportSheet = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteUnverified() async {
        guard let token = session.token else { return }
        do {
            _ = try await APIClient.shared.deleteAllUnverified(token: token)
            await reload(resetPage: true)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private struct HeaderView: View {
    let totalVerified: Int
    let totalNonVerified: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Your tribe")
                .font(TribeTheme.pageTitle())
                .foregroundStyle(TribeTheme.textPrimary)

            Text("\(totalVerified) verified • \(totalNonVerified) unverified")
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)
        }
    }
}

private struct TopControlsView: View {
    @Binding var filter: SubscriberFilterMode
    @Binding var sort: SubscriberSortMode
    @Binding var search: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Picker("Filter", selection: $filter) {
                ForEach(SubscriberFilterMode.allCases, id: \ .self) { f in
                    Text(f.label).tag(f)
                }
            }
            .pickerStyle(.segmented)

            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(TribeTheme.textTertiary)

                TextField("Search email/name", text: $search)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .foregroundStyle(TribeTheme.textPrimary)

                if !search.isEmpty {
                    Button { search = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(TribeTheme.textTertiary)
                    }
                    .buttonStyle(.plain)
                }

                Menu {
                    ForEach(SubscriberSortMode.allCases, id: \ .self) { s in
                        Button { sort = s } label: { Text(s.label) }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                        .foregroundStyle(TribeTheme.textTertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(TribeTheme.cardBg)
            .overlay(
                RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous)
                    .stroke(TribeTheme.stroke)
            )
            .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
        }
    }
}

private struct ErrorBlockView: View {
    let error: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Couldn’t load subscribers")
                .font(.headline)
                .foregroundStyle(TribeTheme.textPrimary)
            Text(error)
                .font(.subheadline)
                .foregroundStyle(TribeTheme.textSecondary)
        }
    }
}

private struct PaginationView: View {
    let page: Int
    let totalPages: Int
    let isLoading: Bool
    let onPrev: () -> Void
    let onNext: () -> Void

    var body: some View {
        if isLoading || totalPages > 1 {
            HStack(spacing: 16) {
                if totalPages > 1 {
                    Button(action: onPrev) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(page <= 1 ? TribeTheme.textTertiary.opacity(0.3) : TribeTheme.textPrimary)
                            .frame(width: 36, height: 36)
                            .background(TribeTheme.cardBg)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(TribeTheme.stroke))
                    }
                    .disabled(page <= 1 || isLoading)

                    if isLoading {
                        ProgressView()
                            .tint(TribeTheme.textSecondary)
                            .scaleEffect(0.8)
                    } else {
                        Text("\(page) of \(totalPages)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(TribeTheme.textSecondary)
                    }

                    Button(action: onNext) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(page >= totalPages ? TribeTheme.textTertiary.opacity(0.3) : TribeTheme.textPrimary)
                            .frame(width: 36, height: 36)
                            .background(TribeTheme.cardBg)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(TribeTheme.stroke))
                    }
                    .disabled(page >= totalPages || isLoading)
                } else if isLoading {
                    ProgressView()
                        .tint(TribeTheme.textSecondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 16)
        }
    }
}

private struct AddSubscriberSheet: View {
    @Binding var email: String
    @Binding var name: String
    let onCancel: () -> Void
    let onAdd: () -> Void

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("Add subscriber")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                TextField("Email", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(TribeTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))

                TextField("Name (optional)", text: $name)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 12)
                    .background(TribeTheme.cardBg)
                    .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))

                HStack {
                    Button("Cancel", action: onCancel)
                        .foregroundStyle(TribeTheme.textSecondary)

                    Spacer()

                    Button("Add", action: onAdd)
                        .disabled(email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .foregroundStyle(TribeTheme.textPrimary)
                }
                .padding(.top, 6)

                Spacer()
            }
            .padding(18)
        }
    }
}

private struct ImportPreviewSheet: View {
    let preview: ImportPreviewResponse
    @Binding var sendVerification: Bool
    @Binding var isImporting: Bool
    let onCancel: () -> Void
    let onImport: () -> Void

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 14) {
                Text("Import preview")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                VStack(alignment: .leading, spacing: 6) {
                    Text("Total in file: \(preview.totalInFile)")
                    Text("Duplicates: \(preview.duplicates)")
                    Text("Invalid: \(preview.invalid)")
                    Text("Will import: \(preview.toImport)")
                }
                .font(.system(size: 13))
                .foregroundStyle(TribeTheme.textSecondary)

                Toggle("Send verification emails", isOn: $sendVerification)
                    .foregroundStyle(TribeTheme.textPrimary)

                HStack {
                    Button("Cancel", action: onCancel)
                        .foregroundStyle(TribeTheme.textSecondary)

                    Spacer()

                    Button(isImporting ? "Importing…" : "Import", action: onImport)
                        .disabled(isImporting || preview.emails.isEmpty)
                        .foregroundStyle(TribeTheme.textPrimary)
                }

                Spacer()
            }
            .padding(18)
        }
    }
}

private struct SubscriberRow: View {
    let subscriber: Subscriber
    let onRemove: () -> Void
    let toast: ToastCenter

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(subscriber.verified ? TribeTheme.accentGreen.opacity(0.9) : TribeTheme.textTertiary.opacity(0.5))
                .frame(width: 8, height: 8)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 4) {
                Text(subscriber.email)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(TribeTheme.textPrimary)

                HStack(spacing: 8) {
                    if let name = subscriber.name, !name.isEmpty {
                        Text(name)
                            .foregroundStyle(TribeTheme.textSecondary)
                    }

                    Text(subscriber.verified ? "Verified" : "Unverified")
                        .foregroundStyle(subscriber.verified ? TribeTheme.accentGreen.opacity(0.9) : TribeTheme.textTertiary)
                }
                .font(.system(size: 12))
            }

            Spacer()

            Button {
                UIPasteboard.general.string = subscriber.email
                toast.show("Email copied")
            } label: {
                Image(systemName: "doc.on.doc")
                    .foregroundStyle(TribeTheme.textTertiary)
            }
            .buttonStyle(.plain)

            Button(role: .destructive) {
                onRemove()
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(Color.red.opacity(0.8))
            }
            .buttonStyle(.plain)
        }
        .tribeCard()
    }
}

private struct ExportSheet: View {
    let text: String

    var body: some View {
        ZStack {
            TribeTheme.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 12) {
                Text("Export")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(TribeTheme.textPrimary)

                Text("Copied to clipboard")
                    .font(.system(size: 12))
                    .foregroundStyle(TribeTheme.textSecondary)

                ScrollView {
                    Text(text)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(TribeTheme.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .background(TribeTheme.cardBg)
                        .clipShape(RoundedRectangle(cornerRadius: TribeTheme.inputRadius, style: .continuous))
                }

                Button("Copy") {
                    UIPasteboard.general.string = text
                }
                .foregroundStyle(TribeTheme.textPrimary)
                .padding(.top, 6)

                Spacer()
            }
            .padding(18)
        }
        .onAppear {
            UIPasteboard.general.string = text
        }
    }
}


private struct SubscribersLifecycleModifier: ViewModifier {
    let filter: SubscriberFilterMode
    let sort: SubscriberSortMode
    let search: String
    let reload: (_ resetPage: Bool) -> Void

    @State private var searchDebounce: Task<Void, Never>?

    func body(content: Content) -> some View {
        content
            .task { reload(true) }
            .refreshable { reload(true) }
            .onChange(of: filter) { _, _ in reload(true) }
            .onChange(of: sort) { _, _ in reload(true) }
            .onChange(of: search) { _, _ in
                searchDebounce?.cancel()
                searchDebounce = Task {
                    try? await Task.sleep(nanoseconds: 350_000_000)
                    guard !Task.isCancelled else { return }
                    reload(true)
                }
            }
    }
}

private struct SubscribersOverlaysModifier<AddSheet: View>: ViewModifier {
    @Binding var showingAdd: Bool
    let addSheet: () -> AddSheet

    @Binding var showingImportChooser: Bool
    @Binding var showingFileImporter: Bool

    @Binding var importPreview: ImportPreviewResponse?
    @Binding var importSendVerification: Bool
    @Binding var isImporting: Bool

    let onPasteEmails: () -> Void
    let onFileImport: (Result<[URL], Error>) -> Void
    let onRunImport: (ImportPreviewResponse) -> Void

    @Binding var showingDeleteUnverifiedConfirm: Bool
    let onDeleteUnverified: () -> Void

    @Binding var showingExportSheet: Bool
    let exportedText: String

    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $showingAdd) {
                addSheet()
                    .presentationDetents([.medium])
            }
            .confirmationDialog(
                "Import subscribers",
                isPresented: $showingImportChooser,
                titleVisibility: .visible
            ) {
                Button("Choose file (CSV/TXT)") { showingFileImporter = true }
                Button("Paste emails") { onPasteEmails() }
                Button("Cancel", role: .cancel) {}
            }
            .fileImporter(
                isPresented: $showingFileImporter,
                allowedContentTypes: [UTType.commaSeparatedText, UTType.plainText],
                allowsMultipleSelection: false
            ) { result in
                onFileImport(result)
            }
            .sheet(item: $importPreview) { preview in
                ImportPreviewSheet(
                    preview: preview,
                    sendVerification: $importSendVerification,
                    isImporting: $isImporting,
                    onCancel: { importPreview = nil },
                    onImport: { onRunImport(preview) }
                )
                .presentationDetents([.medium])
            }
            .confirmationDialog(
                "Delete all unverified subscribers?",
                isPresented: $showingDeleteUnverifiedConfirm,
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) { onDeleteUnverified() }
                Button("Cancel", role: .cancel) {}
            }
            .sheet(isPresented: $showingExportSheet) {
                ExportSheet(text: exportedText)
                    .presentationDetents([.medium, .large])
            }
    }
}
