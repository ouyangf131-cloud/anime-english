import React from 'react';
import { unlock, speak } from '../lib/speech.js';
import { preloadBgs } from '../lib/preload.js';
import { SCENE_BGS } from '../data/characters.js';
import { charImg, bgImg, ORDER } from '../data/characters.js';

export default function StartScreen({ onEnter }) {
  const enter = () => {
    unlock(); // iOS Safari: speech must be started from a tap
    onEnter(); // navigation calls stop(), so speak after it (still inside this tap)
    speak("Let's go and see!");
    // Low-priority warm-up of all scene backgrounds once the map has started loading.
    setTimeout(() => preloadBgs(SCENE_BGS), 1500);
  };
  return (
    <div className="start" style={{ backgroundImage: `url(${bgImg('forest')})` }}>
      <div className="start-veil" />
      <div className="start-inner">
        <h1 className="start-title">山林小村<br /><span>英语冒险</span></h1>
        <p className="start-sub">A little English adventure in the forest village</p>
        <div className="start-chars">
          {ORDER.map((id) => <img key={id} src={charImg(id, 'chibi')} alt={id} />)}
        </div>
        <button className="btn btn-primary btn-big" onClick={enter}>点击进入村子</button>
        <p className="start-note">🔊 进入后会自动朗读英语，请打开声音（iPhone 关闭静音键）</p>
      </div>
    </div>
  );
}
