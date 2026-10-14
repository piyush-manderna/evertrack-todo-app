import * as chrono from 'chrono-node';

/*
  parseTaskText(text): finds a date and/or time written inside a task title.

    "Dentist tomorrow 5pm"       -> { title: 'Dentist', task_date: '2026-10-14', task_time: '17:00' }
    "Pay rent on 25 Oct"         -> { title: 'Pay rent', task_date: '2026-10-25', task_time: null }
    "Call mom in 2 hours"        -> { title: 'Call mom', task_date: today, task_time: now + 2h }
    "Water plants every day 8am" -> { title unchanged, task_time: '08:00', repeat: 'every day' }

  Dates come back as 'YYYY-MM-DD' and times as 'HH:MM' (local time), the same shapes the
  date and time inputs use. A field the title doesn't mention is null.
  Repeating phrases ("every day", "weekly"...) are detected but not supported by the database
  yet, so they stay in the title and are reported in `repeat`.
*/

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const REPEAT = /\b(?:every\s?day|everyday|daily|weekly|monthly|every\s+(?:other\s+)?(?:day|week|month|year|weekday|weekend|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:r(?:s(?:day)?)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)s?)\b/i;

// Ordinary words that are also month/day names. Ignored when written alone in lower case
// ("may I", "sat down", "sun cream"), but "May 5" or "Sat" still work.
const AMBIGUOUS = /^(?:may|march|sat|sun|mon|wed|now|second|sec)$/;

// Words left dangling in front of a removed date ("pay rent on 25 Oct" -> "pay rent")
const TRAILING_CONNECTORS = /(?:\s+(?:on|at|by|before|for|due|from|until|till|around|in|this|the|coming))+\s*$/i;

export function parseTaskText(text, ref = new Date()) {
  const none = { title: text, task_date: null, task_time: null, repeat: null };
  if (!text || !text.trim()) return none;

  // hide a repeat phrase from the date parser (same length, so positions still line up)
  let masked = text;
  let repeat = null;
  const rep = text.match(REPEAT);
  if (rep) {
    repeat = rep[0];
    masked = text.slice(0, rep.index) + ' '.repeat(rep[0].length) + text.slice(rep.index + rep[0].length);
  }

  const found = chrono
    .parse(masked, ref, { forwardDate: true })
    .filter((r) => !(AMBIGUOUS.test(r.text) && r.text === r.text.toLowerCase()));
  let task_date = null;
  let task_time = null;
  for (const r of found) {
    const s = r.start;
    const d = s.date();
    const relative = /^\s*(?:in\s+)?(?:\d+|an?|half an?)\s*(?:\+\s*)?(?:hours?|hrs?|minutes?|mins?|days?|weeks?|months?)\b/i.test(r.text) || /\bfrom now\b/i.test(r.text);
    if (!task_date && (s.isCertain('day') || s.isCertain('weekday') || relative)) task_date = ymd(d);
    if (!task_time && (s.isCertain('hour') || (relative && /hour|hr|minute|min/i.test(r.text)))) {
      let h = d.getHours();
      // "at 3" with no am/pm means the afternoon for hours 1-6 (but "03:00" is left alone)
      if (!relative && !s.isCertain('meridiem') && !/\b0\d:\d{2}/.test(r.text)) {
        if (h >= 1 && h <= 6) h += 12;
        else if (h >= 7 && h <= 11 && /\b(?:dinner|supper|tonight|evening|night)\b/i.test(text)) h += 12;
      }
      task_time = `${pad(h)}:${pad(d.getMinutes())}`;
    }
  }

  // "on the 20th": chrono skips a bare day-of-month, so handle it here when it isn't part of
  // something chrono already understood ("20th Oct", "Oct 20th")
  if (!task_date) {
    const ord = masked.match(/\b(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i);
    if (ord) {
      const end = ord.index + ord[0].length;
      const overlaps = found.some((r) => ord.index < r.index + r.text.length && end > r.index);
      const day = Number(ord[1]);
      if (!overlaps && day >= 1 && day <= 31) {
        const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
        let date = new Date(ref.getFullYear(), ref.getMonth(), day);
        if (date < today) date = new Date(ref.getFullYear(), ref.getMonth() + 1, day);
        if (date.getDate() === day) {
          task_date = ymd(date);
          found.push({ index: ord.index, text: ord[0], start: null });
        }
      }
    }
  }
  if (!task_date && !task_time) return { ...none, repeat };

  // remove the date words from the title, last one first so earlier positions stay valid
  let title = text;
  for (const r of [...found].sort((a, b) => b.index - a.index)) {
    const before = title.slice(0, r.index).replace(TRAILING_CONNECTORS, '');
    title = `${before} ${title.slice(r.index + r.text.length)}`;
  }
  title = title
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s,;:.\-\u2013\u2014]+|[\s,;:\-\u2013\u2014]+$/g, '');

  return { title: title || text.trim(), task_date, task_time, repeat };
}

/* Friendly text for the little chip: "Tomorrow", "Fri, Oct 16", "5:00 PM" */
export function describeDate(dateStr, now = new Date()) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('en-US', opts);
}

export function describeTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
