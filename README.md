# 🚗 TraCar

**Keep your car in check — track NCT, insurance, motor tax, service history and fuel all in one place.**

---

## 📱 What is TraCar?

TraCar is a lightweight, browser-based vehicle maintenance tracker designed to help you stay on top of everything related to your car. No sign-ups, no accounts, no cloud — just a fast, private tool that lives in your browser and works like a native app.

## ✨ Features

### 🏠 Dashboard
- Personalised greeting with your name and car nickname
- Upload a photo of your car as the hero image
- Compliance status dots showing expiry countdowns for NCT, Insurance and Motor Tax
- Year-to-date spend tracker with fuel vs service cost breakdown

### 📋 Compliance Reminders
- Add NCT, Insurance and Motor Tax expiry dates
- Color-coded status: 🟢 Good, 🟡 Warning (≤30 days), 🔴 Urgent (≤7 days)
- "Add to Calendar" button generates ICS files for Google/Apple Calendar
- Expired reminders stay visible for 30 days then auto-disappear

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
- All data stored locally in your browser via `localStorage`
- "Clear All Data" with confirmation phrase to prevent accidents
- No accounts, no servers, no tracking

### 🎨 Design
- Dark glassmorphism UI with animated ambient background blobs
- Glass-liquid cards with specular highlight effects
- Pulse animations for urgent compliance items
- Bottom navigation bar with floating action button
- Responsive design optimised for mobile (iPhone/Android)
- PWA-ready: add to home screen for app-like experience

## 📸 Screenshots

| Dashboard | Compliance | Fuel Log |
|-----------|------------|----------|
| 🏠 Car photo, status dots, YTD spend | 📋 NCT, Insurance, Motor Tax reminders | ⛽ Fill logging with charts |

| Service | Settings |
|---------|----------|
| 🔧 Service history and upcoming intervals | ⚙️ Vehicle details and data management |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) |
| Charts | [Recharts](https://recharts.org/) |
| Toasts | [Sonner](https://sonner.emilkowal.ski/) |
| Icons | Inline SVGs |
| Storage | `localStorage` |


## 📄 Data & Privacy

Everything is saved **locally in your browser**. There are no servers, no analytics, no tracking. If you clear your browser data, your TraCar data goes with it. This is by design — your car data stays yours.

## 📱 Install as a Web App

TraCar works best when added to your home screen:

1. Open TraCar in your browser
2. Tap **Share** (iOS) or **⋮ Menu → Install** (Android/Chrome)
3. Tap **"Add to Home Screen"**
4. Launch from your home screen for a full-screen, app-like experience

> 💡 Use the same browser each time to keep your data persistent.

## 🙌 Credits

Made by [Artemis Coder](https://github.com/Artemis-Coder17)
