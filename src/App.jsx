import React, { useState, useCallback, lazy, Suspense } from 'react';
import StartScreen from './components/StartScreen.jsx';
import TaskPlayer from './components/TaskPlayer.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import ReviewScreen from './components/ReviewScreen.jsx';
import NotebookScreen from './components/NotebookScreen.jsx';
import CharactersScreen from './components/CharactersScreen.jsx';
import { TASK_BY_ID } from './tasks/index.js';
import { stop } from './lib/speech.js';

const MapScreen = lazy(() => import('./components/MapScreen.jsx'));

export default function App() {
  // screen: start | map | task | result | review | notebook | characters
  const [nav, setNav] = useState({ screen: 'start' });
  const go = useCallback((screen, params = {}) => { stop(); setNav({ screen, ...params }); window.scrollTo(0, 0); }, []);

  let body;
  switch (nav.screen) {
    case 'start':
      body = <StartScreen onEnter={() => go('map')} />;
      break;
    case 'map':
      body = (
        <Suspense fallback={<div className="loading">正在铺开地图…</div>}>
          <MapScreen
            onStartTask={(id) => go('task', { taskId: id })}
            onNotebook={() => go('notebook')}
            onCharacters={() => go('characters')}
          />
        </Suspense>
      );
      break;
    case 'task':
      body = (
        <TaskPlayer
          key={nav.taskId + (nav.nonce || '')}
          task={TASK_BY_ID[nav.taskId]}
          onQuit={() => go('map')}
          onFinish={(result) => go('result', { result })}
        />
      );
      break;
    case 'result':
      body = (
        <ResultScreen
          result={nav.result}
          onReview={() => go('review', { items: nav.result.wrong.map((w) => ({ taskId: nav.result.taskId, turnId: w.turnId })), from: 'result', result: nav.result })}
          onMap={() => go('map')}
          onRetry={() => go('task', { taskId: nav.result.taskId, nonce: Date.now() })}
        />
      );
      break;
    case 'review':
      body = (
        <ReviewScreen
          items={nav.items}
          from={nav.from}
          onMap={() => go('map')}
          onBack={() => (nav.from === 'notebook' ? go('notebook') : go('result', { result: nav.result }))}
        />
      );
      break;
    case 'notebook':
      body = <NotebookScreen onBack={() => go('map')} onRedo={(items) => go('review', { items, from: 'notebook' })} />;
      break;
    case 'characters':
      body = <CharactersScreen onBack={() => go('map')} />;
      break;
    default:
      body = null;
  }
  return <div className="app">{body}</div>;
}
