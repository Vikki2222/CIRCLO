import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

// ─────────────────────────────────────────────────────────────
// Small hooks
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

/** Counts from 0 to `to` once the element is visible. */
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
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / 1400, 1);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);

  return <span ref={ref}>{value}{suffix}</span>;
};

/** Card that tracks the cursor for a soft spotlight border. */
const SpotlightCard = ({ className = '', children, ...rest }) => {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <article className={`${styles.card} ${className}`} onPointerMove={onMove} {...rest}>
      {children}
    </article>
  );
};

/** Button that leans slightly toward the cursor. */
const MagneticLink = ({ to, className, children }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    if (prefersReducedMotion()) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.25;
    const y = (e.clientY - r.top - r.height / 2) * 0.35;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <Link ref={ref} to={to} className={className} onPointerMove={onMove} onPointerLeave={reset}>
      {children}
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
// Hero scene — layered, parallax "living map"
// ─────────────────────────────────────────────────────────────

const PINS = [
  { x: 18, y: 30, full: false, d: 0 },
  { x: 72, y: 22, full: true,  d: 0.8 },
  { x: 58, y: 64, full: false, d: 1.6 },
  { x: 30, y: 74, full: false, d: 2.4 },
  { x: 86, y: 58, full: false, d: 3.2 },
];

const TOASTS = [
  'Priya joined Sunrise run',
  'Board games night is full',
  'A spot opened at Pottery 101',
  'Arjun joined Sunrise run',
];

const HeroScene = () => {
  const [toast, setToast]   = useState(0);
  const [joined, setJoined] = useState(5);

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
      {/* Window chrome */}
      <div className={styles.titlebar}>
        <span className={styles.lights}><i /><i /><i /></span>
        <span className={styles.titleText}>Nearby · 10 km</span>
      </div>

      {/* Layer 0: street grid */}
      <svg className={`${styles.layer} ${styles.depth0}`} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="blocks" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#blocks)" className={styles.gridLines} />
        <path className={styles.road} d="M-10 210 C 90 170, 150 240, 240 180 S 380 120, 420 150" />
        <path className={styles.road} d="M120 -10 C 140 80, 100 160, 170 310" />
        <path className={styles.roadThin} d="M-10 90 L 420 60" />
        <path className={styles.roadThin} d="M300 -10 L 260 310" />
        <path className={styles.river} d="M-10 270 C 80 240, 160 290, 260 255 S 380 230, 420 250" />
        <circle className={styles.park} cx="300" cy="110" r="34" />
      </svg>

      {/* Layer 1: radius ring + pins */}
      <div className={`${styles.layer} ${styles.depth1}`}>
        <div className={styles.radius} />
        <div className={styles.youDot} />
        {PINS.map((p, i) => (
          <span
            key={i}
            className={`${styles.pin} ${p.full ? styles.pinFull : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }}
          />
        ))}
      </div>

      {/* Layer 2: floating UI */}
      <div className={`${styles.layer} ${styles.depth2}`}>
        <div className={`${styles.float} ${styles.meetupCard}`}>
          <div className={styles.mcTop}>
            <span className={styles.chip}>Outdoor</span>
            <span className={styles.mcTime}>Sat · 6:30 am</span>
          </div>
          <div className={styles.mcTitle}>Sunrise run, Cubbon Park</div>
          <div className={styles.bar}><span style={{ width: `${(joined / 8) * 100}%` }} /></div>
          <div className={styles.mcMeta}>
            <span className={styles.avatars}>
              <i style={{ background: '#febc2e' }} /><i style={{ background: '#28c840' }} /><i style={{ background: '#8e8e93' }} />
            </span>
            <span><b>{joined}</b>/8 joined</span>
          </div>
        </div>

        <div className={`${styles.float} ${styles.chatCard}`}>
          <div className={styles.bubble}>Meet at the main gate?</div>
          <div className={`${styles.bubble} ${styles.bubbleOwn}`}>Yes, 6:20. Bringing water</div>
          <div className={styles.typing}><i /><i /><i /></div>
        </div>

        <div className={`${styles.float} ${styles.toast}`} key={toast}>
          <span className={styles.toastDot} />
          {TOASTS[toast]}
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
    // Match the overscroll area to the page instead of the app's dark body
    const prev = document.body.style.background;
    document.body.style.background = getComputedStyle(rootRef.current).getPropertyValue('--ink');
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
      <a href="#main" className={styles.skip}>Skip to content</a>

      {/* ── Nav ─────────────────────────────────────────── */}
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <Link to="/" className={styles.brand} onClick={closeMenu}>
          <span className={styles.brandMark} aria-hidden="true" />
          circlo
        </Link>
        <nav className={`${styles.navLinks} ${menuOpen ? styles.navOpen : ''}`} aria-label="Main">
          <a href="#how" onClick={closeMenu}>How it works</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#faq" onClick={closeMenu}>FAQ</a>
          <Link to="/login" className={styles.navSignIn} onClick={closeMenu}>Sign in</Link>
          <Link to="/register" className={styles.btnSmall} onClick={closeMenu}>Get started</Link>
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
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow} data-reveal>
              <span className={styles.liveDot} /> Live meetups, on a map
            </span>
            <h1 className={styles.h1} data-reveal>
              Plans that happen <em>around the corner.</em>
            </h1>
            <p className={styles.lede} data-reveal>
              CIRCLO shows what people near you are doing today. Join a run, a jam
              session or a study table, then sort the details in the group chat.
            </p>
            <div className={styles.ctaRow} data-reveal>
              <MagneticLink to="/register" className={styles.btnPrimary}>
                Find something nearby <span aria-hidden="true">→</span>
              </MagneticLink>
              <Link to="/login" className={styles.btnGhost}>I have an account</Link>
            </div>
          </div>
          <HeroScene />
        </section>

        {/* ── Marquee ───────────────────────────────────── */}
        <div className={styles.marquee} aria-label="Meetup categories">
          <div className={styles.marqueeTrack}>
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <span key={i} aria-hidden={i >= CATEGORIES.length}>
                {c}<i aria-hidden="true">◦</i>
              </span>
            ))}
          </div>
        </div>

        {/* ── How it works (sticky) ─────────────────────── */}
        <section id="how" className={styles.how}>
          <div className={styles.howSticky}>
            <p className={styles.kicker}>How it works</p>
            <h2 className={styles.h2}>From “anyone free?” to <em>on my way</em> in three taps.</h2>
            <div className={styles.rail} aria-hidden="true">
              <span style={{ transform: `scaleY(${(step + 1) / STEPS.length})` }} />
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
        </section>

        {/* ── Bento features ────────────────────────────── */}
        <section id="features" className={styles.features}>
          <p className={styles.kicker} data-reveal>Features</p>
          <h2 className={styles.h2} data-reveal>Small on purpose. <em>Quick</em> by design.</h2>

          <div className={styles.bento}>
            <SpotlightCard className={styles.aMap} data-reveal>
              <h3>A map that is always current</h3>
              <p>Pins change colour the moment a meetup fills or a spot opens. No refreshing.</p>
              <div className={styles.miniMap} aria-hidden="true">
                {[12, 34, 52, 70, 88].map((x, i) => (
                  <span key={x} className={`${styles.miniPin} ${i === 2 ? styles.miniPinFlip : ''}`} style={{ left: `${x}%`, top: `${30 + ((i * 23) % 45)}%` }} />
                ))}
              </div>
            </SpotlightCard>

            <SpotlightCard className={styles.aMeter} data-reveal>
              <h3>Never overbooked</h3>
              <p>Spots are claimed in a single step on the server, so two people can’t take the last one.</p>
              <div className={styles.meter} aria-hidden="true"><span /></div>
            </SpotlightCard>

            <SpotlightCard className={styles.aLock} data-reveal>
              <h3>Chat for attendees only</h3>
              <p>Every meetup gets a private room. Leave, and you’re out of the conversation.</p>
              <div className={styles.lock} aria-hidden="true">
                <span className={styles.lockShackle} /><span className={styles.lockBody} />
              </div>
            </SpotlightCard>

            <SpotlightCard className={styles.aCats} data-reveal>
              <h3>Ten ways to spend an evening</h3>
              <ul className={styles.catList}>
                {CATEGORIES.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </SpotlightCard>

            <SpotlightCard className={styles.aAuth} data-reveal>
              <div>
                <h3>One account, two ways in</h3>
                <p>Sign up with email or continue with Google. Either way, you are on the map in under a minute.</p>
              </div>
              <div className={styles.signinRow} aria-hidden="true">
                <span>Email</span><span>Google</span>
              </div>
            </SpotlightCard>
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
            {TABS[tab].points.map(([title, body]) => (
              <div key={title} className={styles.point}>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Numbers ───────────────────────────────────── */}
        <section className={styles.stats} aria-label="CIRCLO in numbers">
          <div data-reveal><strong><CountUp to={10} /></strong><span>categories to browse</span></div>
          <div data-reveal><strong><CountUp to={10} suffix=" km" /></strong><span>search radius</span></div>
          <div data-reveal><strong><CountUp to={500} /></strong><span>people per meetup, max</span></div>
          <div data-reveal><strong><CountUp to={1} /></strong><span>tap to join</span></div>
        </section>

        {/* ── FAQ ───────────────────────────────────────── */}
        <section id="faq" className={styles.faq}>
          <div>
            <p className={styles.kicker} data-reveal>FAQ</p>
            <h2 className={styles.h2} data-reveal>Before you <em>head out.</em></h2>
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
                      {q}
                      <span className={styles.plus} aria-hidden="true" />
                    </button>
                  </h3>
                  <div id={`faq-${i}`} role="region" className={styles.answer}>
                    <p>{a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────── */}
        <section className={styles.cta}>
          <div className={styles.ctaRings} aria-hidden="true"><span /><span /><span /></div>
          <h2 className={styles.h2} data-reveal>Someone nearby is <em>starting something.</em></h2>
          <div data-reveal>
            <MagneticLink to="/register" className={styles.btnPrimary}>
              Create your account <span aria-hidden="true">→</span>
            </MagneticLink>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span className={styles.brand}><span className={styles.brandMark} aria-hidden="true" />circlo</span>
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
