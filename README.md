# 山林小村 · 英语冒险（v1）

Personal anime-style English-learning H5 for Mike. Village map (Phaser) + dialogue/result UI (React), Vite build, deployed to GitHub Pages.

Live: https://ouyangf131-cloud.github.io/anime-english/

## v1 contents
- Village map home (tap to walk, tap NPCs for tasks, tap ✨ items for words with pronunciation)
- Four characters: Kai (player), Mira, Hana, Tomo — portraits with happy / surprised / confused expressions, chibi sprites on the map
- Task 1 初来乍到, Task 2 茶屋早餐 (14 turns each), result page, review mode, 错题本
- Scoring: first try = full, second try = half, later = 0; total 100
- All data in `localStorage` key `anime-english.v1` (no login)
- Read-aloud via `speechSynthesis` (en-US voice, unlocked by the first tap; 🔊 replay, 🐢 half speed, long-press / 译 for Chinese)

## Structure
```
src/
  tasks/task1.json, task2.json   one JSON per task (auto-loaded by tasks/index.js)
  data/characters.js             names, colors, catchphrases, image helpers
  data/mapData.js                NPC spots, tappable map words (map pixel coords, map is 720x1280)
  map/VillageScene.js            Phaser scene (map, chibis, walking, flipX for left)
  components/                    React screens: Start, Map, TaskPlayer, Result, Review, Notebook, Characters
  lib/store.js speech.js util.js localStorage, TTS, scoring
public/assets/                   WebP art (chars/, bg/) produced by tools/process_assets.py
tests/e2e.mjs                    Playwright play-through (390x844, WebKit)
```

## Add a task
1. Copy `src/tasks/task2.json` to `src/tasks/task3.json`, set a new `id`, `order`, `giver` (npc whose map marker offers it), `characters`, `keySentences`, `ending`, and `scenes[].turns[]`.
2. Each turn: `speaker`, `expression` (happy|surprised|confused), `line`, `zh`, optional `prompt`, 3 `options` ({en, zh}), `answer` (index), `hint`, optional `after` reaction.
3. Scene `bg` must be listed in `SCENE_BGS` (`src/data/characters.js`: forge, forest, teahouse, river) and exist as `public/assets/bg/<bg>.webp`. Optional scene `travelNote` (中文) shows on the transition card. Remove the task from `COMING_SOON` in `src/tasks/index.js`.
4. Run `npm run audio` to pre-render fallback MP3s for new English lines (the e2e fails if any line lacks a clip).

## Read-aloud
`src/lib/speech.js`: speechSynthesis first (en-US voice, picked again on `voiceschanged`; unlocked by a silent utterance inside the first tap; `cancel()` then `speak()` synchronously, `resume()` if paused). If there is no English voice, the utterance errors, or `onstart` doesn't fire within 1.5 s, it plays the pre-rendered clip (`public/assets/audio/`, local Piper TTS `en_US-lessac-medium`, `tools/gen_audio.py`) through one shared `<audio>` element unlocked on the first tap. `window.__aeSpeech` exposes an event log for tests.
`npm run speech-probe` (needs PulseAudio null sink `cap`, espeak-ng + speech-dispatcher, xvfb) drives a headed browser and records the real audio output; `MODE=synth|noapi|broken`.

## Commands
```
npm install
npm run dev            # local dev
npm run build          # -> dist/
npx vite preview --port 4173 &  BROWSER=webkit npm run e2e
npm run deploy         # build + commit dist/ on top of gh-pages branch (normal push)
npm run assets         # regenerate WebP assets from source PNGs
npm run audio          # regenerate fallback MP3s (Piper TTS) + src/data/audioManifest.json
```
