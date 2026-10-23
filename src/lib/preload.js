// Warm the browser cache for scene backgrounds so transition cards never show
// the bare page colour while a .webp is still downloading. Keeps references so
// the Image objects (and their decoded data) aren't garbage-collected early.
import { bgImg } from '../data/characters.js';

const cache = new Map();
export function preloadBgs(ids) {
  const ps = [];
  for (const id of new Set(ids)) {
    if (!cache.has(id)) {
      const img = new Image();
      img.decoding = 'async';
      const p = new Promise((res) => { img.onload = img.onerror = () => res(id); });
      img.src = bgImg(id);
      cache.set(id, { img, p });
    }
    ps.push(cache.get(id).p);
  }
  if (typeof window !== 'undefined') window.__aePreloaded = [...cache.keys()];
  return Promise.all(ps);
}
