# NephTrack Agent Guide

## Goals
- Provide a SwiftUI iOS app for nephrostomy care tracking with fast, bathroom-friendly logging.
- Capture daily intake, outputs (bag + urinal), flushes, bowel movements, dressing state, and clinical notes.
- Summarize end-of-day totals for urine outputs.
- Optimize for iOS 26+ liquid-glass visual style with large, low-friction controls.

## UX Principles
- One-handed use; large tap targets; minimal typing in primary flows.
- “Log now” defaults with optional timestamp edits.
- Quick amount chips for common volumes; manual entry available.
- Clear daily summary with explicit “End Day” action.

## Architecture
- SwiftUI app with SwiftData persistence.
- Data models in a single file for easy iteration (can be split later).
- Views grouped by purpose: Quick Log (primary), History, Summary.
- Shared design tokens for glass materials, gradients, and spacing.

## Data Model (SwiftData)
- IntakeEntry: amountMl, date, notes.
- OutputBagEntry: amountMl, date, notes.
- OutputUrinalEntry: amountMl, date, notes.
- FlushEntry: date, notes.
- BowelMovementEntry: date, type/notes (Bristol optional), notes.
- DressingEntry: date, state, notes.
- DailyTotal: date, bagMl, urinalMl, totalMl, notes.

## Core Files
- `NephTrack/NephTrackApp.swift`: App entry; SwiftData container.
- `NephTrack/Models.swift`: SwiftData models and enums.
- `NephTrack/ContentView.swift`: Tab-based root navigation.
- `NephTrack/QuickLogView.swift`: Primary logging UX.
- `NephTrack/HistoryView.swift`: Log history and filters.
- `NephTrack/SummaryView.swift`: Daily totals and end-of-day action.
- `NephTrack/DesignSystem.swift`: Visual styles, gradients, spacing.

## Constraints
- iOS 26 minimum.
- No network or external services required.
- Keep app functional offline.

## Notes
- If iOS 26 APIs are unavailable in local Xcode, target may need a temporary downgrade for builds.
- Future enhancements could include export, reminders, or sync.
