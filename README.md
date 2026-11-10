# My PA — Personal Assistant Web App & PWA

**My PA** is a clean, modern, mobile-friendly personal assistant web application and Progressive Web App (PWA). It features two-way Google Calendar synchronization, natural language Quick Add with voice recognition, habit tracking with streaks, a Pomodoro focus timer with ambient soundscapes, smart overdue task rescheduling, interactive push notifications, and local SQLite data persistence.

---

## 🌟 Key Features

1. **Modern Responsive Design & Dark Mode**:
   - Clean, mobile-friendly UI with glassmorphic cards, micro-interactions, desktop sidebar, and a dedicated mobile bottom dock.
   - Light Mode, Dark Mode, and System Default themes with instant toggle.

2. **Google Sign-In & Google Calendar Two-Way Sync**:
   - Seamless two-way calendar sync: Google Calendar events show up on your timeline and dashboard.
   - Tasks created with due dates and times automatically create matching events on your calendar.
   - Manual "Sync Now" button and automatic background sync.

3. **Home Dashboard (Unified View)**:
   - **Today's Schedule**: Hourly chronological timeline integrating Google Calendar appointments and scheduled tasks with Google Meet join links.
   - **To-Do List**: Inline completion, priority flags, category chips, subtasks checklist progress, and edit drawers.
   - **Upcoming Deadlines**: Countdown indicators (*Due in 2 hours*, *Tomorrow*, *In 3 days*).
   - **Daily Momentum**: Real-time counter of tasks completed today, pending tasks, and active habit streaks.

4. **Task Management & Quick Add**:
   - Fields: Title, Notes/description, Due date & time, Priority (Urgent, High, Medium, Low), Category (Work, Personal, Health, Study, Finance, Errands), Repeat rule (None, Daily, Weekly, Monthly), and Subtasks checklist.
   - **Quick Add with Natural Language Processing (NLP)**:
     - Type: `"call mom tomorrow at 5 pm"`, `"team sprint on friday at 10am #work !high"`, `"gym workout daily at 7 am #health"`.
     - Automatically parses task title, date, time, priority tags (`!urgent`, `!high`), categories (`#work`, `#personal`), and recurring frequency (`daily`, `weekly`).
   - **Voice Input**:
     - Speech-to-text powered by the Web Speech API (`SpeechRecognition`).
     - Click the microphone icon or tap voice input on mobile to dictate tasks directly.

5. **Alerts & Smart Notifications**:
   - **Daily Morning Summary**: Configurable delivery time (e.g. 08:00 AM) summarizing today's schedule and tasks.
   - **Evening Review**: Configurable delivery time (e.g. 08:00 PM) reviewing unfinished tasks and prompting rescheduling.
   - **Browser Push Notifications**: Integrated with Web Notification API and Service Worker actions (*Mark Done*, *Snooze 15m*).
   - **Web Audio Alert Synthesizer**: 5 distinct selectable audio alert themes (*Gentle Chime*, *Modern Bell*, *Upbeat Marimba*, *Crisp Digital Ping*, *Zen Singing Bowl*) with preview buttons.
   - **Email Notifications**: Formatted HTML email template preview and simulation for morning digests and evening check-ins.

6. **Overdue Tasks with Smart 1-Click Rescheduling**:
   - Highlights tasks that have passed their deadline.
   - 1-click actions: *Reschedule to Today*, *Tomorrow at 9 AM*, *This Weekend*, or *Pick custom date*.

7. **Habit Tracker with Streaks**:
   - Visual flame streak counter (🔥 X days streak, best streak).
   - 7-day rolling matrix check-in grid for quick 1-click logging.
   - Add custom habits with icons, frequency, and categories.

8. **Pomodoro Focus Timer**:
   - 25m Focus / 5m Short Break / 15m Long Break with animated circular SVG countdown.
   - Task linkage: Link timer to a specific to-do item.
   - Synthesized ambient audio generator: *Gentle Rain*, *Forest Stream*, *White Noise*, or *Subtle Clock Tick* with volume slider.
   - Auto-logs focus minutes to your database and weekly productivity report.

9. **Notes & Ideas**:
   - Color-coded markdown-friendly notes with tags, search, and pin-to-top functionality.

10. **Weekly Progress Report**:
    - Interactive SVG bar chart showing daily task completions and creations (Monday to Sunday).
    - Category distribution progress bars and focus time breakdown.

11. **Progressive Web App (PWA) & Offline Mode**:
    - `manifest.json` and `sw.js` service worker for home screen installation on mobile phones and desktops.
    - IndexedDB offline cache ensures full functionality even without internet access.

12. **Secure Database Persistence**:
    - Node.js v24 native `node:sqlite` (`database.sqlite`) provides lightning-fast zero-dependency SQL persistence.

---

## 🚀 Quick Start Guide

### 1. Launch the Server
Inside `C:\Users\K KRISHNA CHARAN\.gemini\antigravity\scratch\my-pa`:

```bash
# Run using Node directly
node server.js

# Or double-click the included Windows batch file:
START_MY_PA.bat
```

### 2. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in Chrome, Edge, Safari, or your mobile browser.

---

## 📱 Installing on Phone (PWA)
1. Open `http://<your-computer-ip>:3000` or deploy to any web host.
2. Tap the **Install My PA** prompt banner or tap the browser menu (e.g. Chrome's **"Add to Home Screen"** or Safari's **"Share" -> "Add to Home Screen"**).
3. The app will launch in standalone fullscreen mode like a native mobile app!
