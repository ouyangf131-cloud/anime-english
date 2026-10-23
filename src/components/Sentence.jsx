import React, { useRef, useState } from 'react';
import { SpeakPair } from './SpeakButtons.jsx';

// English sentence with: replay, half-speed replay, long-press (or 译 button) for Chinese
export default function Sentence({ en, zh, showZhDefault = false, big = false }) {
  const [showZh, setShowZh] = useState(showZhDefault);
  const timer = useRef(null);
  const start = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setShowZh(true), 450); };
  const cancel = () => clearTimeout(timer.current);
  return (
    <div className="sentence">
      <div
        className={`sentence-en ${big ? 'big' : ''}`}
        onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >{en}</div>
      <div className="sentence-tools">
        <SpeakPair text={en} />
        <button type="button" className={`icon-btn zh-btn ${showZh ? 'on' : ''}`} onClick={() => setShowZh((v) => !v)} aria-label="显示中文">译</button>
      </div>
      {showZh && <div className="sentence-zh">{zh}</div>}
    </div>
  );
}
