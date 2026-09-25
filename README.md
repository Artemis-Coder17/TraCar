# 🚗 TraCar --> https://tra-car.vercel.app/

**Keep your car in check — track NCT, insurance, motor tax, service history and fuel all in one place.**

---

## 📱 What is TraCar?

TraCar is a lightweight, browser-based vehicle maintenance tracker designed to help you stay on top of everything related to your car. No sign-ups, no accounts — just a fast, private tool that works like a native app. Your data is persisted in a Supabase backend, and Vercel cron jobs automatically send you notifications when your NCT, insurance or motor tax is coming up for renewal.

## ✨ Features

### 🏠 Dashboard
- Personalised greeting with your name and car nickname
- Upload a photo of your car as the hero image
- Compliance status dots showing expiry countdowns for NCT, Insurance and Motor Tax
- Year-to-date spend tracker with fuel vs service cost breakdown

### 📋 Compliance Reminders
- Add NCT, Insurance and Motor Tax expiry dates
- Color-coded status: 🟢 Good, 🟡 Warning (≤30 days), 🔴 Urgent (≤7 days)
- `Add to Calendar` button generates ICS files for Google/Apple Calendar
- Expired reminders stay visible for 30 days then auto-disappear
- **Automated notifications** — Vercel cron jobs check expiry dates on a schedule and send you a notification when NCT, Insurance or Motor Tax is approaching

### ⛽ Fuel Logging
- Log fuel fills with date, litres, price per litre and total cost
- See monthly spending trends with a Recharts bar chart
- Export your fuel history as CSV for AI-powered insights

### 🔧 Service History
- Record services with date, mileage, description and cost
- Track upcoming services by interval (time or mileage)
- Activity feed showing all your past log entries

### ⚙️ Vehicle Settings
- Set your name, car nickname, registration, make, model, year, colour and fuel type
- Upload or change your car photo
- Tap the car name or registration to edit anytime

### 🗑️ Data Management
- All data stored persistently in **Supabase** (PostgreSQL)
- "Clear All Data" with confirmation phrase to prevent accidents
- No tracking, no analytics — your data is yours

### 🎨 Design
- Dark glassmorphism UI with animated ambient background blobs
- Glass-liquid cards with specular highlight effects
- Pulse animations for urgent compliance items
- Bottom navigation bar with floating action button
- Responsive design optimised for mobile (iPhone/Android)
- PWA-ready: add to home screen for app-like experience

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |
| Icons | Inline SVGs |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Scheduled Jobs | [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) |
| Hosting | [Vercel](https://vercel.com/) |

## 📄 Data & Privacy

Your data is stored in a **Supabase** PostgreSQL database — giving you persistence across devices and sessions without relying on browser storage. There are no third-party analytics or tracking services. Vercel cron jobs run on a schedule and send automated notifications when your NCT, Insurance or Motor Tax is due — no manual checking required.

## ⏰ Cron Jobs

TraCar uses **Vercel Cron Jobs** to run scheduled background tasks that keep your compliance reminders proactive:

- **Expiry notifications** — checks all stored NCT, Serice Reminders, Insurance and Motor Tax dates on a schedule and automatically sends a notification when a reminder is approaching (🟡 ≤30 days) or urgent (🔴 ≤7 days)
- **Expired reminder cleanup** — automatically removes compliance items that have been expired for more than 30 days

Notifications are triggered based on the same urgency thresholds shown in the UI, so you get alerted at the right time without having to open the app. Cron schedules are defined in `vercel.json` and run serverlessly on Vercel's infrastructure.

## 📱 Install as a Web App

TraCar works best when added to your home screen:

1. Open TraCar in your browser
2. Tap **Share** (iOS) or **⋮ Menu → Install** (Android/Chrome)
3. Tap **"Add to Home Screen"**
4. Launch from your home screen for a full-screen, app-like experience

## 🙌 Credits

Made by [Artemis Coder](https://github.com/Artemis-Coder17)
