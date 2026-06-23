# OpenFit Local 🏋️‍♂️

A **free, offline-first** home workout PWA — no ads, no subscriptions, no internet required after first load.

🔗 **Live App:** [skfshashank.github.io/HomeWorkoutApp](https://skfshashank.github.io/HomeWorkoutApp/)

## Why OpenFit Local?

Built for Indian 9-to-5 professionals who want effective home workouts without gym memberships or expensive apps. Targets belly fat reduction, flexibility, and overall fitness through scientifically-backed exercise routines.

## Features

| Feature | Description |
|---------|-------------|
| 🎯 Smart Onboarding | 4-step wizard tailors workouts to your goal, focus area, time, and level |
| 📅 Daily Workout Plans | Auto-generated based on your profile — belly fat, yoga, HIIT, strength |
| 🏃 Guided Workout Player | Timer, rep counter, animated SVG demos, step-by-step instructions |
| 🔥 Streaks & Consistency | Track daily streaks with a weekly calendar heatmap |
| 🏆 Achievements & XP | Gamified progression system with unlockable milestones |
| 📊 Progress Tracker | BMI calculator, body fat estimator, workout history, measurement log |
| 🧘 Yoga & Pranayama | Full library including Surya Namaskar, Warrior, Tree Pose, and more |
| 💧 Water Tracker | 8-glass daily hydration tracker on the dashboard |
| 🪑 Desk Break Timer | 45-min Pomodoro-style reminder for office workers |
| 🗓️ 30-Day Challenge | Grid-based monthly challenge with daily checkoffs |
| 👤 Multi-Profile | Switch between family members — each with separate history |
| 🌙 Dark/Light Theme | System-aware theme with manual override |
| 🌐 Bilingual | English + Hindi (हिंदी) |
| 💾 Backup/Restore | Export/import all data as JSON |
| 📴 100% Offline | Works without internet after first visit (PWA + Service Worker) |

## Tech Stack

- **Vanilla JS** (ES Modules) — zero dependencies, zero build step
- **Clean Architecture** — Domain → Application → Infrastructure → UI
- **IndexedDB** for structured data, localStorage for preferences
- **Service Worker** with network-first strategy for code, cache-first for assets
- **GitHub Pages** for hosting (static files only)

## Architecture

```
src/
├── app/            # Bootstrap, Router, EventBus
├── application/    # Use Cases (GetProgress, StartWorkout, etc.)
├── core/           # Storage, i18n, utilities, SVG animations
├── domain/         # Entities (User) & Services (SchedulerEngine)
└── features/       # UI Views (Dashboard, Trainer, Progress, Settings)
```

## Exercise Catalog

116 exercises across 10 categories:
- Belly Fat, Core, Upper Body, Lower Body
- HIIT, Full Body, Yoga, Pranayama
- Stretch, Office-friendly

Each exercise includes: animated SVG demo, step-by-step instructions, breathing cues, tips, common mistakes, and Hindi translations.

## Getting Started

1. Visit [the live app](https://skfshashank.github.io/HomeWorkoutApp/)
2. Complete the 4-step onboarding
3. Start your first workout!

### Local Development

```bash
# Clone
git clone https://github.com/skfshashank/HomeWorkoutApp.git
cd HomeWorkoutApp

# Serve (any static server works)
npx serve .
# or
python -m http.server 8000
```

No build step required — open `index.html` directly or serve with any static file server.

## Target Audience

- 🇮🇳 Indian office workers (9-5 schedule)
- People wanting belly fat reduction at home
- Users who prefer offline apps without subscriptions
- Beginners to advanced — adaptive difficulty

## License

MIT