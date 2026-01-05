import AppIntents
import Foundation

@available(iOS 16.0, *)
struct VoiceCommandIntent: AppIntent {
    static var title: LocalizedStringResource = "Log with Voice"
    static var description = IntentDescription("Log a NephTrack entry from a natural language command.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Command")
    var command: VoiceCommandEntity

    static var parameterSummary: some ParameterSummary {
        Summary("\(\.$command)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let query = command.id.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.isEmpty {
            let msg: LocalizedStringResource = "Please provide a command."
            return .result(dialog: IntentDialog(full: msg, supporting: msg))
        }

        guard let url = URL(string: "https://output-tracker-production.up.railway.app/api/voice-text") else {
            let msg: LocalizedStringResource = "Unable to reach the server."
            return .result(dialog: IntentDialog(full: msg, supporting: msg))
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let payload = ["text": query]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                let msg: LocalizedStringResource = "Voice parsing failed."
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            if let error = json["error"] as? String {
                let msg: LocalizedStringResource = LocalizedStringResource(stringLiteral: error)
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            guard let action = json["action"] as? String else {
                let msg: LocalizedStringResource = "Could not understand command."
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            let nowMs = Date().timeIntervalSince1970 * 1000
            let amount = (json["amount"] as? Double) ?? (json["amount"] as? Int).map(Double.init)
            let outputType = json["type"] as? String
            let bristol = json["bristolScale"] as? Int
            let state = json["state"] as? String
            let note = json["note"] as? String

            guard let token = KeychainStore.get(account: "authToken"),
                  let passphrase = KeychainStore.get(account: "passphrase"),
                  !token.isEmpty, !passphrase.isEmpty
            else {
                let msg: LocalizedStringResource = "Open NephTrack once to finish setup."
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            let result: (String, [String: Any])? = {
                switch action {
                case "intake":
                    guard let amount, amount > 0 else { return nil }
                    return ("intake", ["amountMl": Int(amount), "note": note ?? ""])
                case "output":
                    guard let amount, amount > 0 else { return nil }
                    let cleanedType = (outputType ?? "bag").lowercased()
                    let resolvedType = (cleanedType == "void") ? "void" : "bag"
                    return (resolvedType, [
                        "amountMl": Int(amount),
                        "colorNote": "",
                        "clots": false,
                        "pain": false,
                        "leakage": false,
                        "fever": false,
                        "otherNote": note ?? ""
                    ])
                case "flush":
                    let resolved = (amount ?? 30)
                    return ("flush", ["amountMl": Int(resolved), "note": note ?? ""])
                case "bowel":
                    let resolved = bristol ?? 0
                    return ("bowel", ["bristolScale": resolved, "note": note ?? ""])
                case "dressing":
                    return ("dressing", ["state": state ?? "Checked", "note": note ?? ""])
                default:
                    return nil
                }
            }()

            guard let (typeForServer, entryPayload) = result else {
                let msg: LocalizedStringResource = "Could not understand command."
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            let encryptedBlob = try NephTrackCrypto.encryptJSON(entryPayload, passphrase: passphrase)
            let entryId = UUID().uuidString.lowercased()

            let pushUrl = URL(string: "https://output-tracker-production.up.railway.app/api/sync/push")!
            var pushReq = URLRequest(url: pushUrl)
            pushReq.httpMethod = "POST"
            pushReq.setValue("application/json", forHTTPHeaderField: "Content-Type")
            pushReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

            let entry: [String: Any] = [
                "id": entryId,
                "type": typeForServer,
                "encrypted_blob": encryptedBlob,
                "timestamp": nowMs,
                "client_updated_at": nowMs,
                "deleted": false,
                "deleted_at": NSNull()
            ]

            let body: [String: Any] = ["entries": [entry]]
            pushReq.httpBody = try JSONSerialization.data(withJSONObject: body, options: [])

            let (_, pushResp) = try await URLSession.shared.data(for: pushReq)
            guard let pushHttp = pushResp as? HTTPURLResponse, (200..<300).contains(pushHttp.statusCode) else {
                let msg: LocalizedStringResource = "Saved locally. Will sync when app opens."
                let item = SiriQueueItem(action: action,
                                         amountMl: amount,
                                         type: outputType,
                                         bristolScale: bristol,
                                         state: state,
                                         note: note,
                                         timestamp: nowMs)
                SiriQueueStore.enqueue(item)
                return .result(dialog: IntentDialog(full: msg, supporting: msg))
            }

            let msg: LocalizedStringResource = "Logged."
            return .result(dialog: IntentDialog(full: msg, supporting: msg))
        } catch {
            let msg: LocalizedStringResource = "Voice parsing failed."
            return .result(dialog: IntentDialog(full: msg, supporting: msg))
        }
    }
}
