import React, { useMemo, useState, useEffect } from 'react';
import { findTurn, TASK_BY_ID } from '../tasks/index.js';
import { CHARACTERS, charImg, bgImg } from '../data/characters.js';
import { shuffle } from '../lib/util.js';
import { speak } from '../lib/speech.js';
import { removeWrong } from '../lib/store.js';
import Sentence from './Sentence.jsx';
import { SpeakPair } from './SpeakButtons.jsx';

// Redo wrong questions. A first-try correct answer removes it from 错题本.
export default function ReviewScreen({ items, from, onMap, onBack }) {
  const list = useMemo(() => items.map((it) => ({ ...it, turn: findTurn(it.taskId, it.turnId) })).filter((x) => x.turn), [items]);
  const [i, setI] = useState(0);
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const [mastered, setMastered] = useState(0);
  const cur = list[i];
  const opts = useMemo(() => (cur ? shuffle(cur.turn.options.map((o, k) => ({ ...o, k }))) : []), [cur]);

  useEffect(() => { if (cur) speak(cur.turn.line); }, [i]); // eslint-disable-line

  if (!list.length || i >= list.length) {
    return (
      <div className="page" style={{ backgroundImage: `url(${bgImg('forest')})` }}>
        <div className="page-inner">
          <div className="panel review-done" data-testid="review-done">
            <img src={charImg('kai', 'happy')} alt="" />
            <div className="result-title">复习完成！</div>
            <p>共 {list.length} 题，一次答对 {mastered} 题，已从错题本移除。</p>
            <div className="result-actions">
              <button className="btn btn-primary btn-big" onClick={onMap} data-testid="review-back-map">回到地图</button>
              <button className="btn btn-big" onClick={onBack}>{from === 'notebook' ? '返回错题本' : '返回结算页'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const t = cur.turn;
  const task = TASK_BY_ID[cur.taskId];
  const pick = (o) => {
    if (done) return;
    if (o.k === t.answer) {
      setDone(true);
      speak(o.en);
      if (wrong.length === 0) { removeWrong(cur.taskId, cur.turnId); setMastered((m) => m + 1); }
    } else setWrong((w) => [...w, o.en]);
  };
  const next = () => { setWrong([]); setDone(false); setI(i + 1); };

  return (
    <div className="scene" style={{ backgroundImage: `url(${bgImg(t.bg)})` }}>
      <div className="scene-veil soft" />
      <div className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="返回">←</button>
        <div className="topbar-mid"><div className="topbar-title">复习错题 · {task.title}</div>
          <div className="progress"><div style={{ width: `${(i / list.length) * 100}%` }} /></div></div>
        <div className="topbar-counter">{i + 1}/{list.length}</div>
      </div>
      <div className="stage small">
        <img className="portrait pop" key={i + String(done) + wrong.length} src={charImg(t.speaker, done ? 'happy' : wrong.length ? 'confused' : t.expression)} alt="" />
      </div>
      <div className="dialog panel" data-testid="review">
        <div className="name-tag" style={{ background: CHARACTERS[t.speaker].color }}>{CHARACTERS[t.speaker].name}</div>
        <Sentence key={i} en={t.line} zh={t.zh} />
      </div>
      <div className="answer-area">
        <div className="kai-row">
          <img className={`kai-face ${done ? 'correct' : wrong.length ? 'wrong' : 'ask'}`} src={charImg('kai', wrong.length && !done ? 'confused' : 'happy')} alt="" />
          <div className="kai-say">
            {done ? (
              <div className="good">{wrong.length === 0 ? '✨ 答对了！已从错题本移除' : '👌 对了！这题还留在错题本里'}</div>
            ) : wrong.length ? <div className="hint">💡 {t.hint}</div> : <div className="prompt">{t.prompt || 'Kai 该怎么回答？'}</div>}
          </div>
        </div>
        {!done ? (
          <div className="options">
            {opts.map((o) => (
              <button key={o.en} className={`option ${wrong.includes(o.en) ? 'bad' : ''}`} disabled={wrong.includes(o.en)} onClick={() => pick(o)} data-testid="option">{o.en}</button>
            ))}
          </div>
        ) : (
          <div className="options">
            <div className="explain panel-inner">
              <div className="en">{t.options[t.answer].en} <SpeakPair text={t.options[t.answer].en} /></div>
              <div className="zh">{t.options[t.answer].zh}</div>
              <div className="tip">💡 {t.hint}</div>
            </div>
            <button className="btn btn-primary btn-big" onClick={next} data-testid="review-next">{i + 1 < list.length ? '下一题 ▶' : '完成复习'}</button>
          </div>
        )}
      </div>
    </div>
  );
}
