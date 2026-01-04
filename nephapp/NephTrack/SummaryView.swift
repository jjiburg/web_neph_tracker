import SwiftUI
import SwiftData

struct SummaryView: View {
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \OutputEntry.timestamp, order: .reverse) private var outputs: [OutputEntry]
    @Query(sort: \IntakeEntry.timestamp, order: .reverse) private var intakes: [IntakeEntry]
    @Query(sort: \FlushEntry.timestamp, order: .reverse) private var flushes: [FlushEntry]
    @Query(sort: \BowelMovementEntry.timestamp, order: .reverse) private var bowelMovements: [BowelMovementEntry]
    @Query(sort: \DressingEntry.timestamp, order: .reverse) private var dressings: [DressingEntry]
    @Query(sort: \DailyTotalEntry.day, order: .reverse) private var dailyTotals: [DailyTotalEntry]

    @State private var selectedDay = Date()
    @State private var lastRecordedMessage: String?
    @State private var headerOffset: CGFloat = 0

    var body: some View {
        ZStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Color.clear.frame(height: 60) // Header spacer
                    
                    dayPicker
                    summaryCard
                    actionCard
                    totalsHistoryCard
                    
                    Color.clear.frame(height: 100)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            .coordinateSpace(name: "scroll")
            .onPreferenceChange(ScrollOffsetKey.self) { headerOffset = $0 }
        }
        .overlay(alignment: .top) {
            ScreenHeader(title: "Summary", subtitle: selectedDay.formatted(date: .abbreviated, time: .omitted))
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.ultraThinMaterial.opacity(headerOpacity))
                .blur(radius: headerBlur)
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.85), value: lastRecordedMessage)
    }

    private var headerOpacity: Double {
        let offset = -headerOffset
        return min(max(offset / 100, 0), 1)
    }
    
    private var headerBlur: CGFloat {
        let offset = -headerOffset
        return min(max(offset / 20, 0), 20)
    }

    private var dayPicker: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                   Text("Day")
                       .font(DesignSystem.font(.headline, weight: .bold))
                       .foregroundStyle(.white)
                   Spacer()
                   DatePicker("", selection: $selectedDay, displayedComponents: .date)
                       .datePickerStyle(.compact)
                       .labelsHidden()
                }

                Button("Jump to Today") {
                    withAnimation { selectedDay = Date() }
                }
                .buttonStyle(GlassChipStyle(active: Calendar.current.isDateInToday(selectedDay)))
            }
        }
    }

    private var summaryCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Totals for \(selectedDay.formatted(date: .abbreviated, time: .omitted))")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 12)], spacing: 12) {
                    SummaryStat(title: "Bag Output", value: Units.formatMl(bagTotal))
                    SummaryStat(title: "Voided Output", value: Units.formatMl(voidedTotal))
                    SummaryStat(title: "Total Output", value: Units.formatMl(totalOutput))
                    SummaryStat(title: "Intake", value: Units.formatMl(intakeTotal))
                }

                HStack(spacing: 12) {
                    SummaryPill(title: "Flushes", value: "\(flushCount)")
                    SummaryPill(title: "BM", value: "\(bowelCount)")
                    SummaryPill(title: "Dressing", value: dressingSummary)
                }
            }
        }
    }

    private var actionCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("End of Day")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                Button {
                    recordEndOfDay()
                } label: {
                    Label("Record End of Day Totals", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(LiquidButtonStyle())

                if let lastRecordedMessage {
                    Text(lastRecordedMessage)
                        .font(DesignSystem.font(.footnote))
                        .foregroundStyle(.secondary)
                        .transition(.opacity)
                }
            }
        }
    }

    private var totalsHistoryCard: some View {
        GlassCard {
            VStack(alignment: .leading, spacing: 16) {
                Text("Recorded Daily Totals")
                    .font(DesignSystem.font(.headline, weight: .bold))
                    .foregroundStyle(.white)

                if dailyTotals.isEmpty {
                    Text("No totals recorded yet.")
                        .font(DesignSystem.font(.footnote))
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(dailyTotals.prefix(7)) { total in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(total.day.formatted(date: .abbreviated, time: .omitted))
                                .font(DesignSystem.font(.subheadline, weight: .semibold))
                                .foregroundStyle(.white)
                            Text("Bag \(Units.formatMl(total.bagTotalMl)) • Voided \(Units.formatMl(total.urinalTotalMl)) • Total \(Units.formatMl(total.totalOutputMl))")
                                .font(DesignSystem.font(.footnote))
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        .padding(12)
                        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
        }
    }

    private var dayOutputs: [OutputEntry] {
        outputs.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDay) }
    }

    private var dayIntakes: [IntakeEntry] {
        intakes.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDay) }
    }

    private var dayFlushes: [FlushEntry] {
        flushes.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDay) }
    }

    private var dayBowelMovements: [BowelMovementEntry] {
        bowelMovements.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDay) }
    }

    private var dayDressings: [DressingEntry] {
        dressings.filter { Calendar.current.isDate($0.timestamp, inSameDayAs: selectedDay) }
    }

    private var bagTotal: Double {
        dayOutputs.filter { $0.type == .bag }.reduce(0) { $0 + $1.amountMl }
    }

    private var voidedTotal: Double {
        dayOutputs.filter { $0.type == .urinal }.reduce(0) { $0 + $1.amountMl }
    }

    private var totalOutput: Double {
        bagTotal + voidedTotal
    }

    private var intakeTotal: Double {
        dayIntakes.reduce(0) { $0 + $1.amountMl }
    }

    private var flushCount: Int {
        dayFlushes.count
    }

    private var bowelCount: Int {
        dayBowelMovements.count
    }

    private var dressingSummary: String {
        guard let latest = dayDressings.sorted(by: { $0.timestamp > $1.timestamp }).first else {
            return "None"
        }
        return latest.state.rawValue
    }

    private func recordEndOfDay() {
        let dayStart = Calendar.current.startOfDay(for: selectedDay)
        let existing = dailyTotals.first { Calendar.current.isDate($0.day, inSameDayAs: selectedDay) }
        let total = bagTotal + voidedTotal

        if let existing {
            existing.day = dayStart
            existing.bagTotalMl = bagTotal
            existing.urinalTotalMl = voidedTotal
            existing.totalOutputMl = total
            existing.intakeTotalMl = intakeTotal
            withAnimation {
                lastRecordedMessage = "Updated totals for \(dayStart.formatted(date: .abbreviated, time: .omitted))."
            }
        } else {
            let entry = DailyTotalEntry(
                day: dayStart,
                bagTotalMl: bagTotal,
                urinalTotalMl: voidedTotal,
                totalOutputMl: total,
                intakeTotalMl: intakeTotal
            )
            modelContext.insert(entry)
            withAnimation {
                lastRecordedMessage = "Recorded totals for \(dayStart.formatted(date: .abbreviated, time: .omitted))."
            }
        }
        
        // Clear message after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            withAnimation {
                lastRecordedMessage = nil
            }
        }
    }
}

private struct SummaryStat: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(DesignSystem.font(.caption, weight: .bold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(DesignSystem.font(.title3, weight: .bold))
                .foregroundStyle(.white)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct SummaryPill: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(DesignSystem.font(.caption, weight: .medium))
                .foregroundStyle(.secondary)
            Text(value)
                .font(DesignSystem.font(.subheadline, weight: .bold))
                .foregroundStyle(.white)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .frame(maxWidth: .infinity)
        .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

#Preview {
    NavigationStack {
        SummaryView()
    }
}
