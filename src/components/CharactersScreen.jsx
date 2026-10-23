import React, { useState } from 'react';
import { CHARACTERS, ORDER, charImg, bgImg } from '../data/characters.js';
import { SpeakPair } from './SpeakButtons.jsx';

const EXPR = ['happy', 'surprised', 'confused'];

export default function CharactersScreen({ onBack }) {
  const [expr, setExpr] = useState({});
  return (
    <div className="page" style={{ backgroundImage: `url(${bgImg('forest')})` }}>
      <div className="page-inner">
        <div className="page-head">
          <button className="icon-btn" onClick={onBack} aria-label="返回地图">←</button>
          <h2>🌿 村民</h2><span />
        </div>
        {ORDER.map((id) => {
          const c = CHARACTERS[id];
          const e = expr[id];
          return (
            <div className="panel char-card" key={id}>
              <button className="char-img" onClick={() => setExpr((x) => ({ ...x, [id]: EXPR[(EXPR.indexOf(e) + 1) % EXPR.length] }))} aria-label="换表情">
                <img src={charImg(id, e || 'fullbody')} alt={c.name} />
              </button>
              <div className="char-info">
                <div className="char-name" style={{ color: c.color }}>{c.name} <small>{c.zh} · {c.age} 岁</small></div>
                <p>{c.desc}</p>
                <div className="catch"><div className="en">“{c.catchphrase}”</div><div className="zh">{c.catchphraseZh}</div><SpeakPair text={c.catchphrase} /></div>
                <div className="char-tip">点图片换表情</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
