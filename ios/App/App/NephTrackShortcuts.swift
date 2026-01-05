import AppIntents

@available(iOS 16.0, *)
struct NephTrackShortcuts: AppShortcutsProvider {
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: VoiceCommandIntent(),
            phrases: [
                "\(\.$command) to \(.applicationName)",
                "\(\.$command) in \(.applicationName)",
                "In \(.applicationName), \(\.$command)"
            ],
            shortTitle: "Log entry",
            systemImageName: "waveform"
        )
    }
}
