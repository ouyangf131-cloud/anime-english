// Read-aloud probe: drives the real app in a HEADED browser and records the
// system audio output (PulseAudio null sink "cap" monitor) around each step,
// so we verify actual sound, not just API calls.
// Usage: BROWSER=chromium|webkit MODE=synth|noapi|broken node tests/speech_probe.mjs [baseUrl]
//   synth  = normal (speechSynthesis via speech-dispatcher/espeak-ng)
//   noapi  = window.speechSynthesis removed -> MP3 fallback
//   broken = speak() never starts (no onstart) -> watchdog -> MP3 fallback
import { webkit, chromium } from 'playwright';
import { spawn } from 'node:child_process';

const BASE = process.argv[2] || 'http://localhost:4173/anime-english/';
const B = process.env.BROWSER || 'chromium';
const MODE = process.env.MODE || 'synth';
const engine = B === 'webkit' ? webkit : chromium;
const browser = await engine.launch({
  headless: false,
  args: B === 'chromium' ? ['--enable-speech-dispatcher', '--autoplay-policy=user-gesture-required'] : [],
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: B === 'chromium' });
if (MODE === 'noapi') await ctx.addInitScript(() => { delete window.speechSynthesis; delete Window.prototype.speechSynthesis; try { Object.defineProperty(window, 'speechSynthesis', { value: undefined }); } catch (e) {} });
if (MODE === 'broken') await ctx.addInitScript(() => { const s = window.speechSynthesis; if (s) s.speak = () => {}; });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

function record() {
  const chunks = [];
  const p = spawn('parec', ['-d', 'cap.monitor', '--format=s16le', '--rate=16000', '--channels=1', '--latency-msec=20']);
  p.stdout.on('data', (d) => chunks.push(d));
  return async () => {
    p.kill(); await new Promise((r) => setTimeout(r, 150));
    const buf = Buffer.concat(chunks); const n = Math.floor(buf.length / 2);
    let sum = 0, loud = 0; for (let i = 0; i < n; i++) { const v = buf.readInt16LE(i * 2); sum += v * v; if (Math.abs(v) > 1000) loud++; }
    return { sec: +(n / 16000).toFixed(2), rms: Math.round(Math.sqrt(sum / Math.max(1, n))), loudSec: +(loud / 16000).toFixed(2) };
  };
}
const events = async () => page.evaluate(() => window.__aeSpeech.log.splice(0));
const state = async () => page.evaluate(() => window.__aeSpeech.state());
const results = [];
async function step(name, action, waitMs = 4500) {
  await events();
  const stop = record();
  await new Promise((r) => setTimeout(r, 200));
  await action();
  await page.waitForTimeout(waitMs);
  const audio = await stop();
  const ev = await events();
  const kinds = ev.map((e) => e.type + (e.gesture ? '(gesture)' : '') + (e.why ? `[${e.why}]` : ''));
  const sound = audio.loudSec > 0.2;
  results.push({ name, sound, ...audio, events: kinds.join(' ') });
  console.log(`${sound ? 'SOUND ' : 'SILENT'} ${name}  rms=${audio.rms} loud=${audio.loudSec}s  :: ${kinds.join(' ')}`);
}

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const voices = await page.evaluate(() => (window.speechSynthesis?.getVoices() || []).map((v) => `${v.name}|${v.lang}`));
console.log(`== ${B} mode=${MODE}  voices=${voices.length} en-US=${voices.filter((v) => /en[-_]US/i.test(v)).length} e.g. ${voices.filter((v) => /^.*\|en/i.test(v)).slice(0, 4).join(', ')}`);
console.log('   state before tap:', JSON.stringify(await state()));
await step('first tap 点击进入村子 -> unlock + "Let\'s go and see!"', () => page.getByText('点击进入村子').click());
console.log('   state after tap:', JSON.stringify(await state()));
await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready(), null, { timeout: 20000 });
await page.getByTestId('open-tasks').click().catch(async () => { await page.getByText('任务').first().click(); });
await page.getByTestId('start-task1').click();
await page.getByTestId('intro').waitFor();
await page.getByTestId('begin').click();
await step('auto-play first line after card (no gesture): Tomo t1-01', () => page.getByTestId('arrive').click(), 4500);
await step('🔊 replay', () => page.getByRole('button', { name: '播放发音' }).first().click(), 4500);
await step('🐢 slow replay', () => page.getByRole('button', { name: '慢速播放' }).first().click(), 7000);
await step('answer tap -> option read aloud', () => page.getByRole('button', { name: "Hi, I'm Kai.", exact: true }).click(), 4000);
console.log('   final state:', JSON.stringify(await state()), errors.length ? 'ERRORS ' + errors.join('|') : '');
await browser.close();
const silent = results.filter((r) => !r.sound);
console.log(silent.length ? `RESULT: ${silent.length} silent step(s)` : 'RESULT: all steps produced sound');
process.exit(silent.length ? 1 : 0);
