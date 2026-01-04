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
- **Node.js/Express** for sync server
- **PostgreSQL** for cloud storage
- **Web Crypto API** for AES-GCM 256 E2E Encryption
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

The app is optimized for deployment on Railway:
1. Connect your GitHub repository to Railway.
2. Add a **PostgreSQL** database to your project.
3. Railway will automatically detect the `start` script and build/run the project.
4. Set the following Environment Variables in Railway:
   - `DATABASE_URL`: (Automatically provided by Railway)
   - `JWT_SECRET`: Any random string for auth tokens.

## End-to-End Encryption (E2E)

NephTrack uses a "Zero-Knowledge" architecture:
- **Passphrase**: You set a passphrase on your device. This passphrase is NEVER sent to the server.
- **Encryption**: Data is encrypted using AES-GCM (256-bit) before leaving your device.
- **Privacy**: The server only sees encrypted blobs. Even if the database is compromised, your health data remains unreadable without your passphrase.
  - ⚠️ **Important**: If you lose your passphrase, your cloud-synced data cannot be recovered.

## Project Structure
```
src/
├── main.jsx          # Entry point
├── App.jsx           # Root component with tab navigation
├── index.css         # Liquid Glass design system (Global Styles)
├── store.js          # IndexedDB data layer
├── hooks.js          # React hooks for data management
├── import.js         # JSON backup import utility
├── encryption.js     # E2E encryption logic
├── sync.js           # Cloud synchronization service
├── views/
│   ├── QuickLogView.jsx
│   ├── HistoryView.jsx
│   └── SummaryView.jsx
└── components/
    ├── AuthScreen.jsx
    ├── Icons.jsx     # Centralized SVG icon definitions
    ├── ImportSheet.jsx
    ├── IntakeSheet.jsx
    ├── OutputSheet.jsx
    ├── FlushSheet.jsx
    ├── BowelSheet.jsx
    └── DressingSheet.jsx
```

## Design System
The app implements iOS 26 "Liquid Glass" aesthetics:
- **Glassmorphism**: `glass-card` classes with `backdrop-filter: blur(20px)`, `rgba(255,255,255,0.06)` backgrounds, and `1px solid rgba(255,255,255,0.1)` borders.
- **Typography**: Inter font, utilizing `text-dim` and `text-accent` utility classes.
- **Interactive Elements**: `liquid-button` with spring physics and gradient backgrounds.
- **Iconography**: Centralized SVG icons via `Icons.jsx` replacing legacy emojis.
- **Animation**: `Framer Motion` for sheet transitions and page enters (`AnimatePresence`).

## Data Model
- **IntakeEntry**: amountMl, timestamp, note
- **OutputEntry**: type (bag/urinal), amountMl, symptoms, colorNote, timestamp
- **FlushEntry**: amountMl, timestamp, note
- **BowelEntry**: bristolScale, timestamp, note
- **DressingEntry**: state, timestamp, note
- **DailyTotal**: date, bagMl, urinalMl, totalMl, intakeMl

---

> **Note**: Mirror any updates to this file in `AGENTS.md`.
