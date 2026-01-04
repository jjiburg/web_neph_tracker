import Foundation
import SwiftData

@Model
final class IntakeEntry {
    var timestamp: Date
    var amountMl: Double
    var note: String

    init(timestamp: Date = Date(), amountMl: Double = 0, note: String = "") {
        self.timestamp = timestamp
        self.amountMl = amountMl
        self.note = note
    }
}

enum OutputType: String, Codable, CaseIterable {
    case bag
    case urinal

    var displayName: String {
        self == .bag ? "Bag" : "Voided"
    }

    var detailName: String {
        self == .bag ? "Bag Output" : "Voided Output"
    }
}

@Model
final class OutputEntry {
    var timestamp: Date
    var amountMl: Double
    var typeRaw: String
    var colorNote: String
    var clots: Bool
    var pain: Bool
    var leakage: Bool
    var fever: Bool
    var otherNote: String

    var type: OutputType {
        get { OutputType(rawValue: typeRaw) ?? .bag }
        set { typeRaw = newValue.rawValue }
    }

    init(
        timestamp: Date = Date(),
        amountMl: Double = 0,
        type: OutputType = .bag,
        colorNote: String = "",
        clots: Bool = false,
        pain: Bool = false,
        leakage: Bool = false,
        fever: Bool = false,
        otherNote: String = ""
    ) {
        self.timestamp = timestamp
        self.amountMl = amountMl
        self.typeRaw = type.rawValue
        self.colorNote = colorNote
        self.clots = clots
        self.pain = pain
        self.leakage = leakage
        self.fever = fever
        self.otherNote = otherNote
    }
}

@Model
final class FlushEntry {
    var timestamp: Date
    var amountMl: Double
    var note: String

    init(timestamp: Date = Date(), amountMl: Double = 0, note: String = "") {
        self.timestamp = timestamp
        self.amountMl = amountMl
        self.note = note
    }
}

@Model
final class BowelMovementEntry {
    var timestamp: Date
    var bristolScale: Int
    var note: String

    init(timestamp: Date = Date(), bristolScale: Int = 0, note: String = "") {
        self.timestamp = timestamp
        self.bristolScale = bristolScale
        self.note = note
    }
}

enum DressingState: String, Codable {
    case checked = "Checked"
    case needsChanging = "Needs Changing"
    case changedToday = "Changed Today"

    static let uiCases: [DressingState] = [.checked, .needsChanging, .changedToday]

    static func from(rawValue: String) -> DressingState {
        switch rawValue {
        case "Checked":
            return .checked
        case "Needs Changing":
            return .needsChanging
        case "Changed Today":
            return .changedToday
        case "Clean/Dry":
            return .checked
        case "Damp":
            return .needsChanging
        case "Needs Change":
            return .needsChanging
        case "Leaking":
            return .needsChanging
        case "Changed":
            return .changedToday
        default:
            return .checked
        }
    }
}

@Model
final class DressingEntry {
    var timestamp: Date
    var stateRaw: String
    var note: String

    var state: DressingState {
        get { DressingState.from(rawValue: stateRaw) }
        set { stateRaw = newValue.rawValue }
    }

    init(timestamp: Date = Date(), state: DressingState = .checked, note: String = "") {
        self.timestamp = timestamp
        self.stateRaw = state.rawValue
        self.note = note
    }
}

@Model
final class DailyTotalEntry {
    var day: Date
    var bagTotalMl: Double
    var urinalTotalMl: Double
    var totalOutputMl: Double
    var intakeTotalMl: Double

    init(
        day: Date = Date(),
        bagTotalMl: Double = 0,
        urinalTotalMl: Double = 0,
        totalOutputMl: Double = 0,
        intakeTotalMl: Double = 0
    ) {
        self.day = day
        self.bagTotalMl = bagTotalMl
        self.urinalTotalMl = urinalTotalMl
        self.totalOutputMl = totalOutputMl
        self.intakeTotalMl = intakeTotalMl
    }
}
