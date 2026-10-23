// Browser speechSynthesis wrapper. iOS Safari only plays after a user gesture,
// so unlock() must be called from a tap handler before auto-play works.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let unlocked = false;
let voice = null;

function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  const en = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  const pref = ['Samantha', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Alex', 'Ava', 'Allison'];
  for (const p of pref) {
    const v = en.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return en.find((v) => v.localService) || en[0] || voices.find((v) => /^en/i.test(v.lang)) || null;
}

if (synth) {
  voice = pickVoice();
  synth.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
}

export const speechSupported = () => !!synth;
export const isUnlocked = () => unlocked;

export function unlock() {
  if (!synth || unlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch (e) { /* ignore */ }
  unlocked = true;
  if (!voice) voice = pickVoice();
}

export function speak(text, { rate = 0.9, onend } = {}) {
  if (!synth || !text) return;
  unlocked = true;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    if (voice) u.voice = voice;
    u.rate = rate;
    if (onend) u.onend = onend;
    // Safari sometimes needs a tick after cancel()
    setTimeout(() => synth.speak(u), 30);
  } catch (e) { /* ignore */ }
}

export function stop() {
  try { synth?.cancel(); } catch (e) { /* ignore */ }
}
