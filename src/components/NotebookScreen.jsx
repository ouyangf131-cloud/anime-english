import React, { useState } from 'react';
import { load } from '../lib/store.js';
import { TASKS } from '../tasks/index.js';
import { bgImg, charImg } from '../data/characters.js';
import { WrongItem } from './ResultScreen.jsx';

export default function NotebookScreen({ onBack, onRedo }) {
  const [data] = useState(load);
  const all = Object.values(data.wrong);
  return (
    <div className="page" style={{ backgroundImage: `url(${bgImg('teahouse')})` }}>
      <div className="page-inner" data-testid="notebook">
        <div className="page-head">
          <button className="icon-btn" onClick={onBack} aria-label="返回地图">←</button>
          <h2>📕 错题本</h2>
          <span className="count">{all.length} 题</span>
        </div>
        {all.length === 0 ? (
          <div className="panel empty-nb">
            <img src={charImg('hana', 'happy')} alt="" />
            <p>错题本是空的。<br />做任务时答错的句子会自动收进来，复习时一次答对就会移出。</p>
          </div>
        ) : (
          <>
            <button className="btn btn-primary btn-big full" onClick={() => onRedo(all.map(({ taskId, turnId }) => ({ taskId, turnId })))} data-testid="redo-all">重做全部错题（{all.length}）</button>
            {TASKS.map((t) => {
              const items = all.filter((w) => w.taskId === t.id);
              if (!items.length) return null;
              return (
                <div className="panel" key={t.id}>
                  <div className="section-title row">
                    <span>任务 {t.order} · {t.title}（{items.length}）</span>
                    <button className="btn btn-small" onClick={() => onRedo(items.map(({ taskId, turnId }) => ({ taskId, turnId })))}>重做本任务</button>
                  </div>
                  <ul className="wrong-list">
                    {items.map((w) => <WrongItem key={w.turnId} taskId={w.taskId} turnId={w.turnId} picks={w.lastPick ? [w.lastPick] : []} count={w.count} />)}
                  </ul>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
