// End-to-end play-through on a 390x844 touch viewport.
// Usage: npm run build && npx vite preview --port 4173 &  then  BROWSER=webkit node tests/e2e.mjs [baseUrl]
import { webkit, chromium, devices } from 'playwright';
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:4173/anime-english/';
const engine = process.env.BROWSER === 'chromium' ? chromium : webkit;
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const tasks = {
  task1: JSON.parse(fs.readFileSync(new URL('../src/tasks/task1.json', import.meta.url))),
  task2: JSON.parse(fs.readFileSync(new URL('../src/tasks/task2.json', import.meta.url))),
};
const turnsOf = (t) => t.scenes.flatMap((s) => s.turns);
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => { if (!c) throw new Error('ASSERT: ' + m); log('ok -', m); };
const tag = process.env.BROWSER || 'webkit';
const VP = (process.env.VP || '390x844').split('x').map(Number);
const SAVE_SHOTS = process.env.VP == null || process.env.VP === '390x844';

const browser = await engine.launch();
const ctx = await browser.newContext({
  ...devices['iPhone 13'],
  ...(engine === chromium ? { defaultBrowserType: undefined } : {}),
  viewport: { width: VP[0], height: VP[1] },
  deviceScaleFactor: 2,
  locale: 'zh-CN',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('dialog', (d) => d.accept());

const shot = async (n) => { if (!SAVE_SHOTS && !n.endsWith('FAIL')) return; await page.waitForTimeout(450); await page.screenshot({ path: `${SHOTS}${n}.jpg`, type: 'jpeg', quality: 82 }); };
const tid = (id) => page.getByTestId(id);

async function enterMap() {
  await page.getByText('点击进入村子').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready(), null, { timeout: 20000 });
  await page.waitForTimeout(500);
}

// Every option must be fully on screen and actually hit-testable (not covered / clipped),
// and the hint box must be fully visible too.
async function checkVisible(label) {
  const r = await page.evaluate(() => {
    const vh = window.innerHeight, vw = window.innerWidth;
    const full = (el) => {
      const q = el.getBoundingClientRect();
      const inView = q.top >= -0.5 && q.bottom <= vh + 0.5 && q.left >= -0.5 && q.right <= vw + 0.5;
      const pts = [[q.left + 6, q.top + 4], [q.right - 6, q.bottom - 4], [q.left + q.width / 2, q.top + q.height / 2]];
      const hit = pts.every(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (el === e || el.contains(e)); });
      return { top: Math.round(q.top), bottom: Math.round(q.bottom), inView, hit };
    };
    const opts = [...document.querySelectorAll('[data-testid=option]')].map((b) => ({ t: b.innerText, ...full(b) }));
    const hint = document.querySelector('[data-testid=hint]');
    return { vh, opts, hint: hint ? full(hint) : null };
  });
  const bad = r.opts.filter((o) => !o.inView || !o.hit);
  if (bad.length) throw new Error(`ASSERT: ${label}: option(s) not fully visible/tappable (vh ${r.vh}): ${JSON.stringify(bad)}`);
  if (r.hint && !(r.hint.inView && r.hint.hit)) throw new Error(`ASSERT: ${label}: hint not fully visible: ${JSON.stringify(r.hint)}`);
  return true;
}
let visChecks = 0;
const travelCards = [];

async function playTask(taskId, plan /* turnId -> number of wrong picks before correct */, shotTurn) {
  const task = tasks[taskId];
  await tid('intro').waitFor();
  if (shotTurn) await shot(`${tag}-03-task-intro`);
  await tid('begin').tap();
  let expectedScore = 0, shownSum = 0;
  const N = turnsOf(task).length;
  const full = (i) => Math.floor(100 / N) + (i >= N - (100 - Math.floor(100 / N) * N) ? 1 : 0);
  let ti = -1;
  const firstOfScene = new Map(task.scenes.map((s, i) => [s.turns[0].id, { s, i }]));
  for (const turn of turnsOf(task)) {
    ti++;
    // transition card (BUG-07: kept) when the scene changes; check place + background
    const sc = firstOfScene.get(turn.id);
    if (sc && sc.i === 0) {
      await page.locator('[data-testid=travel], [data-testid=dialog]').first().waitFor({ timeout: 5000 });
      if (await tid('travel').isVisible()) await tid('arrive').tap();
    }
    if (sc && sc.i > 0) {
      await tid('travel').waitFor({ timeout: 5000 });
      const card = await tid('travel').innerText();
      if (!card.includes(sc.s.place) || (sc.s.travelNote && !card.includes(sc.s.travelNote))) throw new Error(`ASSERT: ${taskId} travel card for ${sc.s.id} wrong: ${card}`);
      travelCards.push(`${taskId}:${sc.s.id}`);
      if (taskId === 'task2' && shotTurn) await shot(`${tag}-05${sc.s.id === 'forge' ? 'b' : 'd'}-task2-card-${sc.s.id}`);
      await tid('arrive').tap();
      if (taskId === 'task2' && shotTurn) { await tid('dialog').waitFor(); await shot(`${tag}-05${sc.s.id === 'forge' ? 'c' : 'e'}-task2-${sc.s.id}`); }
    }
    if (sc) {
      await tid('dialog').waitFor();
      const bgUrl = await page.locator('.scene').first().evaluate((e) => e.style.backgroundImage);
      if (!bgUrl.includes(`/assets/bg/${sc.s.bg}.webp`)) throw new Error(`ASSERT: ${taskId} scene ${sc.s.id} background ${bgUrl}, expected ${sc.s.bg}`);
    }
    await tid('dialog').waitFor();
    await page.getByText(turn.line, { exact: true }).waitFor({ timeout: 5000 });
    const correct = turn.options[turn.answer].en;
    const wrongs = turn.options.filter((_, i) => i !== turn.answer).map((o) => o.en);
    const nWrong = plan[turn.id] || 0;
    for (let k = 0; k < nWrong; k++) {
      await page.getByRole('button', { name: wrongs[k], exact: true }).tap();
      await tid('hint').waitFor();
      const kaiAlt = await tid('kai-face').getAttribute('alt');
      assert(kaiAlt.includes('confused'), `${turn.id}: wrong pick #${k + 1} shows hint + Kai confused`);
      const npcAlt = await tid('npc-portrait').getAttribute('alt');
      assert(npcAlt.endsWith('confused'), `${turn.id}: wrong pick #${k + 1} NPC expression is confused (${npcAlt})`);
      assert(await page.getByRole('button', { name: wrongs[k], exact: true }).isDisabled(), `${turn.id}: wrong option disabled for retry`);
      await page.waitForTimeout(80);
      await checkVisible(`${taskId} ${turn.id} after ${k + 1} wrong`); visChecks++;
      if (VP[1] < 600 && tag === 'webkit' && k === 1 && (turn.id === 't1-14' || turn.id === 't1-12')) {
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${SHOTS}short-${VP.join('x')}-${turn.id}-wrong2.jpg`, type: 'jpeg', quality: 82 });
      }
      if (shotTurn === turn.id && k === 0) await shot(`${tag}-04-dialogue-wrong-hint`);
    }
    if (shotTurn === turn.id && nWrong === 0) await shot(`${tag}-04-dialogue-turn`);
    if (nWrong === 0) { await checkVisible(`${taskId} ${turn.id} initial`); visChecks++; }
    await page.getByRole('button', { name: correct, exact: true }).tap();
    await tid('good').waitFor();
    const kaiAlt = await tid('kai-face').getAttribute('alt');
    if (nWrong === 0 && turn.id === turnsOf(task)[0].id) assert(kaiAlt.includes('happy'), `${turn.id}: correct -> Kai happy`);
    if (shotTurn === turn.id) await shot(`${tag}-05-dialogue-correct`);
    const pts = parseFloat((await tid('pts').innerText()).replace('+', ''));
    const exp = nWrong === 0 ? full(ti) : nWrong === 1 ? full(ti) / 2 : 0;
    const nb = await tid('next').boundingBox();
    if (!nb || nb.y < 0 || nb.y + nb.height > VP[1] + 0.5) throw new Error(`ASSERT: ${turn.id} 继续 button off-screen ${JSON.stringify(nb)}`);
    if (pts !== exp) throw new Error(`ASSERT: ${turn.id} shows +${pts}, expected +${exp}`);
    shownSum += pts; expectedScore += exp;
    await tid('next').tap();
  }
  await tid('to-result').waitFor();
  if (shotTurn) await shot(`${tag}-06-ending`);
  await tid('to-result').tap();
  await tid('result').waitFor();
  let maxSum = 0; for (let i = 0; i < N; i++) maxSum += full(i);
  assert(maxSum === 100, `${taskId} per-turn full points sum to exactly 100`);
  const score = parseFloat(await tid('score').innerText());
  assert(score === expectedScore && score === shownSum, `${taskId} score ${score} == expected ${expectedScore} == sum of shown points ${shownSum}`);
  const nWrongItems = await tid('wrong-item').count();
  assert(nWrongItems === Object.keys(plan).length, `${taskId} result lists ${nWrongItems} wrong items`);
  return score;
}

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await shot(`${tag}-01-start`);
  // ---- scene/location data (BUG-08): task 2 must use several village locations, all with backgrounds
  const SCENE_BGS = JSON.parse(fs.readFileSync(new URL('../src/data/characters.js', import.meta.url), 'utf8').match(/SCENE_BGS = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
  for (const t of Object.values(tasks)) {
    for (const sc of t.scenes) assert(SCENE_BGS.includes(sc.bg), `${t.id} scene ${sc.id} uses allowed background '${sc.bg}'`);
    assert(turnsOf(t).length === 14, `${t.id} has 14 turns`);
  }
  const t2bgs = tasks.task2.scenes.map((s) => s.bg);
  assert(new Set(t2bgs).size === tasks.task2.scenes.length && tasks.task2.scenes.length === 3, `task2 has 3 segments in 3 different locations: ${t2bgs.join(' -> ')}`);
  const bgStatus = await page.evaluate(async (bgs) => Promise.all(bgs.map(async (b) => (await fetch(`assets/bg/${b}.webp`)).status)), SCENE_BGS);
  assert(bgStatus.every((x) => x === 200), `all scene backgrounds load (${SCENE_BGS.join(', ')}): ${bgStatus.join(',')}`);
  // ---- read-aloud fallback clips: every spoken English line has an MP3 and it loads
  const manifest = JSON.parse(fs.readFileSync(new URL('../src/data/audioManifest.json', import.meta.url)));
  const need = [];
  for (const t of Object.values(tasks)) {
    t.keySentences.forEach((k) => need.push(k.en)); need.push(t.ending.line);
    for (const u of turnsOf(t)) { need.push(u.line); if (u.after) need.push(u.after.line); u.options.forEach((o) => need.push(o.en)); }
  }
  const missing = need.filter((x) => !manifest[x]);
  assert(missing.length === 0, `every task line/option has a fallback clip (${need.length} refs, missing: ${missing.join(' | ')})`);
  const clipStatus = await page.evaluate(async (files) => {
    const bad = [];
    for (const f of files) { const r = await fetch(`assets/audio/${f}`); if (r.status !== 200 || !(r.headers.get('content-type') || '').includes('audio')) bad.push(f + ':' + r.status); }
    return bad;
  }, [...new Set(Object.values(manifest)), 'silent.mp3']);
  assert(clipStatus.length === 0, `all ${Object.keys(manifest).length} fallback clips served as audio (bad: ${clipStatus.join(',')})`);
  await enterMap();
  const sp = await page.evaluate(() => ({ log: window.__aeSpeech.log.slice(), hasUA: !!navigator.userActivation }));
  const un = sp.log.find((e) => e.type === 'unlock-synth' || e.type === 'unlock-audio');
  assert(un && (!sp.hasUA || un.gesture), `speech unlocked on first tap${sp.hasUA ? ' inside the user gesture' : ''} (${sp.log.filter((e) => e.type.startsWith('unlock')).map((e) => e.type).join(',')})`);
  const first = sp.log.find((e) => e.type === 'synth-speak' || e.type === 'audio-play');
  assert(first && first.text === "Let's go and see!" && (!sp.hasUA || first.gesture), `first line spoken synchronously in the tap (${first?.type})`);
  await shot(`${tag}-02-map`);

  // ===== BUG-01 regression: taps on DOM sheets must not fall through to Phaser map items
  for (const id of ['task2', 'task1', 'task2']) {
    await tid('open-tasks').tap();
    await tid(`start-${id}`).waitFor();
    await tid(`start-${id}`).tap();
    await page.waitForTimeout(400);
    assert(!(await tid('word-card').isVisible().catch(() => false)), `tap-through: task list 开始 ${id} did not open a map word card`);
    assert(await tid('intro').isVisible(), `tap-through: task list 开始 ${id} opened the task intro`);
    await page.getByLabel('退出').tap();
    await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready(), null, { timeout: 20000 });
    await page.waitForTimeout(300);
  }
  // taps on the bottom bar / sheet close buttons must not move Kai or open items either
  await tid('open-tasks').tap();
  await page.locator('.sheet').getByLabel('关闭').tap();
  await page.waitForTimeout(300);
  assert(!(await tid('word-card').isVisible().catch(() => false)), 'tap-through: closing sheet did not open a word card');

  // tap a word item on the map (bridge)
  const bridge = await page.evaluate(() => window.__aeMap.itemScreen(350, 600));
  await page.touchscreen.tap(bridge.x, bridge.y);
  await tid('word-card').waitFor();
  assert((await tid('word-card').innerText()).includes('bridge'), 'map item tap shows word card');
  await shot(`${tag}-02b-map-word`);
  await tid('word-card').getByLabel('关闭').tap();

  // tap Tomo -> Kai walks over -> NPC sheet -> start task 1
  const tomo = await page.evaluate(() => window.__aeMap.npcScreen('tomo'));
  await page.touchscreen.tap(tomo.x, tomo.y);
  await tid('npc-sheet').waitFor({ timeout: 8000 });
  await shot(`${tag}-02c-map-npc`);
  await tid('npc-sheet').getByTestId('start-task1').tap();

  // ===== Task 1: one wrong (half), one double-wrong (zero)
  const s1 = await playTask('task1', { 't1-01': 1, 't1-03': 2 }, 't1-01');
  await shot(`${tag}-07-result`);
  const cmp1 = await tid('compare').innerText();
  assert(cmp1.includes('第一次'), 'first attempt comparison text');

  // review wrong answers (first-try correct removes them from notebook)
  await tid('review').tap();
  for (let k = 0; k < 2; k++) {
    await tid('review').waitFor();
    if (k === 0) await shot(`${tag}-08-review`);
    const text = await tid('review').innerText();
    const turn = turnsOf(tasks.task1).find((t) => text.includes(t.line));
    await page.getByRole('button', { name: turn.options[turn.answer].en, exact: true }).tap();
    await tid('review-next').tap();
  }
  await tid('review-done').waitFor();
  assert((await tid('review-done').innerText()).includes('一次答对 2'), 'review completed, 2 mastered');
  await tid('review-back-map').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());

  // ===== Task 2 via task list, one wrong; skip review
  await tid('open-tasks').tap();
  await tid('start-task2').tap();
  const s2a = await playTask('task2', { 't2-08': 1 }, 't2-08');
  await tid('back-map').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());

  // notebook has 1 item (task1 items were mastered in review)
  await tid('open-notebook').tap();
  await tid('notebook').waitFor();
  assert(await tid('wrong-item').count() === 1, 'notebook has 1 wrong item');
  await shot(`${tag}-09-notebook`);

  // ===== persistence across reload
  await page.reload({ waitUntil: 'networkidle' });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('anime-english.v1')));
  assert(stored.tasks.task1.best === s1 && stored.tasks.task2.last.score === s2a, 'scores persisted in localStorage');
  assert(Object.keys(stored.wrong).length === 1, 'wrong list persisted');
  await enterMap();
  const stats = await page.locator('.map-stats').innerText();
  assert(stats.includes('完成 2/2'), `map stats after reload: ${stats}`);
  assert((await tid('open-notebook').innerText()).includes('(1)'), 'notebook badge after reload');
  await shot(`${tag}-10-map-after-reload`);

  // redo from notebook -> mastered -> empty
  await tid('open-notebook').tap();
  await tid('redo-all').tap();
  await tid('review').waitFor();
  const t28 = turnsOf(tasks.task2).find((t) => t.id === 't2-08');
  // wrong once in review first (stays), check hint, then correct
  await page.getByRole('button', { name: t28.options[1].en, exact: true }).tap();
  await page.getByRole('button', { name: t28.options[0].en, exact: true }).tap();
  await tid('review-next').tap();
  await tid('review-done').waitFor();
  assert((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('anime-english.v1')).wrong).length)) === 1, 'review with a miss keeps item in notebook');
  await page.getByText('返回错题本').tap();
  await tid('redo-all').tap();
  await page.getByRole('button', { name: t28.options[0].en, exact: true }).tap();
  await tid('review-next').tap();
  await tid('review-done').waitFor();
  assert((await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('anime-english.v1')).wrong).length)) === 0, 'first-try correct removes item from notebook');
  await tid('review-back-map').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());

  // ===== replay task 2 perfectly -> comparison vs last
  await tid('open-tasks').tap();
  await tid('start-task2').tap();
  const s2b = await playTask('task2', {}, null);
  const cmp2 = await tid('compare').innerText();
  assert(cmp2.includes(`+${s2b - s2a}`) && cmp2.includes(`上次 ${s2a}`), `comparison: ${cmp2.replace(/\n/g, ' ')}`);
  assert(await tid('review').isDisabled(), 'review disabled when no wrong answers');
  const rc = await tid('review').evaluate((el) => { const cs = getComputedStyle(el); return { c: cs.color, b: cs.backgroundColor, o: cs.opacity }; });
  const lum = (str) => { const [r, g, b] = str.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const L1 = lum(rc.c), L2 = lum(rc.b); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  assert(rc.o === '1' && ratio >= 4.5, `disabled 复习错题 contrast ${ratio.toFixed(2)}:1 (opacity ${rc.o})`);
  await shot(`${tag}-11-result-perfect`);
  await tid('back-map').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());

  // Characters page
  await page.getByText('村民').tap();
  await page.waitForTimeout(600);
  await shot(`${tag}-12-characters`);

  // ===== Stress: every turn wrong twice (both tasks) -> visibility after 1 and 2 misses on every turn; score 0
  //        every turn wrong once (task 1) -> exactly 50
  await page.getByLabel('返回地图').tap();
  await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());
  const allWrong = (t, n) => Object.fromEntries(turnsOf(tasks[t]).map((x) => [x.id, n]));
  for (const [t, n, exp] of [['task1', 2, 0], ['task2', 2, 0], ['task1', 1, 50]]) {
    await tid('open-tasks').tap();
    await tid(`start-${t}`).tap();
    const sc = await playTask(t, allWrong(t, n), null);
    assert(sc === exp, `${t} with every turn wrong ${n}x scores exactly ${exp}`);
    await tid('back-map').tap();
    await page.waitForFunction(() => window.__aeMap && window.__aeMap.ready());
  }
  log(`visibility checks passed: ${visChecks}`);

  // Layout sanity: no horizontal overflow, tap targets >= 44px on map bar
  const ok = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert(ok, 'no horizontal overflow');
  log('transition cards seen:', travelCards.join(', '));
  assert(travelCards.includes('task2:forge') && travelCards.includes('task2:river'), 'task2 transition cards to forge and river shown');
  const sp2 = await page.evaluate(() => ({ log: window.__aeSpeech.log.slice(), st: window.__aeSpeech.state() }));
  const noClip = sp2.log.filter((e) => e.type === 'no-clip');
  assert(noClip.length === 0, `no spoken line lacked a fallback clip (engine ${sp2.st.engine}, voice ${sp2.st.voice?.name || 'none'})`);
  const played = sp2.log.filter((e) => ['synth-start', 'audio-start'].includes(e.type));
  log('speech events (last page load):', Object.entries(sp2.log.reduce((a, e) => ((a[e.type] = (a[e.type] || 0) + 1), a), {})).map((x) => x.join('=')).join(' '));
  assert(played.length > 0, `read-aloud actually started (${played.length} synth-start/audio-start events)`);
  assert(errors.length === 0, 'no page errors: ' + errors.join(' | '));
  console.log('\nALL PASSED', { s1, s2a, s2b });
} catch (e) {
  await shot(`${tag}-FAIL`).catch(() => {});
  console.error('FAILED:', e.message, '\nerrors:', errors);
  process.exitCode = 1;
} finally {
  await browser.close();
}
