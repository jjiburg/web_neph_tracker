# NephTrack (React + Capacitor)

A nephrostomy care tracking app built with React and Capacitor, featuring an iOS 26 "Liquid Glass" design aesthetic.

## Goals
- Fast, bathroom-friendly logging for daily intake, outputs, flushes, bowel movements, and dressing checks
- Daily summaries with "End of Day" recording
- Offline-first with IndexedDB persistence
- Native iOS app via Capacitor

## Tech Stack
- **React** (Vite)
- **Capacitor** for iOS deployment
- **IndexedDB** (via `idb`) for local persistence
- **Framer Motion** for animations

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Add iOS platform
npm run cap:add:ios

# Sync web build to iOS
npm run cap:sync

# Open Xcode project
npm run cap:open:ios
```

## Deployment (Railway)

The app is optimized for deployment on Railway as a static site:
1. Connect your GitHub repository to Railway.
2. Railway will automatically detect the `start` script and build the project using Vite.
3. The app is served using `serve` on the port assigned by Railway.

## Project Structure
```
src/
├── main.jsx          # Entry point
├── App.jsx           # Root component with tab navigation
├── index.css         # Liquid Glass design system
├── store.js          # IndexedDB data layer
├── hooks.js          # React hooks for data management
├── views/
│   ├── QuickLogView.jsx
│   ├── HistoryView.jsx
│   └── SummaryView.jsx
└── components/
    ├── IntakeSheet.jsx
    ├── OutputSheet.jsx
    ├── FlushSheet.jsx
    ├── BowelSheet.jsx
    └── DressingSheet.jsx
```

## Design System
The app implements iOS 26 "Liquid Glass" aesthetics:
- Translucent cards with `backdrop-filter: blur()`
- Animated gradient backgrounds
- Large, accessible tap targets (min 56px)
- Floating tab bar with glass material

## Data Model
- **IntakeEntry**: amountMl, timestamp, note
- **OutputEntry**: type (bag/urinal), amountMl, symptoms, colorNote, timestamp
- **FlushEntry**: amountMl, timestamp, note
- **BowelEntry**: bristolScale, timestamp, note
- **DressingEntry**: state, timestamp, note
- **DailyTotal**: date, bagMl, urinalMl, totalMl, intakeMl

---

> **Note**: Mirror any updates to this file in `AGENTS.md`.
