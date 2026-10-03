/* ==========================================================
   TYPING MASTER — SCRIPT
   100% offline. No frameworks, no external libraries.
   ========================================================== */

'use strict';

/* ============================================================
   1. STORAGE
   ============================================================ */
class Storage {
  static KEY = 'typingMasterProgressV1';

  static defaultData() {
    return {
      settings: {
        theme: 'dark', animations: true, sound: true,
        fontSize: 22, typingFont: 'mono', paragraphLength: 'medium',
        keyboardLayout: 'qwerty', timerDuration: 60
      },
      profile: { username: 'Typist', avatar: '🧑‍💻' },
      unlockedLevels: 1,
      levelStars: {},           // levelIndex -> stars (1-3)
      achievementsUnlocked: [], // ids
      totals: {
        testsCompleted: 0, charsTyped: 0, wordsTyped: 0,
        coins: 0, xp: 0, practiceSeconds: 0,
        bestWpm: 0, bestAccuracy: 0,
        currentStreak: 0, bestStreak: 0, lastPracticeDate: null,
        perfectTestsInRow: 0, perfectDatesSet: []
      },
      history: [],       // {date, wpm, acc, mode, level, mistakes, chars, words, pass}
      keyMistakes: {},   // key -> count
      practiceDates: {}  // 'YYYY-MM-DD' -> seconds practiced
    };
  }

  static load() {
    try {
      const raw = localStorage.getItem(Storage.KEY);
      if (!raw) return Storage.defaultData();
      const parsed = JSON.parse(raw);
      // merge with defaults so new fields are never missing
      return Storage.deepMerge(Storage.defaultData(), parsed);
    } catch (e) {
      console.warn('Storage load failed, using defaults', e);
      return Storage.defaultData();
    }
  }

  static save(data) {
    try {
      localStorage.setItem(Storage.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage save failed', e);
    }
  }

  static deepMerge(base, override) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    for (const k in override) {
      if (override[k] && typeof override[k] === 'object' && !Array.isArray(override[k]) && base[k] && typeof base[k] === 'object') {
        out[k] = Storage.deepMerge(base[k], override[k]);
      } else {
        out[k] = override[k];
      }
    }
    return out;
  }
}

/* ============================================================
   2. STATIC DATA — LEVELS, RANKS, MODES, ACHIEVEMENTS
   ============================================================ */

const LEVELS = Array.from({ length: 25 }, (_, i) => ({
  index: i + 1,
  target: (i + 1) * 10
}));

const RANKS = [
  { name: 'Beginner', min: 0 }, { name: 'Learner', min: 15 },
  { name: 'Student', min: 30 }, { name: 'Intermediate', min: 45 },
  { name: 'Advanced', min: 60 }, { name: 'Professional', min: 80 },
  { name: 'Expert', min: 100 }, { name: 'Master', min: 125 },
  { name: 'Grandmaster', min: 150 }, { name: 'Legend', min: 200 },
  { name: 'Typing God', min: 250 }
];

function rankForWpm(wpm) {
  let r = RANKS[0];
  for (const rk of RANKS) if (wpm >= rk.min) r = rk;
  return r.name;
}

const MODES = [
  { id: 'classic', name: 'Classic', desc: 'Standard timed test at your chosen duration.', timed: true, category: 'mixed' },
  { id: 'timeattack', name: 'Time Attack', desc: 'A fast 30-second sprint. Every second counts.', timed: true, fixedDuration: 30, category: 'mixed' },
  { id: 'zen', name: 'Zen', desc: 'No timer, no pressure. Just type at your own pace.', timed: false, category: 'quotes' },
  { id: 'hardcore', name: 'Hardcore', desc: 'One mistake ends the test immediately.', timed: true, failOnMistake: true, category: 'mixed' },
  { id: 'randomwords', name: 'Random Words', desc: 'Loose words instead of full sentences.', timed: true, category: 'words' },
  { id: 'paragraph', name: 'Paragraph', desc: 'Full paragraphs of flowing prose.', timed: true, category: 'medium' },
  { id: 'quotes', name: 'Quotes', desc: 'Type well-known quotes.', timed: true, category: 'quotes' },
  { id: 'programming', name: 'Programming Code', desc: 'Real code snippets with symbols and syntax.', timed: true, category: 'programming' },
  { id: 'numbers', name: 'Numbers', desc: 'Numeric strings and figures.', timed: true, category: 'numbers' },
  { id: 'symbols', name: 'Symbols', desc: 'Punctuation and special characters.', timed: true, category: 'symbols' },
  { id: 'custom', name: 'Custom Text', desc: 'Paste in your own text to practice.', timed: true, category: 'custom' },
  { id: 'endless', name: 'Endless', desc: 'No timer, no end — stop whenever you like.', timed: false, category: 'mixed' }
];

/* -------- Paragraph bank, by category -------- */
const PARAGRAPHS = {
  easy: [
    "The cat sat on the mat and looked at the sun.",
    "I like to read books when it is raining outside.",
    "She walked to the store to buy some milk and bread.",
    "The dog ran fast across the green open field.",
    "We had a good time at the park on Sunday.",
    "He likes to draw pictures of trees and birds.",
    "The kids played games in the yard until dark.",
    "My mom cooks dinner every night for the family.",
    "The sun was warm and the sky was very blue.",
    "They went on a short walk near the quiet lake."
  ],
  medium: [
    "Typing quickly is a skill that improves steadily with regular, focused practice over time.",
    "The library was quiet except for the soft rustle of pages turning one after another.",
    "A balanced diet, consistent sleep, and daily movement all contribute to long term wellbeing.",
    "Learning a new language requires patience, repetition, and a genuine curiosity about how people think.",
    "The old bridge creaked under the weight of the truck as it slowly crossed the river.",
    "Effective communication depends less on vocabulary and more on clarity, timing, and attentive listening.",
    "The scientist recorded her observations carefully, knowing that small details often reveal the larger picture.",
    "Traveling to unfamiliar places teaches you to notice things you would otherwise take for granted.",
    "The orchestra tuned their instruments quietly while the audience settled into their seats.",
    "Good habits compound slowly, so the real reward often shows up much later than expected."
  ],
  hard: [
    "Notwithstanding the ostensibly straightforward premise, the underlying architecture proved considerably more convoluted than anticipated.",
    "The juxtaposition of contradictory evidence forced the committee to reconsider its previously unshakeable conclusions.",
    "Her meticulous, almost obsessive attention to procedural minutiae ultimately safeguarded the integrity of the experiment.",
    "The bureaucratic labyrinth of overlapping jurisdictions rendered even the simplest regulatory approval maddeningly slow.",
    "Quantum entanglement defies classical intuition, suggesting correlations that persist irrespective of spatial separation.",
    "The philosopher's argument, though internally consistent, rested on premises that were themselves highly contestable.",
    "Reconciling divergent stakeholder incentives required a negotiation strategy that was simultaneously firm and conciliatory.",
    "The manuscript's marginalia revealed an unexpectedly rigorous engagement with contemporaneous scientific controversies.",
    "Institutional inertia, more than any deliberate malice, explained the organization's sluggish response to crisis.",
    "The cryptographer's proof hinged on an elegant but nonobvious reduction to a well known computational problem."
  ],
  extreme: [
    "Pseudopseudohypoparathyroidism, juxtaposed against idiosyncratic epistemological frameworks, exemplifies the ne plus ultra of terminological obfuscation.",
    "The antidisestablishmentarian's incommensurable worldview precipitated an irreconcilable schism within the ecclesiastical hierarchy.",
    "Floccinaucinihilipilification of trivial pursuits belies a deeper, almost sesquipedalian anxiety about intellectual legitimacy.",
    "Her Weltanschauung, deeply entrenched in post-structuralist deconstructionism, resisted any facile categorization whatsoever.",
    "The thermodynamically improbable configuration nonetheless satisfied every boundary condition stipulated by the eigenvalue problem.",
    "Counterintuitively, the hyperparameter's nonmonotonic relationship with generalization error confounded even seasoned practitioners.",
    "The palimpsest's undecipherable substratum hinted at a proto-orthographic system predating known Mesopotamian cuneiform.",
    "Epistemologically speaking, the incommensurability thesis undermines any straightforward comparison across paradigmatic frameworks.",
    "The syzygy's gravitational perturbation induced a quasi-periodic librational oscillation in the trojan asteroid's orbit.",
    "Antidisestablishmentarianism notwithstanding, the disestablishmentarians' rhetoric grew increasingly vituperative and uncompromising."
  ],
  programming: [
    "function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }",
    "const sum = arr.reduce((acc, val) => acc + val, 0); console.log(sum);",
    "for (let i = 0; i < items.length; i++) { console.log(items[i].name); }",
    "class Node { constructor(value) { this.value = value; this.next = null; } }",
    "if (user && user.isActive && !user.isBanned) { grantAccess(user.id); }",
    "const data = await fetch(url).then(res => res.json()).catch(err => null);",
    "def quicksort(arr): return arr if len(arr) <= 1 else quicksort([x for x in arr[1:] if x < arr[0]]) + [arr[0]] + quicksort([x for x in arr[1:] if x >= arr[0]])",
    "SELECT name, COUNT(*) as total FROM orders GROUP BY name ORDER BY total DESC LIMIT 10;",
    "public static int binarySearch(int[] arr, int target) { int lo = 0, hi = arr.length - 1; }",
    "let obj = { a: 1, b: 2, ...spread }; const { a, ...rest } = obj; console.log(rest);"
  ],
  quotes: [
    "The only way to do great work is to love what you do.",
    "In the middle of difficulty lies opportunity.",
    "It does not matter how slowly you go as long as you do not stop.",
    "The journey of a thousand miles begins with a single step.",
    "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    "Whether you think you can or you think you cannot, you are right.",
    "The best way to predict the future is to create it.",
    "Believe you can and you are halfway there.",
    "Do not watch the clock; do what it does, keep going.",
    "Everything you can imagine is real in some form or another."
  ],
  numbers: [
    "3 14159 26535 89793 23846 26433 83279 50288",
    "1 2 3 5 8 13 21 34 55 89 144 233 377 610",
    "42 17 99 3 256 1024 65536 2048 512 128",
    "2024 1999 1776 2001 1945 1969 2020 1492",
    "100 200 300 400 500 600 700 800 900 1000",
    "7 14 21 28 35 42 49 56 63 70 77 84 91 98",
    "0 1 1 2 3 5 8 13 21 34 55 89 144",
    "9876543210 1234567890 5647382910",
    "3.14 2.71 1.41 1.61 0.577 6.022",
    "10 100 1000 10000 100000 1000000"
  ],
  symbols: [
    "!@#$%^&*()_+-=[]{}|;:',.<>/?`~",
    "user@example.com => (a && b) || !c;",
    "{ \"key\": \"value\", \"arr\": [1,2,3] }",
    "<div class=\"box\">Hello, World!</div>",
    "price: $19.99 | discount: -15% | total: $16.99",
    "a+b=c; x-y=z; m*n=p; q/r=s;",
    "#hashtag @mention *bold* _italic_ ~strike~",
    "if (x >= 10 && x <= 20) { return true; }",
    "path/to/file.txt -> ../other/dir/file2.txt",
    "SELECT * FROM users WHERE age > 18 AND active = 1;"
  ],
  words: [
    "time person year way day thing man world life hand part",
    "child eye woman place work week case point government",
    "company number group problem fact water room mother area",
    "money story fact month lot right study book eye job",
    "word business issue side kind head house service friend",
    "father power hour game line end member law car city",
    "community name president team minute idea body information",
    "back parent face others level office door health person",
    "art war history party result change morning reason light",
    "value area money week area company system record center"
  ],
  custom: []
};

/* -------- Achievement generation -------- */
function buildAchievements() {
  const list = [];
  const add = (id, icon, title, desc, cond) => list.push({ id, icon, title, desc, cond, unlocked: false });

  // WPM milestones
  [10, 25, 50, 75, 100, 125, 150, 175, 200, 225, 250].forEach(w => {
    add(`wpm_${w}`, '⚡', `${w} WPM`, `Reach a top speed of ${w} words per minute.`, s => s.totals.bestWpm >= w);
  });

  // Tests completed
  [1, 10, 50, 100, 500, 1000, 5000].forEach(n => {
    add(`tests_${n}`, '📝', n === 1 ? 'First Test' : `${n} Tests`, `Complete ${n} typing ${n === 1 ? 'test' : 'tests'}.`, s => s.totals.testsCompleted >= n);
  });

  // Characters typed
  [1000, 10000, 100000, 500000, 1000000].forEach(n => {
    const label = n >= 1000000 ? 'Million Characters' : `${n.toLocaleString()} Characters`;
    add(`chars_${n}`, '🔤', label, `Type a cumulative total of ${n.toLocaleString()} characters.`, s => s.totals.charsTyped >= n);
  });

  // Words typed
  [500, 5000, 50000, 200000].forEach(n => {
    add(`words_${n}`, '📖', `${n.toLocaleString()} Words`, `Type a cumulative total of ${n.toLocaleString()} words.`, s => s.totals.wordsTyped >= n);
  });

  // Accuracy specials
  add('perfect_1', '🎯', 'Perfect Accuracy', 'Complete a test with 100% accuracy.', s => s.totals.bestAccuracy >= 100);
  add('perfect_5', '🎯', 'Sharp Shooter', 'Score 100% accuracy five tests in a row.', s => s.totals.perfectTestsInRow >= 5);
  add('perfect_week', '📅', 'Perfect Week', 'Score a perfect test on 7 different days.', s => s.totals.perfectDatesSet.length >= 7);

  // Streaks
  [3, 7, 14, 30, 100].forEach(n => {
    add(`streak_${n}`, '🔥', `${n}-Day Streak`, `Practice for ${n} consecutive days.`, s => s.totals.bestStreak >= n);
  });

  // Levels completed
  [5, 10, 15, 20, 25].forEach(n => {
    add(`levels_${n}`, '🏁', n === 25 ? 'Typing Legend' : `${n} Levels Cleared`, n === 25 ? 'Clear all 25 levels.' : `Clear ${n} levels.`, s => (s.unlockedLevels - 1) >= n);
  });

  // Mode exploration
  MODES.forEach(m => {
    add(`mode_${m.id}`, '◆', `Tried ${m.name}`, `Complete a test in ${m.name} mode.`, s => (s.modesPlayed || []).includes(m.id));
  });

  // Time-based
  [(60 * 60), (5 * 60 * 60), (20 * 60 * 60)].forEach((secs, i) => {
    const hrs = secs / 3600;
    add(`time_${hrs}`, '⏱', `${hrs}h Practiced`, `Accumulate ${hrs} hour(s) of practice time.`, s => s.totals.practiceSeconds >= secs);
  });

  // Rank unlocks
  RANKS.forEach(r => {
    if (r.min === 0) return;
    add(`rank_${r.name}`, '🎖', `Rank: ${r.name}`, `Reach the ${r.name} rank.`, s => s.totals.bestWpm >= r.min);
  });

  add('typing_god', '👑', 'Typing God', 'Reach the maximum rank and top speed of 250 WPM.', s => s.totals.bestWpm >= 250);

  return list;
}
const ACHIEVEMENTS = buildAchievements();

/* -------- Keyboard layout with finger mapping -------- */
// f = finger id: 1 left-pinky .. 4 left-index, 5 right-index .. 8 right-pinky, T = thumb
const KEY_ROWS = [
  [['`','1'],['1','1'],['2','2'],['3','3'],['4','4'],['5','4'],['6','5'],['7','5'],['8','6'],['9','7'],['0','8'],['-','8'],['=','8']],
];
// Simpler explicit layout definition (row, key, width, finger)
const KEYBOARD_LAYOUT = [
  [ {k:'`',w:1,f:1}, {k:'1',w:1,f:1}, {k:'2',w:1,f:2}, {k:'3',w:1,f:3}, {k:'4',w:1,f:4}, {k:'5',w:1,f:4},
    {k:'6',w:1,f:5}, {k:'7',w:1,f:5}, {k:'8',w:1,f:6}, {k:'9',w:1,f:7}, {k:'0',w:1,f:8}, {k:'-',w:1,f:8}, {k:'=',w:1,f:8}, {k:'Backspace',w:2,f:8,label:'⌫'} ],
  [ {k:'Tab',w:1.5,f:1,label:'Tab'}, {k:'q',w:1,f:1}, {k:'w',w:1,f:2}, {k:'e',w:1,f:3}, {k:'r',w:1,f:4}, {k:'t',w:1,f:4},
    {k:'y',w:1,f:5}, {k:'u',w:1,f:5}, {k:'i',w:1,f:6}, {k:'o',w:1,f:7}, {k:'p',w:1,f:8}, {k:'[',w:1,f:8}, {k:']',w:1,f:8}, {k:'\\',w:1.5,f:8} ],
  [ {k:'CapsLock',w:1.75,f:1,label:'Caps'}, {k:'a',w:1,f:1}, {k:'s',w:1,f:2}, {k:'d',w:1,f:3}, {k:'f',w:1,f:4}, {k:'g',w:1,f:4},
    {k:'h',w:1,f:5}, {k:'j',w:1,f:5}, {k:'k',w:1,f:6}, {k:'l',w:1,f:7}, {k:';',w:1,f:8}, {k:'\'',w:1,f:8}, {k:'Enter',w:2.25,f:8,label:'Enter'} ],
  [ {k:'Shift',w:2.25,f:1,label:'Shift',side:'left'}, {k:'z',w:1,f:1}, {k:'x',w:1,f:2}, {k:'c',w:1,f:3}, {k:'v',w:1,f:4}, {k:'b',w:1,f:4},
    {k:'n',w:1,f:5}, {k:'m',w:1,f:5}, {k:',',w:1,f:6}, {k:'.',w:1,f:7}, {k:'/',w:1,f:8}, {k:'Shift',w:2.75,f:8,label:'Shift',side:'right'} ],
  [ {k:'Control',w:1.5,f:1,label:'Ctrl'}, {k:'Alt',w:1.5,f:1,label:'Alt'}, {k:' ',w:6.25,f:'T',label:'Space'}, {k:'Alt',w:1.5,f:8,label:'Alt'}, {k:'Control',w:1.5,f:8,label:'Ctrl'} ]
];
const FINGER_NAMES = {
  1: 'Left Pinky', 2: 'Left Ring', 3: 'Left Middle', 4: 'Left Index',
  5: 'Right Index', 6: 'Right Middle', 7: 'Right Ring', 8: 'Right Pinky', T: 'Thumb'
};

/* ============================================================
   3. SOUND MANAGER (Web Audio API — synthesized, no files)
   ============================================================ */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }
  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  tone(freq, dur, type = 'sine', vol = 0.08) {
    if (!this.enabled) return;
    this.ensureCtx();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  key() { this.tone(700, 0.03, 'square', 0.03); }
  correct() { this.tone(880, 0.05, 'sine', 0.05); }
  wrong() { this.tone(160, 0.09, 'sawtooth', 0.06); }
  success() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.08), i * 90)); }
  failure() { [300, 220, 140].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sawtooth', 0.07), i * 110)); }
  click() { this.tone(500, 0.04, 'square', 0.04); }
}

/* ============================================================
   4. PARTICLE BACKGROUND (Canvas)
   ============================================================ */
class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = true;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles();
    requestAnimationFrame(() => this.loop());
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  initParticles() {
    const count = Math.min(70, Math.floor((window.innerWidth * window.innerHeight) / 18000));
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      r: Math.random() * 2 + 0.6,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      hue: Math.random() > 0.5 ? '62,197,255' : '168,85,247',
      a: Math.random() * 0.5 + 0.2
    }));
  }
  loop() {
    if (this.running) this.draw();
    requestAnimationFrame(() => this.loop());
  }
  draw() {
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.hue},${p.a})`;
      ctx.fill();
    }
    // faint connecting lines for nearby particles
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i], b = this.particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.strokeStyle = `rgba(120,150,255,${0.06 * (1 - dist / 110)})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
  }
  setEnabled(on) { this.running = on; if (!on) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); }
}

/* ============================================================
   5. MAIN APPLICATION
   ============================================================ */
/* ============================================================
   4b. P2P RACE (WebRTC DataChannel, local network only, no servers)
   ============================================================ */
class P2PRace {
  constructor(onMessage, onOpen, onClose) {
    this.pc = null;
    this.channel = null;
    this.onMessage = onMessage;
    this.onOpenCb = onOpen;
    this.onCloseCb = onClose;
  }
  newConnection() {
    // No iceServers: connection stays entirely on the local network, no internet involved.
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.oniceconnectionstatechange = () => {
      const st = this.pc.iceConnectionState;
      if (st === 'disconnected' || st === 'failed' || st === 'closed') {
        if (this.onCloseCb) this.onCloseCb();
      }
    };
  }
  setupChannel(channel) {
    this.channel = channel;
    channel.onopen = () => this.onOpenCb && this.onOpenCb();
    channel.onclose = () => this.onCloseCb && this.onCloseCb();
    channel.onmessage = (e) => {
      try { this.onMessage(JSON.parse(e.data)); } catch (err) { /* ignore malformed */ }
    };
  }
  waitIceComplete() {
    if (this.pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise((resolve) => {
      const check = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      this.pc.addEventListener('icegatheringstatechange', check);
      setTimeout(resolve, 4000); // failsafe so a flaky network can't hang the UI forever
    });
  }
  async createHostOffer() {
    this.newConnection();
    const channel = this.pc.createDataChannel('race');
    this.setupChannel(channel);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitIceComplete();
    return JSON.stringify(this.pc.localDescription);
  }
  async acceptAnswer(answerStr) {
    const answer = JSON.parse(answerStr);
    await this.pc.setRemoteDescription(answer);
  }
  async createJoinAnswer(offerStr) {
    this.newConnection();
    this.pc.ondatachannel = (e) => this.setupChannel(e.channel);
    const offer = JSON.parse(offerStr);
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.waitIceComplete();
    return JSON.stringify(this.pc.localDescription);
  }
  send(obj) {
    if (this.channel && this.channel.readyState === 'open') this.channel.send(JSON.stringify(obj));
  }
  close() {
    if (this.channel) { try { this.channel.close(); } catch (e) {} }
    if (this.pc) { try { this.pc.close(); } catch (e) {} }
    this.channel = null; this.pc = null;
  }
}

class App {
  constructor() {
    this.data = Storage.load();
    this.sound = new SoundManager();
    this.sound.enabled = this.data.settings.sound;
    this.recentParagraphs = {}; // category -> array of recently used indices
    this.currentMode = null;
    this.currentLevel = null;
    this.test = null; // active test state
    this.pausedElapsed = 0;
    this.vs = this.createVsState(null, false); // 1v1 race state

    this.applySettingsToDOM();
    this.bindNav();
    this.bindSettings();
    this.bindProfile();
    this.bindTestControls();
    this.bindVsSetup();
    this.renderHome();
    this.renderLevels();
    this.renderModes();
    this.renderAchievements();
    this.renderProfile();

    const bgCanvas = document.getElementById('bg-canvas');
    this.particles = new ParticleBackground(bgCanvas);
    this.particles.setEnabled(this.data.settings.animations);
  }

  save() { Storage.save(this.data); }

  createVsState(p2p, isHost) {
    return {
      p2p,
      isHost,
      duration: 30,
      matchMode: 'timed',
      ruleset: 'standard',
      category: 'words',
      customText: '',
      text: '',
      charStates: [],
      pos: 0,
      correct: 0,
      wrongAttempts: 0,
      typed: 0,
      currentWrong: false,
      completedText: false,
      finished: false,
      lost: false,
      lossReason: '',
      ready: false,
      oppReady: false,
      oppFinished: false,
      oppLive: null,
      oppStats: null,
      myStats: null,
      startTime: null,
      endTime: null,
      timerInterval: null,
      disconnectTimer: null,
      _lastSend: 0,
      _lastWpm: 0
    };
  }

  /* ---------------- Navigation ---------------- */
  bindNav() {
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.rippleEffect(e);
        this.sound.click();
        const target = btn.dataset.nav;
        if (target === 'continue') { this.startContinue(); return; }
        if (target === 'vs-setup' && (!this.vs || !this.vs.p2p)) this.vsResetUI();
        this.goTo(target);
      });
    });
    document.getElementById('test-exit').addEventListener('click', () => this.quitTest());
  }
  rippleEffect(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ry', `${e.clientY - rect.top}px`);
    btn.classList.add('ripple');
    setTimeout(() => btn.classList.remove('ripple'), 300);
  }
  goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${screenId}`);
    if (el) el.classList.add('active');
    if (screenId === 'statistics') this.renderStatistics();
    if (screenId === 'achievements') this.renderAchievements();
    if (screenId === 'home') this.renderHome();
  }

  startContinue() {
    const lvl = this.data.unlockedLevels;
    this.startLevelTest(lvl);
  }

  /* ---------------- Home ---------------- */
  renderHome() {
    document.getElementById('home-rank').textContent = rankForWpm(this.data.totals.bestWpm);
    document.getElementById('home-best-wpm').textContent = this.data.totals.bestWpm;
    document.getElementById('home-level').textContent = this.data.unlockedLevels;
  }

  /* ---------------- Levels ---------------- */
  renderLevels() {
    const grid = document.getElementById('level-grid');
    grid.innerHTML = '';
    LEVELS.forEach(lv => {
      const unlocked = lv.index <= this.data.unlockedLevels;
      const cleared = lv.index < this.data.unlockedLevels;
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked ? '' : ' locked') + (cleared ? ' cleared' : '');
      const stars = this.data.levelStars[lv.index] || 0;
      card.innerHTML = `<div class="lc-num">${lv.index}</div><div class="lc-wpm">${lv.target} WPM</div><div class="lc-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>`;
      if (unlocked) card.addEventListener('click', () => this.startLevelTest(lv.index));
      grid.appendChild(card);
    });
  }

  /* ---------------- Modes ---------------- */
  renderModes() {
    const grid = document.getElementById('mode-grid');
    grid.innerHTML = '';
    MODES.forEach(m => {
      const card = document.createElement('div');
      card.className = 'mode-card';
      card.innerHTML = `<h4>${m.name}</h4><p>${m.desc}</p>`;
      card.addEventListener('click', () => this.startModeTest(m.id));
      grid.appendChild(card);
    });
  }

  /* ---------------- Achievements ---------------- */
  renderAchievements() {
    const grid = document.getElementById('achievement-grid');
    grid.innerHTML = '';
    let unlockedCount = 0;
    ACHIEVEMENTS.forEach(a => {
      const isUnlocked = this.data.achievementsUnlocked.includes(a.id);
      if (isUnlocked) unlockedCount++;
      const card = document.createElement('div');
      card.className = 'ach-card ' + (isUnlocked ? 'unlocked' : 'locked');
      card.innerHTML = `<div class="ach-icon">${a.icon}</div><div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div>`;
      grid.appendChild(card);
    });
    document.getElementById('ach-progress').textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
  }

  checkAchievements() {
    const newly = [];
    ACHIEVEMENTS.forEach(a => {
      if (!this.data.achievementsUnlocked.includes(a.id) && a.cond(this.data)) {
        this.data.achievementsUnlocked.push(a.id);
        newly.push(a);
      }
    });
    if (newly.length) this.save();
    return newly;
  }

  showAchievementPopups(list) {
    if (!list.length) return;
    let i = 0;
    const popup = document.getElementById('achievement-popup');
    const showNext = () => {
      if (i >= list.length) { popup.classList.add('hidden'); popup.classList.remove('show'); return; }
      const a = list[i++];
      document.getElementById('ap-title').textContent = `${a.icon} ${a.title}`;
      popup.classList.remove('hidden');
      popup.classList.add('show');
      this.sound.success();
      setTimeout(() => { popup.classList.remove('show'); setTimeout(showNext, 250); }, 2600);
    };
    showNext();
  }

  /* ---------------- Statistics ---------------- */
  renderStatistics() {
    const t = this.data.totals;
    const summary = document.getElementById('stats-summary');
    const items = [
      ['Tests', t.testsCompleted], ['Best WPM', t.bestWpm], ['Best Accuracy', `${t.bestAccuracy}%`],
      ['Chars Typed', t.charsTyped.toLocaleString()], ['Words Typed', t.wordsTyped.toLocaleString()],
      ['Coins', t.coins], ['XP', t.xp], ['Best Streak', `${t.bestStreak}d`],
      ['Practice Time', `${Math.round(t.practiceSeconds / 60)}m`]
    ];
    summary.innerHTML = items.map(([l, v]) => `<div class="ss-item"><div class="ss-val">${v}</div><div class="ss-lbl">${l}</div></div>`).join('');

    this.drawLineChart('chart-wpm', this.data.history.slice(-20).map(h => h.wpm), '#3ec5ff');
    this.drawLineChart('chart-acc', this.data.history.slice(-20).map(h => h.acc), '#a855f7', 100);
    this.drawHeatBar('chart-heat');
    this.drawCalendar('chart-cal');
  }

  drawLineChart(canvasId, values, color, fixedMax) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!values.length) {
      ctx.fillStyle = 'rgba(154,163,199,0.6)'; ctx.font = '13px sans-serif';
      ctx.fillText('No data yet — complete a test to see progress.', 14, h / 2);
      return;
    }
    const max = fixedMax || Math.max(...values, 10) * 1.15;
    const min = 0;
    const stepX = w / Math.max(values.length - 1, 1);
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / (max - min)) * (h - 20) - 10;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    // fill under line
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = color.replace(')', ',0.12)').replace('rgb', 'rgba');
    ctx.fillStyle = color + '22';
    ctx.fill();
    // points
    values.forEach((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / (max - min)) * (h - 20) - 10;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    });
  }

  drawHeatBar(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const entries = Object.entries(this.data.keyMistakes).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!entries.length) {
      ctx.fillStyle = 'rgba(154,163,199,0.6)'; ctx.font = '13px sans-serif';
      ctx.fillText('No mistakes recorded yet.', 14, h / 2);
      return;
    }
    const max = Math.max(...entries.map(e => e[1]));
    const barW = w / entries.length;
    entries.forEach(([key, count], i) => {
      const barH = (count / max) * (h - 40);
      const x = i * barW + barW * 0.15;
      const bw = barW * 0.7;
      const y = h - barH - 24;
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#ff5fd1'); grad.addColorStop(1, '#a855f7');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, bw, barH);
      ctx.fillStyle = 'rgba(238,242,255,0.8)'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
      ctx.fillText(key === ' ' ? '␣' : key, x + bw / 2, h - 8);
      ctx.fillText(String(count), x + bw / 2, y - 4);
    });
    ctx.textAlign = 'left';
  }

  drawCalendar(canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const days = 35;
    const cols = 7, rows = 5;
    const cellW = w / cols, cellH = h / rows;
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      const seconds = this.data.practiceDates[key] || 0;
      const col = i % cols, row = Math.floor(i / cols);
      const intensity = Math.min(1, seconds / 600);
      ctx.fillStyle = intensity === 0 ? 'rgba(255,255,255,0.05)' : `rgba(62,197,255,${0.2 + intensity * 0.7})`;
      ctx.fillRect(col * cellW + 3, row * cellH + 3, cellW - 6, cellH - 6);
    }
  }

  /* ---------------- Profile ---------------- */
  bindProfile() {
    const input = document.getElementById('profile-username');
    input.addEventListener('change', () => {
      this.data.profile.username = input.value.trim() || 'Typist';
      this.save();
    });
    const avatars = ['🧑‍💻','🧙','🦸','🥷','🤖','👾','🐱','🐼','🦁','🐸','🧑‍🚀','🧑‍🎤'];
    const picker = document.getElementById('avatar-picker');
    picker.innerHTML = avatars.map(a => `<button data-a="${a}">${a}</button>`).join('');
    picker.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        this.data.profile.avatar = b.dataset.a;
        this.save(); this.renderProfile();
      });
    });
  }
  renderProfile() {
    document.getElementById('profile-username').value = this.data.profile.username;
    document.getElementById('profile-avatar').textContent = this.data.profile.avatar;
    const rank = rankForWpm(this.data.totals.bestWpm);
    document.getElementById('profile-rank').textContent = rank;
    const t = this.data.totals;
    const items = [
      ['Best WPM', t.bestWpm], ['Best Accuracy', `${t.bestAccuracy}%`],
      ['Achievements', `${this.data.achievementsUnlocked.length}/${ACHIEVEMENTS.length}`],
      ['Practice Time', `${Math.round(t.practiceSeconds / 60)}m`],
      ['Levels Cleared', this.data.unlockedLevels - 1],
      ['Tests Completed', t.testsCompleted]
    ];
    document.getElementById('profile-grid').innerHTML = items.map(([l, v]) => `<div class="pg-item"><div class="pg-val">${v}</div><div class="pg-lbl">${l}</div></div>`).join('');
  }

  /* ---------------- Settings ---------------- */
  applySettingsToDOM() {
    const s = this.data.settings;
    document.documentElement.setAttribute('data-theme', s.theme);
    document.documentElement.style.setProperty('--type-size', s.fontSize + 'px');
    const fontMap = { mono: 'var(--font-mono)', sans: 'var(--font-ui)', serif: 'var(--font-serif)' };
    document.documentElement.style.setProperty('--type-font', fontMap[s.typingFont]);

    this.setSeg('set-theme', s.theme);
    this.setSeg('set-font', s.typingFont);
    this.setSeg('set-length', s.paragraphLength);
    this.setSeg('set-layout', s.keyboardLayout);
    this.setSeg('set-timer', String(s.timerDuration));
    document.getElementById('set-anim').checked = s.animations;
    document.getElementById('set-sound').checked = s.sound;
    document.getElementById('set-fontsize').value = s.fontSize;
  }
  setSeg(id, val) {
    const el = document.getElementById(id);
    el.querySelectorAll('button').forEach(b => b.classList.toggle('seg-on', b.dataset.val === val));
  }
  bindSettings() {
    const segGroups = ['set-theme', 'set-font', 'set-length', 'set-layout', 'set-timer'];
    const keyMap = { 'set-theme': 'theme', 'set-font': 'typingFont', 'set-length': 'paragraphLength', 'set-layout': 'keyboardLayout', 'set-timer': 'timerDuration' };
    segGroups.forEach(id => {
      document.getElementById(id).querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = keyMap[id];
          let val = btn.dataset.val;
          if (key === 'timerDuration') val = parseInt(val, 10);
          this.data.settings[key] = val;
          this.setSeg(id, btn.dataset.val);
          this.applySettingsToDOM();
          this.save();
          this.sound.click();
        });
      });
    });
    document.getElementById('set-anim').addEventListener('change', (e) => {
      this.data.settings.animations = e.target.checked;
      this.particles.setEnabled(e.target.checked);
      this.save();
    });
    document.getElementById('set-sound').addEventListener('change', (e) => {
      this.data.settings.sound = e.target.checked;
      this.sound.enabled = e.target.checked;
      this.save();
    });
    document.getElementById('set-fontsize').addEventListener('input', (e) => {
      this.data.settings.fontSize = parseInt(e.target.value, 10);
      document.documentElement.style.setProperty('--type-size', this.data.settings.fontSize + 'px');
      this.save();
    });

    document.getElementById('btn-export').addEventListener('click', () => this.exportProgress());
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', (e) => this.importProgress(e));
    document.getElementById('btn-reset-progress').addEventListener('click', () => {
      if (confirm('Reset ALL progress? This cannot be undone.')) {
        this.data = Storage.defaultData();
        this.save(); this.applySettingsToDOM(); this.renderHome(); this.renderLevels();
        this.renderAchievements(); this.renderProfile();
        this.toast('Progress reset.');
      }
    });
    document.getElementById('btn-reset-stats').addEventListener('click', () => {
      if (confirm('Reset statistics history only?')) {
        this.data.history = []; this.data.keyMistakes = {}; this.data.practiceDates = {};
        this.save(); this.toast('Statistics reset.');
      }
    });
  }
  exportProgress() {
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'typing-master-progress.json'; a.click();
    URL.revokeObjectURL(url);
    this.toast('Progress exported.');
  }
  importProgress(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        this.data = Storage.deepMerge(Storage.defaultData(), parsed);
        this.save();
        this.applySettingsToDOM(); this.renderHome(); this.renderLevels();
        this.renderAchievements(); this.renderProfile();
        this.toast('Progress imported.');
      } catch (err) {
        this.toast('Import failed: invalid file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  toast(msg) {
    const layer = document.getElementById('toast-layer');
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    layer.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ============================================================
     TYPING TEST ENGINE
     ============================================================ */
  categoryForLevel(index) {
    if (index <= 8) return 'easy';
    if (index <= 16) return 'medium';
    if (index <= 22) return 'hard';
    return 'extreme';
  }

  pickParagraph(category) {
    const pool = PARAGRAPHS[category] && PARAGRAPHS[category].length ? PARAGRAPHS[category] : PARAGRAPHS.medium;
    if (!this.recentParagraphs[category]) this.recentParagraphs[category] = [];
    const recent = this.recentParagraphs[category];
    let idx;
    let attempts = 0;
    do { idx = Math.floor(Math.random() * pool.length); attempts++; }
    while (recent.includes(idx) && attempts < 20 && pool.length > 3);
    recent.push(idx);
    if (recent.length > Math.min(5, pool.length - 1)) recent.shift();
    return pool[idx];
  }

  generateChunk(category, unitsWanted) {
    const shortCats = ['numbers', 'symbols', 'words'];
    const n = shortCats.includes(category) ? Math.max(3, unitsWanted) : Math.max(1, Math.round(unitsWanted / 3) || 1);
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(this.pickParagraph(category));
    return parts.join(' ');
  }

  lengthUnits() {
    const map = { short: 1, medium: 2, long: 3 };
    return map[this.data.settings.paragraphLength] || 2;
  }

  startLevelTest(levelIndex) {
    const level = LEVELS.find(l => l.index === levelIndex);
    if (!level) return;
    const category = this.categoryForLevel(levelIndex);
    this.beginTest({
      modeId: 'level', modeName: `Level ${levelIndex}`, category,
      timed: true, duration: this.data.settings.timerDuration,
      failOnMistake: false, levelIndex, targetWpm: level.target
    });
  }

  startModeTest(modeId) {
    const mode = MODES.find(m => m.id === modeId);
    if (!mode) return;
    let category = mode.category === 'mixed' ? ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] : mode.category;
    let customText = null;
    if (mode.id === 'custom') {
      const txt = window.prompt('Paste or type the custom text to practice:', '');
      customText = (txt && txt.trim().length > 5) ? txt.trim() : "The quick brown fox jumps over the lazy dog while the sun sets slowly behind the hills.";
    }
    this.beginTest({
      modeId: mode.id, modeName: mode.name, category,
      timed: mode.timed, duration: mode.fixedDuration || this.data.settings.timerDuration,
      failOnMistake: !!mode.failOnMistake, levelIndex: null, targetWpm: 0, customText
    });
  }

  beginTest(cfg) {
    const initialText = cfg.customText || this.generateChunk(cfg.category, this.lengthUnits() * 2);
    this.test = {
      cfg,
      text: initialText,
      charStates: new Array(initialText.length).fill(null),
      pos: 0,
      startTime: Date.now(),
      pausedAt: null,
      pausedDuration: 0,
      paused: false,
      finished: false,
      keyMistakeCounts: {},
      correctCount: 0,
      wrongCount: 0,
      timerInterval: null,
      lastWordBoundary: 0
    };
    document.getElementById('test-mode-label').textContent = cfg.modeName;
    document.getElementById('ls-level').textContent = cfg.levelIndex || '-';
    document.getElementById('ls-target').textContent = cfg.targetWpm || 0;
    document.getElementById('finger-guide-label').textContent = 'Press any key to begin';
    document.getElementById('pause-overlay').classList.add('hidden');
    this.renderKeyboard();
    this.renderTypeText();
    this.updateLiveStats(true);
    this.goTo('test');
    const input = document.getElementById('hidden-input');
    input.value = '';
    setTimeout(() => input.focus(), 50);
    document.getElementById('type-text').parentElement.onclick = () => input.focus();

    if (this.test.timerInterval) clearInterval(this.test.timerInterval);
    this.test.timerInterval = setInterval(() => this.tickTimer(), 200);
    document.getElementById('timer-display').textContent = cfg.timed ? cfg.duration : '∞';
  }

  ensureAheadText() {
    const t = this.test;
    if (t.cfg.customText) return; // custom text does not auto-extend
    const remaining = t.text.length - t.pos;
    if (remaining < 60) {
      const more = this.generateChunk(t.cfg.category, 2);
      t.text += ' ' + more;
      t.charStates = t.charStates.concat(new Array(more.length + 1).fill(null));
    }
  }

  escapeHtml(ch) {
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '&') return '&amp;';
    if (ch === '"') return '&quot;';
    return ch;
  }

  renderTypeText() {
    const t = this.test;
    const container = document.getElementById('type-text');
    let html = '';
    const start = Math.max(0, t.pos - 120);
    const end = Math.min(t.text.length, t.pos + 200);
    for (let i = start; i < end; i++) {
      const ch = this.escapeHtml(t.text[i]);
      let cls = 'untyped';
      if (t.charStates[i] === 'correct') cls = 'correct';
      else if (t.charStates[i] === 'wrong') cls = 'wrong';
      if (i === t.pos) cls += ' current';
      html += `<span class="ch ${cls}">${ch}</span>`;
    }
    container.innerHTML = html;
    const currentEl = container.querySelector('.current');
    if (currentEl) currentEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  renderKeyboard() {
    const kb = document.getElementById('keyboard');
    kb.innerHTML = '';
    const topMistyped = Object.entries(this.data.keyMistakes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
    KEYBOARD_LAYOUT.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(k => {
        const div = document.createElement('div');
        const wClass = 'w-' + String(k.w).replace('.', '_');
        div.className = 'key ' + wClass + (topMistyped.includes(k.k) ? ' mistyped-often' : '');
        div.dataset.key = k.k;
        div.dataset.finger = k.f;
        div.textContent = k.label || (k.k === ' ' ? '' : k.k.toUpperCase());
        rowEl.appendChild(div);
      });
      kb.appendChild(rowEl);
    });
  }

  highlightNextKey() {
    document.querySelectorAll('.key.current').forEach(k => k.classList.remove('current', 'finger-hint'));
    const t = this.test;
    const nextChar = t.text[t.pos];
    if (nextChar === undefined) return;
    const lookupChar = nextChar.toLowerCase();
    const keyEl = [...document.querySelectorAll('.key')].find(k => k.dataset.key.toLowerCase() === lookupChar);
    if (keyEl) {
      keyEl.classList.add('current', 'finger-hint');
      const finger = FINGER_NAMES[keyEl.dataset.finger] || '';
      document.getElementById('finger-guide-label').textContent = `${finger} — press "${nextChar === ' ' ? 'space' : nextChar}"`;
      if (/[A-Z]/.test(nextChar)) {
        const shiftEl = [...document.querySelectorAll('.key')].find(k => k.dataset.key === 'Shift');
        if (shiftEl) shiftEl.classList.add('finger-hint');
      }
    }
  }

  flashKey(char, cls) {
    const lookup = char.toLowerCase();
    const el = [...document.querySelectorAll('.key')].find(k => k.dataset.key.toLowerCase() === lookup);
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 150);
  }

  bindTestControls() {
    const input = document.getElementById('hidden-input');
    input.addEventListener('keydown', (e) => this.handleKeydown(e));
    document.getElementById('btn-pause').addEventListener('click', () => this.pauseTest());
    document.getElementById('btn-restart').addEventListener('click', () => this.restartTest());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeTest());
    document.getElementById('btn-restart-2').addEventListener('click', () => { this.resumeTest(); this.restartTest(); });
    document.getElementById('btn-quit').addEventListener('click', () => { this.resumeTest(); this.quitTest(true); });
    document.getElementById('btn-result-retry').addEventListener('click', () => this.retryFromResult());
    document.getElementById('btn-result-next').addEventListener('click', () => this.nextFromResult());
    document.getElementById('btn-result-home').addEventListener('click', () => this.goTo('home'));
  }

  handleKeydown(e) {
    const t = this.test;
    if (!t || t.finished || t.paused) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (t.pos > 0) {
        t.pos--;
        t.charStates[t.pos] = null;
        this.renderTypeText();
        this.highlightNextKey();
      }
      return;
    }
    if (e.key.length !== 1) {
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'CapsLock' || e.key === 'Tab') {
        this.flashKey(e.key, 'correct-flash');
      }
      return;
    }
    e.preventDefault();
    this.ensureAheadText();
    const expected = t.text[t.pos];
    const isCorrect = e.key === expected;
    t.charStates[t.pos] = isCorrect ? 'correct' : 'wrong';
    if (isCorrect) {
      t.correctCount++;
      this.flashKey(e.key, 'correct-flash');
      this.sound.correct();
    } else {
      t.wrongCount++;
      t.keyMistakeCounts[expected] = (t.keyMistakeCounts[expected] || 0) + 1;
      this.flashKey(e.key, 'wrong-flash');
      this.sound.wrong();
      if (t.cfg.failOnMistake) {
        t.pos++;
        this.finishTest('hardcoreFail');
        return;
      }
    }
    this.sound.key();
    t.pos++;
    this.renderTypeText();
    this.highlightNextKey();
    this.updateLiveStats(false);
  }

  elapsedSeconds() {
    const t = this.test;
    const now = t.paused ? t.pausedAt : Date.now();
    return Math.max(0, (now - t.startTime - t.pausedDuration) / 1000);
  }

  updateLiveStats() {
    const t = this.test;
    const elapsed = this.elapsedSeconds();
    const minutes = Math.max(elapsed / 60, 1 / 300);
    const wpm = Math.round((t.correctCount / 5) / minutes);
    const cpm = Math.round(t.correctCount / minutes);
    const total = t.correctCount + t.wrongCount;
    const accuracy = total > 0 ? Math.round((t.correctCount / total) * 100) : 100;
    document.getElementById('ls-wpm').textContent = wpm;
    document.getElementById('ls-cpm').textContent = cpm;
    document.getElementById('ls-acc').textContent = accuracy + '%';
    document.getElementById('ls-mistakes').textContent = t.wrongCount;
  }

  tickTimer() {
    const t = this.test;
    if (!t || t.finished || t.paused) return;
    const elapsed = this.elapsedSeconds();
    if (t.cfg.timed) {
      const remaining = Math.max(0, t.cfg.duration - elapsed);
      document.getElementById('timer-display').textContent = Math.ceil(remaining);
      this.ensureAheadText();
      if (remaining <= 0) { this.finishTest('timeup'); return; }
    } else {
      document.getElementById('timer-display').textContent = Math.floor(elapsed) + 's';
    }
    this.updateLiveStats();
  }

  pauseTest() {
    const t = this.test;
    if (!t || t.paused || t.finished) return;
    t.paused = true;
    t.pausedAt = Date.now();
    document.getElementById('pause-overlay').classList.remove('hidden');
  }
  resumeTest() {
    const t = this.test;
    if (!t || !t.paused) { document.getElementById('pause-overlay').classList.add('hidden'); return; }
    t.pausedDuration += Date.now() - t.pausedAt;
    t.paused = false;
    document.getElementById('pause-overlay').classList.add('hidden');
    document.getElementById('hidden-input').focus();
  }
  restartTest() {
    const cfg = this.test.cfg;
    if (this.test.timerInterval) clearInterval(this.test.timerInterval);
    this.beginTest(cfg);
  }
  quitTest(skipConfirm) {
    if (!this.test || this.test.finished) { this.goTo('home'); return; }
    if (!skipConfirm && !confirm('Quit this test? Your progress on it will not be saved.')) return;
    if (this.test.timerInterval) clearInterval(this.test.timerInterval);
    this.test.finished = true;
    this.goTo('home');
  }

  finishTest(reason) {
    const t = this.test;
    if (t.finished) return;
    t.finished = true;
    if (t.timerInterval) clearInterval(t.timerInterval);

    const elapsed = this.elapsedSeconds();
    const minutes = Math.max(elapsed / 60, 1 / 300);
    const correct = t.correctCount, wrong = t.wrongCount, total = correct + wrong;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;
    const wpm = Math.round((correct / 5) / minutes);
    const cpm = Math.round(correct / minutes);
    const wordsTyped = Math.max(0, Math.round(correct / 5));

    let pass;
    if (reason === 'hardcoreFail') pass = false;
    else if (t.cfg.levelIndex) pass = (accuracy >= 100 && wpm >= t.cfg.targetWpm && reason === 'timeup');
    else pass = true;

    // ---- Update persistent totals ----
    const d = this.data;
    d.totals.testsCompleted++;
    d.totals.charsTyped += total;
    d.totals.wordsTyped += wordsTyped;
    d.totals.practiceSeconds += Math.round(elapsed);
    d.totals.bestWpm = Math.max(d.totals.bestWpm, wpm);
    d.totals.bestAccuracy = Math.max(d.totals.bestAccuracy, accuracy);

    const todayKey = new Date().toISOString().slice(0, 10);
    d.practiceDates[todayKey] = (d.practiceDates[todayKey] || 0) + Math.round(elapsed);
    if (d.totals.lastPracticeDate !== todayKey) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yKey = y.toISOString().slice(0, 10);
      d.totals.currentStreak = (d.totals.lastPracticeDate === yKey) ? d.totals.currentStreak + 1 : 1;
      d.totals.bestStreak = Math.max(d.totals.bestStreak, d.totals.currentStreak);
      d.totals.lastPracticeDate = todayKey;
    }
    if (accuracy >= 100) {
      d.totals.perfectTestsInRow++;
      if (!d.totals.perfectDatesSet.includes(todayKey)) d.totals.perfectDatesSet.push(todayKey);
    } else {
      d.totals.perfectTestsInRow = 0;
    }

    if (!d.modesPlayed) d.modesPlayed = [];
    if (!d.modesPlayed.includes(t.cfg.modeId)) d.modesPlayed.push(t.cfg.modeId);

    for (const [k, c] of Object.entries(t.keyMistakeCounts)) d.keyMistakes[k] = (d.keyMistakes[k] || 0) + c;

    let starsEarned = 0;
    if (t.cfg.levelIndex && pass) {
      if (t.cfg.levelIndex === d.unlockedLevels) d.unlockedLevels = Math.min(26, d.unlockedLevels + 1);
      starsEarned = wpm >= t.cfg.targetWpm * 1.5 ? 3 : wpm >= t.cfg.targetWpm * 1.25 ? 2 : 1;
      d.levelStars[t.cfg.levelIndex] = Math.max(d.levelStars[t.cfg.levelIndex] || 0, starsEarned);
    }

    const xpEarned = Math.round(wpm + accuracy / 5 + (pass ? 20 : 0));
    const coinsEarned = Math.round(wpm / 4 + (pass ? 10 : 0));
    d.totals.xp += xpEarned;
    d.totals.coins += coinsEarned;

    d.history.push({ date: todayKey, wpm, acc: accuracy, mode: t.cfg.modeName, level: t.cfg.levelIndex, mistakes: wrong, chars: total, words: wordsTyped, pass });
    if (d.history.length > 500) d.history = d.history.slice(-500);

    this.save();
    const newlyUnlocked = this.checkAchievements();

    this.renderHome(); this.renderLevels(); this.renderProfile();
    this.showResult({ pass, wpm, cpm, accuracy, mistakes: wrong, elapsed, xpEarned, coinsEarned, starsEarned, newlyUnlocked, reason });
  }

  showResult(r) {
    const banner = document.getElementById('result-banner');
    const isLevelTest = !!this.test.cfg.levelIndex;
    if (r.reason === 'hardcoreFail') { banner.textContent = 'FAILED — MISTAKE MADE'; banner.className = 'result-banner fail'; }
    else if (isLevelTest) { banner.textContent = r.pass ? 'LEVEL PASSED' : 'LEVEL FAILED'; banner.className = 'result-banner ' + (r.pass ? 'pass' : 'fail'); }
    else { banner.textContent = 'TEST COMPLETE'; banner.className = 'result-banner pass'; }

    const grid = [
      ['WPM', r.wpm], ['Target', this.test.cfg.targetWpm || '-'], ['Accuracy', r.accuracy + '%'],
      ['CPM', r.cpm], ['Mistakes', r.mistakes], ['Time', Math.round(r.elapsed) + 's']
    ];
    document.getElementById('result-grid').innerHTML = grid.map(([l, v]) => `<div class="rg-item"><div class="rg-val">${v}</div><div class="rg-lbl">${l}</div></div>`).join('');

    const weakKeys = Object.entries(this.test.keyMistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('result-weak').textContent = weakKeys.length
      ? `Weak keys this test: ${weakKeys.map(k => `"${k[0] === ' ' ? 'space' : k[0]}" (${k[1]})`).join(', ')}`
      : 'No mistyped keys this test — clean run.';

    let suggestion;
    if (r.mistakes === 0 && r.wpm < (this.test.cfg.targetWpm || 999)) suggestion = 'Accuracy is solid — focus on building raw speed with short, frequent drills.';
    else if (r.accuracy < 90) suggestion = 'Slow down slightly and prioritize hitting the correct key over rushing ahead.';
    else if (isLevelTest && !r.pass) suggestion = `You need ${this.test.cfg.targetWpm} WPM at 100% accuracy without the timer running out early. Keep practicing this level.`;
    else suggestion = 'Great consistency — try a harder category or the next level to keep progressing.';
    document.getElementById('result-suggestion').textContent = suggestion;

    document.getElementById('result-xp').textContent = r.xpEarned;
    document.getElementById('result-coins').textContent = r.coinsEarned;
    document.getElementById('result-stars').textContent = r.starsEarned ? '★'.repeat(r.starsEarned) + '☆'.repeat(3 - r.starsEarned) : '—';

    const nextBtn = document.getElementById('btn-result-next');
    nextBtn.style.display = (isLevelTest && r.pass && this.test.cfg.levelIndex < 25) ? 'inline-flex' : 'none';

    this.goTo('result');
    if (r.pass) { this.sound.success(); this.confetti(); }
    else { this.sound.failure(); document.getElementById('result-banner').classList.add('fail'); }
    this.showAchievementPopups(r.newlyUnlocked);
  }

  retryFromResult() { this.beginTest(this.test.cfg); }
  nextFromResult() {
    const nextIndex = this.test.cfg.levelIndex + 1;
    if (nextIndex <= 25) this.startLevelTest(nextIndex); else this.goTo('home');
  }

  confetti() {
    if (!this.data.settings.animations) return;
    const colors = ['#3ec5ff', '#a855f7', '#ff5fd1', '#3ee87f', '#ffcc4d'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const size = Math.random() * 8 + 4;
      piece.style.width = size + 'px';
      piece.style.height = size * 0.4 + 'px';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      document.body.appendChild(piece);
      const duration = Math.random() * 1500 + 1500;
      const drift = (Math.random() - 0.5) * 200;
      piece.animate([
        { transform: piece.style.transform + ' translateY(0)', opacity: 1 },
        { transform: `rotate(${Math.random() * 720}deg) translateY(100vh) translateX(${drift}px)`, opacity: 0.2 }
      ], { duration, easing: 'ease-in' });
      setTimeout(() => piece.remove(), duration + 100);
    }
  }

  /* ============================================================
     1v1 RACE (WebRTC, same Wi-Fi/hotspot, no internet, no server)
     ============================================================ */
  bindVsSetup() {
    document.getElementById('vs-btn-host').addEventListener('click', () => this.vsStartHost());
    document.getElementById('vs-btn-join').addEventListener('click', () => this.vsStartJoin());
    document.getElementById('vs-host-connect').addEventListener('click', () => this.vsHostConnect());
    document.getElementById('vs-join-generate').addEventListener('click', () => this.vsJoinGenerate());
    document.getElementById('vs-copy-offer').addEventListener('click', () => this.copyToClipboard('vs-host-offer'));
    document.getElementById('vs-copy-answer').addEventListener('click', () => this.copyToClipboard('vs-join-answer'));
    document.getElementById('vs-exit').addEventListener('click', () => this.vsQuitRace());
    document.getElementById('vs-btn-rematch').addEventListener('click', () => this.vsRematch());
    document.getElementById('vs-btn-disconnect').addEventListener('click', () => this.vsDisconnectHome());
    document.getElementById('vs-hidden-input').addEventListener('keydown', (e) => this.handleVsKeydown(e));
    document.getElementById('vs-hidden-input').addEventListener('paste', (e) => { e.preventDefault(); if (this.vs && this.vs.startTime !== null && !this.vs.finished) this.vsFinishMyRace('invalid'); });
    document.getElementById('vs-hidden-input').addEventListener('drop', (e) => { e.preventDefault(); if (this.vs && this.vs.startTime !== null && !this.vs.finished) this.vsFinishMyRace('invalid'); });
    document.getElementById('vs-hidden-input').addEventListener('beforeinput', (e) => {
      if (e.inputType && !['insertText', 'deleteContentBackward'].includes(e.inputType)) {
        e.preventDefault();
        if (this.vs && this.vs.startTime !== null && !this.vs.finished) this.vsFinishMyRace('invalid');
      }
    });
    document.getElementById('vs-btn-ready').addEventListener('click', () => this.vsMarkReady());
    document.querySelectorAll('#vs-match-type button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#vs-match-type button').forEach(b => b.classList.remove('seg-on'));
        btn.classList.add('seg-on');
      });
    });
    document.querySelectorAll('#vs-ruleset button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#vs-ruleset button').forEach(b => b.classList.remove('seg-on'));
        btn.classList.add('seg-on');
      });
    });
  }

  copyToClipboard(id) {
    const el = document.getElementById(id);
    el.select();
    el.setSelectionRange(0, 999999);
    try { document.execCommand('copy'); } catch (e) {}
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.value).catch(() => {});
    }
    this.toast('Copied to clipboard');
  }

  vsResetUI() {
    if (this.vs && this.vs.timerInterval) clearInterval(this.vs.timerInterval);
    document.getElementById('vs-role-pick').classList.remove('hidden');
    document.getElementById('vs-host-panel').classList.add('hidden');
    document.getElementById('vs-join-panel').classList.add('hidden');
    document.getElementById('vs-lobby').classList.add('hidden');
    document.getElementById('vs-ready-overlay').classList.add('hidden');
    document.getElementById('vs-countdown-overlay').classList.add('hidden');
    document.getElementById('vs-host-offer').value = '';
    document.getElementById('vs-host-answer').value = '';
    document.getElementById('vs-join-offer').value = '';
    document.getElementById('vs-join-answer').value = '';
    document.getElementById('vs-host-status').textContent = '';
    document.getElementById('vs-join-status').textContent = '';
  }

  async vsStartHost() {
    this.vs = this.createVsState(null, true);
    document.getElementById('vs-role-pick').classList.add('hidden');
    document.getElementById('vs-host-panel').classList.remove('hidden');
    document.getElementById('vs-host-status').textContent = 'Generating code...';
    this.vs.p2p = new P2PRace(
      (msg) => this.onVsMessage(msg),
      () => this.onVsConnected(),
      () => this.onVsDisconnected()
    );
    try {
      const offer = await this.vs.p2p.createHostOffer();
      document.getElementById('vs-host-offer').value = offer;
      document.getElementById('vs-host-status').textContent = 'Code ready — send it to the other device.';
    } catch (e) {
      document.getElementById('vs-host-status').textContent = 'Could not generate a code on this browser/device.';
    }
  }

  async vsHostConnect() {
    const ansStr = document.getElementById('vs-host-answer').value.trim();
    if (!ansStr) { this.toast('Paste the reply code first.'); return; }
    try {
      await this.vs.p2p.acceptAnswer(ansStr);
      document.getElementById('vs-host-status').textContent = 'Connecting...';
    } catch (e) {
      document.getElementById('vs-host-status').textContent = 'That code looks invalid — ask them to resend it.';
    }
  }

  vsStartJoin() {
    this.vs = this.createVsState(null, false);
    document.getElementById('vs-role-pick').classList.add('hidden');
    document.getElementById('vs-join-panel').classList.remove('hidden');
  }

  async vsJoinGenerate() {
    const offerStr = document.getElementById('vs-join-offer').value.trim();
    if (!offerStr) { this.toast('Paste the host\'s code first.'); return; }
    this.vs.p2p = new P2PRace(
      (msg) => this.onVsMessage(msg),
      () => this.onVsConnected(),
      () => this.onVsDisconnected()
    );
    try {
      const answer = await this.vs.p2p.createJoinAnswer(offerStr);
      document.getElementById('vs-join-answer').value = answer;
      document.getElementById('vs-join-status').textContent = 'Send this reply back to the host, then wait here.';
    } catch (e) {
      document.getElementById('vs-join-status').textContent = 'That code looks invalid — ask them to resend it.';
    }
  }

  onVsConnected() {
    if (this.vs && this.vs.disconnectTimer) {
      clearTimeout(this.vs.disconnectTimer);
      this.vs.disconnectTimer = null;
    }
    document.getElementById('vs-host-panel').classList.add('hidden');
    document.getElementById('vs-join-panel').classList.add('hidden');
    document.getElementById('vs-lobby').classList.remove('hidden');
    if (this.vs.isHost) {
      document.getElementById('vs-host-controls').classList.remove('hidden');
      document.getElementById('vs-guest-waiting').classList.add('hidden');
      this.renderVsCategoryGrid();
    } else {
      document.getElementById('vs-host-controls').classList.add('hidden');
      document.getElementById('vs-guest-waiting').classList.remove('hidden');
    }
    this.toast('Connected to opponent!');
  }

  onVsDisconnected() {
    const raceActive = document.getElementById('screen-vs-race').classList.contains('active');
    const resultActive = document.getElementById('screen-vs-result').classList.contains('active');
    if (raceActive && this.vs && !this.vs.finished) {
      this.toast('Opponent disconnected. 10-second reconnect window started.');
      if (this.vs.disconnectTimer) clearTimeout(this.vs.disconnectTimer);
      this.vs.disconnectTimer = setTimeout(() => this.vsHandleOpponentForfeit(), 10000);
    } else if (raceActive || resultActive) this.toast('Opponent disconnected.');
  }

  renderVsCategoryGrid() {
    const grid = document.getElementById('vs-category-grid');
    const cats = [
      { id: 'words', name: 'Words' }, { id: 'medium', name: 'Paragraphs' },
      { id: 'programming', name: 'Programming' }, { id: 'numbers', name: 'Numbers' },
      { id: 'symbols', name: 'Symbols' }, { id: 'custom', name: 'Custom Text' }
    ];
    grid.innerHTML = '';
    cats.forEach(c => {
      const card = document.createElement('div');
      card.className = 'mode-card';
      card.innerHTML = `<h4>${c.name}</h4><p>Use identical ${c.name.toLowerCase()} content for both players.</p>`;
      card.addEventListener('click', () => this.vsHostStartRace(c.id));
      grid.appendChild(card);
    });
  }

  vsHostStartRace(category) {
    const durationBtn = document.querySelector('#vs-match-type button.seg-on');
    const rulesetBtn = document.querySelector('#vs-ruleset button.seg-on');
    const matchMode = durationBtn ? durationBtn.dataset.mode : 'timed';
    const duration = Number(durationBtn ? durationBtn.dataset.duration : 30);
    const ruleset = rulesetBtn ? rulesetBtn.dataset.ruleset : 'standard';
    const customText = document.getElementById('vs-custom-text').value.trim();
    if (category === 'custom' && customText.length < 10) {
      this.toast('Add at least 10 characters of custom text.');
      return;
    }
    const units = matchMode === 'unlimited' ? 4 : duration >= 120 ? 10 : duration === 60 ? 7 : 4;
    const text = category === 'custom' ? customText : this.generateChunk(category, units);
    const cfg = { text, duration, matchMode, ruleset, category };
    this.vs.p2p.send({ type: 'init', ...cfg });
    this.vsBeginRaceLocal(cfg);
  }

  onVsMessage(msg) {
    if (msg.type === 'init') this.vsBeginRaceLocal(msg);
    else if (msg.type === 'ready') { this.vs.oppReady = true; this.vsUpdateReadyStatus(); if (this.vs.isHost) this.vsMaybeStartCountdown(); }
    else if (msg.type === 'count') this.vsShowCountdown(msg.n);
    else if (msg.type === 'progress') this.vsUpdateOpponentProgress(msg);
    else if (msg.type === 'finish') this.vsHandleOpponentFinish(msg);
    else if (msg.type === 'rematch') {
      this.toast('Opponent wants a rematch.');
      document.getElementById('vs-lobby').classList.remove('hidden');
      if (this.vs.isHost) this.renderVsCategoryGrid();
      this.goTo('vs-setup');
    }
  }

  vsBeginRaceLocal(cfg) {
    const vs = this.vs;
    const text = cfg.text || '';
    vs.text = text;
    vs.duration = Number(cfg.duration || 30);
    vs.matchMode = cfg.matchMode || (vs.duration ? 'timed' : 'unlimited');
    vs.ruleset = cfg.ruleset || 'standard';
    vs.category = cfg.category || 'words';
    vs.endTime = null;
    vs.charStates = new Array(text.length).fill(null);
    vs.pos = 0; vs.correct = 0; vs.wrongAttempts = 0; vs.typed = 0; vs.currentWrong = false; vs.completedText = false;
    vs.finished = false; vs.oppFinished = false; vs.oppStats = null; vs.myStats = null; vs.oppLive = null;
    vs.lost = false; vs.lossReason = ''; vs.ready = false; vs.oppReady = false;
    vs.startTime = null; vs._lastSend = 0; vs._lastWpm = 0;
    if (vs.timerInterval) clearInterval(vs.timerInterval);
    if (vs.disconnectTimer) clearTimeout(vs.disconnectTimer);
    vs.timerInterval = null;
    this.goTo('vs-race');
    this.renderVsText();
    document.getElementById('vs-my-fill').style.width = '0%';
    document.getElementById('vs-opp-fill').style.width = '0%';
    document.getElementById('vs-my-wpm').textContent = '0 WPM';
    document.getElementById('vs-opp-wpm').textContent = '0 WPM';
    document.getElementById('vs-ls-wpm').textContent = '0';
    document.getElementById('vs-ls-acc').textContent = 'N/A';
    document.getElementById('vs-ls-progress').textContent = '0%';
    document.getElementById('vs-ls-time').textContent = vs.matchMode === 'timed' ? vs.duration + 's' : '∞';
    document.getElementById('vs-timer-display').textContent = vs.matchMode === 'timed' ? vs.duration + 's' : '∞';
    const input = document.getElementById('vs-hidden-input');
    input.value = '';
    document.getElementById('vs-type-text').parentElement.onclick = () => input.focus();
    document.getElementById('vs-btn-ready').disabled = false;
    document.getElementById('vs-btn-ready').textContent = 'Ready';
    document.getElementById('vs-ready-overlay').classList.remove('hidden');
    this.vsUpdateReadyStatus();
  }

  vsRunCountdown() {
    const seq = [3, 2, 1, 'GO'];
    let i = 0;
    const step = () => {
      if (i >= seq.length) return;
      const n = seq[i++];
      this.vs.p2p.send({ type: 'count', n });
      this.vsShowCountdown(n);
      if (i < seq.length) setTimeout(step, 1000);
    };
    step();
  }

  vsShowCountdown(n) {
    const overlay = document.getElementById('vs-countdown-overlay');
    const numEl = document.getElementById('vs-countdown-num');
    document.getElementById('vs-ready-overlay').classList.add('hidden');
    overlay.classList.remove('hidden');
    numEl.textContent = n;
    this.sound.click();
    if (n === 'GO') {
      this.sound.success();
      setTimeout(() => {
        overlay.classList.add('hidden');
        this.vsStartTimer();
        document.getElementById('vs-hidden-input').focus();
      }, 450);
    }
  }

  vsMarkReady() {
    const vs = this.vs;
    if (!vs || !vs.text || vs.ready) return;
    vs.ready = true;
    document.getElementById('vs-btn-ready').disabled = true;
    document.getElementById('vs-btn-ready').textContent = 'Ready Locked';
    vs.p2p.send({ type: 'ready' });
    this.vsUpdateReadyStatus();
    if (vs.isHost) this.vsMaybeStartCountdown();
  }

  vsUpdateReadyStatus() {
    const vs = this.vs;
    const status = document.getElementById('vs-ready-status');
    const mine = vs.ready ? 'You are ready' : 'Press Ready when prepared';
    const opp = vs.oppReady ? 'opponent is ready' : 'waiting for opponent';
    status.textContent = `${mine}; ${opp}.`;
  }

  vsMaybeStartCountdown() {
    const vs = this.vs;
    if (!vs.ready || !vs.oppReady || vs.startTime !== null) return;
    document.getElementById('vs-ready-overlay').classList.add('hidden');
    this.vsRunCountdown();
  }

  vsStartTimer() {
    const vs = this.vs;
    if (vs.startTime !== null) return;
    document.getElementById('vs-ready-overlay').classList.add('hidden');
    vs.startTime = Date.now();
    vs.endTime = vs.matchMode === 'timed' ? vs.startTime + vs.duration * 1000 : null;
    this.vsUpdateMyStats();
    vs.timerInterval = setInterval(() => this.vsTickTimer(), 200);
  }

  vsTickTimer() {
    const vs = this.vs;
    if (!vs || vs.finished || vs.startTime === null) return;
    this.vsUpdateMyStats();
    if (vs.matchMode === 'timed' && Date.now() >= vs.endTime) this.vsFinishMyRace('time');
  }

  handleVsKeydown(e) {
    const vs = this.vs;
    if (!vs || !vs.text || vs.finished || vs.startTime === null) { if (e.key.length === 1) e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      this.vsFinishMyRace('invalid');
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (vs.ruleset === 'precision' && vs.currentWrong) {
        vs.charStates[vs.pos] = null;
        vs.currentWrong = false;
        this.renderVsText();
      }
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    if (vs.pos >= vs.text.length) return;
    const expected = vs.text[vs.pos];
    const correct = e.key === expected;
    vs.typed++;

    if (vs.ruleset === 'hardcore' && !correct) {
      vs.wrongAttempts++;
      vs.currentWrong = true;
      vs.charStates[vs.pos] = 'wrong';
      this.sound.wrong();
      this.renderVsText();
      this.vsUpdateMyStats();
      this.vsSendProgressThrottled(true);
      this.vsFinishMyRace('hardcore');
      return;
    }

    if (vs.ruleset === 'standard') {
      vs.charStates[vs.pos] = correct ? 'correct' : 'wrong';
      if (correct) { vs.correct++; this.sound.correct(); } else { vs.wrongAttempts++; this.sound.wrong(); }
      this.sound.key();
      vs.pos++;
      if (vs.pos >= vs.text.length) this.vsCompleteText();
      this.renderVsText();
      this.vsUpdateMyStats();
      this.vsSendProgressThrottled();
      return;
    }

    if (!correct) {
      vs.wrongAttempts++;
      vs.currentWrong = true;
      vs.charStates[vs.pos] = 'wrong';
      this.sound.wrong();
      this.renderVsText();
      this.vsUpdateMyStats();
      this.vsSendProgressThrottled();
      return;
    }
    vs.charStates[vs.pos] = 'correct';
    vs.currentWrong = false;
    vs.correct++;
    this.sound.correct();
    this.sound.key();
    vs.pos++;
    if (vs.pos >= vs.text.length) this.vsCompleteText();
    this.renderVsText();
    this.vsUpdateMyStats();
    this.vsSendProgressThrottled();
  }

  vsCompleteText() {
    const vs = this.vs;
    vs.completedText = true;
    if (vs.matchMode === 'unlimited') this.vsFinishMyRace('complete');
  }

  vsUpdateMyStats() {
    const vs = this.vs;
    const elapsed = Math.max((Date.now() - vs.startTime) / 1000, 0.3);
    const minutes = elapsed / 60;
    const wpm = Math.round((vs.correct / 5) / minutes);
    const accuracy = this.vsCurrentAccuracy();
    const progress = this.vsCurrentProgress();
    const remaining = vs.matchMode === 'timed' ? Math.max(0, Math.ceil((vs.endTime - Date.now()) / 1000)) : null;
    document.getElementById('vs-ls-wpm').textContent = wpm;
    document.getElementById('vs-ls-acc').textContent = accuracy === null ? 'N/A' : accuracy + '%';
    document.getElementById('vs-ls-progress').textContent = progress + '%';
    document.getElementById('vs-ls-time').textContent = vs.matchMode === 'timed' ? remaining + 's' : Math.floor(elapsed) + 's';
    document.getElementById('vs-my-wpm').textContent = wpm + ' WPM';
    document.getElementById('vs-my-fill').style.width = progress + '%';
    document.getElementById('vs-timer-display').textContent = vs.matchMode === 'timed' ? remaining + 's' : Math.floor(elapsed) + 's';
    vs._lastWpm = wpm;
  }

  vsCurrentAccuracy() {
    const vs = this.vs;
    if (vs.typed === 0) return null;
    if (vs.ruleset === 'precision') return 100;
    return Math.round((vs.correct / vs.typed) * 100);
  }

  vsCurrentProgress() {
    const vs = this.vs;
    return Math.min(100, Math.round((vs.correct / vs.text.length) * 100));
  }

  vsSendProgressThrottled(force = false) {
    const vs = this.vs;
    const now = Date.now();
    if (!force && vs._lastSend && now - vs._lastSend < 150) return;
    vs._lastSend = now;
    vs.p2p.send({ type: 'progress', pos: vs.correct, total: vs.text.length, wpm: vs._lastWpm || 0, accuracy: this.vsCurrentAccuracy(), correct: vs.correct });
  }

  vsUpdateOpponentProgress(msg) {
    const progress = Math.min(100, Math.round((msg.pos / msg.total) * 100));
    this.vs.oppLive = { wpm: msg.wpm || 0, accuracy: msg.accuracy, progress, correct: msg.correct || msg.pos || 0 };
    document.getElementById('vs-opp-fill').style.width = progress + '%';
    document.getElementById('vs-opp-wpm').textContent = `${msg.wpm || 0} WPM · ${msg.accuracy === null ? 'N/A' : (msg.accuracy || 0) + '%'}`;
  }

  vsFinishMyRace(reason = 'complete') {
    const vs = this.vs;
    if (vs.finished) return;
    vs.finished = true;
    if (vs.timerInterval) clearInterval(vs.timerInterval);
    vs.lost = ['hardcore', 'invalid', 'forfeit'].includes(reason);
    vs.lossReason = reason === 'hardcore' ? 'Wrong key in Hardcore' : reason === 'invalid' ? 'Invalid input action' : reason === 'forfeit' ? 'Forfeit' : '';
    vs.myStats = this.vsBuildStats(reason, vs.lost);
    vs.p2p.send({ type: 'finish', ...vs.myStats });
    if (vs.lost) {
      vs.oppStats = this.vsBuildOpponentFallbackStats();
      this.vsShowRaceResult();
    } else if (vs.oppFinished) this.vsShowRaceResult();
    else this.toast(vs.matchMode === 'timed' ? 'Time is up! Waiting for opponent...' : 'You finished! Waiting for opponent...');
  }

  vsHandleOpponentFinish(msg) {
    const vs = this.vs;
    if (vs.disconnectTimer) { clearTimeout(vs.disconnectTimer); vs.disconnectTimer = null; }
    vs.oppFinished = true;
    vs.oppStats = {
      wpm: msg.wpm || 0,
      accuracy: msg.accuracy ?? null,
      progress: msg.progress || 0,
      correct: msg.correct || 0,
      typed: msg.typed || 0,
      time: msg.time || 0,
      completionTime: msg.completionTime || null,
      matchDuration: msg.matchDuration || 0,
      finishedAt: Date.now(),
      completedText: !!msg.completedText,
      lost: !!msg.lost,
      reason: msg.reason || 'complete'
    };
    if (vs.ruleset === 'hardcore' && vs.oppStats.lost && !vs.finished) {
      vs.finished = true;
      if (vs.timerInterval) clearInterval(vs.timerInterval);
      vs.myStats = this.vsBuildStats('opponent-lost', false);
      this.vsShowRaceResult();
    } else if (vs.finished) this.vsShowRaceResult();
  }

  vsBuildStats(reason, lost) {
    const vs = this.vs;
    const elapsed = Math.max((Date.now() - vs.startTime) / 1000, 0);
    const minutes = Math.max(elapsed / 60, 1 / 300);
    const wpm = Math.round((vs.correct / 5) / minutes);
    return {
      wpm,
      accuracy: this.vsCurrentAccuracy(),
      progress: this.vsCurrentProgress(),
      correct: vs.correct,
      typed: vs.typed,
      time: elapsed,
      completionTime: vs.completedText ? elapsed : null,
      matchDuration: vs.matchMode === 'timed' ? vs.duration : elapsed,
      completedText: vs.completedText,
      finishedAt: Date.now(),
      lost,
      reason
    };
  }

  vsBuildOpponentFallbackStats() {
    const live = this.vs.oppLive || {};
    return {
      wpm: live.wpm || 0,
      accuracy: live.accuracy ?? null,
      progress: live.progress || 0,
      correct: live.correct || 0,
      typed: live.correct || 0,
      time: 0,
      completionTime: null,
      matchDuration: this.vs.matchMode === 'timed' ? this.vs.duration : 0,
      completedText: false,
      finishedAt: Date.now(),
      lost: false,
      reason: 'opponent-win'
    };
  }

  vsHandleOpponentForfeit() {
    const vs = this.vs;
    if (!vs || vs.finished) return;
    vs.oppFinished = true;
    vs.oppStats = this.vsBuildOpponentFallbackStats();
    vs.oppStats.lost = true;
    vs.oppStats.reason = 'forfeit';
    vs.finished = true;
    if (vs.timerInterval) clearInterval(vs.timerInterval);
    vs.myStats = this.vsBuildStats('opponent-forfeit', false);
    this.vsShowRaceResult();
  }

  vsShowRaceResult() {
    const vs = this.vs;
    const outcome = this.vsCompareStats(vs.myStats, vs.oppStats);
    const myWin = outcome === 1;
    const banner = document.getElementById('vs-result-banner');
    banner.textContent = outcome === 0 ? 'DRAW' : myWin ? 'YOU WIN!' : 'OPPONENT WINS';
    banner.className = 'result-banner ' + (myWin || outcome === 0 ? 'pass' : 'fail');
    document.getElementById('vs-result-compare').innerHTML = `
      <div class="vs-result-col ${myWin ? 'winner' : ''}">
        <h4>You</h4>
        <div class="vr-val">${vs.myStats.wpm} WPM</div>
        <div class="vr-sub">${this.vsFormatResultStats(vs.myStats)}</div>
      </div>
      <div class="vs-result-col ${outcome === -1 ? 'winner' : ''}">
        <h4>Opponent</h4>
        <div class="vr-val">${vs.oppStats.wpm} WPM</div>
        <div class="vr-sub">${this.vsFormatResultStats(vs.oppStats)}</div>
      </div>`;
    this.goTo('vs-result');
    if (myWin || outcome === 0) { this.sound.success(); if (myWin) this.confetti(); } else { this.sound.failure(); }
  }

  vsCompareStats(my, opp) {
    if (my.lost && !opp.lost) return -1;
    if (!my.lost && opp.lost) return 1;
    if (my.lost && opp.lost) return 0;

    if (this.vs.ruleset === 'hardcore') {
      if (my.completedText && !opp.completedText) return 1;
      if (!my.completedText && opp.completedText) return -1;
      if (my.completedText && opp.completedText && my.completionTime !== opp.completionTime) return my.completionTime < opp.completionTime ? 1 : -1;
      return 0;
    }

    if (this.vs.matchMode === 'unlimited') {
      if (my.completedText && !opp.completedText) return 1;
      if (!my.completedText && opp.completedText) return -1;
      if (my.completedText && opp.completedText && my.completionTime !== opp.completionTime) return my.completionTime < opp.completionTime ? 1 : -1;
      const myAcc = my.accuracy ?? -1;
      const oppAcc = opp.accuracy ?? -1;
      if (myAcc !== oppAcc) return myAcc > oppAcc ? 1 : -1;
      return 0;
    }

    if (my.progress === 0 && opp.progress > 0) return -1;
    if (my.progress > 0 && opp.progress === 0) return 1;
    if (my.progress === 0 && opp.progress === 0) return 0;
    if (my.progress !== opp.progress) return my.progress > opp.progress ? 1 : -1;
    if (my.wpm !== opp.wpm) return my.wpm > opp.wpm ? 1 : -1;
    const myAcc = my.accuracy ?? -1;
    const oppAcc = opp.accuracy ?? -1;
    if (myAcc !== oppAcc) return myAcc > oppAcc ? 1 : -1;
    return 0;
  }

  vsFormatResultStats(s) {
    const accuracy = s.accuracy === null ? 'N/A' : s.accuracy + '%';
    const parts = [`${s.progress}% progress`, `${accuracy} accuracy`];
    if (this.vs.matchMode === 'unlimited') parts.push(s.completionTime === null ? 'not finished' : `${s.completionTime.toFixed(1)}s finish`);
    parts.push(`${Math.round(s.matchDuration)}s match`);
    if (s.lost) parts.push(s.reason === 'hardcore' ? 'immediate loss' : 'forfeit');
    return parts.join(' · ');
  }

  renderVsText() {
    const vs = this.vs;
    const container = document.getElementById('vs-type-text');
    let html = '';
    for (let i = 0; i < vs.text.length; i++) {
      const ch = this.escapeHtml(vs.text[i]);
      let cls = 'untyped';
      if (vs.charStates[i] === 'correct') cls = 'correct';
      else if (vs.charStates[i] === 'wrong') cls = 'wrong';
      if (i === vs.pos) cls += ' current';
      html += `<span class="ch ${cls}">${ch}</span>`;
    }
    container.innerHTML = html;
    const cur = container.querySelector('.current');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  }

  vsQuitRace() {
    if (!confirm('Leave this race?')) return;
    if (this.vs.p2p) this.vs.p2p.close();
    this.vs = this.createVsState(null, false);
    this.vsResetUI();
    this.goTo('home');
  }

  vsRematch() {
    this.vs.p2p.send({ type: 'rematch' });
    document.getElementById('vs-lobby').classList.remove('hidden');
    if (this.vs.isHost) this.renderVsCategoryGrid();
    this.goTo('vs-setup');
  }

  vsDisconnectHome() {
    if (this.vs.timerInterval) clearInterval(this.vs.timerInterval);
    if (this.vs.disconnectTimer) clearTimeout(this.vs.disconnectTimer);
    document.getElementById('vs-lobby').classList.remove('hidden');
    if (this.vs.isHost) {
      document.getElementById('vs-host-controls').classList.remove('hidden');
      document.getElementById('vs-guest-waiting').classList.add('hidden');
      this.renderVsCategoryGrid();
    } else {
      document.getElementById('vs-host-controls').classList.add('hidden');
      document.getElementById('vs-guest-waiting').classList.remove('hidden');
    }
    this.goTo('vs-setup');
  }
}

/* ============================================================
   6. INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  window.typingMasterApp = new App();
});
