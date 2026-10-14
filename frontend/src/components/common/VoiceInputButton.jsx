import { useState } from 'react';
import './VoiceInputButton.css';
import useSpeechToText, { speechSupported } from '../../hooks/useSpeechToText';
import { useNotification } from '../../context/NotificationContext';
import { SPEECH_LANGS, getVoiceLang, setVoiceLang } from '../../utils/speech';

const ERROR_TEXT = {
  'not-allowed': 'Microphone access is blocked. Allow it in your browser\'s site settings (phones need HTTPS).',
  'service-not-allowed': 'Voice input is blocked on this device or browser.',
  'audio-capture': 'No microphone was found.',
  network: 'Voice input needs an internet connection, and works in Chrome or Edge (not Brave or Firefox).',
  'language-not-supported': 'That language isn\'t supported for voice input.',
  default: 'Voice input couldn\'t start. Try again.',
};

/**
 * Microphone button that dictates into a field.
 *   onText(text)   - receives each finished phrase (append it with appendSpoken)
 *   showLanguage   - also show the small accent picker (EN · US / IN / UK / AU)
 * Renders nothing in browsers without speech recognition (e.g. Firefox).
 * Put it inside <div className="voice-field"> (or "voice-field is-textarea") next to the field.
 */
export default function VoiceInputButton({ onText, showLanguage = false }) {
  const { showNotification } = useNotification();
  const [lang, setLang] = useState(getVoiceLang);

  const { listening, phase, interim, start, stop } = useSpeechToText({
    onText,
    onError: (code) => showNotification('Voice input', ERROR_TEXT[code] || ERROR_TEXT.default, 'error'),
    onSilence: () => showNotification(
      'Voice input',
      'I didn\'t hear anything. Check Chrome is using the right microphone, then speak a bit closer.',
      'info'
    ),
  });

  const statusLabel = {
    starting: 'Starting mic… wait a moment',
    ready: 'Listening… speak now',
    hearing: 'Hearing you…',
  }[phase] || 'Listening…';

  if (!speechSupported) return null;

  const handleLang = (e) => {
    setLang(e.target.value);
    setVoiceLang(e.target.value); // every mic button reads this when it starts
  };

  return (
    <span className="voice-controls">
      {listening && (
        <span className="voice-status" role="status">
          {statusLabel}{interim && <em> {interim.slice(-80)}</em>}
        </span>
      )}

      {showLanguage && (
        <select
          className="voice-lang"
          value={lang}
          onChange={handleLang}
          disabled={listening}
          aria-label="Speech language"
          title="Speech language"
        >
          {SPEECH_LANGS.map(l => (
            <option key={l.code} value={l.code} title={l.label}>{l.short}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        className={`voice-btn ${listening ? 'listening' : ''}`}
        onClick={listening ? stop : start}
        aria-pressed={listening}
        aria-label={listening ? 'Stop voice input' : 'Start voice input'}
        title={listening ? 'Stop' : 'Speak instead of typing'}
      >
        {listening ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v4M8 22h8" />
          </svg>
        )}
      </button>
    </span>
  );
}
