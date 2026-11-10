// Google Sign-In and Google Calendar Two-Way Sync Manager
class CalendarSyncManager {
  constructor() {
    this.isConnected = true;
    this.userProfile = {
      name: 'Krishna Charan',
      email: 'krishnacharan@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };
    this.lastSyncedAt = new Date();
    this.isSyncing = false;
    this.autoSyncInterval = null;
    this.init();
  }

  init() {
    // Auto sync every 5 minutes
    this.autoSyncInterval = setInterval(() => {
      if (this.isConnected) {
        this.syncNow(true);
      }
    }, 5 * 60 * 1000);
  }

  setConnection(status, profile = null) {
    this.isConnected = status;
    if (profile) this.userProfile = profile;
    document.dispatchEvent(new CustomEvent('calendar:sync-status-changed', {
      detail: { isConnected: this.isConnected, profile: this.userProfile }
    }));
  }

  async syncNow(silent = false) {
    if (this.isSyncing) return;
    this.isSyncing = true;
    document.dispatchEvent(new CustomEvent('calendar:sync-started'));

    try {
      const result = await window.api.syncCalendar();
      this.lastSyncedAt = new Date();
      this.isSyncing = false;

      document.dispatchEvent(new CustomEvent('calendar:synced', {
        detail: {
          syncedCount: result.syncedCount,
          totalEvents: result.totalEvents,
          lastSynced: this.lastSyncedAt,
          silent
        }
      }));

      if (!silent) {
        window.soundManager.play('ping');
      }
      return result;
    } catch (err) {
      console.error('Calendar sync error:', err);
      this.isSyncing = false;
      document.dispatchEvent(new CustomEvent('calendar:sync-error', { detail: err }));
    }
  }

  formatEventTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatEventDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' });
  }
}

window.calendarManager = new CalendarSyncManager();
