import Foundation
import SwiftData

enum BackupManager {
    static let schemaVersion = 1

    static func exportData(from context: ModelContext) throws -> Data {
        let intakes = try context.fetch(FetchDescriptor<IntakeEntry>())
        let outputs = try context.fetch(FetchDescriptor<OutputEntry>())
        let flushes = try context.fetch(FetchDescriptor<FlushEntry>())
        let bowelMovements = try context.fetch(FetchDescriptor<BowelMovementEntry>())
        let dressings = try context.fetch(FetchDescriptor<DressingEntry>())
        let dailyTotals = try context.fetch(FetchDescriptor<DailyTotalEntry>())

        let payload = BackupPayload(
            createdAt: Date(),
            schemaVersion: schemaVersion,
            intakes: intakes.map { BackupIntake(entry: $0) },
            outputs: outputs.map { BackupOutput(entry: $0) },
            flushes: flushes.map { BackupFlush(entry: $0) },
            bowelMovements: bowelMovements.map { BackupBowelMovement(entry: $0) },
            dressings: dressings.map { BackupDressing(entry: $0) },
            dailyTotals: dailyTotals.map { BackupDailyTotal(entry: $0) }
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        return try encoder.encode(payload)
    }

    static func importData(from data: Data, into context: ModelContext, replaceExisting: Bool) throws {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let payload = try decoder.decode(BackupPayload.self, from: data)

        if replaceExisting {
            try deleteAll(from: context)
        }

        payload.intakes.forEach { context.insert($0.makeEntry()) }
        payload.outputs.forEach { context.insert($0.makeEntry()) }
        payload.flushes.forEach { context.insert($0.makeEntry()) }
        payload.bowelMovements.forEach { context.insert($0.makeEntry()) }
        payload.dressings.forEach { context.insert($0.makeEntry()) }
        payload.dailyTotals.forEach { context.insert($0.makeEntry()) }

        try context.save()
    }

    static func autoBackupIfNeeded(
        context: ModelContext,
        enabled: Bool,
        lastBackupDay: String,
        updateLastBackupDay: (String) -> Void,
        updateLastFilename: (String) -> Void
    ) -> String? {
        guard enabled else { return nil }
        let dayKey = dayString(for: Date())
        guard dayKey != lastBackupDay else { return nil }

        do {
            let data = try exportData(from: context)
            let url = try storeBackup(data: data)
            updateLastBackupDay(dayKey)
            updateLastFilename(url.lastPathComponent)
            return url.lastPathComponent
        } catch {
            return nil
        }
    }

    private static func deleteAll(from context: ModelContext) throws {
        let intakes = try context.fetch(FetchDescriptor<IntakeEntry>())
        intakes.forEach { context.delete($0) }

        let outputs = try context.fetch(FetchDescriptor<OutputEntry>())
        outputs.forEach { context.delete($0) }

        let flushes = try context.fetch(FetchDescriptor<FlushEntry>())
        flushes.forEach { context.delete($0) }

        let bowelMovements = try context.fetch(FetchDescriptor<BowelMovementEntry>())
        bowelMovements.forEach { context.delete($0) }

        let dressings = try context.fetch(FetchDescriptor<DressingEntry>())
        dressings.forEach { context.delete($0) }

        let totals = try context.fetch(FetchDescriptor<DailyTotalEntry>())
        totals.forEach { context.delete($0) }
    }

    private static func storeBackup(data: Data) throws -> URL {
        let fileManager = FileManager.default
        let documents = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        let backupDirectory = documents.appendingPathComponent("Backups", isDirectory: true)
        try fileManager.createDirectory(at: backupDirectory, withIntermediateDirectories: true)

        let filename = "NephTrack-Backup-\(timestampString(for: Date())).json"
        let url = backupDirectory.appendingPathComponent(filename)
        try data.write(to: url, options: .atomic)

        try purgeBackups(in: backupDirectory, keepLatest: 10)
        return url
    }

    private static func purgeBackups(in directory: URL, keepLatest: Int) throws {
        let fileManager = FileManager.default
        let urls = try fileManager.contentsOfDirectory(at: directory, includingPropertiesForKeys: [.creationDateKey], options: [])
        let sorted = urls.sorted { lhs, rhs in
            let leftDate = (try? lhs.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? Date.distantPast
            let rightDate = (try? rhs.resourceValues(forKeys: [.creationDateKey]).creationDate) ?? Date.distantPast
            return leftDate > rightDate
        }

        guard sorted.count > keepLatest else { return }
        for url in sorted.dropFirst(keepLatest) {
            try? fileManager.removeItem(at: url)
        }
    }

    private static func timestampString(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd-HHmmss"
        return formatter.string(from: date)
    }

    private static func dayString(for date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

struct BackupPayload: Codable {
    let createdAt: Date
    let schemaVersion: Int
    let intakes: [BackupIntake]
    let outputs: [BackupOutput]
    let flushes: [BackupFlush]
    let bowelMovements: [BackupBowelMovement]
    let dressings: [BackupDressing]
    let dailyTotals: [BackupDailyTotal]
}

struct BackupIntake: Codable {
    let timestamp: Date
    let amountMl: Double
    let note: String

    init(entry: IntakeEntry) {
        timestamp = entry.timestamp
        amountMl = entry.amountMl
        note = entry.note
    }

    func makeEntry() -> IntakeEntry {
        IntakeEntry(timestamp: timestamp, amountMl: amountMl, note: note)
    }
}

struct BackupOutput: Codable {
    let timestamp: Date
    let amountMl: Double
    let typeRaw: String
    let colorNote: String
    let clots: Bool
    let pain: Bool
    let leakage: Bool
    let fever: Bool
    let otherNote: String

    init(entry: OutputEntry) {
        timestamp = entry.timestamp
        amountMl = entry.amountMl
        typeRaw = entry.type.rawValue
        colorNote = entry.colorNote
        clots = entry.clots
        pain = entry.pain
        leakage = entry.leakage
        fever = entry.fever
        otherNote = entry.otherNote
    }

    func makeEntry() -> OutputEntry {
        OutputEntry(
            timestamp: timestamp,
            amountMl: amountMl,
            type: OutputType(rawValue: typeRaw) ?? .bag,
            colorNote: colorNote,
            clots: clots,
            pain: pain,
            leakage: leakage,
            fever: fever,
            otherNote: otherNote
        )
    }
}

struct BackupFlush: Codable {
    let timestamp: Date
    let amountMl: Double
    let note: String

    init(entry: FlushEntry) {
        timestamp = entry.timestamp
        amountMl = entry.amountMl
        note = entry.note
    }

    func makeEntry() -> FlushEntry {
        FlushEntry(timestamp: timestamp, amountMl: amountMl, note: note)
    }
}

struct BackupBowelMovement: Codable {
    let timestamp: Date
    let bristolScale: Int
    let note: String

    init(entry: BowelMovementEntry) {
        timestamp = entry.timestamp
        bristolScale = entry.bristolScale
        note = entry.note
    }

    func makeEntry() -> BowelMovementEntry {
        BowelMovementEntry(timestamp: timestamp, bristolScale: bristolScale, note: note)
    }
}

struct BackupDressing: Codable {
    let timestamp: Date
    let stateRaw: String
    let note: String

    init(entry: DressingEntry) {
        timestamp = entry.timestamp
        stateRaw = entry.state.rawValue
        note = entry.note
    }

    func makeEntry() -> DressingEntry {
        DressingEntry(timestamp: timestamp, state: DressingState.from(rawValue: stateRaw), note: note)
    }
}

struct BackupDailyTotal: Codable {
    let day: Date
    let bagTotalMl: Double
    let urinalTotalMl: Double
    let totalOutputMl: Double
    let intakeTotalMl: Double

    init(entry: DailyTotalEntry) {
        day = entry.day
        bagTotalMl = entry.bagTotalMl
        urinalTotalMl = entry.urinalTotalMl
        totalOutputMl = entry.totalOutputMl
        intakeTotalMl = entry.intakeTotalMl
    }

    func makeEntry() -> DailyTotalEntry {
        DailyTotalEntry(
            day: day,
            bagTotalMl: bagTotalMl,
            urinalTotalMl: urinalTotalMl,
            totalOutputMl: totalOutputMl,
            intakeTotalMl: intakeTotalMl
        )
    }
}
