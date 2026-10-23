// Coordinates are in map-image pixels (map.webp is 720 x 1280).
export const MAP_W = 720;
export const MAP_H = 1280;

export const NPC_SPOTS = {
  tomo: { x: 215, y: 870, flip: false },
  hana: { x: 520, y: 820, flip: true },
  mira: { x: 185, y: 430, flip: false },
};
export const KAI_START = { x: 360, y: 1010 };

// Tappable things on the map: tap -> word card + pronunciation
export const ITEMS = [
  { id: 'gate', x: 356, y: 905, en: 'gate', zh: '大门', ex: 'This is the village gate.' },
  { id: 'bridge', x: 350, y: 600, en: 'bridge', zh: '桥', ex: 'Let\'s cross the bridge.' },
  { id: 'river', x: 420, y: 790, en: 'river', zh: '河；小溪', ex: 'The river is cold.' },
  { id: 'teahouse', x: 600, y: 610, en: 'teahouse', zh: '茶屋', ex: 'Hana works at the teahouse.' },
  { id: 'lantern', x: 600, y: 742, en: 'lantern', zh: '灯笼', ex: 'The lantern is warm and bright.' },
  { id: 'forge', x: 120, y: 760, en: 'forge', zh: '铁匠铺', ex: 'Tomo works at the forge.' },
  { id: 'smoke', x: 95, y: 470, en: 'smoke', zh: '烟', ex: 'Smoke comes from the chimney.' },
  { id: 'tree', x: 250, y: 230, en: 'tree', zh: '树', ex: 'This tree is very old.' },
  { id: 'mountain', x: 560, y: 120, en: 'mountain', zh: '山', ex: 'The mountains are high.' },
  { id: 'flower', x: 110, y: 1040, en: 'flower', zh: '花', ex: 'What a pretty red flower!' },
  { id: 'rock', x: 590, y: 1110, en: 'rock', zh: '石头', ex: 'The rock is green with moss.' },
];

// Which NPC offers which tasks (other tasks are "coming soon")
export const NPC_TALK = {
  tomo: { line: 'Ha ha! No problem, my friend!', zh: '哈哈！没问题，朋友！' },
  hana: { line: 'Take your time. Would you like some tea?', zh: '慢慢来，要喝点茶吗？' },
  mira: { line: "Follow me. Don't get lost!", zh: '跟着我，别走丢了！' },
};
