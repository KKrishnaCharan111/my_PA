// SVG-based Weekly Progress Report Visualizer
class ProgressCharts {
  static renderWeeklyReport(stats, containerId = 'weekly-report-container') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!stats || !stats.weekly) {
      container.innerHTML = '<div class="text-muted p-4">Loading report data...</div>';
      return;
    }

    const { weekly, overview, categories } = stats;
    const maxTasks = Math.max(...weekly.map(d => Math.max(d.completed, d.created, 4)));

    // Generate Weekly Completion Bar Chart SVG
    const chartHeight = 180;
    const chartWidth = 520;
    const barWidth = 24;
    const spacing = (chartWidth - 40) / weekly.length;

    const barsSvg = weekly.map((d, i) => {
      const x = 30 + i * spacing;
      const completedH = (d.completed / maxTasks) * (chartHeight - 40);
      const createdH = (d.created / maxTasks) * (chartHeight - 40);
      const completedY = chartHeight - 25 - completedH;
      const createdY = chartHeight - 25 - createdH;

      return `
        <g class="chart-day-group">
          <!-- Created Bar -->
          <rect x="${x}" y="${createdY}" width="${barWidth}" height="${createdH}" rx="4" fill="rgba(99, 102, 241, 0.2)" />
          <!-- Completed Bar -->
          <rect x="${x + 6}" y="${completedY}" width="${barWidth - 6}" height="${completedH}" rx="4" fill="#6366f1">
            <title>${d.day} (${d.date}): ${d.completed} completed, ${d.created} created</title>
          </rect>
          <!-- Count text -->
          ${d.completed > 0 ? `<text x="${x + barWidth/2}" y="${completedY - 6}" text-anchor="middle" font-size="11" font-weight="600" fill="currentColor">${d.completed}</text>` : ''}
          <!-- Day label -->
          <text x="${x + barWidth/2}" y="${chartHeight - 6}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.7">${d.day}</text>
        </g>
      `;
    }).join('');

    const focusHours = Math.floor(overview.totalFocusMinutes / 60);
    const focusMinsRemainder = overview.totalFocusMinutes % 60;

    container.innerHTML = `
      <div class="report-overview-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper bg-indigo-soft">🎯</div>
          <div class="stat-content">
            <span class="stat-label">Tasks Completed</span>
            <span class="stat-value text-indigo">${overview.totalCompleted}</span>
            <span class="stat-subtext">${overview.totalPending} currently active</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-emerald-soft">📈</div>
          <div class="stat-content">
            <span class="stat-label">Productivity Rate</span>
            <span class="stat-value text-emerald">${overview.completionRate}%</span>
            <span class="stat-subtext">Completion efficiency</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-amber-soft">⏱️</div>
          <div class="stat-content">
            <span class="stat-label">Focus Logged</span>
            <span class="stat-value text-amber">${focusHours}h ${focusMinsRemainder}m</span>
            <span class="stat-subtext">Deep work time</span>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper bg-rose-soft">⚠️</div>
          <div class="stat-content">
            <span class="stat-label">Overdue Tasks</span>
            <span class="stat-value text-rose">${overview.overdueCount}</span>
            <span class="stat-subtext">${overview.overdueCount > 0 ? 'Requires attention' : 'All caught up!'}</span>
          </div>
        </div>
      </div>

      <div class="report-charts-row">
        <div class="report-card chart-card">
          <div class="report-card-header">
            <h4>Daily Task Activity</h4>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-color bg-indigo-soft"></span> Created</span>
              <span class="legend-item"><span class="legend-color bg-indigo"></span> Completed</span>
            </div>
          </div>
          <div class="svg-container">
            <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="w-full h-auto">
              <!-- Grid lines -->
              <line x1="20" y1="20" x2="${chartWidth - 20}" y2="20" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="4" />
              <line x1="20" y1="${chartHeight/2}" x2="${chartWidth - 20}" y2="${chartHeight/2}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="4" />
              <line x1="20" y1="${chartHeight - 25}" x2="${chartWidth - 20}" y2="${chartHeight - 25}" stroke="currentColor" stroke-opacity="0.2" />
              ${barsSvg}
            </svg>
          </div>
        </div>

        <div class="report-card categories-card">
          <div class="report-card-header">
            <h4>Category Breakdown</h4>
            <span class="text-sm text-muted">Distribution</span>
          </div>
          <div class="categories-bars-list">
            ${categories && categories.length > 0 ? categories.map(cat => {
              const total = overview.totalCompleted + overview.totalPending || 1;
              const pct = Math.round((cat.count / total) * 100);
              const colorClass = ProgressCharts.getCategoryColorClass(cat.category);
              return `
                <div class="category-stat-row">
                  <div class="cat-stat-info">
                    <span class="cat-stat-name">${cat.category}</span>
                    <span class="cat-stat-count">${cat.count} (${pct}%)</span>
                  </div>
                  <div class="cat-progress-track">
                    <div class="cat-progress-fill ${colorClass}" style="width: ${pct}%"></div>
                  </div>
                </div>
              `;
            }).join('') : '<p class="text-muted">No category data available</p>'}
          </div>
        </div>
      </div>
    `;
  }

  static getCategoryColorClass(cat) {
    const map = {
      Work: 'fill-indigo',
      Personal: 'fill-sky',
      Health: 'fill-emerald',
      Study: 'fill-purple',
      Finance: 'fill-amber',
      Errands: 'fill-rose'
    };
    return map[cat] || 'fill-indigo';
  }
}

window.progressCharts = ProgressCharts;
