// All data lives in localStorage (single user, no login).
const KEY = 'anime-english.v1';

const empty = () => ({ v: 1, tasks: {}, wrong: {}, kai: null, seenIntro: false });

export function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) return { ...empty(), ...d };
  } catch (e) { /* ignore */ }
  return empty();
}

export function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* ignore */ }
}

export function update(fn) {
  const d = load();
  fn(d);
  save(d);
  return d;
}

export const wrongKey = (taskId, turnId) => `${taskId}:${turnId}`;

/** Record a finished attempt. Returns { prev, best } for comparison. */
export function recordAttempt(taskId, attempt, wrongItems) {
  let prev = null;
  const d = update((d) => {
    const t = d.tasks[taskId] || { plays: 0, best: 0, last: null, history: [] };
    prev = t.last;
    t.plays += 1;
    t.best = Math.max(t.best || 0, attempt.score);
    t.last = attempt;
    t.history = [...(t.history || []), attempt].slice(-30);
    d.tasks[taskId] = t;
    for (const w of wrongItems) {
      const k = wrongKey(taskId, w.turnId);
      const old = d.wrong[k];
      d.wrong[k] = { taskId, turnId: w.turnId, count: (old?.count || 0) + 1, lastPick: w.picks[0], at: attempt.at };
    }
  });
  return { prev, best: d.tasks[taskId].best };
}

export function removeWrong(taskId, turnId) {
  update((d) => { delete d.wrong[wrongKey(taskId, turnId)]; });
}

export function setKaiPos(pos) {
  update((d) => { d.kai = pos; });
}

export function resetAll() {
  localStorage.removeItem(KEY);
}
