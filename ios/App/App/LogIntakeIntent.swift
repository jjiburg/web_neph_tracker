import AppIntents
import Foundation

@available(iOS 16.0, *)
struct LogIntakeIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Intake"
    static var description = IntentDescription("Log a water intake amount in Output Tracker.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Amount (ml)", default: 250)
    var amountMl: Double

    @Parameter(title: "Note", description: "Optional note, like water")
    var note: String?

    static var parameterSummary: some ParameterSummary {
        Summary("Log \(\.$amountMl) ml intake")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let amount = amountMl
        if amount <= 0 {
            let msg: LocalizedStringResource = "Please provide a valid intake amount."
            return .result(dialog: IntentDialog(full: msg, supporting: msg))
        }

        let timestamp = Date().timeIntervalSince1970 * 1000
        let item = SiriQueueItem(action: "intake",
                                 amountMl: amount,
                                 type: nil,
                                 bristolScale: nil,
                                 state: nil,
                                 note: note,
                                 timestamp: timestamp)
        SiriQueueStore.enqueue(item)

        let suffix = (note ?? "").isEmpty ? "" : " (\(note!))"
        let message = "Logged \(Int(amount)) ml intake\(suffix)."
        let dialog = IntentDialog(full: LocalizedStringResource(stringLiteral: message),
                                  supporting: LocalizedStringResource(stringLiteral: message))
        return .result(dialog: dialog)
    }
}
