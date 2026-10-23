import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS, charImg, bgImg } from '../data/characters.js';
import { allTurns } from '../tasks/index.js';
import { speak, stop } from '../lib/speech.js';
import { shuffle, scoreOf, pointsEarned, turnPoints } from '../lib/util.js';
import { recordAttempt } from '../lib/store.js';
import Sentence from './Sentence.jsx';
import { SpeakPair } from './SpeakButtons.jsx';

export default function TaskPlayer({ task, onQuit, onFinish }) {
  const turns = useMemo(() => allTurns(task), [task]);
  const [phase, setPhase] = useState('intro'); // intro | travel | turn | ending
  const [idx, setIdx] = useState(0);
  const [tries, setTries] = useState(0);
  const [wrongPicks, setWrongPicks] = useState([]);
  const [status, setStatus] = useState('ask'); // ask | wrong | correct
  const results = useRef([]);
  const startAt = useRef(0);
  const finishedAt = useRef(0);

  const turn = turns[idx];
  const scene = task.scenes.find((s) => s.id === turn?.sceneId);
  const options = useMemo(
    () => (turn ? shuffle(turn.options.map((o, i) => ({ ...o, i }))) : []),
    [turn],
  );

  // auto read the NPC line when a turn appears
  useEffect(() => {
    if (phase === 'turn' && turn) speak(turn.line);
    if (phase === 'intro') speak(task.keySentences[0].en);
    if (phase === 'ending') speak(task.ending.line);
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stop(), []);

  const begin = () => {
    startAt.current = Date.now();
    setPhase('travel');
  };

  const pick = (opt) => {
    if (status === 'correct') return;
    const n = tries + 1;
    setTries(n);
    if (opt.i === turn.answer) {
      setStatus('correct');
      results.current[idx] = { turnId: turn.id, tries: n, picks: wrongPicks };
      speak(opt.en, {
        onend: () => { if (turn.after) setTimeout(() => speak(turn.after.line), 250); },
      });
    } else {
      setStatus('wrong');
      setWrongPicks((w) => [...w, opt.en]);
    }
  };

  const next = () => {
    const ni = idx + 1;
    setTries(0); setWrongPicks([]); setStatus('ask');
    if (ni >= turns.length) {
      finishedAt.current = Date.now();
      setPhase('ending');
      return;
    }
    const changed = turns[ni].sceneId !== turn.sceneId;
    setIdx(ni);
    setPhase(changed ? 'travel' : 'turn');
  };

  const finish = () => {
    const res = results.current;
    const score = scoreOf(res, turns.length);
    const wrong = res.filter((r) => r.tries > 1);
    const attempt = {
      score,
      timeMs: finishedAt.current - startAt.current,
      firstTry: res.filter((r) => r.tries === 1).length,
      total: turns.length,
      at: Date.now(),
    };
    const { prev, best } = recordAttempt(task.id, attempt, wrong);
    onFinish({ taskId: task.id, title: task.title, ...attempt, wrong, prev, best });
  };

  const quit = () => {
    if (phase === 'intro' || window.confirm('确定退出任务吗？本次进度不会保存。')) onQuit();
  };

  // ---------- render ----------
  if (phase === 'intro') {
    const giver = task.giver;
    return (
      <div className="scene" style={{ backgroundImage: `url(${bgImg(task.scenes[0].bg)})` }}>
        <div className="scene-veil" />
        <TopBar onQuit={quit} title={`任务 ${task.order} · ${task.title}`} />
        <div className="intro" data-testid="intro">
          <div className="intro-cast">
            {task.characters.map((c) => <img key={c} src={charImg(c, 'fullbody')} alt={c} className={c === giver ? 'main' : ''} />)}
          </div>
          <div className="panel intro-panel">
            <div className="intro-title">{task.title} <small>{task.titleEn}</small></div>
            <p className="intro-story">{task.story}</p>
            <p className="intro-goal">🎯 {task.goal}</p>
            <div className="intro-keys-head">本次重点句（点 🔊 先听一遍）</div>
            <ul className="intro-keys">
              {task.keySentences.map((k) => (
                <li key={k.en}><div><div className="en">{k.en}</div><div className="zh">{k.zh}</div></div><SpeakPair text={k.en} /></li>
              ))}
            </ul>
            <div className="intro-rule">共 {turns.length} 轮对话 · 首次答对满分，第二次答对得一半 · 满分 100</div>
            <button className="btn btn-primary btn-big" onClick={begin} data-testid="begin">开始任务</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'travel') {
    return (
      <div className="scene" style={{ backgroundImage: `url(${bgImg(scene.bg)})` }}>
        <div className="scene-veil soft" />
        <TopBar onQuit={quit} title={`任务 ${task.order} · ${task.title}`} progress={idx / turns.length} />
        <div className="travel" data-testid="travel">
          <div className="travel-card panel">
            <div className="travel-place">📍 {scene.place}</div>
            <div className="travel-en">{scene.placeEn}</div>
            <div className="travel-walk"><img src={charImg('kai', 'chibi')} alt="Kai" /><img src={charImg(scene.npc, 'chibi')} alt="" className="flip" /></div>
            <button className="btn btn-primary btn-big" onClick={() => setPhase('turn')} data-testid="arrive">到了，打招呼 ▶</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'ending') {
    const e = task.ending;
    return (
      <div className="scene" style={{ backgroundImage: `url(${bgImg(task.scenes[task.scenes.length - 1].bg)})` }}>
        <div className="scene-veil soft" />
        <TopBar onQuit={quit} title={`任务 ${task.order} · ${task.title}`} progress={1} />
        <div className="stage">
          <img className="portrait" src={charImg(e.speaker, e.expression)} alt={e.speaker} />
          <img className="portrait-kai" src={charImg('kai', 'happy')} alt="Kai" />
        </div>
        <div className="dialog panel">
          <div className="name-tag" style={{ background: CHARACTERS[e.speaker].color }}>{CHARACTERS[e.speaker].name}</div>
          <Sentence en={e.line} zh={e.zh} big />
          <p className="narration">{e.narration}</p>
          <button className="btn btn-primary btn-big" onClick={finish} data-testid="to-result">任务完成！查看结算</button>
        </div>
      </div>
    );
  }

  // turn
  const showAfter = status === 'correct' && turn.after;
  const spk = showAfter ? turn.after.speaker : turn.speaker;
  const npcExpr = showAfter ? turn.after.expression
    : status === 'correct' ? 'happy'
    : status === 'wrong' ? 'confused'
    : turn.expression;
  const kaiExpr = status === 'wrong' ? 'confused' : 'happy';
  const ch = CHARACTERS[spk];

  return (
    <div className="scene" style={{ backgroundImage: `url(${bgImg(scene.bg)})` }}>
      <div className="scene-veil soft" />
      <TopBar onQuit={quit} title={`${scene.place}`} progress={(idx + (status === 'correct' ? 1 : 0)) / turns.length} counter={`${idx + 1}/${turns.length}`} />
      <div className="stage">
        <img key={spk + npcExpr} className={`portrait pop ${status === 'wrong' ? 'shake' : ''}`} src={charImg(spk, npcExpr)} alt={`${spk} ${npcExpr}`} data-testid="npc-portrait" />
      </div>
      <div className="dialog panel" data-testid="dialog">
        <div className="name-tag" style={{ background: ch.color }}>{ch.name}</div>
        {showAfter
          ? <Sentence key={'a' + idx} en={turn.after.line} zh={turn.after.zh} />
          : <Sentence key={'l' + idx} en={turn.line} zh={turn.zh} />}
      </div>

      <div className="answer-area">
        <div className="kai-row">
          <img className={`kai-face ${status}`} src={charImg('kai', kaiExpr)} alt={`Kai ${kaiExpr}`} data-testid="kai-face" />
          <div className="kai-say">
            {status === 'wrong' ? (
              <div className="hint" data-testid="hint">💡 {turn.hint}<div className="hint-sub">{tries === 1 ? `再选一次吧（第二次答对得 ${Math.ceil(turnPoints(idx, turns.length) / 2)} 分）` : '再选一次吧（这题不再得分，但要弄懂哦）'}</div></div>
            ) : status === 'correct' ? (
              <div className="good" data-testid="good">{tries === 1 ? '✨ 答对了！' : tries === 2 ? '👍 对了！（第二次，得一半分）' : '👌 这次对了'} <span className="pts" data-testid="pts">+{pointsEarned(idx, turns.length, tries)}</span></div>
            ) : (
              <div className="prompt">{turn.prompt || 'Kai 该怎么回答？'}<span className="prompt-pts">本题 {turnPoints(idx, turns.length)} 分</span></div>
            )}
          </div>
        </div>
        {status !== 'correct' ? (
          <div className="options">
            {options.map((o) => {
              const bad = wrongPicks.includes(o.en);
              return (
                <button key={o.en} className={`option ${bad ? 'bad' : ''}`} disabled={bad} onClick={() => pick(o)} data-testid="option">
                  {o.en}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="options">
            <div className="option chosen">{turn.options[turn.answer].en}<span className="opt-zh">{turn.options[turn.answer].zh}</span></div>
            <button className="btn btn-primary btn-big" onClick={next} data-testid="next">继续 ▶</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TopBar({ onQuit, title, progress, counter }) {
  return (
    <div className="topbar">
      <button className="icon-btn" onClick={onQuit} aria-label="退出">✕</button>
      <div className="topbar-mid">
        <div className="topbar-title">{title}</div>
        {progress != null && <div className="progress"><div style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
      </div>
      <div className="topbar-counter">{counter || ''}</div>
    </div>
  );
}
