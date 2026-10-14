import { useState, useRef, useEffect, useCallback } from 'react';
import { getVoiceLang } from '../utils/speech';

// Chrome, Edge and Android Chrome expose this (Firefox doesn't). Needs HTTPS or localhost.
const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

export const speechSupported = Boolean(SpeechRecognitionAPI);

// Desktop Chrome/Edge work best in one long "continuous" session (no gaps between phrases).
// Android Chrome repeats words in that mode, so there it listens one phrase at a time.
const IS_ANDROID = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

const FATAL_ERRORS = new Set([
  'not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'language-not-supported',
]);

/**
 * Dictation hook.
 *   onText(text)  - called with each finished phrase
 *   onError(code) - called for problems the user should know about (mic blocked, offline...)
 *   onSilence()   - called when it switched itself off because it never heard anything
 *   lang          - optional BCP-47 code; defaults to the saved voice language
 *
 * It listens one phrase at a time and re-arms itself, so you can keep talking through
 * pauses. It stops by itself after a stretch of silence, or when you press stop.
 */
export default function useSpeechToText({ onText, onError, onSilence, lang } = {}) {
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState('idle'); // 'starting' -> 'ready' -> 'hearing'
  const [interim, setInterim] = useState('');

  const recRef = useRef(null);       // current recognition session
  const wantRef = useRef(false);     // the user wants dictation on
  const silentRuns = useRef(0);      // consecutive sessions with no speech
  const cbRef = useRef({});
  const beginRef = useRef(null);

  useEffect(() => {
    cbRef.current = { onText, onError, onSilence, lang };
  });

  useEffect(() => {
    beginRef.current = () => {
      const rec = new SpeechRecognitionAPI();
      rec.lang = cbRef.current.lang || getVoiceLang();
      rec.continuous = !IS_ANDROID;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let pending = ''; // words heard but not yet finalised: never throw these away

      // the mic is only really open after audiostart: anything said before is lost
      rec.onaudiostart = () => setPhase('ready');
      rec.onspeechstart = () => setPhase('hearing');
      rec.onspeechend = () => setPhase('ready');

      rec.onresult = (e) => {
        silentRuns.current = 0;
        let live = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            const text = result[0].transcript.trim();
            if (text) cbRef.current.onText?.(text);
          } else {
            live += result[0].transcript;
          }
        }
        pending = live;
        setInterim(live);
      };

      rec.onerror = (e) => {
        console.warn('[voice input] recognition error:', e.error);
        if (e.error === 'no-speech') { silentRuns.current += 1; return; }
        if (e.error === 'aborted') return;
        if (FATAL_ERRORS.has(e.error)) {
          wantRef.current = false;
          cbRef.current.onError?.(e.error);
        }
      };

      rec.onend = () => {
        if (pending.trim()) {
          cbRef.current.onText?.(pending.trim());
          pending = '';
        }
        if (recRef.current === rec) recRef.current = null;
        setInterim('');

        if (wantRef.current && silentRuns.current < 2) {
          // keep listening through pauses
          setPhase('starting');
          setTimeout(() => {
            if (!wantRef.current || recRef.current) return;
            try {
              beginRef.current();
            } catch {
              wantRef.current = false;
              setListening(false);
              setPhase('idle');
            }
          }, 150);
        } else {
          const gaveUp = wantRef.current; // true = we stopped because nothing was heard
          wantRef.current = false;
          setListening(false);
          setPhase('idle');
          if (gaveUp) cbRef.current.onSilence?.();
        }
      };

      rec.start();
      recRef.current = rec;
    };
  });

  const start = useCallback(() => {
    if (!speechSupported || wantRef.current) return;
    wantRef.current = true;
    silentRuns.current = 0;
    setListening(true);
    setPhase('starting');
    try {
      beginRef.current();
    } catch {
      wantRef.current = false;
      setListening(false);
      setPhase('idle');
      cbRef.current.onError?.('start-failed');
    }
  }, []);

  const stop = useCallback(() => {
    wantRef.current = false;
    if (recRef.current) recRef.current.stop(); // still delivers the last words, then onend
    else { setListening(false); setPhase('idle'); }
  }, []);

  // closing the popup while listening shuts the mic off
  useEffect(() => () => {
    wantRef.current = false;
    recRef.current?.abort();
  }, []);

  return { listening, phase, interim, start, stop, supported: speechSupported };
}
