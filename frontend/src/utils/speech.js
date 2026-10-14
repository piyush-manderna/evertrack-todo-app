// Helpers for voice input (speech-to-text)

// The browser transcribes in the language you pick. These are English accents,
// which is what speech recognition needs to get English words right.
export const SPEECH_LANGS = [
  { code: 'en-US', short: 'EN · US', label: 'English (US)' },
  { code: 'en-IN', short: 'EN · IN', label: 'English (India)' },
  { code: 'en-GB', short: 'EN · UK', label: 'English (UK)' },
  { code: 'en-AU', short: 'EN · AU', label: 'English (Australia)' },
];

const STORAGE_KEY = 'taskflow.voiceLang';

export function getVoiceLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SPEECH_LANGS.some(l => l.code === saved)) return saved;
  } catch {
    // storage unavailable
  }
  return 'en-US';
}

export function setVoiceLang(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage unavailable
  }
}

// Adds a spoken phrase to the text already in a field:
// - puts a space between them
// - capitalises the phrase if it starts a new sentence (or the field is empty)
// - respects a maximum length (e.g. 255 for the task title)
export function appendSpoken(prev, text, { maxLength } = {}) {
  const chunk = (text || '').trim();
  if (!chunk) return prev || '';

  const base = (prev || '').replace(/[ \t]+$/, '');
  const startsSentence = base === '' || /[.!?\n]$/.test(base);
  const piece = startsSentence ? chunk.charAt(0).toUpperCase() + chunk.slice(1) : chunk;

  let joined;
  if (base === '') joined = piece;
  else if (base.endsWith('\n')) joined = base + piece;
  else joined = `${base} ${piece}`;

  return maxLength ? joined.slice(0, maxLength) : joined;
}
