// Smart Natural Language Parser for Quick Add
// Parses: "call mom tomorrow at 5 pm", "team sprint on friday at 10am #work !high repeat weekly"
class QuickAddNLP {
  static parse(input) {
    if (!input || !input.trim()) return null;

    let text = input.trim();
    let priority = 'medium';
    let category = 'Work';
    let repeatFrequency = 'none';
    let dueDate = null;
    let dueTime = null;
    const now = new Date();

    // 1. Priority tags: !urgent, !high, !med, !medium, !low
    if (/!(urgent|high|priority)/i.test(text)) {
      priority = text.match(/!urgent/i) ? 'urgent' : 'high';
      text = text.replace(/!(urgent|high|priority)/gi, '');
    } else if (/!(med|medium)/i.test(text)) {
      priority = 'medium';
      text = text.replace(/!(med|medium)/gi, '');
    } else if (/!low/i.test(text)) {
      priority = 'low';
      text = text.replace(/!low/gi, '');
    }

    // 2. Category tags: #work, #personal, #health, #study, #finance, #errands
    const catMatch = text.match(/#(\w+)/);
    if (catMatch) {
      const tag = catMatch[1].toLowerCase();
      const catMap = {
        work: 'Work',
        personal: 'Personal',
        health: 'Health',
        fitness: 'Health',
        gym: 'Health',
        study: 'Study',
        learning: 'Study',
        finance: 'Finance',
        money: 'Finance',
        errand: 'Errands',
        errands: 'Errands'
      };
      category = catMap[tag] || (tag.charAt(0).toUpperCase() + tag.slice(1));
      text = text.replace(/#\w+/g, '');
    }

    // 3. Repeat pattern: repeat daily, every day, daily, weekly, monthly
    if (/\b(repeat daily|every day|daily)\b/i.test(text)) {
      repeatFrequency = 'daily';
      text = text.replace(/\b(repeat daily|every day|daily)\b/gi, '');
    } else if (/\b(repeat weekly|every week|weekly)\b/i.test(text)) {
      repeatFrequency = 'weekly';
      text = text.replace(/\b(repeat weekly|every week|weekly)\b/gi, '');
    } else if (/\b(repeat monthly|every month|monthly)\b/i.test(text)) {
      repeatFrequency = 'monthly';
      text = text.replace(/\b(repeat monthly|every month|monthly)\b/gi, '');
    }

    // 4. Time parsing: "at 5 pm", "at 5:30pm", "5pm", "17:00", "at 9 am"
    const timeMatch = text.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) || text.match(/\bat\s+(\d{1,2})(?::(\d{2}))\b/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      dueTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      text = text.replace(timeMatch[0], '');
    } else if (/\b(this morning|in the morning)\b/i.test(text)) {
      dueTime = '09:00';
      text = text.replace(/\b(this morning|in the morning)\b/gi, '');
    } else if (/\b(this afternoon|in the afternoon)\b/i.test(text)) {
      dueTime = '14:00';
      text = text.replace(/\b(this afternoon|in the afternoon)\b/gi, '');
    } else if (/\b(this evening|in the evening|tonight)\b/i.test(text)) {
      dueTime = '18:00';
      text = text.replace(/\b(this evening|in the evening|tonight)\b/gi, '');
    }

    // 5. Date parsing
    // Today / Tonight
    if (/\b(today|tonight)\b/i.test(text)) {
      dueDate = now.toISOString().slice(0, 10);
      text = text.replace(/\b(today|tonight)\b/gi, '');
    }
    // Tomorrow / Day after tomorrow
    else if (/\bday after tomorrow\b/i.test(text)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 2);
      dueDate = d.toISOString().slice(0, 10);
      text = text.replace(/\bday after tomorrow\b/gi, '');
    } else if (/\btomorrow\b/i.test(text)) {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      dueDate = d.toISOString().slice(0, 10);
      text = text.replace(/\btomorrow\b/gi, '');
    }
    // In X days
    else if (/\bin (\d+) days?\b/i.test(text)) {
      const match = text.match(/\bin (\d+) days?\b/i);
      const days = parseInt(match[1], 10);
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      dueDate = d.toISOString().slice(0, 10);
      text = text.replace(match[0], '');
    }
    // Days of week: monday, tuesday, etc.
    else {
      const daysMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const weekdayMatch = text.match(/\b(?:on\s+|next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      if (weekdayMatch) {
        const targetDay = daysMap[weekdayMatch[1].toLowerCase()];
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        if (diff <= 0) diff += 7; // Next occurrence
        const d = new Date(now);
        d.setDate(d.getDate() + diff);
        dueDate = d.toISOString().slice(0, 10);
        text = text.replace(weekdayMatch[0], '');
      }
    }

    // If time was set but date was not set, default to today if in future, else tomorrow
    if (dueTime && !dueDate) {
      dueDate = now.toISOString().slice(0, 10);
    }

    // Clean up remaining title text
    let cleanTitle = text
      .replace(/\s+/g, ' ')
      .replace(/\b(?:by|on|at|due)\s*$/gi, '')
      .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
      .trim();

    if (!cleanTitle) cleanTitle = 'Untitled Task';
    // Capitalize first letter
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

    return {
      title: cleanTitle,
      due_date: dueDate,
      due_time: dueTime,
      priority,
      category,
      repeat_frequency: repeatFrequency
    };
  }
}

window.QuickAddNLP = QuickAddNLP;
