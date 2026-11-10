const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.sqlite');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Setup Schema
db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    google_connected INTEGER DEFAULT 1,
    google_calendar_id TEXT DEFAULT 'primary',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    due_date TEXT,
    due_time TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'Work',
    repeat_frequency TEXT DEFAULT 'none',
    subtasks_json TEXT DEFAULT '[]',
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    google_event_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT DEFAULT 'target',
    category TEXT DEFAULT 'Health',
    target_frequency TEXT DEFAULT 'daily',
    history_json TEXT DEFAULT '[]',
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id TEXT,
    duration_minutes INTEGER NOT NULL,
    mode TEXT DEFAULT 'work',
    completed_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    color TEXT DEFAULT 'blue',
    pinned INTEGER DEFAULT 0,
    tags_json TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    google_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    location TEXT DEFAULT '',
    meet_link TEXT DEFAULT '',
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    user_id TEXT PRIMARY KEY,
    morning_summary_time TEXT DEFAULT '08:00',
    evening_review_time TEXT DEFAULT '20:00',
    reminder_minutes_before INTEGER DEFAULT 15,
    timezone TEXT DEFAULT 'auto',
    sound_theme TEXT DEFAULT 'chime',
    color_theme TEXT DEFAULT 'system',
    email_notifications INTEGER DEFAULT 1,
    push_notifications INTEGER DEFAULT 1,
    email_address TEXT DEFAULT 'user@gmail.com',
    google_sync_enabled INTEGER DEFAULT 1,
    google_client_id TEXT DEFAULT '',
    google_api_key TEXT DEFAULT ''
  );
`);

// Seed default user and demo data if database is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const defaultUserId = 'user_demo_1';
  db.prepare(`
    INSERT INTO users (id, email, name, avatar, google_connected)
    VALUES (?, ?, ?, ?, 1)
  `).run(defaultUserId, 'krishnacharan@gmail.com', 'Krishna Charan', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80');

  db.prepare(`
    INSERT INTO settings (user_id, morning_summary_time, evening_review_time, reminder_minutes_before, sound_theme, color_theme, email_address)
    VALUES (?, '08:00', '20:00', 15, 'chime', 'system', 'krishnacharan@gmail.com')
  `).run(defaultUserId);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Initial Sample Tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, user_id, title, notes, due_date, due_time, priority, category, repeat_frequency, subtasks_json, completed, google_event_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTask.run(
    'task_1',
    defaultUserId,
    'Client Strategy Meeting & Q4 Roadmap',
    'Review quarterly goals, KPI milestones, and finalize deliverables with stakeholders.',
    todayStr,
    '10:30',
    'high',
    'Work',
    'none',
    JSON.stringify([
      { id: 'sub_1', text: 'Prepare presentation slides', done: true },
      { id: 'sub_2', text: 'Export analytics PDF', done: true },
      { id: 'sub_3', text: 'Share meeting minutes', done: false }
    ]),
    0,
    'gcal_evt_1'
  );

  insertTask.run(
    'task_2',
    defaultUserId,
    'Review Pull Request for Auth & Security',
    'Double check Google OAuth tokens, PKCE flow, and SQL injection sanitization.',
    todayStr,
    '14:00',
    'urgent',
    'Work',
    'none',
    JSON.stringify([
      { id: 'sub_4', text: 'Run unit test suite', done: false },
      { id: 'sub_5', text: 'Verify CSRF protection', done: false }
    ]),
    0,
    'gcal_evt_2'
  );

  insertTask.run(
    'task_3',
    defaultUserId,
    'Pay monthly utility and internet bills',
    'High priority household finance.',
    yesterdayStr,
    '18:00',
    'urgent',
    'Finance',
    'monthly',
    JSON.stringify([]),
    0,
    null
  );

  insertTask.run(
    'task_4',
    defaultUserId,
    'Evening 30-minute cardio & stretch',
    'Run 4km around the park and complete post-workout stretches.',
    todayStr,
    '18:30',
    'medium',
    'Health',
    'daily',
    JSON.stringify([]),
    0,
    null
  );

  insertTask.run(
    'task_5',
    defaultUserId,
    'Read 2 chapters of System Design Interview',
    'Focus on distributed cache and rate limiter design.',
    tomorrowStr,
    '21:00',
    'low',
    'Study',
    'none',
    JSON.stringify([]),
    0,
    null
  );

  // Initial Habits
  const insertHabit = db.prepare(`
    INSERT INTO habits (id, user_id, title, icon, category, target_frequency, history_json, streak, best_streak)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // History entries for habits (last 7 days)
  const habitDates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    habitDates.push(d.toISOString().slice(0, 10));
  }

  insertHabit.run('habit_1', defaultUserId, 'Drink 2.5 Liters of Water', 'droplet', 'Health', 'daily', JSON.stringify([habitDates[0], habitDates[1], habitDates[2], habitDates[3], habitDates[4], habitDates[5]]), 6, 14);
  insertHabit.run('habit_2', defaultUserId, 'Morning 10m Meditation', 'sun', 'Mindfulness', 'daily', JSON.stringify([habitDates[1], habitDates[2], habitDates[3], habitDates[4], habitDates[5]]), 5, 12);
  insertHabit.run('habit_3', defaultUserId, 'Read 20 Pages', 'book-open', 'Learning', 'daily', JSON.stringify([habitDates[2], habitDates[3], habitDates[4], habitDates[5]]), 4, 9);
  insertHabit.run('habit_4', defaultUserId, 'No Screen 30m Before Sleep', 'moon', 'Health', 'daily', JSON.stringify([habitDates[3], habitDates[4], habitDates[5]]), 3, 7);

  // Initial Notes
  const insertNote = db.prepare(`
    INSERT INTO notes (id, user_id, title, content, color, pinned, tags_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertNote.run(
    'note_1',
    defaultUserId,
    'Ideas for Q4 Product Growth',
    '1. Implement AI voice notes transcription\n2. Add Slack & Discord webhook integration\n3. Biometric screen lock for mobile PWA\n4. Smart reschedule recommendations algorithm',
    'purple',
    1,
    JSON.stringify(['Product', 'Strategy', 'Roadmap'])
  );

  insertNote.run(
    'note_2',
    defaultUserId,
    'Healthy Grocery Essentials',
    '- Greek yogurt & almond milk\n- Blueberries, bananas, avocados\n- Sourdough bread & farm eggs\n- Spinach, bell peppers, broccoli',
    'emerald',
    0,
    JSON.stringify(['Personal', 'Shopping'])
  );

  // Initial Google Calendar Events (Synced)
  const insertEvent = db.prepare(`
    INSERT INTO calendar_events (id, user_id, google_id, title, description, start_time, end_time, location, meet_link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(
    'evt_1',
    defaultUserId,
    'gcal_evt_1',
    'Client Strategy Meeting & Q4 Roadmap',
    'Discuss milestones with executive leadership',
    `${todayStr}T10:30:00`,
    `${todayStr}T11:30:00`,
    'Google Meet',
    'https://meet.google.com/xyz-mypa-meet'
  );

  insertEvent.run(
    'evt_2',
    defaultUserId,
    'gcal_evt_2',
    'Design Sync: Design System 2.0',
    'Review typography tokens, dark mode themes, and mobile responsive gestures',
    `${todayStr}T14:00:00`,
    `${todayStr}T15:00:00`,
    'Zoom Room 4',
    'https://zoom.us/j/9876543210'
  );

  insertEvent.run(
    'evt_3',
    defaultUserId,
    'gcal_evt_3',
    'Doctor Checkup & Health Consultation',
    'Routine annual health evaluation',
    `${tomorrowStr}T09:00:00`,
    `${tomorrowStr}T10:00:00`,
    'St. Jude Medical Center',
    ''
  );

  // Seed Focus sessions
  const insertFocus = db.prepare(`
    INSERT INTO focus_sessions (id, user_id, task_id, duration_minutes, mode, completed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertFocus.run('foc_1', defaultUserId, 'task_1', 25, 'work', `${habitDates[4]} 11:00:00`);
  insertFocus.run('foc_2', defaultUserId, 'task_1', 25, 'work', `${habitDates[4]} 11:30:00`);
  insertFocus.run('foc_3', defaultUserId, 'task_2', 25, 'work', `${habitDates[5]} 15:00:00`);
  insertFocus.run('foc_4', defaultUserId, 'task_4', 25, 'work', `${habitDates[6]} 09:30:00`);
}

// Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const currentUserId = 'user_demo_1'; // Active session

  try {
    // API Routes
    if (pathname.startsWith('/api/')) {
      // 1. GET Current User & Settings
      if (pathname === '/api/user' && req.method === 'GET') {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId);
        const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(currentUserId);
        return sendJson(res, 200, { success: true, user, settings });
      }

      // 2. PUT User Settings
      if (pathname === '/api/settings' && req.method === 'PUT') {
        const body = await parseBody(req);
        const stmt = db.prepare(`
          INSERT INTO settings (
            user_id, morning_summary_time, evening_review_time, reminder_minutes_before,
            timezone, sound_theme, color_theme, email_notifications, push_notifications,
            email_address, google_sync_enabled, google_client_id, google_api_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            morning_summary_time = excluded.morning_summary_time,
            evening_review_time = excluded.evening_review_time,
            reminder_minutes_before = excluded.reminder_minutes_before,
            timezone = excluded.timezone,
            sound_theme = excluded.sound_theme,
            color_theme = excluded.color_theme,
            email_notifications = excluded.email_notifications,
            push_notifications = excluded.push_notifications,
            email_address = excluded.email_address,
            google_sync_enabled = excluded.google_sync_enabled,
            google_client_id = excluded.google_client_id,
            google_api_key = excluded.google_api_key
        `);
        stmt.run(
          currentUserId,
          body.morning_summary_time || '08:00',
          body.evening_review_time || '20:00',
          body.reminder_minutes_before !== undefined ? body.reminder_minutes_before : 15,
          body.timezone || 'auto',
          body.sound_theme || 'chime',
          body.color_theme || 'system',
          body.email_notifications ? 1 : 0,
          body.push_notifications ? 1 : 0,
          body.email_address || 'user@gmail.com',
          body.google_sync_enabled ? 1 : 0,
          body.google_client_id || '',
          body.google_api_key || ''
        );
        return sendJson(res, 200, { success: true, message: 'Settings saved' });
      }

      // 3. TASKS
      if (pathname === '/api/tasks' && req.method === 'GET') {
        const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY completed ASC, due_date ASC, due_time ASC').all(currentUserId);
        const parsed = tasks.map(t => ({
          ...t,
          completed: Boolean(t.completed),
          subtasks: JSON.parse(t.subtasks_json || '[]')
        }));
        return sendJson(res, 200, { success: true, tasks: parsed });
      }

      if (pathname === '/api/tasks' && req.method === 'POST') {
        const body = await parseBody(req);
        const id = 'task_' + crypto.randomUUID();
        const subtasksJson = JSON.stringify(body.subtasks || []);
        
        let googleEventId = body.google_event_id || null;
        // Two-way sync: if task has due_date and google sync is active, create matching calendar event
        const userSettings = db.prepare('SELECT google_sync_enabled FROM settings WHERE user_id = ?').get(currentUserId);
        if (userSettings && userSettings.google_sync_enabled && body.due_date) {
          googleEventId = 'gcal_' + crypto.randomUUID().slice(0, 8);
          const startTime = `${body.due_date}T${body.due_time || '09:00'}:00`;
          const endHour = parseInt((body.due_time || '09:00').split(':')[0], 10) + 1;
          const endTime = `${body.due_date}T${String(endHour).padStart(2, '0')}:00:00`;
          
          db.prepare(`
            INSERT INTO calendar_events (id, user_id, google_id, title, description, start_time, end_time, location)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run('evt_' + crypto.randomUUID(), currentUserId, googleEventId, body.title, body.notes || 'Created via My PA task sync', startTime, endTime, 'My PA Calendar');
        }

        db.prepare(`
          INSERT INTO tasks (
            id, user_id, title, notes, due_date, due_time, priority, category, repeat_frequency, subtasks_json, completed, google_event_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
          id,
          currentUserId,
          body.title || 'Untitled Task',
          body.notes || '',
          body.due_date || null,
          body.due_time || null,
          body.priority || 'medium',
          body.category || 'Work',
          body.repeat_frequency || 'none',
          subtasksJson,
          googleEventId
        );

        const created = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        return sendJson(res, 201, {
          success: true,
          task: { ...created, completed: false, subtasks: body.subtasks || [] }
        });
      }

      if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && req.method === 'PUT') {
        const taskId = pathname.split('/')[3];
        const body = await parseBody(req);
        const subtasksJson = JSON.stringify(body.subtasks || []);

        db.prepare(`
          UPDATE tasks SET
            title = ?, notes = ?, due_date = ?, due_time = ?,
            priority = ?, category = ?, repeat_frequency = ?,
            subtasks_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `).run(
          body.title,
          body.notes || '',
          body.due_date || null,
          body.due_time || null,
          body.priority || 'medium',
          body.category || 'Work',
          body.repeat_frequency || 'none',
          subtasksJson,
          taskId,
          currentUserId
        );

        // Update corresponding calendar event if present
        const currentTask = db.prepare('SELECT google_event_id FROM tasks WHERE id = ?').get(taskId);
        if (currentTask && currentTask.google_event_id && body.due_date) {
          const startTime = `${body.due_date}T${body.due_time || '09:00'}:00`;
          db.prepare(`
            UPDATE calendar_events SET title = ?, description = ?, start_time = ?
            WHERE google_id = ? AND user_id = ?
          `).run(body.title, body.notes || '', startTime, currentTask.google_event_id, currentUserId);
        }

        return sendJson(res, 200, { success: true, message: 'Task updated' });
      }

      if (pathname.match(/^\/api\/tasks\/([^/]+)\/toggle$/) && req.method === 'POST') {
        const taskId = pathname.split('/')[3];
        const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(taskId, currentUserId);
        if (!task) return sendJson(res, 404, { error: 'Task not found' });

        const newStatus = task.completed ? 0 : 1;
        const completedAt = newStatus ? new Date().toISOString() : null;

        db.prepare('UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?').run(newStatus, completedAt, taskId);

        // If repeating task is completed, automatically schedule the next occurrence
        if (newStatus && task.repeat_frequency && task.repeat_frequency !== 'none' && task.due_date) {
          const nextDate = new Date(task.due_date);
          if (task.repeat_frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (task.repeat_frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (task.repeat_frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          const nextDateStr = nextDate.toISOString().slice(0, 10);
          const nextId = 'task_' + crypto.randomUUID();
          
          db.prepare(`
            INSERT INTO tasks (id, user_id, title, notes, due_date, due_time, priority, category, repeat_frequency, subtasks_json, completed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(nextId, currentUserId, task.title, task.notes, nextDateStr, task.due_time, task.priority, task.category, task.repeat_frequency, task.subtasks_json);
        }

        return sendJson(res, 200, { success: true, completed: Boolean(newStatus) });
      }

      if (pathname.match(/^\/api\/tasks\/([^/]+)\/reschedule$/) && req.method === 'POST') {
        const taskId = pathname.split('/')[3];
        const body = await parseBody(req);
        db.prepare('UPDATE tasks SET due_date = ?, due_time = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
          .run(body.due_date, body.due_time || '09:00', taskId, currentUserId);
        return sendJson(res, 200, { success: true, message: 'Rescheduled successfully' });
      }

      if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && req.method === 'DELETE') {
        const taskId = pathname.split('/')[3];
        const task = db.prepare('SELECT google_event_id FROM tasks WHERE id = ?').get(taskId);
        if (task && task.google_event_id) {
          db.prepare('DELETE FROM calendar_events WHERE google_id = ? AND user_id = ?').run(task.google_event_id, currentUserId);
        }
        db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(taskId, currentUserId);
        return sendJson(res, 200, { success: true, message: 'Task deleted' });
      }

      // 4. HABITS
      if (pathname === '/api/habits' && req.method === 'GET') {
        const habits = db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at ASC').all(currentUserId);
        const parsed = habits.map(h => ({
          ...h,
          history: JSON.parse(h.history_json || '[]')
        }));
        return sendJson(res, 200, { success: true, habits: parsed });
      }

      if (pathname === '/api/habits' && req.method === 'POST') {
        const body = await parseBody(req);
        const id = 'habit_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO habits (id, user_id, title, icon, category, target_frequency, history_json, streak, best_streak)
          VALUES (?, ?, ?, ?, ?, ?, '[]', 0, 0)
        `).run(id, currentUserId, body.title, body.icon || 'target', body.category || 'Health', body.target_frequency || 'daily');
        return sendJson(res, 201, { success: true, id });
      }

      if (pathname.match(/^\/api\/habits\/([^/]+)\/checkin$/) && req.method === 'POST') {
        const habitId = pathname.split('/')[3];
        const body = await parseBody(req);
        const dateStr = body.date || new Date().toISOString().slice(0, 10);

        const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(habitId, currentUserId);
        if (!habit) return sendJson(res, 404, { error: 'Habit not found' });

        let history = JSON.parse(habit.history_json || '[]');
        if (history.includes(dateStr)) {
          history = history.filter(d => d !== dateStr);
        } else {
          history.push(dateStr);
        }

        // Calculate consecutive streak
        history.sort();
        let streak = 0;
        let testDate = new Date();
        // Check if checked today or yesterday
        const todayStr = testDate.toISOString().slice(0, 10);
        let cur = new Date(todayStr);
        if (!history.includes(todayStr)) {
          cur.setDate(cur.getDate() - 1);
        }
        while (history.includes(cur.toISOString().slice(0, 10))) {
          streak++;
          cur.setDate(cur.getDate() - 1);
        }

        const bestStreak = Math.max(habit.best_streak, streak);

        db.prepare('UPDATE habits SET history_json = ?, streak = ?, best_streak = ? WHERE id = ?')
          .run(JSON.stringify(history), streak, bestStreak, habitId);

        return sendJson(res, 200, { success: true, checked: history.includes(dateStr), streak, bestStreak });
      }

      if (pathname.match(/^\/api\/habits\/([^/]+)$/) && req.method === 'DELETE') {
        const habitId = pathname.split('/')[3];
        db.prepare('DELETE FROM habits WHERE id = ? AND user_id = ?').run(habitId, currentUserId);
        return sendJson(res, 200, { success: true });
      }

      // 5. FOCUS SESSIONS (POMODORO)
      if (pathname === '/api/focus' && req.method === 'GET') {
        const sessions = db.prepare('SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50').all(currentUserId);
        return sendJson(res, 200, { success: true, sessions });
      }

      if (pathname === '/api/focus' && req.method === 'POST') {
        const body = await parseBody(req);
        const id = 'foc_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO focus_sessions (id, user_id, task_id, duration_minutes, mode)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, currentUserId, body.task_id || null, body.duration_minutes || 25, body.mode || 'work');
        return sendJson(res, 201, { success: true, id });
      }

      // 6. NOTES
      if (pathname === '/api/notes' && req.method === 'GET') {
        const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(currentUserId);
        const parsed = notes.map(n => ({
          ...n,
          pinned: Boolean(n.pinned),
          tags: JSON.parse(n.tags_json || '[]')
        }));
        return sendJson(res, 200, { success: true, notes: parsed });
      }

      if (pathname === '/api/notes' && req.method === 'POST') {
        const body = await parseBody(req);
        const id = 'note_' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO notes (id, user_id, title, content, color, pinned, tags_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          currentUserId,
          body.title || 'Untitled Note',
          body.content || '',
          body.color || 'blue',
          body.pinned ? 1 : 0,
          JSON.stringify(body.tags || [])
        );
        return sendJson(res, 201, { success: true, id });
      }

      if (pathname.match(/^\/api\/notes\/([^/]+)$/) && req.method === 'PUT') {
        const noteId = pathname.split('/')[3];
        const body = await parseBody(req);
        db.prepare(`
          UPDATE notes SET
            title = ?, content = ?, color = ?, pinned = ?, tags_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `).run(
          body.title,
          body.content,
          body.color || 'blue',
          body.pinned ? 1 : 0,
          JSON.stringify(body.tags || []),
          noteId,
          currentUserId
        );
        return sendJson(res, 200, { success: true });
      }

      if (pathname.match(/^\/api\/notes\/([^/]+)$/) && req.method === 'DELETE') {
        const noteId = pathname.split('/')[3];
        db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(noteId, currentUserId);
        return sendJson(res, 200, { success: true });
      }

      // 7. CALENDAR & TWO-WAY SYNC
      if (pathname === '/api/calendar' && req.method === 'GET') {
        const events = db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_time ASC').all(currentUserId);
        return sendJson(res, 200, { success: true, events });
      }

      if (pathname === '/api/calendar/sync' && req.method === 'POST') {
        // Simulates bidirectional sync with Google Calendar API:
        // 1. Sync tasks with due dates into calendar events
        // 2. Fetch remote Google Calendar events into local calendar
        const tasksWithDates = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND due_date IS NOT NULL AND completed = 0').all(currentUserId);
        let syncedCount = 0;

        for (const t of tasksWithDates) {
          if (!t.google_event_id) {
            const googleId = 'gcal_' + crypto.randomUUID().slice(0, 8);
            const startTime = `${t.due_date}T${t.due_time || '09:00'}:00`;
            const endHour = parseInt((t.due_time || '09:00').split(':')[0], 10) + 1;
            const endTime = `${t.due_date}T${String(endHour).padStart(2, '0')}:00:00`;

            db.prepare('UPDATE tasks SET google_event_id = ? WHERE id = ?').run(googleId, t.id);
            db.prepare(`
              INSERT INTO calendar_events (id, user_id, google_id, title, description, start_time, end_time, location)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run('evt_' + crypto.randomUUID(), currentUserId, googleId, t.title, t.notes || 'Synced task from My PA', startTime, endTime, 'My PA App');
            syncedCount++;
          }
        }

        const events = db.prepare('SELECT * FROM calendar_events WHERE user_id = ? ORDER BY start_time ASC').all(currentUserId);
        return sendJson(res, 200, {
          success: true,
          syncedCount,
          totalEvents: events.length,
          lastSynced: new Date().toISOString()
        });
      }

      // 8. WEEKLY PROGRESS REPORT STATS
      if (pathname === '/api/stats' && req.method === 'GET') {
        // Calculate last 7 days metrics
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

          const completedTasks = db.prepare(`
            SELECT COUNT(*) as count FROM tasks
            WHERE user_id = ? AND completed = 1 AND substr(completed_at, 1, 10) = ?
          `).get(currentUserId, dateStr).count;

          const createdTasks = db.prepare(`
            SELECT COUNT(*) as count FROM tasks
            WHERE user_id = ? AND substr(created_at, 1, 10) = ?
          `).get(currentUserId, dateStr).count;

          const focusMinutes = db.prepare(`
            SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions
            WHERE user_id = ? AND substr(completed_at, 1, 10) = ?
          `).get(currentUserId, dateStr).total;

          days.push({
            date: dateStr,
            day: dayName,
            completed: completedTasks,
            created: createdTasks,
            focusMinutes: focusMinutes
          });
        }

        const totalCompleted = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1').get(currentUserId).count;
        const totalPending = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 0').get(currentUserId).count;
        const overdueCount = db.prepare(`
          SELECT COUNT(*) as count FROM tasks
          WHERE user_id = ? AND completed = 0 AND due_date < date('now')
        `).get(currentUserId).count;
        const totalFocus = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM focus_sessions WHERE user_id = ?').get(currentUserId).total;

        // Categories breakdown
        const categories = db.prepare(`
          SELECT category, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY category
        `).all(currentUserId);

        return sendJson(res, 200, {
          success: true,
          weekly: days,
          overview: {
            totalCompleted,
            totalPending,
            overdueCount,
            totalFocusMinutes: totalFocus,
            completionRate: totalCompleted + totalPending > 0 ? Math.round((totalCompleted / (totalCompleted + totalPending)) * 100) : 100
          },
          categories
        });
      }

      // 9. MORNING & EVENING NOTIFICATIONS DISPATCH / SIMULATE
      if (pathname === '/api/notifications/morning-digest' && req.method === 'POST') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayTasks = db.prepare(`
          SELECT * FROM tasks WHERE user_id = ? AND completed = 0 AND due_date = ?
        `).all(currentUserId, todayStr);

        const todayEvents = db.prepare(`
          SELECT * FROM calendar_events WHERE user_id = ? AND substr(start_time, 1, 10) = ?
        `).all(currentUserId, todayStr);

        return sendJson(res, 200, {
          success: true,
          type: 'morning_summary',
          title: `🌅 Good Morning, Krishna! Your PA Daily Briefing`,
          date: todayStr,
          tasksCount: todayTasks.length,
          eventsCount: todayEvents.length,
          tasks: todayTasks,
          events: todayEvents,
          message: `You have ${todayTasks.length} tasks and ${todayEvents.length} calendar events scheduled for today.`
        });
      }

      if (pathname === '/api/notifications/evening-review' && req.method === 'POST') {
        const todayStr = new Date().toISOString().slice(0, 10);
        const unfinishedTasks = db.prepare(`
          SELECT * FROM tasks WHERE user_id = ? AND completed = 0 AND due_date <= ?
        `).all(currentUserId, todayStr);

        return sendJson(res, 200, {
          success: true,
          type: 'evening_review',
          title: `🌙 Evening Check-in: Unfinished Tasks Review`,
          date: todayStr,
          unfinishedCount: unfinishedTasks.length,
          tasks: unfinishedTasks,
          message: unfinishedTasks.length > 0
            ? `You have ${unfinishedTasks.length} pending tasks. Would you like to reschedule them for tomorrow?`
            : `Outstanding work! All of today's tasks are completed.`
        });
      }

      // 10. BACKUP & EXPORT/IMPORT
      if (pathname === '/api/backup/export' && req.method === 'GET') {
        const tasks = db.prepare('SELECT * FROM tasks WHERE user_id = ?').all(currentUserId);
        const habits = db.prepare('SELECT * FROM habits WHERE user_id = ?').all(currentUserId);
        const notes = db.prepare('SELECT * FROM notes WHERE user_id = ?').all(currentUserId);
        const settings = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(currentUserId);
        return sendJson(res, 200, {
          version: '1.0',
          exported_at: new Date().toISOString(),
          tasks,
          habits,
          notes,
          settings
        });
      }

      if (pathname === '/api/backup/import' && req.method === 'POST') {
        const body = await parseBody(req);
        if (body.tasks && Array.isArray(body.tasks)) {
          for (const t of body.tasks) {
            db.prepare(`
              INSERT OR REPLACE INTO tasks (id, user_id, title, notes, due_date, due_time, priority, category, repeat_frequency, subtasks_json, completed)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(t.id, currentUserId, t.title, t.notes || '', t.due_date, t.due_time, t.priority || 'medium', t.category || 'Work', t.repeat_frequency || 'none', t.subtasks_json || '[]', t.completed ? 1 : 0);
          }
        }
        return sendJson(res, 200, { success: true, message: 'Data imported successfully' });
      }

      return sendJson(res, 404, { error: 'API route not found' });
    }

    // Static File Serving
    let reqPath = pathname === '/' || pathname === '' ? '/index.html' : pathname;
    const fullPath = path.join(PUBLIC_DIR, reqPath);

    // Prevent directory traversal
    if (!fullPath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden');
      return;
    }

    fs.readFile(fullPath, (err, data) => {
      if (err) {
        // Fallback to index.html for SPA / PWA routes if not an asset
        if (!path.extname(fullPath)) {
          fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (spaErr, spaData) => {
            if (spaErr) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(spaData);
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Set PWA cache headers
      const headers = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      };

      if (ext === '.html' || ext === '.json' || reqPath === '/sw.js') {
        headers['Cache-Control'] = 'no-cache';
      } else {
        headers['Cache-Control'] = 'public, max-age=31536000';
      }

      res.writeHead(200, headers);
      res.end(data);
    });
  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, 500, { error: 'Internal Server Error', details: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  My PA (Personal Assistant) Web App running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Database: ${DB_FILE}`);
  console.log(`===============================================`);
});
