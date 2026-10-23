export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} 分 ${String(s % 60).padStart(2, '0')} 秒` : `${s} 秒`;
}

// first try = 1, second try = 0.5, later = 0
export const creditFor = (tries) => (tries <= 1 ? 1 : tries === 2 ? 0.5 : 0);

export function scoreOf(results, total) {
  const sum = results.reduce((a, r) => a + creditFor(r.tries), 0);
  return Math.round((sum / total) * 100);
}
