import SwiftUI
import SwiftData

struct QuickLogView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \IntakeEntry.timestamp, order: .reverse) private var intakes: [IntakeEntry]
    @Query(sort: \OutputEntry.timestamp, order: .reverse) private var outputs: [OutputEntry]

    @State private var showIntakeSheet = false
    @State private var showOutputSheet = false
    @State private var outputSheetType: OutputType = .bag
    @State private var showFlushSheet = false
    @State private var showBowelSheet = false
    @State private var showDressingSheet = false
    @State private var showDressingOptions = false
    @State private var lastLogText: String?
    @State private var headerOffset: CGFloat = 0

    private let intakeQuickAmountsMl: [Double] = [63, 236, 710]
    private let bagQuickAmountsMl: [Double] = [100, 200, 300]
    private let voidedQuickAmountsMl: [Double] = [25, 50, 100]
    private let dressingQuickStates: [DressingState] = DressingState.uiCases
    private let chipColumns = Array(repeating: GridItem(.flexible(), spacing: 12), count: 3)

    var body: some View {
        ZStack {
            // Background is handled by ContentView, but we can add a localized one if needed.
            // For now, we rely on the global LiquidBackground.

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Spacer for header
                    Color.clear.frame(height: 60)
                    
                    totalsCard
                    
                    if let lastLogText {
                        GlassCard {
                            HStack(spacing: 12) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(DesignSystem.accent)
                                    .font(.title3)
                                Text(lastLogText)
                                    .font(DesignSystem.font(.subheadline, weight: .semibold))
                            }
                        }
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    intakeCard
                    outputCard
                    
                    // Group smaller actions
                    HStack(alignment: .top, spacing: 16) {
                        flushCard
                        bowelCard
                    }
                    
                    dressingCard
                    
                    // Bottom padding for floating tab bar
                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetKey.self) { headerOffset = $0 }
        }
        .overlay(alignment: .top) {
            header
        }
        .sheet(isPresented: $showIntakeSheet) {
            IntakeSheet(quickAmountsMl: intakeQuickAmountsMl) { timestamp, amountMl, note in
                logIntake(amountMl: amountMl, timestamp: timestamp, note: note)
            }
            .presentationDetents([.medium, .large])
            .presentationBackground(.ultraThinMaterial)
        }
        .sheet(isPresented: $showOutputSheet) {
            OutputSheet(type: outputSheetType, quickAmountsMl: outputQuickAmountsForSheet) { timestamp, amountMl, color, clots, pain, leakage, fever, other in
                logOutput(
                    type: outputSheetType,
                    amountMl: amountMl,
                    timestamp: timestamp,
                    colorNote: color,
                    clots: clots,
                    pain: pain,
                    leakage: leakage,
                    fever: fever,
                    otherNote: other
                )
            }
            .presentationBackground(.ultraThinMaterial)
        }
        .sheet(isPresented: $showFlushSheet) {
            FlushSheet { timestamp, amount, note in
                logFlush(timestamp: timestamp, amount: amount, note: note)
            }
            .presentationDetents([.medium])
            .presentationBackground(.ultraThinMaterial)
        }
        .sheet(isPresented: $showBowelSheet) {
            BowelSheet { timestamp, bristol, note in
                logBowelMovement(timestamp: timestamp, bristolScale: bristol, note: note)
            }
            .presentationDetents([.medium])
            .presentationBackground(.ultraThinMaterial)
        }
        .sheet(isPresented: $showDressingSheet) {
            DressingSheet { timestamp, state, note in
                logDressing(timestamp: timestamp, state: state, note: note)
            }
            .presentationDetents([.medium])
            .presentationBackground(.ultraThinMaterial)
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: lastLogText)
    }

    private var header: some View {
        ScreenHeader(title: "Log", subtitle: "Quick Entry")
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial.opacity(headerOpacity))
            .blur(radius: headerBlur)
    }
    
    // Dynamic header styling based on scroll
    private var headerOpacity: Double {
        let offset = -headerOffset
        return min(max(offset / 100, 0), 1)
    }
    
    private var headerBlur: CGFloat {
        let offset = -headerOffset
        return min(max(offset / 20, 0), 20)
    }

    private var totalsCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Today's Totals")
                        .font(DesignSystem.font(.headline, weight: .bold))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Image(systemName: "chart.bar.doc.horizontal")
                        .foregroundStyle(DesignSystem.accent)
                }

                HStack(spacing: 20) {
                    VStack(alignment: .leading) {
                        Text("\(Units.formatMl(todayIntakeMl))")
                            .font(DesignSystem.font(.title, weight: .black))
                            .foregroundStyle(.white)
                        Text("Intake")
                            .font(DesignSystem.font(.caption, weight: .medium))
                            .foregroundStyle(DesignSystem.accent)
                    }
                    
                    Divider().overlay(.white.opacity(0.2))
                    
                    VStack(alignment: .leading) {
                        Text("\(Units.formatMl(todayTotalOutputMl))")
                            .font(DesignSystem.font(.title, weight: .black))
                            .foregroundStyle(.white)
                        Text("Output")
                            .font(DesignSystem.font(.caption, weight: .medium))
                            .foregroundStyle(DesignSystem.accentSecondary)
                    }
                }
            }
        }
        .background(
            GeometryReader { proxy in
                Color.clear.preference(key: ScrollOffsetKey.self, value: proxy.frame(in: .named("scroll")).minY)
            }
        )
    }

    private var intakeCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Label("Hydration", systemImage: "drop.fill")
                    .font(DesignSystem.font(.title3, weight: .bold))
                    .foregroundStyle(DesignSystem.accent)

                LazyVGrid(columns: chipColumns, spacing: 12) {
                    ForEach(intakeQuickAmountsMl, id: \.self) { amount in
                        Button {
                            logIntake(amountMl: amount, timestamp: Date(), note: "")
                        } label: {
                            ChipLabel(text: "+\(Int(amount))")
                        }
                        .buttonStyle(LiquidButtonStyle(color: DesignSystem.accent.opacity(0.8), size: .regular))
                    }
                }

                Button {
                    showIntakeSheet = true
                } label: {
                    Text("Custom Amount")
                }
                .buttonStyle(GlassChipStyle())
            }
        }
    }

    private var outputCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Label("Output", systemImage: "flask.fill")
                    .font(DesignSystem.font(.title3, weight: .bold))
                    .foregroundStyle(DesignSystem.accentSecondary)

                // Bag
                VStack(alignment: .leading, spacing: 8) {
                    Text("Bag Empty")
                        .font(DesignSystem.font(.subheadline, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(bagQuickAmountsMl, id: \.self) { amount in
                                Button {
                                    logOutput(type: .bag, amountMl: amount, timestamp: Date(), colorNote: "", clots: false, pain: false, leakage: false, fever: false, otherNote: "")
                                } label: {
                                    Text("\(Int(amount))")
                                }
                                .buttonStyle(LiquidButtonStyle(color: DesignSystem.accentSecondary, size: .regular))
                            }
                            
                            Button("Custom") {
                                outputSheetType = .bag
                                showOutputSheet = true
                            }
                            .buttonStyle(GlassChipStyle())
                        }
                    }
                }

                Divider().overlay(.white.opacity(0.1))

                // Voided
                VStack(alignment: .leading, spacing: 8) {
                    Text("Natural Void")
                        .font(DesignSystem.font(.subheadline, weight: .medium))
                        .foregroundStyle(.secondary)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(voidedQuickAmountsMl, id: \.self) { amount in
                                Button {
                                    logOutput(type: .urinal, amountMl: amount, timestamp: Date(), colorNote: "", clots: false, pain: false, leakage: false, fever: false, otherNote: "")
                                } label: {
                                    Text("\(Int(amount))")
                                }
                                .buttonStyle(LiquidButtonStyle(color: DesignSystem.accentSecondary.opacity(0.8), size: .regular))
                            }
                            
                            Button("Custom") {
                                outputSheetType = .urinal
                                showOutputSheet = true
                            }
                            .buttonStyle(GlassChipStyle())
                        }
                    }
                }
            }
        }
    }

    private var flushCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Label("Flush", systemImage: "syringe.fill")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                Button {
                    logFlush(timestamp: Date(), amount: 0, note: "")
                } label: {
                    Text("Log Now")
                }
                .buttonStyle(LiquidButtonStyle(color: .blue, size: .small))

                Button("Details") {
                    showFlushSheet = true
                }
                .buttonStyle(GlassChipStyle())
            }
        }
    }

    private var bowelCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                Label("Bowel", systemImage: "toilet.fill")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                Button {
                    showBowelSheet = true
                } label: {
                    Text("Log")
                }
                .buttonStyle(LiquidButtonStyle(color: .orange, size: .small))
            }
        }
    }

    private var dressingCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Label("Dressing", systemImage: "bandage.fill")
                        .font(DesignSystem.font(.headline, weight: .bold))
                        .foregroundStyle(.white)
                    Spacer()
                    Button {
                        withAnimation { showDressingOptions.toggle() }
                    } label: {
                        Image(systemName: "chevron.right")
                            .rotationEffect(.degrees(showDressingOptions ? 90 : 0))
                    }
                }

                if showDressingOptions {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 100))], spacing: 8) {
                        ForEach(dressingQuickStates, id: \.self) { state in
                            Button(state.rawValue) {
                                logDressing(timestamp: Date(), state: state, note: "")
                            }
                            .buttonStyle(GlassChipStyle(active: false))
                        }
                    }
                }
                
                Button("Custom Entry") {
                    showDressingSheet = true
                }
                .buttonStyle(GlassChipStyle())
            }
        }
    }

    // Logic Helpers
    private var todayIntakeMl: Double {
        intakes.filter { Calendar.current.isDateInToday($0.timestamp) }
            .reduce(0) { $0 + $1.amountMl }
    }

    private var todayBagOutputMl: Double {
        outputs.filter { Calendar.current.isDateInToday($0.timestamp) && $0.type == .bag }
            .reduce(0) { $0 + $1.amountMl }
    }

    private var todayVoidedOutputMl: Double {
        outputs.filter { Calendar.current.isDateInToday($0.timestamp) && $0.type == .urinal }
            .reduce(0) { $0 + $1.amountMl }
    }

    private var todayTotalOutputMl: Double {
        todayBagOutputMl + todayVoidedOutputMl
    }

    private var outputQuickAmountsForSheet: [Double] {
        outputSheetType == .bag ? bagQuickAmountsMl : voidedQuickAmountsMl
    }
    
    // Database Actions
    private func logIntake(amountMl: Double, timestamp: Date, note: String) {
        let entry = IntakeEntry(timestamp: timestamp, amountMl: amountMl, note: note)
        modelContext.insert(entry)
        updateLastLog("Intake +\(Units.formatMl(amountMl))")
    }

    private func logOutput(type: OutputType, amountMl: Double, timestamp: Date, colorNote: String, clots: Bool, pain: Bool, leakage: Bool, fever: Bool, otherNote: String) {
        let entry = OutputEntry(timestamp: timestamp, amountMl: amountMl, type: type, colorNote: colorNote, clots: clots, pain: pain, leakage: leakage, fever: fever, otherNote: otherNote)
        modelContext.insert(entry)
        updateLastLog("\(type.displayName) +\(Units.formatMl(amountMl))")
    }

    private func logFlush(timestamp: Date, amount: Double, note: String) {
        let entry = FlushEntry(timestamp: timestamp, amountMl: amount, note: note)
        modelContext.insert(entry)
        updateLastLog("Flush logged")
    }

    private func logBowelMovement(timestamp: Date, bristolScale: Int, note: String) {
        let entry = BowelMovementEntry(timestamp: timestamp, bristolScale: bristolScale, note: note)
        modelContext.insert(entry)
        updateLastLog("Bowel movement logged")
    }

    private func logDressing(timestamp: Date, state: DressingState, note: String) {
        let entry = DressingEntry(timestamp: timestamp, state: state, note: note)
        modelContext.insert(entry)
        updateLastLog("Dressing: \(state.rawValue)")
    }

    private func updateLastLog(_ text: String) {
        withAnimation {
            lastLogText = text
        }
        // Auto-hide log confirmation after 3s
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            if lastLogText == text {
                withAnimation { lastLogText = nil }
            }
        }
    }
}

// MARK: - Sheets
// Note: We use simple ScrollView + GlassCard patterns here instead of Form for better aesthetic match.

private struct IntakeSheet: View {
    @Environment(\.dismiss) private var dismiss
    let quickAmountsMl: [Double]
    let onSave: (Date, Double, String) -> Void

    @State private var timestamp = Date()
    @State private var amountMl: Double = 0
    @State private var note: String = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Log Intake")
                    .font(DesignSystem.font(.title2, weight: .bold))
                    .padding(.top)

                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Amount (ml)")
                        TextField("0", value: $amountMl, format: .number)
                            .font(DesignSystem.font(.title, weight: .bold))
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                        
                        HStack {
                            ForEach(quickAmountsMl, id: \.self) { amount in
                                Button("\(Int(amount))") { amountMl = amount }
                                    .buttonStyle(GlassChipStyle(active: amountMl == amount))
                            }
                        }
                    }
                }

                GlassCard {
                    DatePicker("Time", selection: $timestamp)
                }

                GlassCard {
                    TextField("Notes...", text: $note, axis: .vertical)
                }

                Button("Save Entry") {
                    onSave(timestamp, amountMl, note)
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle(color: DesignSystem.accent))
                .disabled(amountMl <= 0)
            }
            .padding()
        }
    }
}

private struct OutputSheet: View {
    @Environment(\.dismiss) private var dismiss
    let type: OutputType
    let quickAmountsMl: [Double]
    let onSave: (Date, Double, String, Bool, Bool, Bool, Bool, String) -> Void

    @State private var timestamp = Date()
    @State private var amountMl: Double = 0
    @State private var colorNote = ""
    @State private var clots = false
    @State private var pain = false
    @State private var leakage = false
    @State private var fever = false
    @State private var otherNote = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Log \(type.displayName)")
                    .font(DesignSystem.font(.title2, weight: .bold))
                    .padding(.top)

                GlassCard {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Amount (ml)")
                        TextField("0", value: $amountMl, format: .number)
                            .font(DesignSystem.font(.title, weight: .bold))
                            .keyboardType(.numberPad)
                            .padding()
                            .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                        
                        HStack {
                            ForEach(quickAmountsMl, id: \.self) { amount in
                                Button("\(Int(amount))") { amountMl = amount }
                                    .buttonStyle(GlassChipStyle(active: amountMl == amount))
                            }
                        }
                    }
                }

                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Symptoms")
                        Toggle("Clots", isOn: $clots)
                        Toggle("Pain", isOn: $pain)
                        Toggle("Leakage", isOn: $leakage)
                        Toggle("Fever", isOn: $fever)
                    }
                }
                
                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Color / Notes")
                        TextField("Color (e.g. Amber)...", text: $colorNote)
                            .padding(8)
                            .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
                        TextField("Other Details...", text: $otherNote, axis: .vertical)
                             .padding(8)
                             .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 8))
                    }
                }

                Button("Save Entry") {
                    onSave(timestamp, amountMl, colorNote, clots, pain, leakage, fever, otherNote)
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle(color: DesignSystem.accentSecondary))
                .disabled(amountMl <= 0)
            }
            .padding()
        }
    }
}

private struct FlushSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (Date, Double, String) -> Void
    @State private var timestamp = Date()
    @State private var amountMl: Double = 30 // Default flush size often 30ml
    @State private var note = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Log Flush")
                    .font(DesignSystem.font(.title2, weight: .bold))

                GlassCard {
                    VStack(alignment: .leading) {
                        Text("Amount (ml)")
                        TextField("ml", value: $amountMl, format: .number)
                            .keyboardType(.numberPad)
                    }
                }
                
                GlassCard {
                    TextField("Notes...", text: $note)
                }

                Button("Save") {
                    onSave(timestamp, amountMl, note)
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle())
            }
            .padding()
        }
    }
}

private struct BowelSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (Date, Int, String) -> Void
    @State private var timestamp = Date()
    @State private var bristolScale: Int = 0
    @State private var note = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Bowel Movement")
                    .font(DesignSystem.font(.title2, weight: .bold))

                GlassCard {
                    Picker("Bristol Scale", selection: $bristolScale) {
                        Text("Not set").tag(0)
                        ForEach(1...7, id: \.self) { i in
                            Text("Type \(i)").tag(i)
                        }
                    }
                    .pickerStyle(.wheel)
                }
                
                GlassCard {
                    TextField("Notes...", text: $note)
                }

                Button("Save") {
                    onSave(timestamp, bristolScale, note)
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle(color: .orange))
            }
            .padding()
        }
    }
}

private struct DressingSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onSave: (Date, DressingState, String) -> Void
    @State private var timestamp = Date()
    @State private var state: DressingState = .checked
    @State private var note = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                Text("Dressing Check")
                    .font(DesignSystem.font(.title2, weight: .bold))

                GlassCard {
                    Picker("Status", selection: $state) {
                        ForEach(DressingState.uiCases, id: \.self) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.wheel)
                }
                
                GlassCard {
                    TextField("Notes...", text: $note)
                }

                Button("Save") {
                    onSave(timestamp, state, note)
                    dismiss()
                }
                .buttonStyle(LiquidButtonStyle(color: .purple))
            }
            .padding()
        }
    }
}

#Preview {
    ZStack {
        LiquidBackground()
        QuickLogView()
    }
}
