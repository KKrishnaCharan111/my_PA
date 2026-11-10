// Pomodoro Focus Timer Manager with Ambient Sounds & Task Linkage
class PomodoroTimer {
  constructor() {
    this.durations = {
      work: 25 * 60,
      shortBreak: 5 * 60,
      longBreak: 15 * 60
    };
    this.mode = 'work'; // 'work', 'shortBreak', 'longBreak'
    this.timeLeft = this.durations.work;
    this.totalDuration = this.durations.work;
    this.isRunning = false;
    this.timerId = null;
    this.selectedTaskId = null;
    this.completedCount = 0;
    this.ambientType = 'none';
    this.ambientVolume = 0.3;
  }

  setMode(mode) {
    if (this.isRunning) this.pause();
    this.mode = mode;
    this.timeLeft = this.durations[mode] || 25 * 60;
    this.totalDuration = this.timeLeft;
    this.updateUI();
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Start ambient sound if selected
    if (this.ambientType !== 'none') {
      window.soundManager.startAmbient(this.ambientType, this.ambientVolume);
    }

    this.timerId = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.updateUI();
      } else {
        this.handleComplete();
      }
    }, 1000);

    this.updateUI();
  }

  pause() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    window.soundManager.stopAmbient();
    this.updateUI();
  }

  reset() {
    this.pause();
    this.timeLeft = this.durations[this.mode];
    this.updateUI();
  }

  skip() {
    this.pause();
    if (this.mode === 'work') {
      this.setMode(this.completedCount % 4 === 3 ? 'longBreak' : 'shortBreak');
    } else {
      this.setMode('work');
    }
  }

  async handleComplete() {
    this.pause();
    window.soundManager.play('bell');

    if (this.mode === 'work') {
      this.completedCount++;
      const durationMins = Math.round(this.durations.work / 60);

      // Record to backend database
      try {
        await window.api.recordFocusSession({
          task_id: this.selectedTaskId,
          duration_minutes: durationMins,
          mode: 'work'
        });
        document.dispatchEvent(new CustomEvent('focus:session-completed', {
          detail: { duration: durationMins, taskId: this.selectedTaskId }
        }));
      } catch (e) {
        console.warn('Failed recording focus session:', e);
      }

      window.notificationManager.show('🎉 Pomodoro Completed!', {
        body: `Great job! You focused for ${durationMins} minutes. Time for a well-deserved break!`
      });

      // Switch to break
      this.setMode(this.completedCount % 4 === 0 ? 'longBreak' : 'shortBreak');
    } else {
      window.notificationManager.show('⏰ Break Finished!', {
        body: 'Break is over. Ready for your next focus session?'
      });
      this.setMode('work');
    }
  }

  setAmbient(type) {
    this.ambientType = type;
    if (this.isRunning) {
      if (type === 'none') {
        window.soundManager.stopAmbient();
      } else {
        window.soundManager.startAmbient(type, this.ambientVolume);
      }
    }
  }

  setAmbientVolume(vol) {
    this.ambientVolume = parseFloat(vol);
    if (this.isRunning && this.ambientType !== 'none') {
      window.soundManager.startAmbient(this.ambientType, this.ambientVolume);
    }
  }

  setSelectedTask(taskId) {
    this.selectedTaskId = taskId || null;
    this.updateUI();
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  updateUI() {
    const timeDisplay = document.getElementById('pomodoro-time-display');
    const startBtn = document.getElementById('pomodoro-start-btn');
    const progressCircle = document.getElementById('pomodoro-progress-ring');
    const modeTabs = document.querySelectorAll('.pomodoro-mode-tab');
    const activeTaskDisplay = document.getElementById('pomodoro-linked-task');

    const formatted = this.formatTime(this.timeLeft);

    if (timeDisplay) timeDisplay.textContent = formatted;
    document.title = this.isRunning ? `(${formatted}) My PA - Focus` : 'My PA - Personal Assistant';

    if (startBtn) {
      startBtn.innerHTML = this.isRunning
        ? `<span>⏸️</span> Pause`
        : `<span>▶️</span> Start Focus`;
      startBtn.className = `btn btn-lg ${this.isRunning ? 'btn-warning' : 'btn-primary'}`;
    }

    if (progressCircle) {
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      const progress = (this.totalDuration - this.timeLeft) / this.totalDuration;
      const offset = circumference - progress * circumference;
      progressCircle.style.strokeDasharray = `${circumference}`;
      progressCircle.style.strokeDashoffset = `${offset}`;
    }

    if (modeTabs) {
      modeTabs.forEach(tab => {
        if (tab.dataset.mode === this.mode) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }

    if (activeTaskDisplay) {
      if (this.selectedTaskId && window.appState && window.appState.tasks) {
        const task = window.appState.tasks.find(t => t.id === this.selectedTaskId);
        activeTaskDisplay.innerHTML = task
          ? `🎯 Focusing on: <strong>${this.escape(task.title)}</strong>`
          : '🎯 General Focus Session';
      } else {
        activeTaskDisplay.innerHTML = '🎯 General Focus Session';
      }
    }
  }

  escape(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[m]);
  }
}

window.pomodoro = new PomodoroTimer();
