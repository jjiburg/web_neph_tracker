import SwiftUI
import SwiftData

@main
struct NephTrackApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [
            IntakeEntry.self,
            OutputEntry.self,
            FlushEntry.self,
            BowelMovementEntry.self,
            DressingEntry.self,
            DailyTotalEntry.self
        ])
    }
}
