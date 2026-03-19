# HealthLink Patient App

HealthLink is a mobile-based diagnostic support tool for rural and peri-urban Kenya. This patient app allows users to enter symptoms and receive immediate, rule-based guidance—even without internet.

## Features

- **Authentication**: Phone number + PIN login/registration.
- **Symptom Checker (Offline-First)**: Local diagnostic rules engine.
- **Multilingual Support**: English and Kiswahili translations.
- **Offline Data Sync**: Reports are saved locally and synced when internet is available.
- **History**: View past symptom checks and recommendations.

## Tech Stack

- **Framework**: React (Mobile-First Web Prototype)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animations**: Motion
- **Icons**: Lucide React
- **Storage**: LocalStorage (simulating AsyncStorage)

## Project Structure

- `src/App.tsx`: Main application logic and UI.
- `src/store.ts`: Zustand store for state management and persistence.
- `src/engine.ts`: Local diagnostic rules engine.
- `src/rules.json`: Knowledge base for symptoms and conditions.
- `src/translations.json`: i18n strings for English and Kiswahili.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open the app in your browser at `http://localhost:3000`.

## Diagnostic Rules Engine

The app uses a local `rules.json` file. The engine iterates over these rules and matches the user's selected symptoms. It prioritizes rules with more symptoms for higher specificity.

## Offline Capability

The app uses `zustand/middleware/persist` to store all user data and reports in `localStorage`. This ensures the app remains functional without an internet connection. A background sync process (simulated) marks reports as "synced" when a connection is detected.
