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

// Integer points per turn that add up to exactly 100:
// e.g. 14 turns -> twelve turns worth 7 and the last two worth 8.
export function turnPoints(index, total) {
  const base = Math.floor(100 / total);
  const rem = 100 - base * total;
  return base + (index >= total - rem ? 1 : 0);
}

// first try = full points, second try = exactly half (may be x.5), later = 0
export function pointsEarned(index, total, tries) {
  const full = turnPoints(index, total);
  return tries <= 1 ? full : tries === 2 ? full / 2 : 0;
}

// Scores are multiples of 0.5 (exact in floating point): show "96.5" or "97"
export function fmtPts(n) {
  if (n == null) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// results[i] = { tries } for turn i; the score is exactly the sum of the points shown per turn
// (all first try = 100, all second try = 50; no rounding anywhere)
export function scoreOf(results, total) {
  return results.reduce((a, r, i) => a + pointsEarned(i, total, r.tries), 0);
}
