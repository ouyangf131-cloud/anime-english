// Every src/tasks/taskN.json is picked up automatically. Add a new JSON file to add a task.
const mods = import.meta.glob('./*.json', { eager: true });
export const TASKS = Object.values(mods)
  .map((m) => m.default || m)
  .sort((a, b) => a.order - b.order);

export const TASK_BY_ID = Object.fromEntries(TASKS.map((t) => [t.id, t]));

export function allTurns(task) {
  return task.scenes.flatMap((s) => s.turns.map((t) => ({ ...t, sceneId: s.id, bg: s.bg })));
}

export function findTurn(taskId, turnId) {
  const task = TASK_BY_ID[taskId];
  if (!task) return null;
  return allTurns(task).find((t) => t.id === turnId) || null;
}

// Upcoming tasks from the outline (shown as locked on the map)
export const COMING_SOON = [
  { id: 'task3', order: 3, title: '森林里迷路', giver: 'mira' },
  { id: 'task4', order: 4, title: '帮铁匠取东西', giver: 'tomo' },
  { id: 'task5', order: 5, title: '下雨天', giver: 'mira' },
];
