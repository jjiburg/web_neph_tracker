# Output Tracker (React + Capacitor)

A nephrostomy care tracking app built with React and Capacitor, featuring an iOS 26 "Liquid Glass" design aesthetic.

## Goals
- Fast, bathroom-friendly logging for daily intake, outputs, flushes, bowel movements, and dressing checks
- Daily summaries with "End of Day" recording
- Offline-first with IndexedDB persistence
- Native iOS app via Capacitor
- Voice input for hands-free logging

## Tech Stack
- **React** (Vite)
- **Capacitor** for iOS deployment
- **IndexedDB** (via `idb`) for local persistence
- **Node.js/Express** for sync server
- **PostgreSQL** for cloud storage
- **Web Crypto API** for AES-GCM 256 E2E Encryption
- **Framer Motion** for animations
- **Gemini Flash 2.5** for voice command parsing

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Sync web build to iOS
npx cap sync ios

# Open Xcode project
npx cap open ios
```

## Deployment (Railway)

**Production URL**: `https://output-tracker-production.up.railway.app`

The app is deployed on Railway:
1. Connect your GitHub repository to Railway.
2. Add a **PostgreSQL** database to your project.
3. Railway will automatically detect the `start` script and build/run the project.
4. Set the following Environment Variables in Railway:
   - `DATABASE_URL`: (Automatically provided by Railway)
   - `JWT_SECRET`: Any random string for auth tokens.
   - `GEMINI_API_KEY`: Your Google Gemini API key for voice input.

## Voice Input Feature

The app includes a voice command feature using Gemini Flash 2.5:
- **Floating mic button** on QuickLogView with Voice Activity Detection (VAD)
- **Auto-stop recording** after 1.5 seconds of silence
- **Natural language parsing** for commands like:
  - "add 300ml hydration" → logs intake
  - "log 500ml bag output" → logs bag output
  - "natural output 200ml" → logs void output
  - "did a flush" → logs 30ml flush
  - "bowel movement type 4" → logs bowel

Backend: `server/gemini.js` → `/api/voice` endpoint

## AI Insights

The app includes an AI insights feature for the daily tracker session:
- **AI button** on QuickLogView Daily Snapshot
- Sends today's entries, daily goals, and current time-of-day
- Returns concise insights plus goal progress assessment

Backend: `server/gemini.js` → `/api/insights` endpoint

## Capacitor iOS

The iOS app is generated via Capacitor:
- **Project location**: `ios/App/Output Tracker.xcworkspace` (open this in Xcode)
- **API configuration**: `src/config.js` detects native platform and uses production API
  - Override with `VITE_API_BASE` at build time (e.g. `VITE_API_BASE=http://localhost:5173`)
- **CORS**: Server configured to accept `capacitor://localhost` origin

**Important for Capacitor:**
- All API calls use `API_BASE` from `src/config.js`
- On web: `API_BASE = ''` (relative paths)
- On native: `API_BASE = 'https://output-tracker-production.up.railway.app'`
- For local iOS builds: set `VITE_API_BASE=http://localhost:5173` and run `npm run build:local`
- For TestFlight builds: run `npm run build:prod` so it uses Railway
- When running `npx cap sync ios`, ensure your terminal uses UTF-8 to avoid CocoaPods errors:
  - `export LANG=en_US.UTF-8`
  - `export LC_ALL=en_US.UTF-8`
- When making changes that impact the iOS app, the coding agent should automatically:
  - run `npm run build`
  - run `npx cap sync ios` (after exporting UTF-8 env vars if needed)

## End-to-End Encryption (E2E)

Output Tracker uses a "Zero-Knowledge" architecture:
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
├── config.js         # API configuration (Capacitor detection)
├── store.js          # IndexedDB data layer
├── hooks.js          # React hooks for data management
├── import.js         # JSON backup import utility
├── encryption.js     # E2E encryption logic
├── sync.js           # Cloud synchronization service
├── views/
│   ├── QuickLogView.jsx   # Main logging UI with voice button
│   ├── HistoryView.jsx    # Log history with filters
│   └── SummaryView.jsx    # Daily totals and diagnostics
└── components/
    ├── AuthScreen.jsx     # Login/register
    ├── Icons.jsx          # Centralized SVG icons
    ├── GoalSheet.jsx      # Daily goals modal
    ├── VoiceButton.jsx    # Voice input with VAD
    ├── DiagnosticsPanel.jsx # Network diagnostics
    ├── ImportSheet.jsx
    ├── IntakeSheet.jsx
    ├── OutputSheet.jsx
    ├── FlushSheet.jsx
    ├── BowelSheet.jsx
    └── DressingSheet.jsx

server/
├── index.js          # Express server with CORS, auth, sync
└── gemini.js         # Gemini voice API endpoint
```

## Design System
The app implements iOS 26 "Liquid Glass" aesthetics:
- **Glassmorphism**: `glass-card` classes with `backdrop-filter: blur(20px)`, `rgba(255,255,255,0.06)` backgrounds, and `1px solid rgba(255,255,255,0.1)` borders.
- **Typography**: Inter font, utilizing `text-dim` and `text-accent` utility classes.
- **Interactive Elements**: `liquid-button` with spring physics and gradient backgrounds.
- **Iconography**: Centralized SVG icons via `Icons.jsx`.
- **Animation**: `Framer Motion` for sheet transitions and page enters (`AnimatePresence`).

## Data Model
- **IntakeEntry**: amountMl, timestamp, note
- **OutputEntry**: type (bag/void), amountMl, symptoms, colorNote, timestamp
- **FlushEntry**: amountMl, timestamp, note
- **BowelEntry**: bristolScale, timestamp, note
- **DressingEntry**: state, timestamp, note
- **DailyTotal**: date, bagMl, urinalMl, totalMl, intakeMl
- **GoalEntry**: intakeMl, outputMl, timestamp (goal history)

## API Endpoints
- `GET /api/health` - Health check for diagnostics
- `POST /api/register` - Create new user
- `POST /api/login` - Authenticate user
- `POST /api/sync/push` - Push encrypted entries (requires auth)
- `GET /api/sync/pull` - Pull encrypted entries (requires auth)
- `POST /api/voice` - Voice command parsing via Gemini
- `POST /api/insights` - Daily AI insights via Gemini

---

> **Note**: Mirror any updates to this file in `AGENTS.md`.
