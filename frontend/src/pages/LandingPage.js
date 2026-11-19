import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

// ─────────────────────────────────────────────────────────────
// Hooks & helpers
// ─────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds `data-in` to elements with `data-reveal` as they scroll into view. */
const useReveal = (rootRef) => {
  useEffect(() => {
    const nodes = rootRef.current?.querySelectorAll('[data-reveal]') || [];
    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      nodes.forEach((n) => n.setAttribute('data-in', ''));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute('data-in', '');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [rootRef]);
};

/** Writes scroll progress (0–1) and pointer position to CSS variables. */
const useScrollAndPointer = (rootRef) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = prefersReducedMotion();
    let frame = 0;

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const y = window.scrollY;
        root.style.setProperty('--progress', max > 0 ? (y / max).toFixed(4) : 0);
        if (!reduce) root.style.setProperty('--scroll', y.toFixed(0));
        setScrolled(y > 24);
      });
    };
    const onPointer = (e) => {
      if (reduce) return;
      root.style.setProperty('--px', (e.clientX / window.innerWidth - 0.5).toFixed(3));
      root.style.setProperty('--py', (e.clientY / window.innerHeight - 0.5).toFixed(3));
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, [rootRef]);

  return scrolled;
};

/** Counts from 0 to `to` once visible, in chunky steps. */
const CountUp = ({ to, suffix = '' }) => {
  const ref = useRef(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      setValue(to);
      return;
    }
    let timer = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      let i = 0;
      const frames = 14;
      timer = setInterval(() => {
        i += 1;
        setValue(Math.round((to * i) / frames));
        if (i >= frames) clearInterval(timer);
      }, 70);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); clearInterval(timer); };
  }, [to]);

  return <span ref={ref}>{value}{suffix}</span>;
};

// 8×8 pixel icons. '1' = filled pixel.
const ICONS = {
  pin:  ['00111100', '01111110', '11100111', '11100111', '01111110', '00111100', '00011000', '00011000'],
  lock: ['00111100', '01000010', '01000010', '11111111', '11100111', '11100111', '11111111', '11111111'],
  bolt: ['00001110', '00011100', '00111000', '01111110', '00011100', '00111000', '00110000', '01100000'],
  grid: ['11011011', '11011011', '00000000', '11011011', '11011011', '00000000', '11011011', '11011011'],
  key:  ['01110000', '10001000', '10001000', '01111111', '00000101', '00000101', '00000000', '00000000'],
};

const PixelIcon = ({ name, className = '' }) => (
  <svg className={`${styles.icon} ${className}`} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
    {ICONS[name].flatMap((row, y) =>
      [...row].map((c, x) => (c === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null))
    )}
  </svg>
);

/** "(LABEL)" style button that leans toward the cursor in 2px steps. */
const BracketLink = ({ to, variant = 'primary', children }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left - r.width / 2) * 0.2) / 2) * 2;
    const y = Math.round(((e.clientY - r.top - r.height / 2) * 0.3) / 2) * 2;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <Link
      ref={ref}
      to={to}
      className={variant === 'primary' ? styles.btnPrimary : styles.btnGhost}
      onPointerMove={onMove}
      onPointerLeave={reset}
    >
      <span aria-hidden="true">(</span>{children}<span aria-hidden="true">)</span>
    </Link>
  );
};

// ─────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Social', 'Sports', 'Music', 'Food', 'Tech',
  'Art', 'Outdoor', 'Gaming', 'Study', 'Other',
];

const STEPS = [
  {
    n: '01',
    title: 'Open the map',
    body: 'CIRCLO finds you and shows what is starting within 10 km. Green pins have room. Red ones are full.',
  },
  {
    n: '02',
    title: 'Tap a pin, take a spot',
    body: 'See who is hosting, when it starts and how many spots are left. Joining is one tap, and it can never overbook.',
  },
  {
    n: '03',
    title: 'Talk to your group',
    body: 'Every meetup comes with its own chat, open only to people who joined. Plan the details, then go.',
  },
];

const TABS = {
  guests: {
    label: 'For guests',
    points: [
      ['Every kind of plan', 'Runs, board games, jam sessions, study tables. Each meetup is tagged with one of ten categories.'],
      ['Live capacity', 'Counts update the moment someone joins or leaves, so you never chase a full event.'],
      ['Directions in one tap', 'Jump straight to turn-by-turn directions from the meetup panel.'],
    ],
  },
  hosts: {
    label: 'For hosts',
    points: [
      ['Drop a pin, set a cap', 'Pick the spot on the map, choose a time and a limit from 2 to 500 people.'],
      ['It fills itself', 'When the last spot goes, the pin turns red for everyone and joining locks. A spot opens, it turns green again.'],
      ['A room for your people', 'Only attendees can read or post in your meetup chat. Leave or get removed, and access ends.'],
    ],
  },
};

const FAQ = [
  ['Is CIRCLO free?', 'Yes. Creating, joining and chatting are free.'],
  ['How does it know where I am?', 'Your browser asks for permission once. If you say no, the map opens on a default city and you can still browse.'],
  ['Can strangers read my group chat?', 'No. Chat history and live messages are limited to people who joined that meetup.'],
  ['What happens if a meetup fills up?', 'The pin turns red for everyone and the join button locks. If someone leaves, it reopens automatically.'],
  ['Can I sign in with Google?', 'Yes, or with an email and password. Either way takes under a minute.'],
];

// ─────────────────────────────────────────────────────────────
// Background — a slowly turning, pixelated half Earth
// ─────────────────────────────────────────────────────────────

const EARTH_W = 192;           // canvas pixels (scaled up with crisp edges)
const EARTH_H = 96;            // only the top half of the globe is drawn
const EARTH_R = 94;

// Small 3D value noise so continents wrap naturally around the sphere
const hash3 = (x, y, z, seed) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440670441) ^ Math.imul(seed, 144269504);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);
const valueNoise = (x, y, z, seed) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), xf), lerp(c(0, 1, 0), c(1, 1, 0), xf), yf),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), xf), lerp(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf
  );
};
const fbm = (x, y, z, seed) => {
  let sum = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 4; o++) {
    sum += amp * valueNoise(x * f, y * f, z * f, seed + o);
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / 0.9375;
};

// Earth palette (muted, natural)
const C = {
  deep:    [24, 52, 74],
  ocean:   [34, 74, 98],
  shallow: [58, 108, 124],
  sand:    [196, 178, 124],
  grass:   [108, 146, 70],
  forest:  [62, 104, 48],
  jungle:  [44, 80, 38],
  dry:     [150, 124, 78],
  rock:    [112, 92, 68],
  snow:    [232, 236, 228],
  cloud:   [242, 242, 234],
  night:   [10, 12, 14],
  air:     [120, 160, 170],
};

const LIGHT = (() => { const v = [-0.55, -0.55, 0.63]; const m = Math.hypot(...v); return v.map((n) => n / m); })();

const paintEarth = (ctx, img, rot) => {
  const data = img.data;
  const cx = EARTH_W / 2 - 0.5;
  const cy = EARTH_H;               // centre sits on the bottom edge
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const cloudRot = rot * 1.35;
  const cc = Math.cos(cloudRot), cs = Math.sin(cloudRot);

  for (let y = 0; y < EARTH_H; y++) {
    for (let x = 0; x < EARTH_W; x++) {
      const i = (y * EARTH_W + x) * 4;
      const dx = (x - cx) / EARTH_R;
      const dy = (y - cy) / EARTH_R;
      const d2 = dx * dx + dy * dy;

      // Atmosphere: a 2-pixel dithered rim
      if (d2 > 1) {
        const dist = Math.sqrt(d2) * EARTH_R - EARTH_R;
        if (dist < 2.2 && (x + y) % 2 === 0) {
          data[i] = C.air[0]; data[i + 1] = C.air[1]; data[i + 2] = C.air[2]; data[i + 3] = 90;
        } else {
          data[i + 3] = 0;
        }
        continue;
      }

      // Sphere normal, then spin around the vertical axis
      const nx = dx, ny = dy, nz = Math.sqrt(1 - d2);
      const rx = nx * cos + nz * sin;
      const rz = -nx * sin + nz * cos;

      const h = fbm(rx * 1.7 + 10, ny * 1.7 + 10, rz * 1.7 + 10, 7);
      const lat = Math.abs(ny);
      const ice = lat + (fbm(rx * 4, ny * 4, rz * 4, 31) - 0.5) * 0.12 > 0.95;

      let col;
      if (ice) col = C.snow;
      else if (h < 0.47) col = h < 0.4 ? C.deep : C.ocean;
      else if (h < 0.5) col = C.shallow;
      else if (h < 0.52) col = C.sand;
      else {
        const wet = fbm(rx * 3 + 50, ny * 3, rz * 3, 19);
        if (h > 0.66) col = h > 0.74 ? C.snow : C.rock;
        else if (lat < 0.35 && wet > 0.55) col = C.jungle;
        else if (wet < 0.42) col = C.dry;
        else col = h > 0.58 ? C.forest : C.grass;
      }

      // Clouds drift a little faster than the ground
      const qx = nx * cc + nz * cs, qz = -nx * cs + nz * cc;
      const cloud = fbm(qx * 2.6 + 90, ny * 3.2, qz * 2.6, 53);
      if (cloud > 0.67) col = C.cloud;

      // Lighting in four bands for a pixel-art look, plus a dark limb
      const lit = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const band = Math.min(3, Math.floor((0.2 + lit * 0.95) * 4)) / 3;
      const shade = 0.28 + band * 0.72;
      const mix = (a, b) => Math.round(b + (a - b) * shade);
      data[i]     = mix(col[0], C.night[0]);
      data[i + 1] = mix(col[1], C.night[1]);
      data[i + 2] = mix(col[2], C.night[2]);
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
};

const PixelEarth = () => {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(EARTH_W, EARTH_H);
    let rot = 0.6;
    paintEarth(ctx, img, rot);
    if (prefersReducedMotion()) return;

    // Turn slowly, redrawing at a low frame rate for a retro feel.
    // Pause while the hero is off screen.
    let timer = 0;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => { rot += 0.012; paintEarth(ctx, img, rot); }, 120);
    };
    const stop = () => { clearInterval(timer); timer = 0; };
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()))
      : null;
    if (io) io.observe(canvas); else start();
    return () => { stop(); io?.disconnect(); };
  }, []);

  return (
    <div className={styles.earth} aria-hidden="true">
      <canvas ref={ref} width={EARTH_W} height={EARTH_H} className={styles.earthCanvas} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Hero scene — a pixel-art neighbourhood map in layers
// ─────────────────────────────────────────────────────────────

const MAP_W = 96;
const MAP_H = 80;

/** Paints a tiny map at 96×80 pixels; CSS scales it up with crisp pixels. */
const drawPixelMap = (canvas) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };

  // Ground with a faint block grid
  ctx.fillStyle = '#141414';
  ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x % 8 === 0 || y % 8 === 0) px(x, y, '#1b1b1b');
      else if ((x * 7 + y * 13) % 29 === 0) px(x, y, '#1a1a1a');
    }
  }

  // Park: dithered greens
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const d = Math.hypot(x - 74, y - 20);
      if (d < 11) px(x, y, (x + y) % 2 ? '#2f4a22' : '#3c5d2b');
      if (d < 7 && (x * y) % 5 === 0) px(x, y, '#5b8a3a');
    }
  }

  // Water: an olive channel along the bottom
  for (let x = 0; x < MAP_W; x++) {
    const top = 66 + Math.round(Math.sin(x / 7) * 2);
    for (let y = top; y < top + 5; y++) px(x, y, (x + y) % 3 ? '#22261c' : '#2b3122');
    if (x % 6 === 0) px(x, top + 2, '#3a4230');
  }

  // Roads
  const road = '#34342f';
  for (let x = 0; x < MAP_W; x++) { px(x, 30, road); px(x, 31, road); }
  for (let y = 0; y < MAP_H; y++) { px(34, y, road); px(35, y, road); }
  for (let i = 0; i < 60; i++) {
    const y = 78 - Math.floor(i * 1.2);
    px(48 + i, y, road);
    px(49 + i, y, road);
  }
  for (let x = 0; x < MAP_W; x += 2) px(x, 48, '#2a2a26');

  // Search radius: dashed lime ring
  for (let a = 0; a < 360; a += 4) {
    if ((a / 4) % 3 === 2) continue;
    const r = (a * Math.PI) / 180;
    px(Math.round(44 + Math.cos(r) * 22), Math.round(42 + Math.sin(r) * 22), '#5f7a33');
  }
};

const PINS = [
  { x: 20, y: 22, full: false, d: 0 },
  { x: 72, y: 46, full: true,  d: 0.6 },
  { x: 58, y: 62, full: false, d: 1.2 },
  { x: 28, y: 70, full: false, d: 1.8 },
  { x: 86, y: 72, full: false, d: 2.4 },
];

const TOASTS = [
  'Priya joined Sunrise run',
  'Board games night is full',
  'A spot opened at Pottery 101',
  'Arjun joined Sunrise run',
];

const HeroScene = () => {
  const canvasRef = useRef(null);
  const [toast, setToast]   = useState(0);
  const [joined, setJoined] = useState(5);

  useEffect(() => {
    if (canvasRef.current) drawPixelMap(canvasRef.current);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => {
      setToast((t) => (t + 1) % TOASTS.length);
      setJoined((j) => (j >= 7 ? 4 : j + 1));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.titlebar}>
        <span>nearby.map</span>
        <span className={styles.winBtns}><i /><i /><i /></span>
      </div>

      <div className={styles.viewport}>
        {/* Layer 0: pixel map */}
        <div className={`${styles.layer} ${styles.depth0}`}>
          <canvas ref={canvasRef} width={MAP_W} height={MAP_H} className={styles.mapCanvas} />
        </div>

        {/* Layer 1: you + pins */}
        <div className={`${styles.layer} ${styles.depth1}`}>
          <span className={styles.you} style={{ left: '46%', top: '52%' }} />
          {PINS.map((p, i) => (
            <span
              key={i}
              className={`${styles.pin} ${p.full ? styles.pinFull : ''}`}
              style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
            />
          ))}
        </div>

        {/* Layer 2: floating panels */}
        <div className={`${styles.layer} ${styles.depth2}`}>
          <div className={`${styles.panel} ${styles.meetupCard}`}>
            <div className={styles.mcTop}>
              <span className={styles.chip}>Outdoor</span>
              <span>Sat 06:30</span>
            </div>
            <div className={styles.mcTitle}>Sunrise run, Cubbon Park</div>
            <div className={styles.blocks}>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} className={i < joined ? styles.blockOn : ''} />
              ))}
            </div>
            <div className={styles.mcMeta}>
              <span className={styles.avatars}><i /><i /><i /></span>
              <span><b>{joined}</b>/8 joined</span>
            </div>
          </div>

          <div className={`${styles.panel} ${styles.chatCard}`}>
            <div className={styles.bubble}>Meet at the main gate?</div>
            <div className={`${styles.bubble} ${styles.bubbleOwn}`}>Yes. 06:20. Bringing water</div>
            <div className={styles.typing}><i /><i /><i /></div>
          </div>

          <div className={`${styles.panel} ${styles.toast}`} key={toast}>
            &gt; {TOASTS[toast]}<span className={styles.caret} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

const LandingPage = () => {
  const rootRef  = useRef(null);
  const scrolled = useScrollAndPointer(rootRef);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab]           = useState('guests');
  const [openFaq, setOpenFaq]   = useState(0);
  const [step, setStep]         = useState(0);
  const stepRefs = useRef([]);
  useReveal(rootRef);

  useEffect(() => {
    document.title = 'CIRCLO · Meet people nearby';
    // Match the overscroll area to the page
    const prev = document.body.style.background;
    document.body.style.background = getComputedStyle(rootRef.current).getPropertyValue('--bg');
    return () => { document.body.style.background = prev; };
  }, []);

  // Highlight the step closest to the middle of the screen
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setStep(Number(e.target.dataset.step));
      }),
      { rootMargin: '-45% 0px -45% 0px' }
    );
    stepRefs.current.forEach((n) => n && io.observe(n));
    return () => io.disconnect();
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div ref={rootRef} className={styles.page}>
      <div className={styles.progress} aria-hidden="true" />
      <div className={styles.scanlines} aria-hidden="true" />
      <PixelEarth />
      <a href="#main" className={styles.skip}>Skip to content</a>

      {/* ── Nav ─────────────────────────────────────────── */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <PixelIcon name="pin" className={styles.brandIcon} />
          circlo
        </Link>
        <nav className={`${styles.navLinks} ${menuOpen ? styles.navOpen : ''}`} aria-label="Main">
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
          <Link to="/login" onClick={closeMenu}>Sign in</Link>
          <Link to="/register" className={styles.navCta} onClick={closeMenu}>(Sign up)</Link>
        </nav>
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span />
        </button>
      </header>

      <main id="main">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroBar} data-reveal>
            <span>Nearby <b aria-hidden="true">✦✦✦</b></span>
            <span className={styles.heroBarRight}>If it’s happening within 10 km,<br />it’s on the map.</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1 className={styles.h1} data-reveal>
                Meet<span className={styles.slash}>/</span><br />
                people<span className={styles.slash}>/</span><br />
                nearby<span className={styles.cursor} aria-hidden="true" />
              </h1>
              <p className={styles.lede} data-reveal>
                CIRCLO shows what people around you are doing today. Join a run, a jam
                session or a study table, then sort the details in the group chat.
              </p>
              <div className={styles.ctaRow} data-reveal>
                <BracketLink to="/register">Find a meetup</BracketLink>
                <BracketLink to="/login" variant="ghost">Sign in</BracketLink>
              </div>
            </div>
            <HeroScene />
          </div>
        </section>

        {/* ── Marquee ───────────────────────────────────── */}
        <div className={styles.marquee} aria-label="Meetup categories">
          <div className={styles.marqueeTrack}>
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <span key={i} aria-hidden={i >= CATEGORIES.length}>
                {c}<i aria-hidden="true">/</i>
              </span>
            ))}
          </div>
        </div>

        {/* ── How it works (lime band, sticky) ──────────── */}
        <section id="how" className={styles.band}>
          <div className={styles.how}>
            <div className={styles.howSticky}>
              <p className={styles.kicker}>How it works ✦</p>
              <h2 className={styles.h2}>Three taps<span className={styles.slash}>/</span> then go.</h2>
              <div className={styles.rail} aria-hidden="true">
                {STEPS.map((s, i) => <i key={s.n} className={i <= step ? styles.railOn : ''} />)}
              </div>
            </div>
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li
                  key={s.n}
                  ref={(n) => (stepRefs.current[i] = n)}
                  data-step={i}
                  className={`${styles.step} ${step === i ? styles.stepActive : ''}`}
                >
                  <span className={styles.stepNum}>{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Features grid ─────────────────────────────── */}
        <section id="features" className={styles.features}>
          <p className={styles.kicker} data-reveal>Features ✦</p>
          <h2 className={styles.h2} data-reveal>Small<span className={styles.slash}>/</span> fast<span className={styles.slash}>/</span> local.</h2>

          <div className={styles.bento}>
            <article className={`${styles.card} ${styles.aMap}`} data-reveal>
              <PixelIcon name="grid" />
              <h3>A map that is always current</h3>
              <p>Pins change colour the moment a meetup fills or a spot opens. No refreshing.</p>
              <div className={styles.miniMap} aria-hidden="true">
                {[12, 34, 52, 70, 88].map((x, i) => (
                  <span key={x} className={`${styles.miniPin} ${i === 2 ? styles.miniPinFlip : ''}`} style={{ left: `${x}%`, top: `${30 + ((i * 23) % 45)}%` }} />
                ))}
              </div>
            </article>

            <article className={`${styles.card} ${styles.aMeter}`} data-reveal>
              <PixelIcon name="bolt" />
              <h3>Never overbooked</h3>
              <p>Spots are claimed in a single step on the server, so two people can’t take the last one.</p>
              <div className={styles.meter} aria-hidden="true">
                {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 0.25}s` }} />)}
              </div>
            </article>

            <article className={`${styles.card} ${styles.aLock}`} data-reveal>
              <PixelIcon name="lock" className={styles.blink} />
              <h3>Chat for attendees only</h3>
              <p>Every meetup gets a private room. Leave, and you’re out of the conversation.</p>
            </article>

            <article className={`${styles.card} ${styles.aCats}`} data-reveal>
              <PixelIcon name="pin" />
              <h3>Ten ways to spend an evening</h3>
              <ul className={styles.catList}>
                {CATEGORIES.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </article>

            <article className={`${styles.card} ${styles.aAuth}`} data-reveal>
              <div>
                <PixelIcon name="key" />
                <h3>One account, two ways in</h3>
                <p>Sign up with email or continue with Google. Either way, you are on the map in under a minute.</p>
              </div>
              <div className={styles.signinRow} aria-hidden="true">
                <span>Email</span><span>Google</span>
              </div>
            </article>
          </div>
        </section>

        {/* ── Tabs ──────────────────────────────────────── */}
        <section className={styles.tabsSection}>
          <div className={styles.tabList} role="tablist" aria-label="Who CIRCLO is for" data-reveal>
            {Object.entries(TABS).map(([key, t]) => (
              <button
                key={key}
                role="tab"
                id={`tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                className={tab === key ? styles.tabActive : ''}
                onClick={() => setTab(key)}
              >
                {t.label}
              </button>
            ))}
            <span className={styles.tabThumb} style={{ transform: `translateX(${tab === 'guests' ? 0 : 100}%)` }} aria-hidden="true" />
          </div>
          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className={styles.tabPanel}
            key={tab}
          >
            {TABS[tab].points.map(([title, body], i) => (
              <div key={title} className={styles.point}>
                <span className={styles.pointNum}>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Numbers ───────────────────────────────────── */}
        <section className={styles.stats} aria-label="CIRCLO in numbers">
          <div data-reveal><strong><CountUp to={10} /></strong><span>categories to browse</span></div>
          <div data-reveal><strong><CountUp to={10} suffix="km" /></strong><span>search radius</span></div>
          <div data-reveal><strong><CountUp to={500} /></strong><span>people per meetup, max</span></div>
          <div data-reveal><strong><CountUp to={1} /></strong><span>tap to join</span></div>
        </section>

        {/* ── FAQ ───────────────────────────────────────── */}
        <section id="faq" className={styles.faq}>
          <div>
            <p className={styles.kicker} data-reveal>FAQ ✦</p>
            <h2 className={styles.h2} data-reveal>Before you<span className={styles.slash}>/</span> head out.</h2>
          </div>
          <div className={styles.accordion}>
            {FAQ.map(([q, a], i) => {
              const open = openFaq === i;
              return (
                <div key={q} className={`${styles.qa} ${open ? styles.qaOpen : ''}`}>
                  <h3>
                    <button
                      aria-expanded={open}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpenFaq(open ? -1 : i)}
                    >
                      <span>{q}</span>
                      <span className={styles.plus} aria-hidden="true">{open ? '−' : '+'}</span>
                    </button>
                  </h3>
                  <div id={`faq-${i}`} role="region" className={styles.answer}>
                    <p>&gt; {a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className={styles.cta}>
          <div className={styles.ctaPixels} aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => <i key={i} style={{ animationDelay: `${(i * 0.37) % 4}s` }} />)}
          </div>
          <h2 className={styles.ctaTitle} data-reveal>Join<span className={styles.slash}>/</span><br />in.</h2>
          <p className={styles.ctaText} data-reveal>Someone nearby is starting something.</p>
          <div data-reveal>
            <BracketLink to="/register">Create your account</BracketLink>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}><PixelIcon name="pin" className={styles.brandIcon} />circlo</span>
        <nav aria-label="Footer">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
          <Link to="/login">Sign in</Link>
        </nav>
        <small>© {new Date().getFullYear()} CIRCLO</small>
      </footer>
    </div>
  );
};

export default LandingPage;
