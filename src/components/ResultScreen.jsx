import React, { useEffect } from 'react';
import { findTurn, TASK_BY_ID } from '../tasks/index.js';
import { CHARACTERS, charImg, bgImg } from '../data/characters.js';
import { fmtTime, fmtPts, timeCompare } from '../lib/util.js';
import { speak } from '../lib/speech.js';
import { SpeakPair } from './SpeakButtons.jsx';

export function WrongItem({ taskId, turnId, picks, count }) {
  const t = findTurn(taskId, turnId);
  if (!t) return null;
  const correct = t.options[t.answer];
  const zhOf = (en) => t.options.find((o) => o.en === en)?.zh;
  return (
    <li className="wrong-item" data-testid="wrong-item">
      <div className="wi-line">
        <img src={charImg(t.speaker, 'chibi')} alt="" />
        <div><b>{CHARACTERS[t.speaker].name}：</b>{t.line}<div className="zh">{t.zh}</div></div>
        <SpeakPair text={t.line} />
      </div>
      {t.prompt && <div className="wi-prompt">{t.prompt}</div>}
      {picks?.length > 0 && (
        <div className="wi-row bad">✗ 你选的：{picks.map((p) => <span key={p} className="pick">{p}<small>（{zhOf(p)}）</small></span>)}</div>
      )}
      <div className="wi-row ok">✓ 正确：<span className="pick">{correct.en}</span><SpeakPair text={correct.en} /></div>
      <div className="wi-row zh">中文：{correct.zh}</div>
      <div className="wi-row tip">💡 {t.hint}</div>
      {count > 1 && <div className="wi-row count">累计错 {count} 次</div>}
    </li>
  );
}

export default function ResultScreen({ result, onReview, onMap, onRetry }) {
  const r = result;
  const task = TASK_BY_ID[r.taskId];
  const diff = r.prev ? r.score - r.prev.score : null;
  const stars = r.score >= 90 ? 3 : r.score >= 70 ? 2 : r.score >= 40 ? 1 : 0;
  useEffect(() => { speak(r.score >= 90 ? 'Excellent!' : r.score >= 70 ? 'Great job!' : 'Good try!'); }, []); // eslint-disable-line

  return (
    <div className="page" style={{ backgroundImage: `url(${bgImg(task.scenes[task.scenes.length - 1].bg)})` }}>
      <div className="page-inner" data-testid="result">
        <div className="panel result-card">
          <div className="result-title">任务 {task.order} · {task.title} 完成！</div>
          <div className="result-hero">
            <img src={charImg('kai', r.score >= 70 ? 'happy' : 'confused')} alt="Kai" />
            <div>
              <div className="score" data-testid="score-box"><span data-testid="score">{fmtPts(r.score)}</span><small> 分</small></div>
              <div className="stars">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
            </div>
          </div>
          <div className="result-grid">
            <div><b>{r.firstTry}/{r.total}</b><span>首次答对</span></div>
            <div><b data-testid="time-used">{fmtTime(r.timeMs)}</b><span>用时</span></div>
            <div><b>{fmtPts(r.best)}</b><span>最高分</span></div>
          </div>
          <div className="compare" data-testid="compare">
            {r.prev
              ? <>和上次比：<b className={diff >= 0 ? 'up' : 'down'}>{diff > 0 ? `+${fmtPts(diff)}` : fmtPts(diff)} 分</b>（上次 {fmtPts(r.prev.score)} 分），{timeCompare(r.timeMs, r.prev.timeMs)}</>
              : <>第一次挑战这个任务，记录已保存 📒</>}
          </div>
        </div>

        <div className="panel">
          <div className="section-title">本次错题（{r.wrong.length}）</div>
          {r.wrong.length === 0
            ? <p className="empty">全部一次答对，太棒了！🎉</p>
            : <ul className="wrong-list">{r.wrong.map((w) => <WrongItem key={w.turnId} taskId={r.taskId} turnId={w.turnId} picks={w.picks} />)}</ul>}
        </div>

        <div className="result-actions">
          <button className="btn btn-primary btn-big" onClick={onReview} disabled={r.wrong.length === 0} data-testid="review">{r.wrong.length ? '复习错题' : '复习错题（本次没有错题）'}</button>
          <button className="btn btn-big" onClick={onMap} data-testid="back-map">回到地图</button>
          <button className="btn btn-ghost" onClick={onRetry}>再玩一次</button>
        </div>
      </div>
    </div>
  );
}
