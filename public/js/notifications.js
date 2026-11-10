// Notifications, Daily Morning Summary, Evening Review, and Audio/Push Manager
class NotificationManager {
  constructor() {
    this.permission = 'default';
    this.checkInterval = null;
    this.lastMorningCheck = null;
    this.lastEveningCheck = null;
    this.notifiedTaskIds = new Set();
    this.init();
  }

  async init() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
    // Check every 30 seconds for scheduled triggers (morning summary, task reminders, evening review)
    this.checkInterval = setInterval(() => this.checkSchedules(), 30000);
  }

  async requestPermission() {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return false;
    }
    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      document.dispatchEvent(new CustomEvent('notification:permission-changed', { detail: result }));
      return result === 'granted';
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  // Trigger browser push notification with custom sound and actions
  async show(title, options = {}) {
    const soundTheme = options.soundTheme || (window.appState && window.appState.settings ? window.appState.settings.sound_theme : 'chime');
    
    // Play selected notification sound
    window.soundManager.play(soundTheme);

    const defaultOptions = {
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      vibrate: [200, 100, 200],
      ...options
    };

    if (this.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg && reg.showNotification) {
            return reg.showNotification(title, {
              ...defaultOptions,
              actions: options.actions || [
                { action: 'mark-done', title: '✓ Mark Done' },
                { action: 'snooze', title: '⏰ Snooze 15m' }
              ]
            });
          }
        }
        return new Notification(title, defaultOptions);
      } catch (e) {
        console.warn('Native notification failed, showing in-app toast:', e);
      }
    }

    // Always show in-app toast
    this.showInAppToast(title, options.body || '', options.type || 'info', options.data);
  }

  showInAppToast(title, message, type = 'info', data = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type} animate-slide-in`;
    
    const iconMap = {
      info: '🔔',
      success: '✅',
      warning: '⚠️',
      digest: '🌅',
      evening: '🌙'
    };

    toast.innerHTML = `
      <div class="toast-icon">${iconMap[type] || '🔔'}</div>
      <div class="toast-content">
        <div class="toast-title">${this.escape(title)}</div>
        <div class="toast-body">${this.escape(message)}</div>
        ${data && data.taskId ? `
          <div class="toast-actions">
            <button class="toast-btn toast-btn-done" onclick="window.app.toggleTask('${data.taskId}'); this.closest('.toast-item').remove();">✓ Done</button>
            <button class="toast-btn toast-btn-snooze" onclick="window.notificationManager.snoozeTask('${data.taskId}', '${this.escape(title)}'); this.closest('.toast-item').remove();">⏰ Snooze</button>
          </div>
        ` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast-item').remove();">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 8000);
  }

  snoozeTask(taskId, title) {
    this.showInAppToast('Task Snoozed', `"${title}" snoozed for 15 minutes.`, 'info');
    setTimeout(() => {
      this.show(`⏰ Snoozed Reminder: ${title}`, {
        body: 'Your 15-minute snooze is up! Tap to complete or reschedule.',
        data: { taskId }
      });
    }, 15 * 60 * 1000);
  }

  // Periodic check for morning digest, evening review, and upcoming task reminders
  async checkSchedules() {
    if (!window.appState || !window.appState.settings) return;
    const { settings, tasks } = window.appState;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().slice(0, 10);

    // 1. Morning Digest Check
    if (settings.morning_summary_time === currentTimeStr && this.lastMorningCheck !== todayStr) {
      this.lastMorningCheck = todayStr;
      this.triggerMorningDigest(true);
    }

    // 2. Evening Review Check
    if (settings.evening_review_time === currentTimeStr && this.lastEveningCheck !== todayStr) {
      this.lastEveningCheck = todayStr;
      this.triggerEveningReview(true);
    }

    // 3. Pre-task Reminder Check
    if (tasks && Array.isArray(tasks)) {
      const reminderOffset = settings.reminder_minutes_before || 15;
      tasks.forEach(task => {
        if (!task.completed && task.due_date === todayStr && task.due_time && !this.notifiedTaskIds.has(task.id)) {
          const [h, m] = task.due_time.split(':').map(Number);
          const taskTime = new Date();
          taskTime.setHours(h, m, 0, 0);

          const diffMinutes = Math.round((taskTime.getTime() - now.getTime()) / (60 * 1000));
          if (diffMinutes <= reminderOffset && diffMinutes >= 0) {
            this.notifiedTaskIds.add(task.id);
            this.show(`Reminder: ${task.title}`, {
              body: `Due in ${diffMinutes} minutes (${task.due_time}). Priority: ${task.priority.toUpperCase()}`,
              data: { taskId: task.id }
            });
          }
        }
      });
    }
  }

  // Trigger Morning Summary
  async triggerMorningDigest(automated = false) {
    try {
      const digest = await window.api.getMorningDigest();
      const taskList = digest.tasks.map(t => `• ${t.title} (${t.due_time || 'All day'})`).slice(0, 3).join('\n');
      const body = `${digest.message}\n${taskList}`;

      this.show(digest.title, {
        body,
        type: 'digest',
        soundTheme: window.appState?.settings?.sound_theme || 'chime'
      });

      document.dispatchEvent(new CustomEvent('notification:digest-received', { detail: digest }));
      return digest;
    } catch (e) {
      console.error(e);
    }
  }

  // Trigger Evening Review
  async triggerEveningReview(automated = false) {
    try {
      const review = await window.api.getEveningReview();
      this.show(review.title, {
        body: review.message,
        type: 'evening',
        soundTheme: window.appState?.settings?.sound_theme || 'zen'
      });

      document.dispatchEvent(new CustomEvent('notification:evening-received', { detail: review }));
      return review;
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

window.notificationManager = new NotificationManager();
