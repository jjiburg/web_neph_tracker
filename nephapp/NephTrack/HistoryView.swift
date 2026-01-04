import SwiftUI
import SwiftData

struct HistoryView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \IntakeEntry.timestamp, order: .reverse) private var intakes: [IntakeEntry]
    @Query(sort: \OutputEntry.timestamp, order: .reverse) private var outputs: [OutputEntry]
    @Query(sort: \FlushEntry.timestamp, order: .reverse) private var flushes: [FlushEntry]
    @Query(sort: \BowelMovementEntry.timestamp, order: .reverse) private var bowelMovements: [BowelMovementEntry]
    @Query(sort: \DressingEntry.timestamp, order: .reverse) private var dressings: [DressingEntry]
    @Query(sort: \DailyTotalEntry.day, order: .reverse) private var dailyTotals: [DailyTotalEntry]

    @State private var filter: HistoryFilter = .all
    @State private var editTarget: EditTarget?
    @State private var headerOffset: CGFloat = 0

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 0) {
                    Color.clear.frame(height: 60) // Header spacer
                    
                    filterBar
                        .padding(.bottom, 20)

                    Group {
                         switch filter {
                         case .all:
                             historySection(items: allItems)
                         case .intake:
                             historySection(items: intakeItems)
                         case .output:
                             historySection(items: outputItems)
                         case .flush:
                             historySection(items: flushItems)
                         case .bowel:
                             historySection(items: bowelItems)
                         case .dressing:
                             historySection(items: dressingItems)
                         case .totals:
                             historySection(items: totalItems)
                         }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 100) // Tab bar spacer
                }
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetKey.self) { headerOffset = $0 }
        }
        .overlay(alignment: .top) {
            ScreenHeader(title: "History", subtitle: filter.title)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.ultraThinMaterial.opacity(headerOpacity))
                .blur(radius: headerBlur)
        }
        .sheet(item: $editTarget) { target in
            switch target {
            case .intake(let entry):
                IntakeEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            case .output(let entry):
                OutputEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            case .flush(let entry):
                FlushEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            case .bowel(let entry):
                BowelEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            case .dressing(let entry):
                DressingEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            case .total(let entry):
                DailyTotalEditSheet(entry: entry)
                    .presentationBackground(.ultraThinMaterial)
            }
        }
    }

    private var headerOpacity: Double {
        let offset = -headerOffset
        return min(max(offset / 100, 0), 1)
    }
    
    private var headerBlur: CGFloat {
        let offset = -headerOffset
        return min(max(offset / 20, 0), 20)
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(HistoryFilter.allCases, id: \.self) { item in
                    Button(item.title) {
                        withAnimation { filter = item }
                    }
                    .buttonStyle(GlassChipStyle(active: filter == item))
                }
            }
            .padding(.horizontal, 20)
        }
    }

    @ViewBuilder
    private func historySection(items: [HistoryItem]) -> some View {
        if items.isEmpty {
            VStack(spacing: 16) {
                Image(systemName: "tray")
                    .font(.system(size: 40))
                    .foregroundStyle(.secondary)
                Text("No entries found")
                    .font(DesignSystem.font(.headline))
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 40)
            .frame(maxWidth: .infinity)
        } else {
            LazyVStack(spacing: 12) {
                ForEach(items) { item in
                    GlassCard(padding: 16) {
                        HStack(spacing: 16) {
                            Circle()
                                .fill(item.tint.opacity(0.2))
                                .frame(width: 48, height: 48)
                                .overlay(
                                    Image(systemName: item.systemImage)
                                        .font(.system(size: 20, weight: .semibold))
                                        .foregroundStyle(item.tint)
                                )
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.title)
                                    .font(DesignSystem.font(.headline, weight: .bold))
                                    .foregroundStyle(.white)
                                Text(item.detail)
                                    .font(DesignSystem.font(.subheadline, weight: .medium))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 4) {
                                Text(item.timestamp, style: .time)
                                    .font(DesignSystem.font(.caption, weight: .bold))
                                    .foregroundStyle(.white.opacity(0.6))
                                
                                Button {
                                    item.editAction?()
                                } label: {
                                    Image(systemName: "pencil.circle.fill")
                                        .font(.title2)
                                        .foregroundStyle(DesignSystem.accent.opacity(0.6))
                                }
                            }
                        }
                    }
                    .contextMenu {
                        if let deleteAction = item.deleteAction {
                            Button(role: .destructive, action: deleteAction) {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            }
        }
    }

    private var allItems: [HistoryItem] {
        var items: [HistoryItem] = []
        items.append(contentsOf: intakeItems)
        items.append(contentsOf: outputItems)
        items.append(contentsOf: flushItems)
        items.append(contentsOf: bowelItems)
        items.append(contentsOf: dressingItems)
        items.append(contentsOf: totalItems)
        return items.sorted { $0.timestamp > $1.timestamp }
    }

    private var intakeItems: [HistoryItem] {
        intakes.map { entry in
            HistoryItem(
                timestamp: entry.timestamp,
                title: "Intake",
                detail: Units.formatMl(entry.amountMl) + (entry.note.isEmpty ? "" : " • \(entry.note)"),
                systemImage: "drop.fill",
                tint: DesignSystem.accent,
                editAction: { editTarget = .intake(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private var outputItems: [HistoryItem] {
        outputs.map { entry in
            let notes = outputNoteSummary(entry)
            return HistoryItem(
                timestamp: entry.timestamp,
                title: entry.type.detailName,
                detail: Units.formatMl(entry.amountMl) + (notes.isEmpty ? "" : " • \(notes)"),
                systemImage: entry.type == .bag ? "bag.fill" : "cup.and.saucer.fill",
                tint: entry.type == .bag ? Color(red: 0.44, green: 0.43, blue: 0.88) : Color(red: 0.55, green: 0.35, blue: 0.86),
                editAction: { editTarget = .output(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private var flushItems: [HistoryItem] {
        flushes.map { entry in
            let detail = entry.amountMl > 0 ? "\(Int(entry.amountMl)) ml" : "Logged"
            return HistoryItem(
                timestamp: entry.timestamp,
                title: "Flush",
                detail: detail + (entry.note.isEmpty ? "" : " • \(entry.note)"),
                systemImage: "drop.circle.fill",
                tint: Color(red: 0.55, green: 0.36, blue: 0.84),
                editAction: { editTarget = .flush(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private var bowelItems: [HistoryItem] {
        bowelMovements.map { entry in
            let scale = entry.bristolScale > 0 ? "Bristol \(entry.bristolScale)" : "Logged"
            return HistoryItem(
                timestamp: entry.timestamp,
                title: "Bowel Movement",
                detail: scale + (entry.note.isEmpty ? "" : " • \(entry.note)"),
                systemImage: "heart.text.square.fill",
                tint: Color(red: 0.64, green: 0.39, blue: 0.58),
                editAction: { editTarget = .bowel(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private var dressingItems: [HistoryItem] {
        dressings.map { entry in
            HistoryItem(
                timestamp: entry.timestamp,
                title: "Dressing",
                detail: entry.state.rawValue + (entry.note.isEmpty ? "" : " • \(entry.note)"),
                systemImage: "bandage.fill",
                tint: Color(red: 0.55, green: 0.45, blue: 0.67),
                editAction: { editTarget = .dressing(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private var totalItems: [HistoryItem] {
        dailyTotals.map { entry in
            let detail = "Bag \(Units.formatMl(entry.bagTotalMl)) • Voided \(Units.formatMl(entry.urinalTotalMl))"
            return HistoryItem(
                timestamp: entry.day,
                title: "Daily Total",
                detail: detail,
                systemImage: "chart.bar.fill",
                tint: Color(red: 0.52, green: 0.35, blue: 0.78),
                editAction: { editTarget = .total(entry) },
                deleteAction: { modelContext.delete(entry) }
            )
        }
    }

    private func outputNoteSummary(_ entry: OutputEntry) -> String {
        var parts: [String] = []
        if !entry.colorNote.isEmpty { parts.append(entry.colorNote) }
        if entry.clots { parts.append("clots") }
        if entry.pain { parts.append("pain") }
        if entry.leakage { parts.append("leakage") }
        if entry.fever { parts.append("fever") }
        if !entry.otherNote.isEmpty { parts.append(entry.otherNote) }
        return parts.joined(separator: ", ")
    }
}

enum HistoryFilter: String, CaseIterable {
    case all
    case intake
    case output
    case flush
    case bowel
    case dressing
    case totals

    var title: String {
        switch self {
        case .all: return "All"
        case .intake: return "Intake"
        case .output: return "Output"
        case .flush: return "Flush"
        case .bowel: return "Bowel"
        case .dressing: return "Dressing"
        case .totals: return "Totals"
        }
    }
}

private struct HistoryItem: Identifiable {
    let id = UUID()
    let timestamp: Date
    let title: String
    let detail: String
    let systemImage: String
    let tint: Color
    let editAction: (() -> Void)?
    let deleteAction: (() -> Void)?
}

private enum EditTarget: Identifiable {
    case intake(IntakeEntry)
    case output(OutputEntry)
    case flush(FlushEntry)
    case bowel(BowelMovementEntry)
    case dressing(DressingEntry)
    case total(DailyTotalEntry)

    var id: ObjectIdentifier {
        switch self {
        case .intake(let entry): return ObjectIdentifier(entry)
        case .output(let entry): return ObjectIdentifier(entry)
        case .flush(let entry): return ObjectIdentifier(entry)
        case .bowel(let entry): return ObjectIdentifier(entry)
        case .dressing(let entry): return ObjectIdentifier(entry)
        case .total(let entry): return ObjectIdentifier(entry)
        }
    }
}

// MARK: - Edit Sheets (Refactored to ScrollView)

private struct IntakeEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: IntakeEntry
    @State private var amountMl: Double

    init(entry: IntakeEntry) {
        _entry = Bindable(entry)
        _amountMl = State(initialValue: entry.amountMl)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Edit Intake")
                    .font(DesignSystem.font(.title2, weight: .bold))

                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Amount (ml)")
                        TextField("ml", value: $amountMl, format: .number)
                            .keyboardType(.numberPad)
                            .padding(8)
                            .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 8))
                    }
                }
                
                GlassCard { DatePicker("Time", selection: $entry.timestamp) }
                GlassCard { TextField("Notes", text: $entry.note, axis: .vertical) }

                HStack {
                    Button("Cancel") { dismiss() }
                        .buttonStyle(GlassChipStyle())
                    Spacer()
                    Button("Save Changes") {
                        entry.amountMl = amountMl
                        dismiss()
                    }
                    .buttonStyle(LiquidButtonStyle())
                }
            }
            .padding()
        }
    }
}

private struct OutputEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: OutputEntry
    @State private var amountMl: Double

    init(entry: OutputEntry) {
        _entry = Bindable(entry)
        _amountMl = State(initialValue: entry.amountMl)
    }

    private var typeBinding: Binding<OutputType> {
        Binding(get: { entry.type }, set: { entry.type = $0 })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Edit Output")
                    .font(DesignSystem.font(.title2, weight: .bold))

                GlassCard {
                    Picker("Type", selection: typeBinding) {
                        Text(OutputType.bag.displayName).tag(OutputType.bag)
                        Text(OutputType.urinal.displayName).tag(OutputType.urinal)
                    }
                    .pickerStyle(.segmented)
                }

                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Amount (ml)")
                        TextField("ml", value: $amountMl, format: .number)
                            .keyboardType(.numberPad)
                    }
                }

                GlassCard { DatePicker("Time", selection: $entry.timestamp) }
                
                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Symptoms")
                        Toggle("Clots", isOn: $entry.clots)
                        Toggle("Pain", isOn: $entry.pain)
                        Toggle("Leakage", isOn: $entry.leakage)
                        Toggle("Fever", isOn: $entry.fever)
                    }
                }
                
                GlassCard { TextField("Color Note", text: $entry.colorNote) }
                GlassCard { TextField("Other Notes", text: $entry.otherNote, axis: .vertical) }

                Button("Save Changes") {
                    entry.amountMl = amountMl
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

private struct FlushEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: FlushEntry

    init(entry: FlushEntry) {
        _entry = Bindable(entry)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
               Text("Edit Flush").font(DesignSystem.font(.title2, weight: .bold))
               GlassCard {
                   TextField("Amount (ml)", value: $entry.amountMl, format: .number)
                       .keyboardType(.numberPad)
               }
               GlassCard { DatePicker("Time", selection: $entry.timestamp) }
               GlassCard { TextField("Notes", text: $entry.note, axis: .vertical) }
               
               Button("Save") { dismiss() }
                   .buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

private struct BowelEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: BowelMovementEntry
    init(entry: BowelMovementEntry) { _entry = Bindable(entry) }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Edit Bowel Movement").font(DesignSystem.font(.title2, weight: .bold))
                GlassCard {
                    Picker("Bristol", selection: $entry.bristolScale) {
                        Text("Not set").tag(0)
                        ForEach(1...7, id: \.self) { i in Text("\(i)").tag(i) }
                    }
                    .pickerStyle(.wheel)
                }
                GlassCard { DatePicker("Time", selection: $entry.timestamp) }
                GlassCard { TextField("Notes", text: $entry.note, axis: .vertical) }
                Button("Save") { dismiss() }.buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

private struct DressingEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: DressingEntry
    init(entry: DressingEntry) { _entry = Bindable(entry) }
    
    private var stateBinding: Binding<DressingState> {
        Binding(get: { entry.state }, set: { entry.state = $0 })
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Edit Dressing").font(DesignSystem.font(.title2, weight: .bold))
                GlassCard {
                    Picker("Status", selection: stateBinding) {
                        ForEach(DressingState.uiCases, id: \.self) { s in Text(s.rawValue).tag(s) }
                    }
                    .pickerStyle(.wheel)
                }
                GlassCard { DatePicker("Time", selection: $entry.timestamp) }
                GlassCard { TextField("Notes", text: $entry.note, axis: .vertical) }
                Button("Save") { dismiss() }.buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

private struct DailyTotalEditSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var entry: DailyTotalEntry
    @State private var bagMl: Double
    @State private var voidedMl: Double
    @State private var intakeMl: Double

    init(entry: DailyTotalEntry) {
        _entry = Bindable(entry)
        _bagMl = State(initialValue: entry.bagTotalMl)
        _voidedMl = State(initialValue: entry.urinalTotalMl)
        _intakeMl = State(initialValue: entry.intakeTotalMl)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Edit Daily Total").font(DesignSystem.font(.title2, weight: .bold))
                GlassCard { DatePicker("Day", selection: $entry.day, displayedComponents: .date) }
                
                GlassCard {
                    Text("Bag Output (ml)")
                    TextField("ml", value: $bagMl, format: .number).keyboardType(.numberPad)
                }
                GlassCard {
                    Text("Voided Output (ml)")
                    TextField("ml", value: $voidedMl, format: .number).keyboardType(.numberPad)
                }
                GlassCard {
                    Text("Intake (ml)")
                    TextField("ml", value: $intakeMl, format: .number).keyboardType(.numberPad)
                }
                
                Button("Save") {
                    entry.bagTotalMl = bagMl
                    entry.urinalTotalMl = voidedMl
                    entry.intakeTotalMl = intakeMl
                    entry.totalOutputMl = bagMl + voidedMl
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

#Preview {
    NavigationStack {
        HistoryView()
    }
}
