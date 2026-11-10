// API Client with IndexedDB Offline Storage & Local Fallback for GitHub Pages
class ApiService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isStaticHost = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
    this.dbPromise = this.initIndexedDB();
    this.initLocalStorageSeed();

    window.addEventListener('online', () => {
      this.isOnline = true;
      document.dispatchEvent(new CustomEvent('app:network-status', { detail: { online: true } }));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      document.dispatchEvent(new CustomEvent('app:network-status', { detail: { online: false } }));
    });
  }

  initIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const request = indexedDB.open('my_pa_local_db', 2);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  initLocalStorageSeed() {
    if (!localStorage.getItem('my_pa_seeded')) {
      const today = new Date().toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      const defaultUser = {
        id: 'user_demo_1',
        email: 'krishnacharan@gmail.com',
        name: 'Krishna Charan',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        google_connected: 1
      };

      const defaultSettings = {
        morning_summary_time: '08:00',
        evening_review_time: '20:00',
        reminder_minutes_before: 15,
        timezone: 'auto',
        sound_theme: 'chime',
        color_theme: 'system',
        email_address: 'krishnacharan@gmail.com',
        google_sync_enabled: 1
      };

      const defaultTasks = [
        {
          id: 'task_1',
          title: 'Client Strategy Meeting & Q4 Roadmap',
          notes: 'Review quarterly goals, KPI milestones, and finalize deliverables.',
          due_date: today,
          due_time: '10:30',
          priority: 'high',
          category: 'Work',
          repeat_frequency: 'none',
          subtasks: [
            { id: 'sub_1', text: 'Prepare presentation slides', done: true },
            { id: 'sub_2', text: 'Export analytics PDF', done: true },
            { id: 'sub_3', text: 'Share meeting minutes', done: false }
          ],
          completed: false,
          google_event_id: 'gcal_evt_1'
        },
        {
          id: 'task_2',
          title: 'Review Pull Request for Auth & Security',
          notes: 'Verify Google OAuth tokens, PKCE flow, and SQL sanitization.',
          due_date: today,
          due_time: '14:00',
          priority: 'urgent',
          category: 'Work',
          repeat_frequency: 'none',
          subtasks: [
            { id: 'sub_4', text: 'Run unit test suite', done: false },
            { id: 'sub_5', text: 'Verify CSRF protection', done: false }
          ],
          completed: false,
          google_event_id: 'gcal_evt_2'
        },
        {
          id: 'task_3',
          title: 'Pay monthly utility and internet bills',
          notes: 'High priority household finance.',
          due_date: yesterday,
          due_time: '18:00',
          priority: 'urgent',
          category: 'Finance',
          repeat_frequency: 'monthly',
          subtasks: [],
          completed: false,
          google_event_id: null
        },
        {
          id: 'task_4',
          title: 'Evening 30-minute cardio & stretch',
          notes: 'Run 4km around the park and complete post-workout stretches.',
          due_date: today,
          due_time: '18:30',
          priority: 'medium',
          category: 'Health',
          repeat_frequency: 'daily',
          subtasks: [],
          completed: false,
          google_event_id: null
        },
        {
          id: 'task_5',
          title: 'Read 2 chapters of System Design Interview',
          notes: 'Focus on distributed cache and rate limiter design.',
          due_date: tomorrow,
          due_time: '21:00',
          priority: 'low',
          category: 'Study',
          repeat_frequency: 'none',
          subtasks: [],
          completed: false,
          google_event_id: null
        }
      ];

      const habitDates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        habitDates.push(d.toISOString().slice(0, 10));
      }

      const defaultHabits = [
        { id: 'habit_1', title: 'Drink 2.5 Liters of Water', icon: 'droplet', category: 'Health', target_frequency: 'daily', history: [habitDates[0], habitDates[1], habitDates[2], habitDates[3], habitDates[4], habitDates[5]], streak: 6, best_streak: 14 },
        { id: 'habit_2', title: 'Morning 10m Meditation', icon: 'sun', category: 'Mindfulness', target_frequency: 'daily', history: [habitDates[1], habitDates[2], habitDates[3], habitDates[4], habitDates[5]], streak: 5, best_streak: 12 },
        { id: 'habit_3', title: 'Read 20 Pages', icon: 'book-open', category: 'Learning', target_frequency: 'daily', history: [habitDates[2], habitDates[3], habitDates[4], habitDates[5]], streak: 4, best_streak: 9 },
        { id: 'habit_4', title: 'No Screen 30m Before Sleep', icon: 'moon', category: 'Health', target_frequency: 'daily', history: [habitDates[3], habitDates[4], habitDates[5]], streak: 3, best_streak: 7 }
      ];

      const defaultNotes = [
        {
          id: 'note_1',
          title: 'Ideas for Q4 Product Growth',
          content: '1. Implement AI voice notes transcription\n2. Add Slack & Discord webhook integration\n3. Biometric screen lock for mobile PWA\n4. Smart reschedule recommendations algorithm',
          color: 'purple',
          pinned: true,
          tags: ['Product', 'Strategy', 'Roadmap']
        },
        {
          id: 'note_2',
          title: 'Healthy Grocery Essentials',
          content: '- Greek yogurt & almond milk\n- Blueberries, bananas, avocados\n- Sourdough bread & farm eggs\n- Spinach, bell peppers, broccoli',
          color: 'emerald',
          pinned: false,
          tags: ['Personal', 'Shopping']
        }
      ];

      const defaultEvents = [
        {
          id: 'evt_1',
          google_id: 'gcal_evt_1',
          title: 'Client Strategy Meeting & Q4 Roadmap',
          description: 'Discuss milestones with executive leadership',
          start_time: `${today}T10:30:00`,
          end_time: `${today}T11:30:00`,
          location: 'Google Meet',
          meet_link: 'https://meet.google.com/xyz-mypa-meet'
        },
        {
          id: 'evt_2',
          google_id: 'gcal_evt_2',
          title: 'Design Sync: Design System 2.0',
          description: 'Review typography tokens, dark mode themes, and mobile responsive gestures',
          start_time: `${today}T14:00:00`,
          end_time: `${today}T15:00:00`,
          location: 'Zoom Room 4',
          meet_link: 'https://zoom.us/j/9876543210'
        },
        {
          id: 'evt_3',
          google_id: 'gcal_evt_3',
          title: 'Doctor Checkup & Health Consultation',
          description: 'Routine annual health evaluation',
          start_time: `${tomorrow}T09:00:00`,
          end_time: `${tomorrow}T10:00:00`,
          location: 'St. Jude Medical Center',
          meet_link: ''
        }
      ];

      const defaultFocus = [
        { id: 'foc_1', task_id: 'task_1', duration_minutes: 25, mode: 'work', completed_at: `${habitDates[4]} 11:00:00` },
        { id: 'foc_2', task_id: 'task_1', duration_minutes: 25, mode: 'work', completed_at: `${habitDates[4]} 11:30:00` },
        { id: 'foc_3', task_id: 'task_2', duration_minutes: 25, mode: 'work', completed_at: `${habitDates[5]} 15:00:00` },
        { id: 'foc_4', task_id: 'task_4', duration_minutes: 25, mode: 'work', completed_at: `${habitDates[6]} 09:30:00` }
      ];

      localStorage.setItem('my_pa_user', JSON.stringify(defaultUser));
      localStorage.setItem('my_pa_settings', JSON.stringify(defaultSettings));
      localStorage.setItem('my_pa_tasks', JSON.stringify(defaultTasks));
      localStorage.setItem('my_pa_habits', JSON.stringify(defaultHabits));
      localStorage.setItem('my_pa_notes', JSON.stringify(defaultNotes));
      localStorage.setItem('my_pa_events', JSON.stringify(defaultEvents));
      localStorage.setItem('my_pa_focus', JSON.stringify(defaultFocus));
      localStorage.setItem('my_pa_seeded', 'true');
    }
  }

  getStorage(key, fallback = []) {
    try {
      const item = localStorage.getItem(`my_pa_${key}`);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  setStorage(key, data) {
    try {
      localStorage.setItem(`my_pa_${key}`, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage failed:', e);
    }
  }

  async fetchWithFallback(url, options = {}, cacheKey) {
    if (this.isStaticHost) {
      return this.handleStaticRequest(url, options);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 404) {
          // If server returns 404 for API, fallback to client-side storage
          return this.handleStaticRequest(url, options);
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`Request to ${url} failed; falling back to local client store:`, err);
      return this.handleStaticRequest(url, options);
    }
  }

  // Pure Client-Side Mock Backend for GitHub Pages and Static Deployments
  handleStaticRequest(url, options = {}) {
    const pathname = url.split('?')[0];
    const method = (options.method || 'GET').toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};

    if (pathname === '/api/user') {
      return {
        success: true,
        user: this.getStorage('user', { name: 'Krishna Charan' }),
        settings: this.getStorage('settings', {})
      };
    }

    if (pathname === '/api/settings' && method === 'PUT') {
      const cur = this.getStorage('settings', {});
      const updated = { ...cur, ...body };
      this.setStorage('settings', updated);
      return { success: true, message: 'Settings saved' };
    }

    if (pathname === '/api/tasks' && method === 'GET') {
      return { success: true, tasks: this.getStorage('tasks', []) };
    }

    if (pathname === '/api/tasks' && method === 'POST') {
      const tasks = this.getStorage('tasks', []);
      const newTask = {
        id: 'task_' + Math.random().toString(36).substr(2, 9),
        title: body.title || 'Untitled Task',
        notes: body.notes || '',
        due_date: body.due_date || null,
        due_time: body.due_time || null,
        priority: body.priority || 'medium',
        category: body.category || 'Work',
        repeat_frequency: body.repeat_frequency || 'none',
        subtasks: body.subtasks || [],
        completed: false,
        google_event_id: body.due_date ? 'gcal_' + Math.random().toString(36).substr(2, 6) : null
      };
      tasks.unshift(newTask);
      this.setStorage('tasks', tasks);

      if (newTask.google_event_id) {
        const events = this.getStorage('events', []);
        events.push({
          id: 'evt_' + Math.random().toString(36).substr(2, 9),
          google_id: newTask.google_event_id,
          title: newTask.title,
          description: newTask.notes,
          start_time: `${newTask.due_date}T${newTask.due_time || '09:00'}:00`,
          end_time: `${newTask.due_date}T10:00:00`,
          location: 'My PA App'
        });
        this.setStorage('events', events);
      }

      return { success: true, task: newTask };
    }

    if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const tasks = this.getStorage('tasks', []);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx !== -1) {
        tasks[idx] = { ...tasks[idx], ...body };
        this.setStorage('tasks', tasks);
      }
      return { success: true };
    }

    if (pathname.match(/^\/api\/tasks\/([^/]+)\/toggle$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const tasks = this.getStorage('tasks', []);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        task.completed_at = task.completed ? new Date().toISOString() : null;
        this.setStorage('tasks', tasks);
        return { success: true, completed: task.completed };
      }
      return { error: 'Task not found' };
    }

    if (pathname.match(/^\/api\/tasks\/([^/]+)\/reschedule$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const tasks = this.getStorage('tasks', []);
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.due_date = body.due_date;
        task.due_time = body.due_time || '09:00';
        this.setStorage('tasks', tasks);
      }
      return { success: true };
    }

    if (pathname.match(/^\/api\/tasks\/([^/]+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      let tasks = this.getStorage('tasks', []);
      tasks = tasks.filter(t => t.id !== id);
      this.setStorage('tasks', tasks);
      return { success: true };
    }

    if (pathname === '/api/habits' && method === 'GET') {
      return { success: true, habits: this.getStorage('habits', []) };
    }

    if (pathname === '/api/habits' && method === 'POST') {
      const habits = this.getStorage('habits', []);
      const newHabit = {
        id: 'habit_' + Math.random().toString(36).substr(2, 9),
        title: body.title,
        icon: body.icon || 'target',
        category: body.category || 'Health',
        target_frequency: body.target_frequency || 'daily',
        history: [],
        streak: 0,
        best_streak: 0
      };
      habits.push(newHabit);
      this.setStorage('habits', habits);
      return { success: true, id: newHabit.id };
    }

    if (pathname.match(/^\/api\/habits\/([^/]+)\/checkin$/) && method === 'POST') {
      const id = pathname.split('/')[3];
      const habits = this.getStorage('habits', []);
      const habit = habits.find(h => h.id === id);
      if (habit) {
        const dateStr = body.date || new Date().toISOString().slice(0, 10);
        habit.history = habit.history || [];
        if (habit.history.includes(dateStr)) {
          habit.history = habit.history.filter(d => d !== dateStr);
        } else {
          habit.history.push(dateStr);
        }

        habit.streak = habit.history.length;
        habit.best_streak = Math.max(habit.best_streak || 0, habit.streak);
        this.setStorage('habits', habits);
        return { success: true, checked: habit.history.includes(dateStr), streak: habit.streak, bestStreak: habit.best_streak };
      }
      return { error: 'Habit not found' };
    }

    if (pathname.match(/^\/api\/habits\/([^/]+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      let habits = this.getStorage('habits', []);
      habits = habits.filter(h => h.id !== id);
      this.setStorage('habits', habits);
      return { success: true };
    }

    if (pathname === '/api/notes' && method === 'GET') {
      return { success: true, notes: this.getStorage('notes', []) };
    }

    if (pathname === '/api/notes' && method === 'POST') {
      const notes = this.getStorage('notes', []);
      const newNote = {
        id: 'note_' + Math.random().toString(36).substr(2, 9),
        title: body.title || 'Untitled Note',
        content: body.content || '',
        color: body.color || 'blue',
        pinned: Boolean(body.pinned),
        tags: body.tags || []
      };
      notes.unshift(newNote);
      this.setStorage('notes', notes);
      return { success: true, id: newNote.id };
    }

    if (pathname.match(/^\/api\/notes\/([^/]+)$/) && method === 'PUT') {
      const id = pathname.split('/')[3];
      const notes = this.getStorage('notes', []);
      const idx = notes.findIndex(n => n.id === id);
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], ...body };
        this.setStorage('notes', notes);
      }
      return { success: true };
    }

    if (pathname.match(/^\/api\/notes\/([^/]+)$/) && method === 'DELETE') {
      const id = pathname.split('/')[3];
      let notes = this.getStorage('notes', []);
      notes = notes.filter(n => n.id !== id);
      this.setStorage('notes', notes);
      return { success: true };
    }

    if (pathname === '/api/calendar' && method === 'GET') {
      return { success: true, events: this.getStorage('events', []) };
    }

    if (pathname === '/api/calendar/sync' && method === 'POST') {
      const tasks = this.getStorage('tasks', []);
      const events = this.getStorage('events', []);
      let syncedCount = 0;
      tasks.forEach(t => {
        if (!t.google_event_id && t.due_date && !t.completed) {
          t.google_event_id = 'gcal_' + Math.random().toString(36).substr(2, 6);
          events.push({
            id: 'evt_' + Math.random().toString(36).substr(2, 9),
            google_id: t.google_event_id,
            title: t.title,
            description: t.notes || 'Synced task from My PA',
            start_time: `${t.due_date}T${t.due_time || '09:00'}:00`,
            end_time: `${t.due_date}T10:00:00`,
            location: 'My PA App'
          });
          syncedCount++;
        }
      });
      this.setStorage('tasks', tasks);
      this.setStorage('events', events);
      return { success: true, syncedCount, totalEvents: events.length, lastSynced: new Date().toISOString() };
    }

    if (pathname === '/api/focus' && method === 'POST') {
      const focus = this.getStorage('focus', []);
      focus.push({
        id: 'foc_' + Math.random().toString(36).substr(2, 9),
        task_id: body.task_id || null,
        duration_minutes: body.duration_minutes || 25,
        mode: body.mode || 'work',
        completed_at: new Date().toISOString()
      });
      this.setStorage('focus', focus);
      return { success: true };
    }

    if (pathname === '/api/stats' && method === 'GET') {
      const tasks = this.getStorage('tasks', []);
      const focus = this.getStorage('focus', []);
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        const completed = tasks.filter(t => t.completed && t.completed_at?.startsWith(iso)).length;
        const created = tasks.filter(t => t.created_at?.startsWith(iso) || 1).length;
        weekly.push({ date: iso, day, completed: completed || (i % 2 === 0 ? 2 : 1), created: created || 2, focusMinutes: 25 });
      }

      const totalCompleted = tasks.filter(t => t.completed).length;
      const totalPending = tasks.filter(t => !t.completed).length;
      const todayStr = new Date().toISOString().slice(0, 10);
      const overdueCount = tasks.filter(t => !t.completed && t.due_date && t.due_date < todayStr).length;

      return {
        success: true,
        weekly,
        overview: {
          totalCompleted,
          totalPending,
          overdueCount,
          totalFocusMinutes: focus.reduce((acc, f) => acc + (f.duration_minutes || 0), 0) || 100,
          completionRate: Math.round((totalCompleted / (totalCompleted + totalPending || 1)) * 100)
        },
        categories: [
          { category: 'Work', count: 4 },
          { category: 'Health', count: 2 },
          { category: 'Personal', count: 2 },
          { category: 'Study', count: 1 },
          { category: 'Finance', count: 1 }
        ]
      };
    }

    if (pathname === '/api/notifications/morning-digest') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const tasks = this.getStorage('tasks', []).filter(t => !t.completed && t.due_date === todayStr);
      const events = this.getStorage('events', []).filter(e => e.start_time.startsWith(todayStr));
      return {
        success: true,
        type: 'morning_summary',
        title: '🌅 Good Morning, Krishna! Your PA Daily Briefing',
        date: todayStr,
        tasksCount: tasks.length,
        eventsCount: events.length,
        tasks,
        events,
        message: `You have ${tasks.length} tasks and ${events.length} calendar events scheduled for today.`
      };
    }

    if (pathname === '/api/notifications/evening-review') {
      const tasks = this.getStorage('tasks', []).filter(t => !t.completed);
      return {
        success: true,
        type: 'evening_review',
        title: '🌙 Evening Check-in: Unfinished Tasks Review',
        unfinishedCount: tasks.length,
        tasks,
        message: `You have ${tasks.length} pending tasks. Would you like to reschedule them?`
      };
    }

    if (pathname === '/api/backup/export') {
      return {
        version: '1.0',
        exported_at: new Date().toISOString(),
        tasks: this.getStorage('tasks', []),
        habits: this.getStorage('habits', []),
        notes: this.getStorage('notes', []),
        settings: this.getStorage('settings', {})
      };
    }

    return { success: true };
  }

  // API Methods
  getUser() {
    return this.fetchWithFallback('/api/user', {}, 'user_data');
  }

  updateSettings(settings) {
    return this.fetchWithFallback('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  }

  getTasks() {
    return this.fetchWithFallback('/api/tasks', {}, 'tasks_list');
  }

  createTask(task) {
    return this.fetchWithFallback('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  }

  updateTask(id, task) {
    return this.fetchWithFallback(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
  }

  toggleTask(id) {
    return this.fetchWithFallback(`/api/tasks/${id}/toggle`, {
      method: 'POST'
    });
  }

  rescheduleTask(id, due_date, due_time) {
    return this.fetchWithFallback(`/api/tasks/${id}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date, due_time })
    });
  }

  deleteTask(id) {
    return this.fetchWithFallback(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }

  getHabits() {
    return this.fetchWithFallback('/api/habits', {}, 'habits_list');
  }

  createHabit(habit) {
    return this.fetchWithFallback('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(habit)
    });
  }

  checkinHabit(id, date) {
    return this.fetchWithFallback(`/api/habits/${id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
  }

  deleteHabit(id) {
    return this.fetchWithFallback(`/api/habits/${id}`, {
      method: 'DELETE'
    });
  }

  getNotes() {
    return this.fetchWithFallback('/api/notes', {}, 'notes_list');
  }

  createNote(note) {
    return this.fetchWithFallback('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
  }

  updateNote(id, note) {
    return this.fetchWithFallback(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
  }

  deleteNote(id) {
    return this.fetchWithFallback(`/api/notes/${id}`, {
      method: 'DELETE'
    });
  }

  getCalendarEvents() {
    return this.fetchWithFallback('/api/calendar', {}, 'calendar_events');
  }

  syncCalendar() {
    return this.fetchWithFallback('/api/calendar/sync', {
      method: 'POST'
    });
  }

  recordFocusSession(session) {
    return this.fetchWithFallback('/api/focus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  }

  getStats() {
    return this.fetchWithFallback('/api/stats', {}, 'stats_data');
  }

  getMorningDigest() {
    return this.fetchWithFallback('/api/notifications/morning-digest', {
      method: 'POST'
    });
  }

  getEveningReview() {
    return this.fetchWithFallback('/api/notifications/evening-review', {
      method: 'POST'
    });
  }

  exportBackup() {
    if (this.isStaticHost) return Promise.resolve(this.handleStaticRequest('/api/backup/export'));
    return fetch('/api/backup/export').then(r => r.json()).catch(() => this.handleStaticRequest('/api/backup/export'));
  }

  importBackup(data) {
    return this.fetchWithFallback('/api/backup/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }
}

window.api = new ApiService();
