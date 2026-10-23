// Warm the browser cache for scene backgrounds so transition cards never show
// the bare page colour while a .webp is still downloading. Keeps references so
// the Image objects (and their decoded data) aren't garbage-collected early.
//
// Two modes:
//   preloadBgs(ids)     — start every missing id now (used when a task opens;
//                         intro gives the network time before the first card).
//   idlePreloadBgs(ids) — one at a time after the map is interactive, so map
//                         assets aren't competing with this work.
import { bgImg } from '../data/characters.js';

const cache = new Map();
let idleQueue = [];
let idleBusy = false;

function ensure(id) {
  if (cache.has(id)) return cache.get(id);
  const img = new Image();
  img.decoding = 'async';
  const p = new Promise((res) => { img.onload = img.onerror = () => res(id); });
  img.src = bgImg(id);
  const entry = { img, p };
  cache.set(id, entry);
  if (typeof window !== 'undefined') window.__aePreloaded = [...cache.keys()];
  return entry;
}

export function preloadBgs(ids) {
  const ps = [];
  for (const id of new Set(ids)) ps.push(ensure(id).p);
  return Promise.all(ps);
}

function pumpIdle() {
  if (idleBusy) return;
  const id = idleQueue.shift();
  if (!id) return;
  idleBusy = true;
  const done = () => { idleBusy = false; scheduleIdle(); };
  // Already cached? skip network, keep going.
  if (cache.has(id)) { done(); return; }
  ensure(id).p.then(done, done);
}

function scheduleIdle() {
  if (!idleQueue.length || idleBusy) return;
  const run = () => pumpIdle();
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2500 });
  else setTimeout(run, 400);
}

export function idlePreloadBgs(ids) {
  for (const id of ids) {
    if (!cache.has(id) && !idleQueue.includes(id)) idleQueue.push(id);
  }
  scheduleIdle();
}

export function preloadedIds() { return [...cache.keys()]; }
