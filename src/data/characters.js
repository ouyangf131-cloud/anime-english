// Character settings (see /workspace/anime-english/characters/characters.md)
export const CHARACTERS = {
  kai: {
    id: 'kai', name: 'Kai', zh: '玩家主角', age: 15, color: '#3b5b8c',
    desc: '来村子探险的 15 岁少年，背着木弓和竹箭筒。好奇、开朗、有点冒失，什么都想问一问。',
    catchphrase: "Let's go and see!", catchphraseZh: '走，去看看！',
  },
  mira: {
    id: 'mira', name: 'Mira', zh: '森林里长大的女孩', age: 14, color: '#4f7a3a',
    desc: '野性直率，说话短，对森林了如指掌。身边跟着白色狼崽 Yuki。负责问路、自我介绍、天气。',
    catchphrase: "Follow me. Don't get lost!", catchphraseZh: '跟着我，别走丢了！',
  },
  hana: {
    id: 'hana', name: 'Hana', zh: '茶屋的温柔姐姐', age: 22, color: '#b8862b',
    desc: '温柔耐心、爱笑，说话慢慢的，会把价格和数字重复一遍。负责点餐、买东西、数字和价格。',
    catchphrase: 'Take your time. Would you like some tea?', catchphraseZh: '慢慢来，要喝点茶吗？',
  },
  tomo: {
    id: 'tomo', name: 'Tomo', zh: '铁匠大叔', age: 45, color: '#7a4a2a',
    desc: '大嗓门、爱开玩笑，笑声能传遍整个村子，其实最会照顾新来的人。负责打招呼、道谢道歉、请求帮忙。',
    catchphrase: 'Ha ha! No problem, my friend!', catchphraseZh: '哈哈！没问题，朋友！',
  },
};

export const ORDER = ['kai', 'mira', 'hana', 'tomo'];

const base = import.meta.env.BASE_URL;
export const charImg = (id, variant = 'happy') => `${base}assets/chars/${id}_${variant}.webp`;
export const bgImg = (id) => `${base}assets/bg/${id}.webp`;
