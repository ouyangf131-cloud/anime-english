// Read-aloud.
// Primary: browser speechSynthesis (en-US voice). Fallback: pre-rendered MP3s
// (local Piper TTS, see tools/gen_audio.py) played through ONE shared <audio>
// element. The fallback is used when there is no English voice, when the
// utterance errors, or when it never starts (watchdog).
//
// iOS Safari rules handled here:
//  * unlock() is called synchronously inside the first tap: it speaks a short
//    silent utterance and plays a silent clip on the shared <audio> element,
//    which unlocks both paths for later non-gesture playback.
//  * speak() calls cancel() then speak() synchronously (so a tap handler keeps
//    its user-gesture), and resume()s a paused engine (iOS/Chrome can get stuck
//    "paused" after backgrounding). If onstart doesn't fire, a watchdog retries
//    via the MP3 fallback.
import MANIFEST from '../data/audioManifest.json';

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
const base = import.meta.env.BASE_URL;
const SILENT = `${base}assets/audio/silent.mp3`;

let unlocked = false;
let voice = null;
let voicesKnown = false;
let audio = null;
let watchdog = null;
let token = 0;
let synthFails = 0;

// Debug/test hook: a bounded event log (no PII; only line text and timings).
const log = [];
const note = (type, extra = {}) => {
  const e = { type, t: Math.round(performance.now()), gesture: !!navigator.userActivation?.isActive, ...extra };
  log.push(e); if (log.length > 200) log.shift();
};
if (typeof window !== 'undefined') window.__aeSpeech = { log, state: () => ({ unlocked, voice: voice && { name: voice.name, lang: voice.lang }, voicesKnown, synthFails, engine: engine() }) };

function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (voices.length) voicesKnown = true;
  const en = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  const pref = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Alex', 'Ava', 'Allison'];
  for (const p of pref) {
    const v = en.find((x) => x.name.includes(p));
    if (v) return v;
  }
  // en-US first, then any English voice (en-GB, en-AU ...).
  return en.find((v) => v.localService) || en[0] || voices.find((v) => /^en/i.test(v.lang)) || null;
}

if (synth) {
  voice = pickVoice();
  const onVoices = () => { voice = pickVoice(); note('voiceschanged', { voice: voice?.name || null, n: synth.getVoices().length }); };
  if (synth.addEventListener) synth.addEventListener('voiceschanged', onVoices);
  else synth.onvoiceschanged = onVoices;
}

// 'synth' when an English voice is available (or voices are still loading and
// we haven't seen it fail), otherwise 'audio'.
function engine() {
  if (!synth) return 'audio';
  if (synthFails >= 2) return 'audio';
  if (voicesKnown && !voice) return 'audio';
  return 'synth';
}

function getAudio() {
  if (!audio && typeof Audio !== 'undefined') {
    audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
  }
  return audio;
}

export const speechSupported = () => !!synth || !!getAudio();
export const isUnlocked = () => unlocked;
export const hasClip = (text) => !!MANIFEST[text];

// Must be called synchronously from a tap/click handler.
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  if (synth) {
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
      note('unlock-synth');
    } catch (e) { /* ignore */ }
    if (!voice) voice = pickVoice();
  }
  const a = getAudio();
  if (a) {
    try {
      a.src = SILENT; a.volume = 0;
      const p = a.play();
      note('unlock-audio');
      p?.then(() => { a.pause(); a.volume = 1; }).catch(() => { a.volume = 1; });
    } catch (e) { /* ignore */ }
  }
}

function playClip(text, rate, onend, my) {
  const file = MANIFEST[text];
  const a = getAudio();
  if (!file || !a) { note('no-clip', { text }); onend?.(); return; }
  try {
    a.pause();
    a.src = `${base}assets/audio/${file}`;
    a.volume = 1;
    a.playbackRate = Math.max(0.5, Math.min(1.2, rate / 0.9));
    a.preservesPitch = true; a.webkitPreservesPitch = true;
    a.onplaying = () => { if (my === token) note('audio-start', { text, file }); };
    a.onended = () => { if (my === token) { note('audio-end', { text }); onend?.(); } };
    a.onerror = () => { if (my === token) { note('audio-error', { text }); onend?.(); } };
    const p = a.play();
    note('audio-play', { text, file });
    p?.catch((err) => { if (my === token) note('audio-rejected', { text, err: String(err?.name || err) }); });
  } catch (e) { note('audio-error', { text }); }
}

export function speak(text, { rate = 0.9, onend } = {}) {
  if (!text) return;
  unlocked = true;
  const my = ++token;
  clearTimeout(watchdog);
  try { audio && audio.pause(); } catch (e) { /* ignore */ }

  if (engine() === 'audio') { playClip(text, rate, onend, my); return; }

  let started = false;
  let fellBack = false;
  const fallback = (why) => {
    if (fellBack || my !== token) return;
    fellBack = true;
    synthFails++;
    note('synth-fallback', { text, why });
    try { synth.cancel(); } catch (e) { /* ignore */ }
    playClip(text, rate, onend, my);
  };
  try {
    synth.cancel();
    if (synth.paused) synth.resume();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (voice) u.voice = voice;
    u.rate = rate;
    u.onstart = () => { started = true; synthFails = 0; clearTimeout(watchdog); if (my === token) note('synth-start', { text, voice: voice?.name || null }); };
    u.onend = () => { if (my === token && !fellBack) { note('synth-end', { text }); onend?.(); } };
    u.onerror = (ev) => {
      const err = ev?.error || 'error';
      if (err === 'interrupted' || err === 'canceled') return; // our own cancel()
      if (!started) fallback(err);
    };
    synth.speak(u);
    // iOS sometimes queues a speak() right after cancel() in a paused state.
    if (synth.paused) synth.resume();
    note('synth-speak', { text, voice: voice?.name || null });
    watchdog = setTimeout(() => { if (!started) fallback('no-start'); }, 1500);
  } catch (e) {
    fallback('exception');
  }
}

export function stop() {
  token++;
  clearTimeout(watchdog);
  try { synth?.cancel(); } catch (e) { /* ignore */ }
  try { audio?.pause(); } catch (e) { /* ignore */ }
}
