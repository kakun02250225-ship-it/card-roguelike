/* =========================================================
   深淵の塔 - Abyss Deck -
   デッキ構築型ローグライトカードゲーム

   このファイルの構成：
     1. カードデータ
     2. ガチャの設定
     3. キャラクターのSVGアート
     4. 敵データ
     5. マップとイベントのデータ
     6. ゲーム状態（state）
     7. ユーティリティ
     8. ゲームの開始とマップ進行
     9. 戦闘（プレイヤーのターン／敵のターン）
    10. 勝敗の判定と報酬・ガチャ
    11. 休憩所とイベント
    12. 戦闘演出（攻撃モーション・ダメージ表示）
    13. 画面の描画
    14. ボタンとキー入力
   ========================================================= */

/* =========================
   1. カードデータ
   -------------------------
   effects に書いた内容が、カード使用時にそのまま実行される。
     damage   : 敵に与えるダメージ（筋力の分だけ増える）
     hits     : damage を何回与えるか（省略時は1回）
     block    : 自分が得るブロック
     heal     : 自分が回復するHP
     strength : 自分が得る筋力（この戦闘中、攻撃ダメージが増える）
     draw     : 山札から引く枚数

   rarity はガチャのレアリティ。
     common / rare / epic / legendary の4段階で、高いほど強い。
     epic と legendary はガチャでしか手に入らない。
   ========================= */
const CARD_LIBRARY = {
  // ----- Common -----
  slash: {
    name: "斬撃", icon: "⚔️", type: "attack", cost: 1, rarity: "common",
    effects: { damage: 6 },
  },
  guard: {
    name: "鉄の守り", icon: "🛡️", type: "defense", cost: 1, rarity: "common",
    effects: { block: 5 },
  },
  doubleSlash: {
    name: "二連斬", icon: "🗡️", type: "attack", cost: 1, rarity: "common",
    effects: { damage: 4, hits: 2 },
  },
  shieldBash: {
    name: "盾の一撃", icon: "🛡", type: "attack", cost: 1, rarity: "common",
    effects: { damage: 4, block: 4 },
  },
  prayer: {
    name: "癒しの祈り", icon: "✨", type: "power", cost: 1, rarity: "common",
    effects: { heal: 6 },
  },
  // ----- Rare -----
  heavyBlow: {
    name: "粉砕の一撃", icon: "🔨", type: "attack", cost: 2, rarity: "rare",
    effects: { damage: 14 },
  },
  bloodBlade: {
    name: "吸血の刃", icon: "🩸", type: "attack", cost: 1, rarity: "rare",
    effects: { damage: 5, heal: 3 },
  },
  greatWall: {
    name: "大防壁", icon: "🏰", type: "defense", cost: 2, rarity: "rare",
    effects: { block: 12 },
  },
  warCry: {
    name: "剛力の咆哮", icon: "💪", type: "power", cost: 1, rarity: "rare",
    effects: { strength: 2 },
  },
  focus: {
    name: "深淵の集中", icon: "🔮", type: "power", cost: 1, rarity: "rare",
    effects: { draw: 2 },
  },
  // ----- Epic（ガチャ限定） -----
  soulCrush: {
    name: "滅魂の大撃", icon: "💥", type: "attack", cost: 3, rarity: "epic",
    effects: { damage: 24 },
  },
  stormBlades: {
    name: "嵐の連刃", icon: "🌪️", type: "attack", cost: 2, rarity: "epic",
    effects: { damage: 5, hits: 3 },
  },
  holyWall: {
    name: "不滅の聖壁", icon: "⛪", type: "defense", cost: 2, rarity: "epic",
    effects: { block: 13, heal: 3 },
  },
  // ----- Legendary（ガチャ限定） -----
  finalSlash: {
    name: "終焉の一閃", icon: "⚡", type: "attack", cost: 3, rarity: "legendary",
    effects: { damage: 30 },
  },
  dragonRoar: {
    name: "龍王の咆哮", icon: "🐉", type: "power", cost: 1, rarity: "legendary",
    effects: { strength: 3 },
  },
};

// 最初に持っているデッキ（カードIDの一覧）
const STARTER_DECK = [
  "slash", "slash", "slash", "slash", "slash",
  "guard", "guard", "guard", "guard",
  "warCry",
];

// 戦闘勝利後の報酬として出てくるカード（Common と Rare のみ。
// Epic と Legendary はガチャ限定にして、ガチャの価値を高めている）
const REWARD_POOL = [
  "doubleSlash", "heavyBlow", "bloodBlade", "shieldBash",
  "greatWall", "warCry", "focus", "prayer",
];

/* =========================
   2. ガチャの設定
   -------------------------
   敵を倒すとガチャコインがドロップし、
   1回 GACHA_COST 枚でガチャを引ける。
   weight はレアリティの出やすさ（合計100 = そのまま%）。
   ========================= */
const GACHA_COST = 10;

const RARITY_TABLE = {
  common:    { label: "COMMON",    weight: 50 },
  rare:      { label: "RARE",      weight: 30 },
  epic:      { label: "EPIC",      weight: 15 },
  legendary: { label: "LEGENDARY", weight: 5 },
};

/* =========================
   3. キャラクターのSVGアート
   -------------------------
   画像ファイルを使わず、コードで描いたSVGイラスト。
   グラデーションのidはキャラごとに接頭辞を変えて衝突を防ぐ。
   ========================= */
const ART = {
  // 主人公：放浪の騎士
  knight: `
<svg viewBox="0 0 120 140" class="char-svg">
  <defs>
    <linearGradient id="k-armor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa3c8"/><stop offset="1" stop-color="#3a4060"/>
    </linearGradient>
    <linearGradient id="k-cape" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8a2438"/><stop offset="1" stop-color="#3a0f18"/>
    </linearGradient>
  </defs>
  <path d="M40 54 Q28 95 24 124 L58 112 L62 124 Q72 100 80 56 Z" fill="url(#k-cape)"/>
  <rect x="48" y="96" width="11" height="34" rx="5" fill="#2c3148"/>
  <rect x="63" y="96" width="11" height="34" rx="5" fill="#2c3148"/>
  <path d="M42 56 Q61 48 80 56 L76 100 Q61 107 46 100 Z" fill="url(#k-armor)"/>
  <rect x="46" y="84" width="30" height="6" fill="#1c2030"/>
  <rect x="57" y="83" width="8" height="8" rx="1" fill="#c8a040"/>
  <ellipse cx="43" cy="60" rx="11" ry="8" fill="#6a72a0"/>
  <ellipse cx="79" cy="60" rx="11" ry="8" fill="#6a72a0"/>
  <path d="M47 24 Q61 13 75 24 L75 44 Q61 52 47 44 Z" fill="url(#k-armor)"/>
  <path d="M58 16 Q59 4 70 1 Q67 10 65 18 Z" fill="#b02a3e"/>
  <rect x="52" y="30" width="18" height="5" rx="2.5" fill="#ffd24a"/>
  <path d="M16 62 Q29 57 42 62 L42 88 Q29 100 16 88 Z" fill="#4a3358" stroke="#c8a040" stroke-width="2"/>
  <circle cx="29" cy="74" r="5" fill="none" stroke="#c8a040" stroke-width="2"/>
  <rect x="92" y="18" width="6" height="58" rx="3" fill="#dde4f5"/>
  <path d="M92 18 L95 8 L98 18 Z" fill="#dde4f5"/>
  <rect x="83" y="74" width="24" height="6" rx="3" fill="#c8a040"/>
  <rect x="91" y="80" width="8" height="16" rx="3" fill="#6a4a28"/>
</svg>`,

  // 朽ちた骸骨
  skeleton: `
<svg viewBox="0 0 120 140" class="char-svg">
  <path d="M40 18 Q60 6 80 18 Q88 28 84 42 Q80 52 60 54 Q40 52 36 42 Q32 28 40 18 Z" fill="#e8e2d2"/>
  <rect x="50" y="52" width="20" height="11" rx="4" fill="#d6d0be"/>
  <ellipse cx="50" cy="34" rx="6.5" ry="7" fill="#140b18"/>
  <ellipse cx="70" cy="34" rx="6.5" ry="7" fill="#140b18"/>
  <circle cx="50" cy="35" r="2" fill="#ff4040"/>
  <circle cx="70" cy="35" r="2" fill="#ff4040"/>
  <path d="M57 42 L63 42 L60 48 Z" fill="#140b18"/>
  <rect x="57" y="63" width="6" height="42" fill="#d6d0be"/>
  <path d="M44 70 Q60 79 76 70" stroke="#d6d0be" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M46 80 Q60 88 74 80" stroke="#d6d0be" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M48 90 Q60 97 72 90" stroke="#d6d0be" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M46 67 Q30 74 26 92" stroke="#d6d0be" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M74 67 Q90 74 94 92" stroke="#d6d0be" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="49" y="104" width="22" height="9" rx="4" fill="#d6d0be"/>
  <rect x="50" y="113" width="6" height="24" rx="3" fill="#d6d0be"/>
  <rect x="64" y="113" width="6" height="24" rx="3" fill="#d6d0be"/>
</svg>`,

  // 影の狼
  wolf: `
<svg viewBox="0 0 140 110" class="char-svg">
  <defs>
    <linearGradient id="wf-b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3450"/><stop offset="1" stop-color="#14101f"/>
    </linearGradient>
  </defs>
  <path d="M118 70 Q136 58 134 40 Q122 50 112 58 Z" fill="#2a2438"/>
  <ellipse cx="78" cy="74" rx="44" ry="24" fill="url(#wf-b)"/>
  <path d="M48 56 L56 42 L64 56 L74 40 L84 56 L94 44 L100 58 Z" fill="#2e2840"/>
  <rect x="46" y="86" width="9" height="22" rx="4" fill="#1c1828"/>
  <rect x="66" y="90" width="9" height="18" rx="4" fill="#1c1828"/>
  <rect x="92" y="90" width="9" height="18" rx="4" fill="#1c1828"/>
  <rect x="108" y="86" width="9" height="22" rx="4" fill="#1c1828"/>
  <path d="M46 64 Q30 46 12 50 L2 60 L14 64 L6 73 Q26 82 40 75 Z" fill="#2e2840"/>
  <path d="M34 50 L38 30 L48 47 Z" fill="#2e2840"/>
  <path d="M24 50 L24 36 L34 48 Z" fill="#241e34"/>
  <circle cx="24" cy="57" r="3.5" fill="#ff3838"/>
  <path d="M8 62 L10 68 L13 62 Z" fill="#e8e2d2"/>
  <path d="M15 64 L17 70 L20 64 Z" fill="#e8e2d2"/>
</svg>`,

  // さまよう亡霊
  ghost: `
<svg viewBox="0 0 120 140" class="char-svg">
  <defs>
    <linearGradient id="gh-b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a3f6a"/><stop offset="1" stop-color="#181226"/>
    </linearGradient>
  </defs>
  <path d="M60 14 Q92 28 90 74 L92 128 L80 116 L72 130 L60 118 L48 130 L40 116 L28 128 L30 74 Q28 28 60 14 Z" fill="url(#gh-b)" opacity="0.95"/>
  <ellipse cx="60" cy="46" rx="20" ry="22" fill="#0c0814"/>
  <circle cx="52" cy="44" r="4" fill="#7ae8ff"/>
  <circle cx="68" cy="44" r="4" fill="#7ae8ff"/>
  <path d="M30 70 Q14 76 10 92" stroke="#3a3050" stroke-width="9" fill="none" stroke-linecap="round"/>
  <path d="M90 70 Q106 76 110 92" stroke="#3a3050" stroke-width="9" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="20" r="3" fill="#7ae8ff" opacity="0.6"/>
  <circle cx="100" cy="30" r="2.5" fill="#7ae8ff" opacity="0.5"/>
</svg>`,

  // 呪われた鎧（強敵）
  armor: `
<svg viewBox="0 0 120 140" class="char-svg">
  <defs>
    <linearGradient id="ar-m" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7a8298"/><stop offset="1" stop-color="#2a3040"/>
    </linearGradient>
  </defs>
  <rect x="14" y="26" width="6" height="92" rx="3" fill="#5a4a30"/>
  <path d="M17 26 Q-6 38 4 60 Q12 46 17 44 Z" fill="#aab4c8"/>
  <path d="M17 26 Q40 38 30 60 Q22 46 17 44 Z" fill="#8a94a8"/>
  <rect x="44" y="96" width="13" height="36" rx="5" fill="#3a4254"/>
  <rect x="63" y="96" width="13" height="36" rx="5" fill="#3a4254"/>
  <path d="M38 52 Q60 44 82 52 L78 100 Q60 108 42 100 Z" fill="url(#ar-m)"/>
  <path d="M52 60 L60 78 L68 60" stroke="#1c2230" stroke-width="3" fill="none"/>
  <path d="M26 50 Q38 38 50 48 L46 64 Q34 66 26 58 Z" fill="#5a6478"/>
  <path d="M94 50 Q82 38 70 48 L74 64 Q86 66 94 58 Z" fill="#5a6478"/>
  <path d="M28 48 L20 36 L34 42 Z" fill="#5a6478"/>
  <path d="M92 48 L100 36 L86 42 Z" fill="#5a6478"/>
  <path d="M46 18 Q60 8 74 18 L76 40 Q60 48 44 40 Z" fill="url(#ar-m)"/>
  <rect x="50" y="28" width="20" height="5" rx="2.5" fill="#ff3030"/>
</svg>`,

  // 地獄の番犬（強敵）
  hound: `
<svg viewBox="0 0 140 110" class="char-svg">
  <defs>
    <linearGradient id="hd-b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a2418"/><stop offset="1" stop-color="#1f0c08"/>
    </linearGradient>
    <linearGradient id="hd-f" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#c84a18"/><stop offset="1" stop-color="#ffb030"/>
    </linearGradient>
  </defs>
  <path d="M118 70 Q138 56 134 38 Q120 48 112 58 Z" fill="#3a160c"/>
  <path d="M48 58 L54 38 L62 54 L70 34 L80 52 L88 38 L96 54 L102 44 L104 58 Z" fill="url(#hd-f)" opacity="0.9"/>
  <ellipse cx="78" cy="74" rx="44" ry="24" fill="url(#hd-b)"/>
  <rect x="46" y="86" width="9" height="22" rx="4" fill="#2a0f08"/>
  <rect x="66" y="90" width="9" height="18" rx="4" fill="#2a0f08"/>
  <rect x="92" y="90" width="9" height="18" rx="4" fill="#2a0f08"/>
  <rect x="108" y="86" width="9" height="22" rx="4" fill="#2a0f08"/>
  <path d="M46 64 Q30 46 12 50 L2 60 L14 64 L6 73 Q26 82 40 75 Z" fill="#421a0e"/>
  <path d="M34 50 L38 30 L48 47 Z" fill="#421a0e"/>
  <path d="M24 50 L24 36 L34 48 Z" fill="#331208"/>
  <circle cx="24" cy="57" r="3.5" fill="#ffb030"/>
  <path d="M8 62 L10 68 L13 62 Z" fill="#e8e2d2"/>
  <path d="M15 64 L17 70 L20 64 Z" fill="#e8e2d2"/>
</svg>`,

  // 深淵の魔王（ボス）
  demon: `
<svg viewBox="0 0 160 150" class="char-svg">
  <defs>
    <linearGradient id="dm-b" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a2438"/><stop offset="1" stop-color="#240a14"/>
    </linearGradient>
    <linearGradient id="dm-w" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#38182a"/><stop offset="1" stop-color="#120612"/>
    </linearGradient>
  </defs>
  <path d="M30 58 Q4 34 8 8 Q24 24 34 30 Q30 16 36 6 Q46 22 48 36 L52 56 Z" fill="url(#dm-w)"/>
  <path d="M130 58 Q156 34 152 8 Q136 24 126 30 Q130 16 124 6 Q114 22 112 36 L108 56 Z" fill="url(#dm-w)"/>
  <rect x="62" y="104" width="14" height="38" rx="6" fill="#3a1020"/>
  <rect x="84" y="104" width="14" height="38" rx="6" fill="#3a1020"/>
  <path d="M52 56 Q80 44 108 56 L102 110 Q80 120 58 110 Z" fill="url(#dm-b)"/>
  <path d="M68 70 Q80 78 92 70" stroke="#180410" stroke-width="3" fill="none"/>
  <path d="M70 84 Q80 90 90 84" stroke="#180410" stroke-width="3" fill="none"/>
  <path d="M54 60 Q36 72 34 94" stroke="#4a1626" stroke-width="11" fill="none" stroke-linecap="round"/>
  <path d="M106 60 Q124 72 126 94" stroke="#4a1626" stroke-width="11" fill="none" stroke-linecap="round"/>
  <circle cx="34" cy="98" r="7" fill="#4a1626"/>
  <circle cx="126" cy="98" r="7" fill="#4a1626"/>
  <path d="M64 22 Q80 12 96 22 L94 44 Q80 52 66 44 Z" fill="url(#dm-b)"/>
  <path d="M66 24 Q52 16 50 2 Q62 8 70 16 Z" fill="#d8c8a8"/>
  <path d="M94 24 Q108 16 110 2 Q98 8 90 16 Z" fill="#d8c8a8"/>
  <path d="M70 32 L80 36 L70 38 Z" fill="#ffd24a"/>
  <path d="M90 32 L80 36 L90 38 Z" fill="#ffd24a"/>
  <path d="M72 44 L76 48 L80 44 L84 48 L88 44" stroke="#ffd24a" stroke-width="2" fill="none"/>
</svg>`,
};

/* =========================
   4. 敵データ
   -------------------------
   pattern : 敵の行動パターン。この順番でループする。
     attack : value + 筋力 のダメージを与えてくる
     defend : value のブロックを得る
     buff   : 筋力を value 増やす（以後の攻撃が強くなる）
   coinMin / coinMax : 倒したときに落とすガチャコインの範囲
   敵のHPは階が深くなるほど少しずつ増える（createEnemy参照）。
   ========================= */
const NORMAL_ENEMIES = [
  {
    name: "朽ちた骸骨", art: "skeleton", maxHp: 42,
    coinMin: 5, coinMax: 12,
    pattern: [
      { type: "attack", value: 8 },
      { type: "attack", value: 8 },
      { type: "defend", value: 6 },
    ],
  },
  {
    name: "影の狼", art: "wolf", maxHp: 50,
    coinMin: 5, coinMax: 12,
    pattern: [
      { type: "attack", value: 7 },
      { type: "buff", value: 2 },
      { type: "attack", value: 11 },
    ],
  },
  {
    name: "さまよう亡霊", art: "ghost", maxHp: 46,
    coinMin: 5, coinMax: 12,
    pattern: [
      { type: "attack", value: 6 },
      { type: "attack", value: 9 },
      { type: "defend", value: 8 },
    ],
  },
];

const ELITE_ENEMIES = [
  {
    name: "呪われた鎧", art: "armor", maxHp: 78,
    coinMin: 15, coinMax: 25,
    pattern: [
      { type: "defend", value: 10 },
      { type: "attack", value: 13 },
      { type: "attack", value: 15 },
    ],
  },
  {
    name: "地獄の番犬", art: "hound", maxHp: 70,
    coinMin: 15, coinMax: 25,
    pattern: [
      { type: "attack", value: 9 },
      { type: "buff", value: 2 },
      { type: "attack", value: 14 },
    ],
  },
];

const BOSS_ENEMY = {
  name: "深淵の魔王", art: "demon", maxHp: 140,
  coinMin: 40, coinMax: 40,
  pattern: [
    { type: "buff", value: 3 },
    { type: "attack", value: 15 },
    { type: "defend", value: 12 },
    { type: "attack", value: 20 },
  ],
};

// 戦闘に勝ったあとに回復するHP
const HEAL_AFTER_BATTLE = 8;

/* =========================
   5. マップとイベントのデータ
   ========================= */
const TOTAL_FLOORS = 8; // 最上階（8層目）がボス

// マップに出るマスの種類
const NODE_INFO = {
  battle: { icon: "⚔️", name: "戦闘",   desc: "魔物と戦い、コインを得る" },
  elite:  { icon: "💀", name: "強敵",   desc: "手強いが、コインが多い" },
  rest:   { icon: "🔥", name: "休憩所", desc: "休んで回復するか、鍛錬する" },
  event:  { icon: "❓", name: "イベント", desc: "何が起こるかわからない" },
  boss:   { icon: "👹", name: "魔王の間", desc: "深淵の魔王が待ち受ける" },
};

// イベントマスで起こる出来事。choices の effect は結果の文章を返す
const EVENTS = [
  {
    title: "🎁 古びた宝箱",
    desc: "埃をかぶった宝箱を見つけた。罠の気配もするが……",
    choices: [
      {
        label: "開ける",
        effect() {
          if (Math.random() < 0.7) {
            const coins = randomInt(12, 20);
            gainCoins(coins);
            return `宝箱の中にコインが詰まっていた！ 🪙${coins} 枚獲得！`;
          }
          loseHp(6);
          return "罠だった！ 毒針が刺さり、HPを6失った……";
        },
      },
      { label: "立ち去る", effect: () => "宝箱には手を触れず、先へ進んだ。" },
    ],
  },
  {
    title: "⛲ 癒しの泉",
    desc: "淡く光る泉が湧いている。澄んだ水面が体力を誘う。",
    choices: [
      {
        label: "泉の水を飲む",
        effect() {
          const healed = healPlayer(15);
          return `体に力が満ちる。HPが ${healed} 回復した！`;
        },
      },
      { label: "立ち去る", effect: () => "泉を背に、先へ進んだ。" },
    ],
  },
  {
    title: "🕯️ 血の祭壇",
    desc: "禍々しい祭壇が佇む。血を捧げれば、報酬があるという。",
    choices: [
      {
        label: "血を捧げる（HP-8）",
        effect() {
          loseHp(8);
          const coins = randomInt(20, 30);
          gainCoins(coins);
          return `祭壇が紅く輝き、🪙${coins} 枚のコインが現れた！`;
        },
      },
      {
        label: "祈りを捧げる",
        effect() {
          const healed = healPlayer(5);
          return `静かな加護を感じた。HPが ${healed} 回復した。`;
        },
      },
    ],
  },
  {
    title: "🧙 さまよう商人",
    desc: "「珍しいカードがあるよ。🪙20枚でどうだい？」",
    choices: [
      {
        label: "買う（🪙20でEPICカード）",
        effect() {
          if (state.coins < 20) {
            return "コインが足りない……商人は肩をすくめて去っていった。";
          }
          state.coins -= 20;
          const epics = Object.keys(CARD_LIBRARY).filter(
            (id) => CARD_LIBRARY[id].rarity === "epic"
          );
          const cardId = epics[Math.floor(Math.random() * epics.length)];
          state.deck.push(cardId);
          return `「まいどあり」 ${CARD_LIBRARY[cardId].icon}「${CARD_LIBRARY[cardId].name}」を手に入れた！`;
        },
      },
      { label: "断る", effect: () => "商人は霧のように消えていった。" },
    ],
  },
];

/* =========================
   6. ゲーム状態
   ========================= */
const state = {
  player: {
    maxHp: 75,
    hp: 75,
    block: 0,
    strength: 0,
    maxEnergy: 3,
    energy: 3,
  },
  deck: [],        // 持っている全カード（カードID）
  drawPile: [],    // 山札
  hand: [],        // 手札
  discardPile: [], // 捨て札
  enemy: null,     // いま戦っている敵
  floor: 1,        // いま何層目か（1〜TOTAL_FLOORS）
  busy: false,     // 敵の行動中など、操作を受け付けない間 true
  coins: 0,            // いま持っているガチャコイン
  totalCoinsEarned: 0, // この冒険で集めた合計（結果画面で表示）
  runId: 0,        // やり直すたびに増える番号。古い処理の暴発防止に使う
};

/* =========================
   7. ユーティリティ
   ========================= */

// 配列をランダムに並べ替える（フィッシャー・イェーツ法）
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 指定ミリ秒だけ待つ（敵の行動などに「間」を作るため）
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// min 以上 max 以下のランダムな整数を返す
function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// コインを得る（合計の記録もつける）
function gainCoins(amount) {
  state.coins += amount;
  state.totalCoinsEarned += amount;
}

// プレイヤーのHPを回復する。実際に回復した量を返す
function healPlayer(amount) {
  const before = state.player.hp;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + amount);
  return state.player.hp - before;
}

// イベントなどでHPを失う（イベントでは死なないよう最低1残す）
function loseHp(amount) {
  state.player.hp = Math.max(1, state.player.hp - amount);
}

// 指定idのオーバーレイだけ表示を切り替えるヘルパー
function showOverlay(id) {
  document.getElementById(id).classList.remove("hidden");
}
function hideOverlay(id) {
  document.getElementById(id).classList.add("hidden");
}

// 全部のオーバーレイを閉じる（やり直し時など）
function hideAllOverlays() {
  ["title-screen", "map-screen", "node-screen", "reward-screen",
   "gacha-screen", "result-screen", "pause-screen"].forEach(hideOverlay);
}

/* =========================
   8. ゲームの開始とマップ進行
   ========================= */

function startGame() {
  state.runId++; // 進行中だった古い処理（敵のターンなど）を無効化する
  state.player.maxHp = 75;
  state.player.hp = 75;
  state.player.strength = 0;
  state.deck = [...STARTER_DECK];
  state.floor = 1;
  state.coins = 0;
  state.totalCoinsEarned = 0;
  state.busy = false;

  hideAllOverlays();
  document.getElementById("game-screen").classList.remove("hidden");
  document.getElementById("player-figure").innerHTML = ART.knight;

  enterNode("battle"); // 1層目は必ず戦闘から始まる
}

// 次の階のマス候補を作る
function generateMapChoices(nextFloor) {
  if (nextFloor === TOTAL_FLOORS) return ["boss"]; // 最上階はボスのみ

  let choices = shuffle(["battle", "elite", "rest", "event"]).slice(0, 3);

  // 序盤（3層未満）に強敵は出さない
  if (nextFloor < 3) {
    choices = choices.map((c) => (c === "elite" ? "battle" : c));
  }
  // ボス直前の階には必ず休憩所を出す
  if (nextFloor === TOTAL_FLOORS - 1 && !choices.includes("rest")) {
    choices[0] = "rest";
  }
  return [...new Set(choices)]; // 重複を取り除く
}

// マップ（進む道の選択）を表示する
function showMap() {
  const nextFloor = state.floor + 1;
  document.getElementById("map-floor-text").textContent =
    `第 ${nextFloor} 層 / ${TOTAL_FLOORS} へ進む`;

  const container = document.getElementById("map-nodes");
  container.innerHTML = "";

  generateMapChoices(nextFloor).forEach((type) => {
    const info = NODE_INFO[type];
    const node = document.createElement("div");
    node.className = `map-node node-${type}`;
    node.innerHTML = `
      <div class="map-node-icon">${info.icon}</div>
      <div class="map-node-name">${info.name}</div>
      <div class="map-node-desc">${info.desc}</div>
    `;
    node.addEventListener("click", () => {
      hideOverlay("map-screen");
      state.floor = nextFloor;
      enterNode(type);
    });
    container.appendChild(node);
  });

  showOverlay("map-screen");
  renderTopBar();
}

// 選んだマスに入る
function enterNode(type) {
  if (type === "battle") startBattle(createEnemy("battle"));
  else if (type === "elite") startBattle(createEnemy("elite"));
  else if (type === "boss") startBattle(createEnemy("boss"));
  else if (type === "rest") showRest();
  else if (type === "event") showEvent();
}

/* =========================
   9. 戦闘
   ========================= */

// 敵のインスタンスを作る（階が深いほどHPが少し増える）
function createEnemy(kind) {
  let data;
  if (kind === "boss") {
    data = BOSS_ENEMY;
  } else if (kind === "elite") {
    data = ELITE_ENEMIES[Math.floor(Math.random() * ELITE_ENEMIES.length)];
  } else {
    data = NORMAL_ENEMIES[Math.floor(Math.random() * NORMAL_ENEMIES.length)];
  }
  const bonusHp = kind === "boss" ? 0 : (state.floor - 1) * 4;
  return {
    name: data.name,
    art: data.art,
    maxHp: data.maxHp + bonusHp,
    hp: data.maxHp + bonusHp,
    block: 0,
    strength: 0,
    pattern: data.pattern,
    patternIndex: 0,
    coinMin: data.coinMin,
    coinMax: data.coinMax,
    kind: kind,
  };
}

// 戦闘を始める
function startBattle(enemy) {
  state.enemy = enemy;

  // 山札をシャッフルして用意する。筋力は戦闘ごとにリセット
  state.drawPile = shuffle(state.deck);
  state.hand = [];
  state.discardPile = [];
  state.player.block = 0;
  state.player.strength = 0;

  clearLog();
  addLog(`${NODE_INFO[enemy.kind === "battle" ? "battle" : enemy.kind].icon} ${enemy.name} が立ちはだかる！`);
  startPlayerTurn();
}

function startPlayerTurn() {
  state.player.block = 0; // ブロックはターンをまたぐと消える
  state.player.energy = state.player.maxEnergy;
  drawCards(5);
  state.busy = false;
  renderAll();
}

// 山札からカードを引く。山札が尽きたら捨て札を混ぜ直す
function drawCards(count) {
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) {
      if (state.discardPile.length === 0) break; // どこにもカードがない
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      addLog("🔄 捨て札を混ぜて山札に戻した。");
    }
    state.hand.push(state.drawPile.pop());
  }
}

// 手札のカードをクリックしたときに呼ばれる
function playCard(handIndex) {
  if (state.busy) return; // 敵の行動中は操作できない

  const cardId = state.hand[handIndex];
  const card = CARD_LIBRARY[cardId];

  if (state.player.energy < card.cost) {
    addLog("⚠️ エナジーが足りない！");
    renderAll();
    return;
  }

  state.player.energy -= card.cost;
  addLog(`🃏 「${card.name}」を使った。`);

  // ----- カードの効果を順番に適用する -----
  const effects = card.effects;

  if (effects.damage) {
    const hits = effects.hits || 1;
    const damagePerHit = effects.damage + state.player.strength;
    animatePlayerAttack();
    for (let i = 0; i < hits; i++) {
      damageEnemy(damagePerHit);
    }
  }
  if (effects.block) {
    state.player.block += effects.block;
    addLog(`🛡️ ブロックを ${effects.block} 得た。`);
    spawnPopup("player-area", `🛡️+${effects.block}`, "popup-block");
  }
  if (effects.heal) {
    const healed = healPlayer(effects.heal);
    addLog(`💚 HPを ${healed} 回復した。`);
    spawnPopup("player-area", `+${healed}`, "popup-heal");
  }
  if (effects.strength) {
    state.player.strength += effects.strength;
    addLog(`💪 筋力が ${effects.strength} 上がった！（合計 ${state.player.strength}）`);
    spawnPopup("player-area", `💪+${effects.strength}`, "popup-buff");
  }
  if (effects.draw) {
    drawCards(effects.draw);
  }

  // 使ったカードは手札から捨て札へ
  state.hand.splice(handIndex, 1);
  state.discardPile.push(cardId);

  renderAll();
  checkEnemyDefeated();
}

// 敵にダメージを与える（ブロックが先に削れる）
function damageEnemy(amount) {
  const enemy = state.enemy;
  const blocked = Math.min(enemy.block, amount);
  enemy.block -= blocked;
  const damage = amount - blocked;
  enemy.hp = Math.max(0, enemy.hp - damage);

  if (blocked > 0) {
    addLog(`⚔️ ${damage} ダメージ！（${blocked} はブロックされた）`);
  } else {
    addLog(`⚔️ ${damage} ダメージ！`);
  }
  spawnSlashEffect();
  spawnPopup("enemy-area", `-${damage}`, "popup-damage");
  shakeElement(document.getElementById("enemy-figure"));
}

// 「ターン終了」ボタンを押したときに呼ばれる
async function endTurn() {
  if (state.busy) return;
  state.busy = true;
  const runId = state.runId; // やり直し後に古い処理が動かないよう覚えておく

  // 手札を全部捨てる
  state.discardPile.push(...state.hand);
  state.hand = [];
  renderAll();

  await wait(600);
  if (runId !== state.runId) return;
  enemyAct();
  renderAll();

  // 敵の攻撃でプレイヤーが倒れたかどうか
  if (state.player.hp <= 0) {
    await wait(800);
    if (runId !== state.runId) return;
    showResult(false);
    return;
  }

  await wait(600);
  if (runId !== state.runId) return;
  startPlayerTurn();
}

// 敵が予告どおりの行動をとる
function enemyAct() {
  const enemy = state.enemy;
  enemy.block = 0; // 敵のブロックも自分の行動前に消える

  const intent = enemy.pattern[enemy.patternIndex];

  if (intent.type === "attack") {
    animateEnemyAttack();
    const amount = intent.value + enemy.strength;
    const blocked = Math.min(state.player.block, amount);
    state.player.block -= blocked;
    const damage = amount - blocked;
    state.player.hp = Math.max(0, state.player.hp - damage);

    if (blocked > 0) {
      addLog(`💥 ${enemy.name} の攻撃！ ${damage} ダメージ（${blocked} はブロックした）`);
    } else {
      addLog(`💥 ${enemy.name} の攻撃！ ${damage} ダメージを受けた！`);
    }
    spawnPopup("player-area", `-${damage}`, "popup-damage");
    if (damage > 0) {
      shakeElement(document.getElementById("player-figure"));
    }
  } else if (intent.type === "defend") {
    enemy.block += intent.value;
    addLog(`🛡️ ${enemy.name} は身を固めた。（ブロック ${intent.value}）`);
    spawnPopup("enemy-area", `🛡️+${intent.value}`, "popup-block");
  } else if (intent.type === "buff") {
    enemy.strength += intent.value;
    addLog(`💢 ${enemy.name} の力が増している……！（筋力 +${intent.value}）`);
    spawnPopup("enemy-area", `💪+${intent.value}`, "popup-buff");
  }

  // 次の行動へ進める（最後まで行ったら最初に戻る）
  enemy.patternIndex = (enemy.patternIndex + 1) % enemy.pattern.length;
}

/* =========================
   10. 勝敗の判定と報酬・ガチャ
   ========================= */

// 敵を倒したかチェックする
async function checkEnemyDefeated() {
  if (state.enemy.hp > 0) return;

  state.busy = true;
  const runId = state.runId;
  addLog(`🏆 ${state.enemy.name} を倒した！`);

  // ガチャコインのドロップ
  const droppedCoins = randomInt(state.enemy.coinMin, state.enemy.coinMax);
  gainCoins(droppedCoins);
  addLog(`🪙 ガチャコインを ${droppedCoins} 枚手に入れた！`);

  renderAll();
  await wait(900);
  if (runId !== state.runId) return;

  if (state.enemy.kind === "boss") {
    showResult(true); // 魔王を倒したらクリア
  } else {
    const healed = healPlayer(HEAL_AFTER_BATTLE);
    if (healed > 0) addLog(`💚 ひと息ついてHPが ${healed} 回復した。`);
    showReward();
  }
}

// 報酬画面を開く：報酬プールからランダムに3枚選ぶ
function showReward() {
  const choices = shuffle(REWARD_POOL).slice(0, 3);
  const container = document.getElementById("reward-cards");
  container.innerHTML = "";

  choices.forEach((cardId) => {
    const cardElement = createCardElement(cardId);
    cardElement.addEventListener("click", () => takeReward(cardId));
    container.appendChild(cardElement);
  });

  updateRewardGachaArea();
  showOverlay("reward-screen");
}

// 報酬カードを選んだ（デッキに追加してマップへ）
function takeReward(cardId) {
  state.deck.push(cardId);
  finishReward();
}

// 報酬画面を閉じてマップ選択へ進む
function finishReward() {
  hideOverlay("reward-screen");
  showMap();
}

/* ----- ガチャ ----- */

// 報酬画面のコイン表示とガチャボタンの状態を更新する
function updateRewardGachaArea() {
  document.getElementById("reward-coin-text").textContent =
    `🪙 所持コイン：${state.coins}`;
  document.getElementById("gacha-button").disabled = state.coins < GACHA_COST;
  renderTopBar();
}

// 重み付き抽選でレアリティを1つ決める
function rollGachaRarity() {
  const rarityIds = Object.keys(RARITY_TABLE);
  const totalWeight = rarityIds.reduce(
    (sum, id) => sum + RARITY_TABLE[id].weight, 0
  );
  let roll = Math.random() * totalWeight;
  for (const id of rarityIds) {
    roll -= RARITY_TABLE[id].weight;
    if (roll < 0) return id;
  }
  return rarityIds[0]; // 念のための保険（通常ここには来ない）
}

// ガチャを1回引く（コイン消費 → レアリティ抽選 → カード抽選）
function pullGacha() {
  if (state.coins < GACHA_COST) return; // コイン不足なら引けない

  state.coins -= GACHA_COST;
  const rarity = rollGachaRarity();

  // そのレアリティのカードの中からランダムに1枚
  const pool = Object.keys(CARD_LIBRARY).filter(
    (id) => CARD_LIBRARY[id].rarity === rarity
  );
  const cardId = pool[Math.floor(Math.random() * pool.length)];

  state.deck.push(cardId); // 引いたカードはデッキに追加
  showGachaResult(cardId);
}

// ガチャ結果画面を表示する
function showGachaResult(cardId) {
  const card = CARD_LIBRARY[cardId];

  const label = document.getElementById("gacha-rarity-label");
  label.textContent = `✦ ${RARITY_TABLE[card.rarity].label} ✦`;
  label.className = `rarity-${card.rarity}`;

  const cardHolder = document.getElementById("gacha-card");
  cardHolder.innerHTML = "";
  cardHolder.appendChild(createCardElement(cardId));

  document.getElementById("gacha-coin-text").textContent =
    `🪙 残りコイン：${state.coins}`;
  document.getElementById("gacha-again-button").disabled =
    state.coins < GACHA_COST;

  showOverlay("gacha-screen");
  renderTopBar();
}

// ガチャ結果画面を閉じて報酬画面に戻る
function closeGachaResult() {
  hideOverlay("gacha-screen");
  updateRewardGachaArea();
}

/* ----- 結果（クリア / ゲームオーバー） ----- */
function showResult(isVictory) {
  const title = document.getElementById("result-title");
  const text = document.getElementById("result-text");

  if (isVictory) {
    title.textContent = "🎉 塔を制覇した！";
    title.classList.add("victory");
    text.textContent = "深淵の魔王は崩れ落ち、塔に朝日が差し込んだ。";
  } else {
    title.textContent = "💀 GAME OVER";
    title.classList.remove("victory");
    text.textContent = "騎士は深淵に呑まれた……だが挑戦は終わらない。";
  }
  document.getElementById("result-stats").textContent =
    `🗼 到達：第${state.floor}層 ／ 🪙 集めたコイン：${state.totalCoinsEarned} 枚`;
  showOverlay("result-screen");
}

/* =========================
   11. 休憩所とイベント
   -------------------------
   どちらも共通の「ノード画面」を使う：
   選択肢を選ぶ → 結果の文章を表示 → 「進む」でマップへ
   ========================= */

// ノード画面を組み立てて表示する
function openNodeScreen(title, desc, choices) {
  document.getElementById("node-title").textContent = title;
  document.getElementById("node-desc").textContent = desc;

  const container = document.getElementById("node-choices");
  container.innerHTML = "";
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "node-choice-button";
    button.textContent = choice.label;
    button.addEventListener("click", () => {
      const resultText = choice.effect();
      // 選択肢を消して結果と「進む」ボタンを出す
      container.classList.add("hidden");
      const resultElement = document.getElementById("node-result");
      resultElement.textContent = resultText;
      resultElement.classList.remove("hidden");
      document.getElementById("node-continue-button").classList.remove("hidden");
      renderTopBar();
    });
    container.appendChild(button);
  });

  container.classList.remove("hidden");
  document.getElementById("node-result").classList.add("hidden");
  document.getElementById("node-continue-button").classList.add("hidden");
  showOverlay("node-screen");
}

// ノード画面の「進む」→ マップ選択へ
function leaveNodeScreen() {
  hideOverlay("node-screen");
  showMap();
}

// 休憩所
function showRest() {
  openNodeScreen("🔥 休憩所", "焚き火の暖かさが体を包む。どう過ごす？", [
    {
      label: "🛌 休む（HPを25回復）",
      effect() {
        const healed = healPlayer(25);
        return `ぐっすり眠った。HPが ${healed} 回復した。`;
      },
    },
    {
      label: "💪 鍛錬する（最大HP+6）",
      effect() {
        state.player.maxHp += 6;
        state.player.hp += 6;
        return "ひたすら剣を振った。最大HPが 6 増えた！";
      },
    },
  ]);
}

// イベント（ランダムに1つ選ばれる）
function showEvent() {
  const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  openNodeScreen(event.title, event.desc, event.choices);
}

/* =========================
   12. 戦闘演出
   ========================= */

// 要素を一瞬揺らす（被ダメージ演出）
function shakeElement(element) {
  element.classList.remove("shake");
  // 連続で揺らせるように、一度クラスを外してから付け直す
  void element.offsetWidth;
  element.classList.add("shake");
}

// プレイヤーが敵に向かって踏み込む
function animatePlayerAttack() {
  const figure = document.getElementById("player-figure");
  figure.classList.remove("lunge-right");
  void figure.offsetWidth;
  figure.classList.add("lunge-right");
}

// 敵がプレイヤーに向かって踏み込む
function animateEnemyAttack() {
  const figure = document.getElementById("enemy-figure");
  figure.classList.remove("lunge-left");
  void figure.offsetWidth;
  figure.classList.add("lunge-left");
}

// 敵の上に白い斬撃の軌跡を走らせる
function spawnSlashEffect() {
  const area = document.getElementById("enemy-area");
  const slash = document.createElement("div");
  slash.className = "slash-fx";
  area.appendChild(slash);
  setTimeout(() => slash.remove(), 350);
}

// ダメージや回復の数字をふわっと浮かせる
function spawnPopup(areaId, text, className) {
  const area = document.getElementById(areaId);
  const popup = document.createElement("span");
  popup.className = `damage-popup ${className}`;
  popup.textContent = text;
  popup.style.left = `${30 + Math.random() * 40}%`;
  area.appendChild(popup);
  setTimeout(() => popup.remove(), 900);
}

/* =========================
   13. 画面の描画
   ========================= */

// 画面全体を最新の state に合わせて描き直す
function renderAll() {
  renderPlayer();
  renderEnemy();
  renderHand();
  renderTopBar();
}

function renderPlayer() {
  const player = state.player;
  const hpPercent = (player.hp / player.maxHp) * 100;
  document.getElementById("player-hp-fill").style.width = hpPercent + "%";
  document.getElementById("player-hp-text").textContent =
    `${player.hp} / ${player.maxHp}`;

  renderBadge("player-block", "🛡️", player.block);
  renderBadge("player-strength", "💪", player.strength);

  document.getElementById("energy-text").textContent =
    `${player.energy}/${player.maxEnergy}`;
}

function renderEnemy() {
  const enemy = state.enemy;
  if (!enemy) return;

  const figure = document.getElementById("enemy-figure");
  if (!figure.dataset.art || figure.dataset.art !== enemy.art) {
    figure.innerHTML = ART[enemy.art];
    figure.dataset.art = enemy.art;
  }
  figure.classList.toggle("boss", enemy.kind === "boss");

  document.getElementById("enemy-name").textContent =
    (enemy.kind === "elite" ? "💀 " : "") + enemy.name;

  const hpPercent = (enemy.hp / enemy.maxHp) * 100;
  document.getElementById("enemy-hp-fill").style.width = hpPercent + "%";
  document.getElementById("enemy-hp-text").textContent =
    `${enemy.hp} / ${enemy.maxHp}`;

  renderBadge("enemy-block", "🛡️", enemy.block);
  renderBadge("enemy-strength", "💪", enemy.strength);

  // 行動予告の表示
  const intentElement = document.getElementById("enemy-intent");
  const intent = enemy.pattern[enemy.patternIndex];
  if (enemy.hp <= 0) {
    intentElement.textContent = "💀";
  } else if (intent.type === "attack") {
    intentElement.textContent = `⚔️ ${intent.value + enemy.strength}`;
    intentElement.className = "intent intent-attack";
  } else if (intent.type === "defend") {
    intentElement.textContent = "🛡️ 防御";
    intentElement.className = "intent intent-defend";
  } else {
    intentElement.textContent = "💢 強化";
    intentElement.className = "intent intent-buff";
  }
}

// ブロックや筋力のバッジ表示（0のときは隠す）
function renderBadge(elementId, icon, value) {
  const element = document.getElementById(elementId);
  if (value > 0) {
    element.textContent = `${icon} ${value}`;
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

function renderHand() {
  const handElement = document.getElementById("hand");
  handElement.innerHTML = "";

  state.hand.forEach((cardId, index) => {
    const cardElement = createCardElement(cardId);

    // エナジー不足のカードは暗く表示する
    if (CARD_LIBRARY[cardId].cost > state.player.energy) {
      cardElement.classList.add("unplayable");
    }
    cardElement.addEventListener("click", () => playCard(index));
    handElement.appendChild(cardElement);
  });
}

// カード1枚分のHTML要素を作る（手札・報酬・ガチャで共用）
function createCardElement(cardId) {
  const card = CARD_LIBRARY[cardId];
  const element = document.createElement("div");
  element.className = `card card-${card.type}`;

  const typeLabel =
    card.type === "attack" ? "攻撃" :
    card.type === "defense" ? "防御" : "強化";

  element.innerHTML = `
    <div class="card-cost">${card.cost}</div>
    <div class="card-icon">${card.icon}</div>
    <div class="card-name">${card.name}</div>
    <div class="card-rarity rarity-${card.rarity}">${RARITY_TABLE[card.rarity].label}</div>
    <div class="card-text">${buildCardText(card)}</div>
    <div class="card-type">${typeLabel}</div>
  `;
  return element;
}

// カードの説明文を効果データから組み立てる（筋力を反映した数値で表示）
function buildCardText(card) {
  const parts = [];
  const effects = card.effects;

  if (effects.damage) {
    const damage = effects.damage + state.player.strength;
    if (effects.hits) {
      parts.push(`${damage}ダメージ×${effects.hits}回`);
    } else {
      parts.push(`${damage}ダメージ`);
    }
  }
  if (effects.block) parts.push(`ブロック+${effects.block}`);
  if (effects.heal) parts.push(`HP回復+${effects.heal}`);
  if (effects.strength) parts.push(`筋力+${effects.strength}（この戦闘中）`);
  if (effects.draw) parts.push(`${effects.draw}枚ドロー`);

  return parts.join("、");
}

function renderTopBar() {
  document.getElementById("floor-info").textContent =
    `🗼 第 ${state.floor} 層 / ${TOTAL_FLOORS}`;
  document.getElementById("coin-info").textContent = `🪙 ${state.coins}`;
  document.getElementById("pile-info").textContent =
    `山札 ${state.drawPile.length} ｜ 捨て札 ${state.discardPile.length}`;
}

/* ----- バトルログ ----- */
function addLog(message) {
  const logElement = document.getElementById("log");
  const line = document.createElement("p");
  line.textContent = message;
  logElement.appendChild(line);
  logElement.scrollTop = logElement.scrollHeight; // 常に最新行を表示
}

function clearLog() {
  document.getElementById("log").innerHTML = "";
}

/* =========================
   14. ボタンとキー入力
   ========================= */
document.getElementById("start-button").addEventListener("click", startGame);
document.getElementById("end-turn-button").addEventListener("click", endTurn);
document.getElementById("skip-reward-button").addEventListener("click", finishReward);
document.getElementById("restart-button").addEventListener("click", startGame);
document.getElementById("gacha-button").addEventListener("click", pullGacha);
document.getElementById("gacha-again-button").addEventListener("click", pullGacha);
document.getElementById("gacha-close-button").addEventListener("click", closeGachaResult);
document.getElementById("node-continue-button").addEventListener("click", leaveNodeScreen);

/* ----- ポーズメニュー（ESCキー） ----- */
function togglePause() {
  // タイトル画面ではポーズしない
  if (!document.getElementById("title-screen").classList.contains("hidden")) return;
  document.getElementById("pause-screen").classList.toggle("hidden");
}

function backToTitle() {
  state.runId++; // 進行中の処理を止める
  hideAllOverlays();
  document.getElementById("game-screen").classList.add("hidden");
  showOverlay("title-screen");
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") togglePause();
});

document.getElementById("resume-button").addEventListener("click", togglePause);
document.getElementById("retry-button").addEventListener("click", startGame);
document.getElementById("to-title-button").addEventListener("click", backToTitle);
