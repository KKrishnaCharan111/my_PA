// Habit Tracker with Streaks and 7-day Check-in Matrix
class HabitManager {
  constructor() {
    this.daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }

  getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const isToday = i === 0;
      dates.push({ iso, dayLabel, dayNum, isToday });
    }
    return dates;
  }

  renderHabitsList(habits, containerId = 'habits-list-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!habits || habits.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <h3>No habits tracked yet</h3>
          <p>Build positive daily routines by adding your first habit below.</p>
          <button class="btn btn-primary" onclick="window.app.openAddHabitModal()">+ Create First Habit</button>
        </div>
      `;
      return;
    }

    const last7Days = this.getLast7Days();

    let html = `
      <div class="habits-header-row">
        <div class="habit-col-title">Habit &amp; Streak</div>
        <div class="habit-col-matrix">
          ${last7Days.map(d => `
            <div class="matrix-day-header ${d.isToday ? 'matrix-today' : ''}">
              <span class="m-label">${d.dayLabel}</span>
              <span class="m-num">${d.dayNum}</span>
            </div>
          `).join('')}
        </div>
        <div class="habit-col-actions"></div>
      </div>
      <div class="habits-cards-wrapper">
    `;

    habits.forEach(habit => {
      const history = habit.history || [];
      const streak = habit.streak || 0;
      const best = habit.best_streak || streak;

      html += `
        <div class="habit-card" data-id="${habit.id}">
          <div class="habit-info-side">
            <div class="habit-icon-badge">${this.getIconSymbol(habit.icon)}</div>
            <div class="habit-details">
              <h4 class="habit-name">${this.escape(habit.title)}</h4>
              <div class="habit-meta">
                <span class="habit-category-tag">${this.escape(habit.category)}</span>
                <span class="habit-streak-badge ${streak > 0 ? 'active' : ''}">
                  🔥 ${streak} day${streak === 1 ? '' : 's'} streak
                </span>
                <span class="habit-best-badge">Best: ${best}d</span>
              </div>
            </div>
          </div>

          <div class="habit-matrix-side">
            ${last7Days.map(d => {
              const isChecked = history.includes(d.iso);
              return `
                <button
                  type="button"
                  class="matrix-check-btn ${isChecked ? 'checked' : ''} ${d.isToday ? 'today-btn' : ''}"
                  title="${d.dayLabel} (${d.iso}): ${isChecked ? 'Completed' : 'Not completed'}"
                  onclick="window.app.toggleHabitCheck('${habit.id}', '${d.iso}')"
                >
                  ${isChecked ? '✓' : ''}
                </button>
              `;
            }).join('')}
          </div>

          <div class="habit-actions-side">
            <button class="btn-icon text-muted" title="Delete Habit" onclick="window.app.deleteHabit('${habit.id}')">
              🗑️
            </button>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  getIconSymbol(icon) {
    const iconMap = {
      droplet: '💧',
      sun: '☀️',
      'book-open': '📖',
      moon: '🌙',
      dumbbell: '💪',
      target: '🎯',
      zap: '⚡',
      heart: '❤️',
      coffee: '☕',
      smile: '😊'
    };
    return iconMap[icon] || '🎯';
  }

  escape(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }
}

window.habitManager = new HabitManager();
