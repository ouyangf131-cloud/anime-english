// Collects every English string the app can read aloud -> stdout JSON array.
import fs from 'node:fs';
import { NPC_TALK, ITEMS } from '../src/data/mapData.js';

const texts = new Set(["Let's go and see!", 'Excellent!', 'Great job!', 'Good try!']);
const add = (s) => s && texts.add(s);
for (const f of fs.readdirSync(new URL('../src/tasks/', import.meta.url)).filter((f) => f.endsWith('.json'))) {
  const t = JSON.parse(fs.readFileSync(new URL(`../src/tasks/${f}`, import.meta.url)));
  t.keySentences?.forEach((k) => add(k.en));
  add(t.ending?.line);
  for (const s of t.scenes) for (const u of s.turns) {
    add(u.line); add(u.after?.line); u.options.forEach((o) => add(o.en));
  }
}
Object.values(NPC_TALK).forEach((n) => add(n.line));
ITEMS.forEach((i) => { add(i.en); add(i.ex); });
const chars = fs.readFileSync(new URL('../src/data/characters.js', import.meta.url), 'utf8');
for (const m of chars.matchAll(/catchphrase:\s*(['"])((?:\\.|(?!\1).)*)\1/g)) add(m[2].replace(/\\(.)/g, '$1'));
process.stdout.write(JSON.stringify([...texts], null, 1));
