import React, { useEffect, useRef, useState, useMemo } from 'react';
import Phaser from 'phaser';
import VillageScene from '../map/VillageScene.js';
import { NPC_SPOTS, NPC_TALK } from '../data/mapData.js';
import { CHARACTERS, charImg } from '../data/characters.js';
import { TASKS, COMING_SOON } from '../tasks/index.js';
import { load, setKaiPos } from '../lib/store.js';
import { speak } from '../lib/speech.js';
import { idlePreloadBgs } from '../lib/preload.js';
import { SCENE_BGS } from '../data/characters.js';
import { fmtPts } from '../lib/util.js';
import { SpeakPair } from './SpeakButtons.jsx';

function markersFor(data) {
  const m = {};
  for (const t of TASKS) {
    const done = data.tasks[t.id]?.plays > 0;
    if (!m[t.giver] || m[t.giver] === '★') m[t.giver] = done ? '★' : '!';
  }
  return m;
}

export default function MapScreen({ onStartTask, onNotebook, onCharacters }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const [data] = useState(load);
  const [npc, setNpc] = useState(null);
  const [item, setItem] = useState(null);
  const [sheet, setSheet] = useState(false);
  const wrongCount = Object.keys(data.wrong).length;
  const markers = useMemo(() => markersFor(data), [data]);

  useEffect(() => {
    const scene = new VillageScene({
      base: import.meta.env.BASE_URL,
      kaiPos: data.kai,
      markers,
      onNpc: (id) => { setItem(null); setSheet(false); setNpc(id); speak(NPC_TALK[id].line); },
      onItem: (it) => { setNpc(null); setSheet(false); setItem(it); speak(it.en); },
      onKaiMove: (pos) => setKaiPos(pos),
    });
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: '#2f4a34',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      render: { antialias: true, roundPixels: false },
      input: { activePointers: 1 },
      banner: false,
      scene,
    });
    // test hook (harmless): where to tap on screen for an NPC
    window.__aeMap = {
      npcScreen: (id) => { const s = NPC_SPOTS[id]; return scene.screenPos(s.x, s.y - 50); },
      itemScreen: (x, y) => scene.screenPos(x, y),
      ready: () => !!scene.kai,
    };
    // N-08: only after the village map is interactive, warm scene backgrounds
    // one-by-one so they never compete with map.webp / chibis on first entry.
    let cancelled = false;
    const waitReady = () => {
      if (cancelled) return;
      if (scene.kai) { idlePreloadBgs(SCENE_BGS); return; }
      requestAnimationFrame(waitReady);
    };
    waitReady();
    return () => { cancelled = true; delete window.__aeMap; game.destroy(true); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // While a task list / NPC sheet is open the map underneath must not react to taps
  useEffect(() => { sceneRef.current?.setLocked(sheet || !!npc); }, [sheet, npc]);

  const totalBest = TASKS.reduce((a, t) => a + (data.tasks[t.id]?.best || 0), 0);
  const doneCount = TASKS.filter((t) => data.tasks[t.id]?.plays > 0).length;

  const taskRow = (t) => {
    const p = data.tasks[t.id];
    return (
      <div className="task-row" key={t.id}>
        <img className="task-row-av" src={charImg(t.giver, 'chibi')} alt="" />
        <div className="task-row-main">
          <div className="task-row-title">任务 {t.order} · {t.title}</div>
          <div className="task-row-sub">{p?.plays ? `最高 ${fmtPts(p.best)} 分 · 上次 ${fmtPts(p.last.score)} 分 · 玩过 ${p.plays} 次` : '还没挑战过'}</div>
        </div>
        <button className="btn btn-primary" onClick={() => onStartTask(t.id)} data-testid={`start-${t.id}`}>{p?.plays ? '再玩' : '开始'}</button>
      </div>
    );
  };

  return (
    <div className="map-screen">
      <div className="map-host" ref={hostRef} />
      <header className="map-top">
        <div className="map-title">山林小村</div>
        <div className="map-stats">完成 {doneCount}/{TASKS.length} · 总分 {fmtPts(totalBest)}</div>
      </header>
      <div className="map-tip">点地面走动 · 点人物接任务 · 点 ✨ 学单词</div>

      <nav className="map-bar">
        <button className="bar-btn" onClick={() => { setNpc(null); setItem(null); setSheet(true); }} data-testid="open-tasks">📜<span>任务</span></button>
        <button className="bar-btn" onClick={onNotebook} data-testid="open-notebook">📕<span>错题本{wrongCount ? ` (${wrongCount})` : ''}</span></button>
        <button className="bar-btn" onClick={onCharacters}>🌿<span>村民</span></button>
      </nav>

      {sheet && (
        <div className="sheet" role="dialog">
          <div className="sheet-head"><b>任务列表</b><button className="icon-btn" onClick={() => setSheet(false)} aria-label="关闭">✕</button></div>
          {TASKS.map(taskRow)}
          {COMING_SOON.map((t) => (
            <div className="task-row locked" key={t.id}>
              <img className="task-row-av" src={charImg(t.giver, 'chibi')} alt="" />
              <div className="task-row-main"><div className="task-row-title">任务 {t.order} · {t.title}</div><div className="task-row-sub">下一版开放</div></div>
              <span className="lock">🔒</span>
            </div>
          ))}
        </div>
      )}

      {npc && (
        <div className="sheet npc-sheet" role="dialog" data-testid="npc-sheet">
          <div className="sheet-head">
            <b>{CHARACTERS[npc].name} <small>{CHARACTERS[npc].zh}</small></b>
            <button className="icon-btn" onClick={() => setNpc(null)} aria-label="关闭">✕</button>
          </div>
          <div className="npc-talk">
            <img src={charImg(npc, 'happy')} alt="" className="npc-talk-img" />
            <div className="bubble">
              <div className="en">{NPC_TALK[npc].line}</div>
              <div className="zh">{NPC_TALK[npc].zh}</div>
              <SpeakPair text={NPC_TALK[npc].line} />
            </div>
          </div>
          {TASKS.filter((t) => t.giver === npc).map(taskRow)}
          {TASKS.filter((t) => t.giver !== npc && t.characters.includes(npc)).map((t) => (
            <div className="task-row-note" key={t.id}>在「任务 {t.order} · {t.title}」里也能遇到 {CHARACTERS[npc].name}</div>
          ))}
          {COMING_SOON.filter((t) => t.giver === npc).map((t) => (
            <div className="task-row locked" key={t.id}>
              <div className="task-row-main"><div className="task-row-title">任务 {t.order} · {t.title}</div><div className="task-row-sub">下一版开放</div></div>
              <span className="lock">🔒</span>
            </div>
          ))}
        </div>
      )}

      {item && (
        <div className="sheet word-card" role="dialog" data-testid="word-card">
          <div className="sheet-head"><b>✨ 单词</b><button className="icon-btn" onClick={() => setItem(null)} aria-label="关闭">✕</button></div>
          <div className="word-en">{item.en} <SpeakPair text={item.en} /></div>
          <div className="word-zh">{item.zh}</div>
          <div className="word-ex">{item.ex} <SpeakPair text={item.ex} /></div>
        </div>
      )}
    </div>
  );
}
