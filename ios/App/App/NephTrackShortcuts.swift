import AppIntents

@available(iOS 16.0, *)
struct Output TrackerShortcuts: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: VoiceCommandIntent(),
            phrases: [
                "Add \(\.$command) to \(.applicationName)",
                "Log \(\.$command) to \(.applicationName)",
                "Record \(\.$command) to \(.applicationName)",
                "\(\.$command) to \(.applicationName)",
                "\(\.$command) in \(.applicationName)",
                "In \(.applicationName), \(\.$command)"
            ],
            shortTitle: "Log entry",
            systemImageName: "waveform"
        )
    }
}
