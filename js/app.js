// Main Application Controller for My PA
class App {
  constructor() {
    this.state = {
      tasks: [],
      habits: [],
      notes: [],
      calendarEvents: [],
      settings: {},
      user: null,
      activeTab: 'dashboard',
      filterCategory: 'all',
      filterPriority: 'all',
      filterStatus: 'all',
      searchQuery: '',
      editingTaskId: null,
      editingNoteId: null,
      tempSubtasks: [],
      deferredInstallPrompt: null
    };

    window.appState = this.state;
    this.init();
  }

  async init() {
    this.bindEvents();
    this.initPwaInstall();
    await this.loadAllData();
    this.applyTheme(this.state.settings.color_theme || 'system');
    this.setupQuickAddInput();
    this.render();
  }

  bindEvents() {
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Theme toggle button in header
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = this.getCurrentAppliedTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.applyTheme(next);
        this.saveThemePreference(next);
      });
    }

    // Google Calendar Sync Button
    const syncBtn = document.getElementById('sync-calendar-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.syncCalendarNow());
    }

    // Global Search
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.toLowerCase().trim();
        this.renderCurrentView();
      });
    }

    // Modal background clicks
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.add('hidden');
        }
      });
    });

    // Subtask adder inside task modal
    const addSubtaskBtn = document.getElementById('add-subtask-btn');
    const newSubtaskInput = document.getElementById('new-subtask-input');
    if (addSubtaskBtn && newSubtaskInput) {
      const addSub = () => {
        const val = newSubtaskInput.value.trim();
        if (val) {
          this.state.tempSubtasks.push({ id: 'sub_' + Date.now(), text: val, done: false });
          newSubtaskInput.value = '';
          this.renderModalSubtasks();
        }
      };
      addSubtaskBtn.addEventListener('click', addSub);
      newSubtaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSub();
        }
      });
    }
  }

  initPwaInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.state.deferredInstallPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.remove('hidden');
    });

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (this.state.deferredInstallPrompt) {
          this.state.deferredInstallPrompt.prompt();
          const { outcome } = await this.state.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            console.log('User installed My PA PWA');
          }
          this.state.deferredInstallPrompt = null;
          document.getElementById('pwa-install-banner')?.classList.add('hidden');
        }
      });
    }
  }

  async loadAllData() {
    try {
      const [userData, tasksData, habitsData, notesData, calData] = await Promise.all([
        window.api.getUser().catch(() => ({ user: { name: 'Krishna Charan' }, settings: {} })),
        window.api.getTasks().catch(() => ({ tasks: [] })),
        window.api.getHabits().catch(() => ({ habits: [] })),
        window.api.getNotes().catch(() => ({ notes: [] })),
        window.api.getCalendarEvents().catch(() => ({ events: [] }))
      ]);

      this.state.user = userData.user;
      this.state.settings = userData.settings || {};
      this.state.tasks = tasksData.tasks || [];
      this.state.habits = habitsData.habits || [];
      this.state.notes = notesData.notes || [];
      this.state.calendarEvents = calData.events || [];

      this.updateHeaderProfile();
    } catch (err) {
      console.warn('Failed to load all data:', err);
    }
  }

  updateHeaderProfile() {
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar-img');
    const syncBadge = document.getElementById('sync-status-badge');

    if (nameEl && this.state.user) nameEl.textContent = this.state.user.name;
    if (avatarEl && this.state.user?.avatar) avatarEl.src = this.state.user.avatar;
    if (syncBadge) {
      const count = this.state.calendarEvents.length;
      syncBadge.innerHTML = `
        <span class="status-dot online"></span>
        <span>Google Calendar: ${count} events synced</span>
      `;
    }
  }

  switchTab(tab) {
    this.state.activeTab = tab;

    // Update active nav links
    document.querySelectorAll('[data-tab]').forEach(btn => {
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Show corresponding view section
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`view-${tab}`);
    if (activeView) activeView.classList.remove('hidden');

    this.renderCurrentView();
  }

  renderCurrentView() {
    switch (this.state.activeTab) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'tasks':
        this.renderTasksPage();
        break;
      case 'habits':
        window.habitManager.renderHabitsList(this.state.habits);
        break;
      case 'focus':
        this.renderFocusPage();
        break;
      case 'calendar':
        this.renderCalendarPage();
        break;
      case 'notes':
        this.renderNotesPage();
        break;
      case 'reports':
        this.renderReportsPage();
        break;
      case 'settings':
        this.renderSettingsPage();
        break;
    }
  }

  render() {
    this.renderCurrentView();
  }

  // Quick Add NLP Input & Voice Recognition Setup
  setupQuickAddInput() {
    const input = document.getElementById('quick-add-input');
    const preview = document.getElementById('quick-add-preview');
    const form = document.getElementById('quick-add-form');
    const voiceBtn = document.getElementById('quick-add-voice-btn');

    if (!input) return;

    // Live NLP preview badge while typing
    input.addEventListener('input', () => {
      const val = input.value.trim();
      if (!val) {
        preview.classList.add('hidden');
        preview.innerHTML = '';
        return;
      }

      const parsed = window.QuickAddNLP.parse(val);
      if (parsed) {
        preview.classList.remove('hidden');
        let badges = `<span>Task: <strong>${this.escape(parsed.title)}</strong></span>`;
        if (parsed.due_date) badges += `<span class="nlp-chip">📅 ${parsed.due_date}</span>`;
        if (parsed.due_time) badges += `<span class="nlp-chip">⏰ ${parsed.due_time}</span>`;
        badges += `<span class="nlp-chip nlp-priority-${parsed.priority}">!${parsed.priority}</span>`;
        badges += `<span class="nlp-chip nlp-cat">#${parsed.category}</span>`;
        if (parsed.repeat_frequency !== 'none') badges += `<span class="nlp-chip">🔁 ${parsed.repeat_frequency}</span>`;
        preview.innerHTML = badges;
      }
    });

    // Form submission
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;

      const parsed = window.QuickAddNLP.parse(val);
      if (parsed) {
        await this.createTaskFromParsed(parsed);
        input.value = '';
        preview.classList.add('hidden');
        preview.innerHTML = '';
        window.soundManager.play('ping');
        window.notificationManager.showInAppToast('Task Created', `"${parsed.title}" added to your to-do list.`, 'success');
      }
    });

    // Voice Input Toggle
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        window.speechManager.toggle(
          (result) => {
            if (result.final) {
              input.value = result.final;
              input.dispatchEvent(new Event('input'));
              // Auto-submit after voice
              form.dispatchEvent(new Event('submit'));
            } else if (result.interim) {
              input.value = result.interim;
              input.dispatchEvent(new Event('input'));
            }
          },
          (isListening, error) => {
            if (isListening) {
              voiceBtn.classList.add('listening');
              voiceBtn.title = 'Listening... Speak your task';
              window.notificationManager.showInAppToast('Voice Input Active', 'Listening... e.g. "Meeting tomorrow at 3pm #work"', 'info');
            } else {
              voiceBtn.classList.remove('listening');
              voiceBtn.title = 'Voice Input';
            }
          }
        );
      });
    }
  }

  async createTaskFromParsed(parsed) {
    try {
      const res = await window.api.createTask(parsed);
      if (res.task) {
        this.state.tasks.unshift(res.task);
      } else {
        await this.refreshTasks();
      }
      await this.refreshCalendar();
      this.renderCurrentView();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  }

  // DASHBOARD VIEW
  renderDashboard() {
    this.renderDashboardTimeline();
    this.renderDashboardTodoList();
    this.renderUpcomingDeadlines();
    this.renderOverdueBanner();
    this.renderDashboardStats();
  }

  // 1. Today's Schedule (Google Calendar + Scheduled Tasks)
  renderDashboardTimeline() {
    const container = document.getElementById('dashboard-schedule-container');
    if (!container) return;

    const todayStr = new Date().toISOString().slice(0, 10);

    // Filter today's calendar events
    const todayEvents = this.state.calendarEvents
      .filter(e => e.start_time.startsWith(todayStr))
      .map(e => ({
        type: 'event',
        id: e.id,
        title: e.title,
        time: e.start_time.slice(11, 16),
        endTime: e.end_time?.slice(11, 16),
        description: e.description,
        meetLink: e.meet_link,
        location: e.location
      }));

    // Filter today's tasks that have a time
    const todayTasks = this.state.tasks
      .filter(t => t.due_date === todayStr && !t.completed)
      .map(t => ({
        type: 'task',
        id: t.id,
        title: t.title,
        time: t.due_time || 'All Day',
        priority: t.priority,
        category: t.category,
        subtasks: t.subtasks || []
      }));

    const combined = [...todayEvents, ...todayTasks].sort((a, b) => {
      if (a.time === 'All Day') return -1;
      if (b.time === 'All Day') return 1;
      return a.time.localeCompare(b.time);
    });

    if (combined.length === 0) {
      container.innerHTML = `
        <div class="empty-state-sm">
          <p>🌴 No events or time-blocked tasks for today. Enjoy your day or add a task above!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = combined.map(item => {
      if (item.type === 'event') {
        return `
          <div class="timeline-item timeline-event">
            <div class="timeline-time">${item.time} ${item.endTime ? `- ${item.endTime}` : ''}</div>
            <div class="timeline-dot dot-calendar"></div>
            <div class="timeline-body">
              <div class="timeline-badge badge-gcal">📅 Google Calendar</div>
              <h4 class="timeline-title">${this.escape(item.title)}</h4>
              ${item.location ? `<p class="timeline-sub">📍 ${this.escape(item.location)}</p>` : ''}
              ${item.meetLink ? `<a href="${item.meetLink}" target="_blank" class="timeline-meet-btn">📹 Join Meeting</a>` : ''}
            </div>
          </div>
        `;
      } else {
        return `
          <div class="timeline-item timeline-task priority-border-${item.priority}">
            <div class="timeline-time">${item.time}</div>
            <div class="timeline-dot dot-${item.priority}"></div>
            <div class="timeline-body">
              <div class="timeline-badge badge-${item.priority}">!${item.priority.toUpperCase()}</div>
              <span class="timeline-cat-chip">#${item.category}</span>
              <h4 class="timeline-title">${this.escape(item.title)}</h4>
              <div class="timeline-actions">
                <button class="btn btn-xs btn-outline" onclick="window.app.toggleTask('${item.id}')">✓ Mark Done</button>
                <button class="btn btn-xs btn-ghost" onclick="window.app.openFocusOnTask('${item.id}')">⏱️ Focus</button>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  // 2. Today's To-Do List
  renderDashboardTodoList() {
    const container = document.getElementById('dashboard-todo-container');
    if (!container) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    // Tasks due today or with no date
    const tasks = this.state.tasks.filter(t => !t.completed && (t.due_date === todayStr || !t.due_date));

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-sm">
          <p>🎉 All caught up on today's tasks!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.slice(0, 6).map(t => this.renderTaskCard(t)).join('');
  }

  // 3. Upcoming Deadlines
  renderUpcomingDeadlines() {
    const container = document.getElementById('dashboard-deadlines-container');
    if (!container) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const upcoming = this.state.tasks.filter(t => !t.completed && t.due_date && t.due_date > todayStr)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    if (upcoming.length === 0) {
      container.innerHTML = `<p class="text-sm text-muted p-3">No upcoming deadlines this week.</p>`;
      return;
    }

    container.innerHTML = upcoming.slice(0, 5).map(t => {
      const diffDays = Math.ceil((new Date(t.due_date) - today) / (1000 * 60 * 60 * 24));
      const countdownText = diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;

      return `
        <div class="deadline-item">
          <div class="deadline-left">
            <span class="deadline-countdown badge-${diffDays <= 2 ? 'urgent' : 'high'}">${countdownText}</span>
            <div class="deadline-title">${this.escape(t.title)}</div>
          </div>
          <div class="deadline-meta">
            <span class="text-xs text-muted">${t.due_date} ${t.due_time || ''}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Overdue Tasks with Smart Rescheduling Suggestions
  renderOverdueBanner() {
    const banner = document.getElementById('overdue-tasks-section');
    const container = document.getElementById('overdue-tasks-list');
    if (!banner || !container) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = this.state.tasks.filter(t => !t.completed && t.due_date && t.due_date < todayStr);

    if (overdue.length === 0) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    container.innerHTML = overdue.map(t => `
      <div class="overdue-item">
        <div class="overdue-info">
          <span class="overdue-tag">⚠️ Overdue (Due ${t.due_date})</span>
          <h4 class="overdue-title">${this.escape(t.title)}</h4>
          <span class="text-xs text-muted">Category: ${t.category} • Priority: ${t.priority}</span>
        </div>
        <div class="overdue-reschedule-actions">
          <button class="btn btn-sm btn-outline-primary" onclick="window.app.smartReschedule('${t.id}', 'today')">
            Reschedule to Today
          </button>
          <button class="btn btn-sm btn-outline" onclick="window.app.smartReschedule('${t.id}', 'tomorrow')">
            Tomorrow 9 AM
          </button>
          <button class="btn btn-sm btn-outline" onclick="window.app.smartReschedule('${t.id}', 'weekend')">
            This Weekend
          </button>
          <button class="btn btn-sm btn-ghost" onclick="window.app.openEditTaskModal('${t.id}')">
            Custom Date...
          </button>
        </div>
      </div>
    `).join('');
  }

  // 5. Dashboard Quick Stats
  renderDashboardStats() {
    const todayStr = new Date().toISOString().slice(0, 10);
    const completedToday = this.state.tasks.filter(t => t.completed && t.completed_at?.startsWith(todayStr)).length;
    const pendingTotal = this.state.tasks.filter(t => !t.completed).length;

    const statCompleted = document.getElementById('dash-stat-completed');
    const statPending = document.getElementById('dash-stat-pending');
    const statHabitStreak = document.getElementById('dash-stat-streak');

    if (statCompleted) statCompleted.textContent = completedToday;
    if (statPending) statPending.textContent = pendingTotal;
    if (statHabitStreak) {
      const topStreak = Math.max(0, ...this.state.habits.map(h => h.streak || 0));
      statHabitStreak.textContent = `🔥 ${topStreak}d`;
    }
  }

  // Render a Single Task Card (used in Dashboard & Tasks view)
  renderTaskCard(task) {
    const subtasks = task.subtasks || [];
    const doneSubtasks = subtasks.filter(s => s.done).length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const isOverdue = !task.completed && task.due_date && task.due_date < todayStr;

    return `
      <div class="task-card priority-${task.priority} ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="task-card-main">
          <label class="task-checkbox-wrapper">
            <input
              type="checkbox"
              class="task-checkbox"
              ${task.completed ? 'checked' : ''}
              onchange="window.app.toggleTask('${task.id}')"
            />
            <span class="custom-checkbox"></span>
          </label>

          <div class="task-content">
            <div class="task-header-row">
              <h4 class="task-title ${task.completed ? 'line-through' : ''}">${this.escape(task.title)}</h4>
              ${task.google_event_id ? '<span class="gcal-icon-tag" title="Synced with Google Calendar">📅 GCal</span>' : ''}
            </div>

            ${task.notes ? `<p class="task-notes-snippet">${this.escape(task.notes)}</p>` : ''}

            <div class="task-tags-row">
              <span class="task-tag tag-priority priority-color-${task.priority}">!${task.priority}</span>
              <span class="task-tag tag-category">#${task.category}</span>
              ${task.due_date ? `
                <span class="task-tag tag-due ${isOverdue ? 'tag-overdue' : ''}">
                  📅 ${task.due_date} ${task.due_time || ''} ${isOverdue ? '(Overdue)' : ''}
                </span>
              ` : ''}
              ${task.repeat_frequency && task.repeat_frequency !== 'none' ? `
                <span class="task-tag tag-repeat">🔁 ${task.repeat_frequency}</span>
              ` : ''}
              ${subtasks.length > 0 ? `
                <span class="task-tag tag-subtasks" onclick="window.app.toggleSubtasksList('${task.id}')">
                  ☑️ ${doneSubtasks}/${subtasks.length} subtasks
                </span>
              ` : ''}
            </div>

            <!-- Subtasks checklist expandable -->
            ${subtasks.length > 0 ? `
              <div class="task-subtasks-drawer" id="subtasks-drawer-${task.id}">
                ${subtasks.map(s => `
                  <div class="subtask-row">
                    <label class="subtask-checkbox-label">
                      <input
                        type="checkbox"
                        ${s.done ? 'checked' : ''}
                        onchange="window.app.toggleSubtaskItem('${task.id}', '${s.id}')"
                      />
                      <span class="${s.done ? 'subtask-done' : ''}">${this.escape(s.text)}</span>
                    </label>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="task-card-actions">
          <button class="btn-icon" title="Focus Timer" onclick="window.app.openFocusOnTask('${task.id}')">⏱️</button>
          <button class="btn-icon" title="Edit Task" onclick="window.app.openEditTaskModal('${task.id}')">✏️</button>
          <button class="btn-icon text-rose" title="Delete Task" onclick="window.app.deleteTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;
  }

  // TASKS PAGE VIEW
  renderTasksPage() {
    const container = document.getElementById('tasks-page-list');
    if (!container) return;

    let filtered = [...this.state.tasks];

    // Status filter
    if (this.state.filterStatus === 'pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (this.state.filterStatus === 'completed') {
      filtered = filtered.filter(t => t.completed);
    } else if (this.state.filterStatus === 'overdue') {
      const todayStr = new Date().toISOString().slice(0, 10);
      filtered = filtered.filter(t => !t.completed && t.due_date && t.due_date < todayStr);
    }

    // Category filter
    if (this.state.filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category.toLowerCase() === this.state.filterCategory.toLowerCase());
    }

    // Priority filter
    if (this.state.filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority.toLowerCase() === this.state.filterPriority.toLowerCase());
    }

    // Search query
    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <h3>No tasks match your filters</h3>
          <p>Try clearing your search filters or create a new task with Quick Add.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(t => this.renderTaskCard(t)).join('');
  }

  // FOCUS PAGE VIEW
  renderFocusPage() {
    window.pomodoro.updateUI();
    const taskSelect = document.getElementById('pomodoro-task-selector');
    if (taskSelect) {
      taskSelect.innerHTML = `
        <option value="">-- General Focus Session (No Task) --</option>
        ${this.state.tasks.filter(t => !t.completed).map(t => `
          <option value="${t.id}" ${window.pomodoro.selectedTaskId === t.id ? 'selected' : ''}>
            ${this.escape(t.title)} (${t.category})
          </option>
        `).join('')}
      `;
      taskSelect.onchange = (e) => window.pomodoro.setSelectedTask(e.target.value);
    }
  }

  openFocusOnTask(taskId) {
    window.pomodoro.setSelectedTask(taskId);
    this.switchTab('focus');
  }

  // CALENDAR PAGE VIEW
  renderCalendarPage() {
    const container = document.getElementById('calendar-events-container');
    if (!container) return;

    const events = this.state.calendarEvents;
    if (events.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <h3>No Calendar Events Synced</h3>
          <p>Click "Sync with Google Calendar" to pull your schedule.</p>
          <button class="btn btn-primary" onclick="window.app.syncCalendarNow()">Sync Now</button>
        </div>
      `;
      return;
    }

    // Group events by date
    const grouped = {};
    events.forEach(evt => {
      const dateKey = evt.start_time.slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(evt);
    });

    const dates = Object.keys(grouped).sort();

    container.innerHTML = dates.map(dStr => {
      const dateObj = new Date(dStr + 'T00:00:00');
      const dateHeader = dateObj.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      return `
        <div class="cal-day-group">
          <h3 class="cal-day-title">📅 ${dateHeader}</h3>
          <div class="cal-events-list">
            ${grouped[dStr].map(e => `
              <div class="cal-event-card">
                <div class="cal-time-pill">${e.start_time.slice(11, 16)} - ${e.end_time?.slice(11, 16) || ''}</div>
                <div class="cal-event-info">
                  <h4 class="cal-title">${this.escape(e.title)}</h4>
                  ${e.description ? `<p class="cal-desc">${this.escape(e.description)}</p>` : ''}
                  ${e.location ? `<span class="cal-loc">📍 ${this.escape(e.location)}</span>` : ''}
                  ${e.meetLink ? `<a href="${e.meetLink}" target="_blank" class="cal-link">📹 Join Google Meet</a>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // NOTES PAGE VIEW
  renderNotesPage() {
    const container = document.getElementById('notes-grid-container');
    if (!container) return;

    let notes = [...this.state.notes];

    if (this.state.searchQuery) {
      const q = this.state.searchQuery;
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    }

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📒</div>
          <h3>No notes found</h3>
          <p>Capture thoughts, meeting notes, and markdown summaries.</p>
          <button class="btn btn-primary" onclick="window.app.openAddNoteModal()">+ Create Note</button>
        </div>
      `;
      return;
    }

    container.innerHTML = notes.map(n => `
      <div class="note-card note-color-${n.color} ${n.pinned ? 'note-pinned' : ''}" onclick="window.app.openEditNoteModal('${n.id}')">
        <div class="note-header">
          <h4 class="note-title">${this.escape(n.title)}</h4>
          ${n.pinned ? '<span class="note-pin-badge" title="Pinned Note">📌</span>' : ''}
        </div>
        <div class="note-body-preview">${this.escape(n.content)}</div>
        <div class="note-footer">
          <div class="note-tags">
            ${(n.tags || []).map(t => `<span class="note-tag">#${t}</span>`).join('')}
          </div>
          <button class="btn-icon-xs text-rose" title="Delete Note" onclick="event.stopPropagation(); window.app.deleteNote('${n.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // REPORTS PAGE VIEW
  async renderReportsPage() {
    try {
      const stats = await window.api.getStats();
      window.progressCharts.renderWeeklyReport(stats);
    } catch (e) {
      console.warn(e);
    }
  }

  // SETTINGS PAGE VIEW
  renderSettingsPage() {
    const s = this.state.settings || {};
    const morningTimeInput = document.getElementById('setting-morning-time');
    const eveningTimeInput = document.getElementById('setting-evening-time');
    const reminderOffsetSelect = document.getElementById('setting-reminder-offset');
    const soundSelect = document.getElementById('setting-sound-theme');
    const colorThemeSelect = document.getElementById('setting-color-theme');
    const emailInput = document.getElementById('setting-email');
    const googleClientIdInput = document.getElementById('setting-gclient-id');

    if (morningTimeInput) morningTimeInput.value = s.morning_summary_time || '08:00';
    if (eveningTimeInput) eveningTimeInput.value = s.evening_review_time || '20:00';
    if (reminderOffsetSelect) reminderOffsetSelect.value = s.reminder_minutes_before || '15';
    if (soundSelect) soundSelect.value = s.sound_theme || 'chime';
    if (colorThemeSelect) colorThemeSelect.value = s.color_theme || 'system';
    if (emailInput) emailInput.value = s.email_address || 'krishnacharan@gmail.com';
    if (googleClientIdInput) googleClientIdInput.value = s.google_client_id || '';
  }

  // Actions
  async toggleTask(id) {
    try {
      const res = await window.api.toggleTask(id);
      const task = this.state.tasks.find(t => t.id === id);
      if (task) {
        task.completed = res.completed;
        if (res.completed) {
          window.soundManager.play('ping');
        }
      }
      await this.refreshTasks();
      this.renderCurrentView();
    } catch (e) {
      console.error(e);
    }
  }

  async toggleSubtaskItem(taskId, subtaskId) {
    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.subtasks = task.subtasks || [];
    const item = task.subtasks.find(s => s.id === subtaskId);
    if (item) {
      item.done = !item.done;
      await window.api.updateTask(taskId, task);
      this.renderCurrentView();
    }
  }

  toggleSubtasksList(taskId) {
    const drawer = document.getElementById(`subtasks-drawer-${taskId}`);
    if (drawer) {
      drawer.classList.toggle('open');
    }
  }

  async smartReschedule(taskId, target) {
    const today = new Date();
    let newDateStr = today.toISOString().slice(0, 10);
    let newTimeStr = '09:00';

    if (target === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      newDateStr = tomorrow.toISOString().slice(0, 10);
    } else if (target === 'weekend') {
      const d = new Date(today);
      const diff = 6 - d.getDay(); // Next Saturday
      d.setDate(d.getDate() + (diff <= 0 ? diff + 7 : diff));
      newDateStr = d.toISOString().slice(0, 10);
      newTimeStr = '10:00';
    }

    try {
      await window.api.rescheduleTask(taskId, newDateStr, newTimeStr);
      await this.refreshTasks();
      window.soundManager.play('ping');
      window.notificationManager.showInAppToast('Task Rescheduled', `Moved to ${newDateStr} at ${newTimeStr}`, 'success');
      this.renderCurrentView();
    } catch (e) {
      console.error(e);
    }
  }

  async deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await window.api.deleteTask(id);
      this.state.tasks = this.state.tasks.filter(t => t.id !== id);
      await this.refreshCalendar();
      this.renderCurrentView();
    } catch (e) {
      console.error(e);
    }
  }

  async toggleHabitCheck(habitId, dateStr) {
    try {
      const res = await window.api.checkinHabit(habitId, dateStr);
      const habit = this.state.habits.find(h => h.id === habitId);
      if (habit) {
        habit.history = habit.history || [];
        if (res.checked && !habit.history.includes(dateStr)) {
          habit.history.push(dateStr);
          window.soundManager.play('marimba');
        } else if (!res.checked) {
          habit.history = habit.history.filter(d => d !== dateStr);
        }
        habit.streak = res.streak;
        habit.best_streak = res.bestStreak;
      }
      window.habitManager.renderHabitsList(this.state.habits);
      this.renderDashboardStats();
    } catch (e) {
      console.error(e);
    }
  }

  async deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit?')) return;
    try {
      await window.api.deleteHabit(habitId);
      this.state.habits = this.state.habits.filter(h => h.id !== habitId);
      window.habitManager.renderHabitsList(this.state.habits);
    } catch (e) {
      console.error(e);
    }
  }

  async deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      await window.api.deleteNote(noteId);
      this.state.notes = this.state.notes.filter(n => n.id !== noteId);
      this.renderNotesPage();
    } catch (e) {
      console.error(e);
    }
  }

  async syncCalendarNow() {
    const syncBtn = document.getElementById('sync-calendar-btn');
    if (syncBtn) syncBtn.classList.add('rotating');

    window.notificationManager.showInAppToast('Google Calendar Sync', 'Syncing your calendar events and tasks...', 'info');

    const result = await window.calendarManager.syncNow();
    if (syncBtn) syncBtn.classList.remove('rotating');

    await this.refreshTasks();
    await this.refreshCalendar();
    this.updateHeaderProfile();
    this.renderCurrentView();

    window.notificationManager.showInAppToast(
      'Calendar Synced',
      `Synced ${result?.syncedCount || 0} tasks to Google Calendar. Total events: ${result?.totalEvents || 0}.`,
      'success'
    );
  }

  async refreshTasks() {
    const data = await window.api.getTasks();
    this.state.tasks = data.tasks || [];
  }

  async refreshCalendar() {
    const data = await window.api.getCalendarEvents();
    this.state.calendarEvents = data.events || [];
  }

  // Modals Management
  openAddTaskModal() {
    this.state.editingTaskId = null;
    this.state.tempSubtasks = [];
    document.getElementById('task-modal-title').textContent = 'Create New Task';
    document.getElementById('task-form-title').value = '';
    document.getElementById('task-form-notes').value = '';
    document.getElementById('task-form-due-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('task-form-due-time').value = '10:00';
    document.getElementById('task-form-priority').value = 'medium';
    document.getElementById('task-form-category').value = 'Work';
    document.getElementById('task-form-repeat').value = 'none';

    this.renderModalSubtasks();
    document.getElementById('task-modal').classList.remove('hidden');
  }

  openEditTaskModal(id) {
    const task = this.state.tasks.find(t => t.id === id);
    if (!task) return;

    this.state.editingTaskId = id;
    this.state.tempSubtasks = [...(task.subtasks || [])];

    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-form-title').value = task.title;
    document.getElementById('task-form-notes').value = task.notes || '';
    document.getElementById('task-form-due-date').value = task.due_date || '';
    document.getElementById('task-form-due-time').value = task.due_time || '';
    document.getElementById('task-form-priority').value = task.priority || 'medium';
    document.getElementById('task-form-category').value = task.category || 'Work';
    document.getElementById('task-form-repeat').value = task.repeat_frequency || 'none';

    this.renderModalSubtasks();
    document.getElementById('task-modal').classList.remove('hidden');
  }

  closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
  }

  renderModalSubtasks() {
    const container = document.getElementById('modal-subtasks-list');
    if (!container) return;

    container.innerHTML = this.state.tempSubtasks.map((s, idx) => `
      <div class="subtask-edit-item">
        <span>☑️ ${this.escape(s.text)}</span>
        <button type="button" class="btn-icon-xs text-rose" onclick="window.app.removeModalSubtask(${idx})">&times;</button>
      </div>
    `).join('');
  }

  removeModalSubtask(idx) {
    this.state.tempSubtasks.splice(idx, 1);
    this.renderModalSubtasks();
  }

  async saveTaskModal() {
    const title = document.getElementById('task-form-title').value.trim();
    if (!title) {
      alert('Task title is required.');
      return;
    }

    const payload = {
      title,
      notes: document.getElementById('task-form-notes').value.trim(),
      due_date: document.getElementById('task-form-due-date').value || null,
      due_time: document.getElementById('task-form-due-time').value || null,
      priority: document.getElementById('task-form-priority').value,
      category: document.getElementById('task-form-category').value,
      repeat_frequency: document.getElementById('task-form-repeat').value,
      subtasks: this.state.tempSubtasks
    };

    try {
      if (this.state.editingTaskId) {
        await window.api.updateTask(this.state.editingTaskId, payload);
      } else {
        await window.api.createTask(payload);
      }

      await this.refreshTasks();
      await this.refreshCalendar();
      this.closeTaskModal();
      this.renderCurrentView();
      window.soundManager.play('ping');
    } catch (e) {
      console.error(e);
    }
  }

  // Habits Modal
  openAddHabitModal() {
    document.getElementById('habit-form-title').value = '';
    document.getElementById('habit-form-category').value = 'Health';
    document.getElementById('habit-form-icon').value = 'target';
    document.getElementById('habit-modal').classList.remove('hidden');
  }

  closeHabitModal() {
    document.getElementById('habit-modal').classList.add('hidden');
  }

  async saveHabitModal() {
    const title = document.getElementById('habit-form-title').value.trim();
    if (!title) return;

    const payload = {
      title,
      category: document.getElementById('habit-form-category').value,
      icon: document.getElementById('habit-form-icon').value,
      target_frequency: 'daily'
    };

    try {
      await window.api.createHabit(payload);
      const habitsData = await window.api.getHabits();
      this.state.habits = habitsData.habits || [];
      this.closeHabitModal();
      window.habitManager.renderHabitsList(this.state.habits);
      window.soundManager.play('marimba');
    } catch (e) {
      console.error(e);
    }
  }

  // Notes Modal
  openAddNoteModal() {
    this.state.editingNoteId = null;
    document.getElementById('note-modal-title').textContent = 'Create New Note';
    document.getElementById('note-form-title').value = '';
    document.getElementById('note-form-content').value = '';
    document.getElementById('note-form-color').value = 'blue';
    document.getElementById('note-form-tags').value = '';
    document.getElementById('note-form-pinned').checked = false;
    document.getElementById('note-modal').classList.remove('hidden');
  }

  openEditNoteModal(id) {
    const note = this.state.notes.find(n => n.id === id);
    if (!note) return;

    this.state.editingNoteId = id;
    document.getElementById('note-modal-title').textContent = 'Edit Note';
    document.getElementById('note-form-title').value = note.title;
    document.getElementById('note-form-content').value = note.content || '';
    document.getElementById('note-form-color').value = note.color || 'blue';
    document.getElementById('note-form-tags').value = (note.tags || []).join(', ');
    document.getElementById('note-form-pinned').checked = Boolean(note.pinned);
    document.getElementById('note-modal').classList.remove('hidden');
  }

  closeNoteModal() {
    document.getElementById('note-modal').classList.add('hidden');
  }

  async saveNoteModal() {
    const title = document.getElementById('note-form-title').value.trim();
    if (!title) return;

    const tagsRaw = document.getElementById('note-form-tags').value;
    const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      title,
      content: document.getElementById('note-form-content').value,
      color: document.getElementById('note-form-color').value,
      pinned: document.getElementById('note-form-pinned').checked,
      tags
    };

    try {
      if (this.state.editingNoteId) {
        await window.api.updateNote(this.state.editingNoteId, payload);
      } else {
        await window.api.createNote(payload);
      }

      const notesData = await window.api.getNotes();
      this.state.notes = notesData.notes || [];
      this.closeNoteModal();
      this.renderNotesPage();
      window.soundManager.play('ping');
    } catch (e) {
      console.error(e);
    }
  }

  // Theme Management
  applyTheme(theme) {
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effective);
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = effective === 'dark' ? '☀️' : '🌙';
      themeBtn.title = effective === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  getCurrentAppliedTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  async saveThemePreference(theme) {
    this.state.settings.color_theme = theme;
    await window.api.updateSettings(this.state.settings);
  }

  // Settings Save
  async saveSettings() {
    const morningTime = document.getElementById('setting-morning-time').value;
    const eveningTime = document.getElementById('setting-evening-time').value;
    const reminderOffset = parseInt(document.getElementById('setting-reminder-offset').value, 10);
    const soundTheme = document.getElementById('setting-sound-theme').value;
    const colorTheme = document.getElementById('setting-color-theme').value;
    const email = document.getElementById('setting-email').value;
    const gClientId = document.getElementById('setting-gclient-id').value;

    this.state.settings = {
      ...this.state.settings,
      morning_summary_time: morningTime,
      evening_review_time: eveningTime,
      reminder_minutes_before: reminderOffset,
      sound_theme: soundTheme,
      color_theme: colorTheme,
      email_address: email,
      google_client_id: gClientId
    };

    this.applyTheme(colorTheme);
    await window.api.updateSettings(this.state.settings);
    window.soundManager.play(soundTheme);
    window.notificationManager.showInAppToast('Settings Saved', 'Your assistant preferences have been updated.', 'success');
  }

  testSelectedSound() {
    const sel = document.getElementById('setting-sound-theme');
    const sound = sel ? sel.value : 'chime';
    window.soundManager.play(sound);
  }

  // Email Notification Preview Modal
  showEmailPreview(type) {
    const modal = document.getElementById('email-preview-modal');
    const container = document.getElementById('email-preview-content');
    if (!modal || !container) return;

    const email = this.state.settings?.email_address || 'krishnacharan@gmail.com';
    const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    let emailHtml = '';

    if (type === 'morning') {
      const todayStr = new Date().toISOString().slice(0, 10);
      const todayTasks = this.state.tasks.filter(t => !t.completed && t.due_date === todayStr);
      const todayEvents = this.state.calendarEvents.filter(e => e.start_time.startsWith(todayStr));

      emailHtml = `
        <div class="email-mockup">
          <div class="email-mockup-header">
            <div><strong>From:</strong> My PA Assistant &lt;assistant@mypa.ai&gt;</div>
            <div><strong>To:</strong> ${this.escape(email)}</div>
            <div><strong>Subject:</strong> 🌅 Your Daily Briefing for ${today}</div>
          </div>
          <div class="email-mockup-body">
            <h2>Good Morning, Krishna!</h2>
            <p>Here is your daily agenda and schedule prepared by your personal assistant:</p>
            
            <h3 style="color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px;">📅 Today's Calendar Schedule</h3>
            ${todayEvents.length > 0 ? `
              <ul>
                ${todayEvents.map(e => `<li><strong>${e.start_time.slice(11, 16)}:</strong> ${this.escape(e.title)} ${e.location ? `(${e.location})` : ''}</li>`).join('')}
              </ul>
            ` : '<p>No scheduled calendar appointments today.</p>'}

            <h3 style="color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; margin-top: 16px;">📝 Key To-Do Tasks</h3>
            ${todayTasks.length > 0 ? `
              <ul>
                ${todayTasks.map(t => `<li><strong>[${t.priority.toUpperCase()}]</strong> ${this.escape(t.title)} (${t.due_time || 'All Day'})</li>`).join('')}
              </ul>
            ` : '<p>No tasks with a due date today.</p>'}

            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 13px; color: #64748b;">
              Delivered automatically by <strong>My PA Progressive Web App</strong>.
            </div>
          </div>
        </div>
      `;
    } else {
      const unfinished = this.state.tasks.filter(t => !t.completed);
      emailHtml = `
        <div class="email-mockup">
          <div class="email-mockup-header">
            <div><strong>From:</strong> My PA Assistant &lt;assistant@mypa.ai&gt;</div>
            <div><strong>To:</strong> ${this.escape(email)}</div>
            <div><strong>Subject:</strong> 🌙 Evening Review & Unfinished Tasks</div>
          </div>
          <div class="email-mockup-body">
            <h2>Good Evening, Krishna!</h2>
            <p>You have <strong>${unfinished.length} unfinished tasks</strong> remaining. Review them below to reschedule for tomorrow or the weekend:</p>
            
            <ul>
              ${unfinished.slice(0, 5).map(t => `<li>${this.escape(t.title)} (Priority: ${t.priority})</li>`).join('')}
            </ul>

            <div style="margin-top: 24px;">
              <a href="#" style="background: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Open My PA to Reschedule
              </a>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = emailHtml;
    modal.classList.remove('hidden');
  }

  closeEmailPreview() {
    document.getElementById('email-preview-modal')?.classList.add('hidden');
  }

  // Backup Export & Import
  async exportDataBackup() {
    try {
      const data = await window.api.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my_pa_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.notificationManager.showInAppToast('Backup Exported', 'Downloaded backup JSON file.', 'success');
    } catch (e) {
      console.error(e);
    }
  }

  escape(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }
}

// Instantiate on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('My PA Service Worker registered with scope:', reg.scope);
    }).catch(err => {
      console.warn('SW registration failed:', err);
    });
  }
});
