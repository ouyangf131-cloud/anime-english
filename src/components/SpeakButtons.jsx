import React from 'react';
import { speak } from '../lib/speech.js';

export function SpeakBtn({ text, slow = false, label, className = '' }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={slow ? '慢速播放' : '播放发音'}
      onClick={(e) => { e.stopPropagation(); speak(text, { rate: slow ? 0.5 : 0.9 }); }}
    >
      {label || (slow ? '🐢' : '🔊')}
    </button>
  );
}

export function SpeakPair({ text }) {
  return (
    <span className="speak-pair">
      <SpeakBtn text={text} />
      <SpeakBtn text={text} slow />
    </span>
  );
}
