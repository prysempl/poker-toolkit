import { useState, useEffect, useRef } from "react";

// ─── PAGE ROUTING ───
const PAGES = { HOME: "home", TERMS: "terms", PRIVACY: "privacy" };

// ─── LANDING PAGE ───
const LandingPage = ({ onNavigate }) => {
  const [loaded, setLoaded] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [visibleSections, setVisibleSections] = useState(new Set());
  const sectionRefs = useRef({});

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    setTimeout(() => setLoaded(true), 150);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set([...prev, entry.target.dataset.section]));
          }
        });
      },
      { threshold: 0.15 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loaded]);

  const registerSection = (name) => (el) => {
    if (el) {
      el.dataset.section = name;
      sectionRefs.current[name] = el;
    }
  };

  const isVisible = (name) => visibleSections.has(name);

  const features = [
    {
      icon: "🧠", title: "Preflop Advisor",
      desc: "Select your two cards, pick your position and situation — get an instant recommendation to raise, call, 3-bet, or fold with detailed reasoning and sizing advice.",
      highlight: "Position-aware decisions"
    },
    {
      icon: "🎲", title: "Odds Calculator",
      desc: "Tap your draws from a visual checklist — flush draws, straight draws, overcards — and the app auto-calculates your outs, equity, pot odds, and expected value.",
      highlight: "No mental math needed"
    },
    {
      icon: "🃏", title: "Hand Evaluator",
      desc: "Pick any two hole cards and instantly see their strength rating, tier classification, and actionable advice on how to play them.",
      highlight: "Strength meter + play tips"
    },
    {
      icon: "🎯", title: "Position Guide",
      desc: "Interactive poker table showing recommended opening ranges, hand suggestions, and strategy tips for every seat from UTG to BB.",
      highlight: "Visual table layout"
    },
    {
      icon: "💰", title: "Bankroll Tracker",
      desc: "Log your sessions with buy-in and cash-out amounts. Track total profit/loss, win rate, and average session results over time.",
      highlight: "Track your progress"
    },
    {
      icon: "📖", title: "Poker Glossary",
      desc: "50+ searchable terms organized by category — positions, actions, hand types, key concepts, and bet sizing. Learn the language of poker.",
      highlight: "Free for everyone"
    },
  ];

  const testimonials = [
    { name: "James R.", loc: "London", text: "I used to freeze up every time I had a marginal hand. The preflop advisor gives me confidence to make the right call instantly.", rating: 5 },
    { name: "Sophie M.", loc: "Manchester", text: "The odds calculator is a game changer. I actually understand pot odds now instead of just guessing.", rating: 5 },
    { name: "Daniel K.", loc: "Bristol", text: "Simple, clean, and actually useful at the table. Worth every penny — my win rate has gone up since I started using this.", rating: 5 },
  ];

  const faqs = [
    { q: "Is there a free trial?", a: "Yes — every subscription starts with a 3-day free trial. You won't be charged until the trial ends, and you can cancel anytime before that." },
    { q: "What's included in the free plan?", a: "The free plan gives you access to the Hand Rankings reference and the full Poker Glossary with 50+ searchable terms. All other tools require a Pro subscription." },
    { q: "Can I cancel anytime?", a: "Absolutely. You can cancel your subscription at any time from your account settings. You'll keep access until the end of your current billing period." },
    { q: "Does this work on my phone?", a: "Yes — Poker Toolkit is a web app designed mobile-first. It works on any phone, tablet, or computer with a browser. You can add it to your home screen for an app-like experience." },
    { q: "Is this allowed at the poker table?", a: "Poker Toolkit is a study and training tool. Most casinos and poker rooms don't allow phone use during hands, so use it between sessions to build your instincts and review spots." },
    { q: "How is the preflop advice calculated?", a: "It uses standard tight-aggressive (TAG) strategy for 100bb stacks, factoring in your position, whether you're facing a raise, and the strength tier of your hand. It covers all 1,326 possible starting hand combinations." },
  ];

  const sectionStyle = (name, delay = 0) => ({
    opacity: isVisible(name) ? 1 : 0,
    transform: isVisible(name) ? "translateY(0)" : "translateY(30px)",
    transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a12 0%, #0d1f17 30%, #0a1610 60%, #0f1a14 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#d0c8b8",
      overflowX: "hidden",
    }}>
      {/* Noise */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,26,18,0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "900px", margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => onNavigate(PAGES.HOME)}>
          <span style={{ color: "#c9a84c", fontSize: "18px" }}>♠</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "16px",
            background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>Poker Toolkit</span>
        </div>
        <a href="#pricing" style={{
          background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
          padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 700,
          textDecoration: "none", fontFamily: "'DM Sans', sans-serif",
        }}>Get Started</a>
      </nav>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>

        {/* ── HERO ── */}
        <section style={{
          textAlign: "center", paddingTop: "80px", paddingBottom: "70px",
          opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{ fontSize: "12px", color: "#5a6a5a", letterSpacing: "6px", textTransform: "uppercase", marginBottom: "16px" }}>
            ♠ ♥ ♦ ♣
          </div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 900, lineHeight: 1.1, marginBottom: "20px",
            fontSize: "clamp(36px, 6vw, 56px)",
            background: "linear-gradient(135deg, #f0d78c 0%, #c9a84c 40%, #f0d78c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Make Smarter Decisions<br />at the Poker Table
          </h1>
          <p style={{ fontSize: "17px", color: "#7a8a7a", maxWidth: "520px", margin: "0 auto 32px", lineHeight: 1.6 }}>
            Preflop advice, odds calculations, hand evaluation, and bankroll tracking — all in one tool. Built for players who want to stop guessing and start winning.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#pricing" style={{
              background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
              padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: 800,
              fontFamily: "'Playfair Display', serif", textDecoration: "none",
              boxShadow: "0 4px 24px rgba(201,168,76,0.3)",
            }}>Start Free Trial</a>
            <a href="#features" style={{
              background: "rgba(255,255,255,0.05)", color: "#c9a84c",
              padding: "14px 32px", borderRadius: "12px", fontSize: "15px", fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", textDecoration: "none",
              border: "1px solid rgba(201,168,76,0.2)",
            }}>See Features</a>
          </div>
          <div style={{ marginTop: "20px", fontSize: "12px", color: "#4a5a4a" }}>
            3-day free trial · Cancel anytime · No card charged today
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ── */}
        <div ref={registerSection("proof")} style={{
          display: "flex", justifyContent: "center", gap: "32px", flexWrap: "wrap",
          padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)",
          marginBottom: "60px", ...sectionStyle("proof"),
        }}>
          {[
            { val: "1,326", label: "Hand combos covered" },
            { val: "6", label: "Pro tools included" },
            { val: "50+", label: "Glossary terms" },
            { val: "3-day", label: "Free trial" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ color: "#f0d78c", fontSize: "22px", fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>{s.val}</div>
              <div style={{ color: "#5a6a5a", fontSize: "11px", letterSpacing: "0.5px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── FEATURES ── */}
        <section id="features" ref={registerSection("features")} style={{ marginBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px", ...sectionStyle("features") }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "8px" }}>Everything You Need</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
              background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>Six Tools, One App</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {features.map((f, i) => (
              <div key={i} ref={i === 0 ? registerSection("feat-cards") : undefined}
                style={{
                  borderRadius: "16px", padding: "24px",
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                  ...sectionStyle("feat-cards", i * 0.08),
                }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{f.icon}</div>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "18px", color: "#f0d78c", marginBottom: "4px" }}>{f.title}</h3>
                <div style={{
                  display: "inline-block", borderRadius: "6px", padding: "2px 8px", marginBottom: "10px",
                  background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)",
                  color: "#c9a84c", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px",
                }}>{f.highlight}</div>
                <p style={{ color: "#7a8a7a", fontSize: "13px", lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section ref={registerSection("how")} style={{ marginBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px", ...sectionStyle("how") }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "8px" }}>Simple as 1-2-3</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
              background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>How It Works</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { num: "01", title: "Pick your cards", desc: "Tap your two hole cards from the deck grid. Takes 2 seconds." },
              { num: "02", title: "Set the situation", desc: "Choose your position, whether you're facing a raise, and table size." },
              { num: "03", title: "Get your answer", desc: "Instant recommendation with confidence score, sizing, and detailed reasoning." },
            ].map((step, i) => (
              <div key={i} style={{
                display: "flex", gap: "20px", alignItems: "flex-start",
                borderRadius: "16px", padding: "24px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                ...sectionStyle("how", 0.1 + i * 0.1),
              }}>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "28px",
                  color: "rgba(201,168,76,0.2)", lineHeight: 1, flexShrink: 0, width: "40px",
                }}>{step.num}</div>
                <div>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "16px", color: "#f0d78c", marginBottom: "4px" }}>{step.title}</h3>
                  <p style={{ color: "#7a8a7a", fontSize: "13px", lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section ref={registerSection("reviews")} style={{ marginBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "40px", ...sectionStyle("reviews") }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "8px" }}>From the Table</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
              background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>What Players Say</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{
                borderRadius: "16px", padding: "24px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                ...sectionStyle("reviews", 0.1 + i * 0.1),
              }}>
                <div style={{ color: "#c9a84c", fontSize: "14px", letterSpacing: "2px", marginBottom: "12px" }}>
                  {"★".repeat(t.rating)}
                </div>
                <p style={{ color: "#9a9a8a", fontSize: "13px", lineHeight: 1.6, fontStyle: "italic", marginBottom: "16px" }}>
                  "{t.text}"
                </p>
                <div>
                  <div style={{ color: "#d0c8b8", fontSize: "13px", fontWeight: 600 }}>{t.name}</div>
                  <div style={{ color: "#4a5a4a", fontSize: "11px" }}>{t.loc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" ref={registerSection("pricing")} style={{ marginBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px", ...sectionStyle("pricing") }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "8px" }}>Pricing</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
              background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: "12px",
            }}>Invest in Your Game</h2>
            <p style={{ color: "#6a7a6a", fontSize: "14px" }}>Less than a single buy-in. Pays for itself in one session.</p>
          </div>

          {/* Toggle */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "24px", ...sectionStyle("pricing", 0.1) }}>
            <span style={{ color: !annual ? "#f0d78c" : "#5a6a5a", fontSize: "14px", fontWeight: 600, transition: "color 0.2s" }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              style={{
                position: "relative", width: "48px", height: "26px", borderRadius: "13px", cursor: "pointer", border: "none",
                background: annual ? "linear-gradient(135deg, #c9a84c, #a08030)" : "rgba(255,255,255,0.15)",
                transition: "background 0.3s",
              }}>
              <div style={{
                position: "absolute", width: "20px", height: "20px", borderRadius: "50%", top: "3px",
                left: annual ? "25px" : "3px", transition: "left 0.3s",
                background: annual ? "#1a1a2e" : "#8a9a8a",
              }} />
            </button>
            <span style={{ color: annual ? "#f0d78c" : "#5a6a5a", fontSize: "14px", fontWeight: 600, transition: "color 0.2s" }}>Annual</span>
            <span style={{
              borderRadius: "20px", padding: "3px 10px",
              background: "rgba(39,174,96,0.15)", border: "1px solid rgba(39,174,96,0.25)",
              color: "#27ae60", fontSize: "11px", fontWeight: 700,
            }}>SAVE 37%</span>
          </div>

          {/* Pricing cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", ...sectionStyle("pricing", 0.15) }}>
            {/* Free */}
            <div style={{
              borderRadius: "20px", padding: "28px 24px", textAlign: "center",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ color: "#8a9a8a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>Free</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "36px", color: "#d0c8b8" }}>£0</div>
              <div style={{ color: "#4a5a4a", fontSize: "12px", marginBottom: "20px" }}>forever</div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {["Hand Rankings", "Poker Glossary (50+ terms)"].map(f => (
                  <div key={f} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: "#27ae60", fontSize: "13px" }}>✓</span>
                    <span style={{ color: "#8a9a8a", fontSize: "12px" }}>{f}</span>
                  </div>
                ))}
                {["Preflop Advisor", "Odds Calculator", "Hand Evaluator", "Position Guide", "Bankroll Tracker"].map(f => (
                  <div key={f} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: "#3a4a3a", fontSize: "13px" }}>✗</span>
                    <span style={{ color: "#3a4a3a", fontSize: "12px" }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                background: "rgba(255,255,255,0.05)", color: "#6a7a6a", cursor: "pointer",
              }}>Continue Free</div>
            </div>

            {/* Pro */}
            <div style={{
              borderRadius: "20px", padding: "28px 24px", textAlign: "center", position: "relative",
              background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))",
              border: "2px solid rgba(201,168,76,0.3)",
              boxShadow: "0 0 40px rgba(201,168,76,0.08)",
            }}>
              <div style={{
                position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
                padding: "4px 14px", borderRadius: "20px", fontSize: "10px", fontWeight: 800,
                letterSpacing: "1px", textTransform: "uppercase",
              }}>Most Popular</div>
              <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>Pro</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "36px", color: "#f0d78c" }}>
                £{annual ? "5.66" : "8.97"}
              </div>
              <div style={{ color: "#6a7a6a", fontSize: "12px", marginBottom: "4px" }}>
                /month {annual && <span style={{ color: "#27ae60" }}>· billed £67.97/yr</span>}
              </div>
              <div style={{ color: "#4a5a4a", fontSize: "11px", marginBottom: "20px" }}>3-day free trial</div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
                {["Preflop Advisor", "Odds Calculator", "Hand Evaluator", "Position Guide", "Bankroll Tracker", "Hand Rankings", "Poker Glossary"].map(f => (
                  <div key={f} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ color: "#c9a84c", fontSize: "13px" }}>✓</span>
                    <span style={{ color: "#d0c8b8", fontSize: "12px" }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "12px", borderRadius: "10px", fontSize: "14px", fontWeight: 800, cursor: "pointer",
                background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
                fontFamily: "'Playfair Display', serif",
                boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
              }}>Start Free Trial</div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section ref={registerSection("faq")} style={{ marginBottom: "80px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px", ...sectionStyle("faq") }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", textTransform: "uppercase", letterSpacing: "3px", marginBottom: "8px" }}>FAQ</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
              background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>Questions & Answers</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", ...sectionStyle("faq", 0.1) }}>
            {faqs.map((faq, i) => (
              <button key={i} onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: "100%", textAlign: "left", cursor: "pointer", border: "none",
                  borderRadius: "12px", padding: "16px 20px", transition: "all 0.2s",
                  background: openFaq === i ? "rgba(201,168,76,0.06)" : "rgba(255,255,255,0.02)",
                  borderWidth: "1px", borderStyle: "solid",
                  borderColor: openFaq === i ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.06)",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: openFaq === i ? "#f0d78c" : "#b0a898", fontSize: "14px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{faq.q}</span>
                  <span style={{ color: "#5a6a5a", fontSize: "16px", transition: "transform 0.2s", transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}>+</span>
                </div>
                {openFaq === i && (
                  <div style={{ marginTop: "10px", color: "#7a8a7a", fontSize: "13px", lineHeight: 1.6 }}>{faq.a}</div>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section ref={registerSection("cta")} style={{
          textAlign: "center", marginBottom: "60px",
          borderRadius: "24px", padding: "48px 32px",
          background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))",
          border: "1px solid rgba(201,168,76,0.15)",
          ...sectionStyle("cta"),
        }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>♠</div>
          <h2 style={{
            fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "28px",
            background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: "12px",
          }}>Ready to Level Up?</h2>
          <p style={{ color: "#6a7a6a", fontSize: "14px", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
            Join Poker Toolkit Pro and start making +EV decisions at every table.
          </p>
          <a href="#pricing" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
            padding: "14px 40px", borderRadius: "12px", fontSize: "15px", fontWeight: 800,
            fontFamily: "'Playfair Display', serif", textDecoration: "none",
            boxShadow: "0 4px 24px rgba(201,168,76,0.3)",
          }}>Start Your Free Trial</a>
          <div style={{ marginTop: "12px", color: "#4a5a4a", fontSize: "12px" }}>
            £8.97/month after trial · Cancel anytime
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          padding: "32px 0",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#c9a84c", fontSize: "16px" }}>♠</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "14px", color: "#5a6a5a" }}>Poker Toolkit</span>
          </div>
          <div style={{ display: "flex", gap: "20px" }}>
            <button onClick={() => onNavigate(PAGES.TERMS)} style={{ background: "none", border: "none", color: "#4a5a4a", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>
              Terms of Service
            </button>
            <button onClick={() => onNavigate(PAGES.PRIVACY)} style={{ background: "none", border: "none", color: "#4a5a4a", fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}>
              Privacy Policy
            </button>
          </div>
          <div style={{ color: "#2a3a2a", fontSize: "11px" }}>
            © {new Date().getFullYear()} Poker Toolkit. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── LEGAL PAGE WRAPPER ───
const LegalPage = ({ title, onNavigate, children }) => {
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a12 0%, #0d1f17 30%, #0a1610 60%, #0f1a14 100%)",
      fontFamily: "'DM Sans', sans-serif", color: "#9a9a8a",
    }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px", position: "relative" }}>
        <button onClick={() => onNavigate(PAGES.HOME)} style={{
          background: "none", border: "none", color: "#c9a84c", fontSize: "13px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: "6px", marginBottom: "32px",
        }}>
          <span>←</span> Back to home
        </button>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "32px",
          background: "linear-gradient(135deg, #f0d78c, #c9a84c)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: "8px",
        }}>{title}</h1>
        <div style={{ color: "#4a5a4a", fontSize: "12px", marginBottom: "40px" }}>Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
        <div style={{ lineHeight: 1.8, fontSize: "14px" }}>{children}</div>
      </div>
    </div>
  );
};

const Heading = ({ children }) => (
  <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: "20px", color: "#f0d78c", marginTop: "36px", marginBottom: "12px" }}>{children}</h2>
);
const Para = ({ children }) => <p style={{ marginBottom: "16px", color: "#8a9a8a" }}>{children}</p>;

// ─── TERMS OF SERVICE ───
const TermsPage = ({ onNavigate }) => (
  <LegalPage title="Terms of Service" onNavigate={onNavigate}>
    <Heading>1. Agreement to Terms</Heading>
    <Para>By accessing or using Poker Toolkit ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</Para>

    <Heading>2. Description of Service</Heading>
    <Para>Poker Toolkit is a web-based poker training and decision-support tool. It provides preflop hand advice, odds and equity calculations, position-based strategy guidance, hand evaluation, bankroll tracking, and a poker terminology glossary. The Service is intended for educational and training purposes only.</Para>

    <Heading>3. Accounts</Heading>
    <Para>You must create an account to access Pro features. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You must provide accurate information when creating your account.</Para>

    <Heading>4. Subscriptions and Payment</Heading>
    <Para>Poker Toolkit Pro is available as a monthly (£8.97/month) or annual (£67.97/year) subscription. All new subscriptions include a 3-day free trial. You will not be charged during the trial period. After the trial, your chosen payment method will be charged automatically at the start of each billing cycle. All payments are processed securely through Stripe. We do not store your payment card details.</Para>

    <Heading>5. Cancellation and Refunds</Heading>
    <Para>You may cancel your subscription at any time through your account settings or the Stripe Customer Portal. Upon cancellation, you will retain access to Pro features until the end of your current billing period. No partial refunds are provided for unused portions of a billing period. If you cancel during your free trial, you will not be charged.</Para>

    <Heading>6. Acceptable Use</Heading>
    <Para>You agree not to: use the Service for any illegal purpose; attempt to gain unauthorised access to the Service; reverse engineer or copy the Service; resell, redistribute, or share your account with others; use automated systems to access the Service.</Para>

    <Heading>7. Disclaimer</Heading>
    <Para>Poker Toolkit provides strategy advice and calculations based on standard poker theory. The Service does not guarantee winnings or profitable outcomes. Poker involves risk, and results depend on many factors beyond the scope of this tool. The Service is for educational use only and should not be used as a substitute for your own judgement at the table. We are not responsible for any financial losses incurred while playing poker.</Para>

    <Heading>8. Intellectual Property</Heading>
    <Para>All content, design, code, and branding of Poker Toolkit is owned by us and protected by intellectual property laws. You may not copy, modify, or distribute any part of the Service without prior written permission.</Para>

    <Heading>9. Limitation of Liability</Heading>
    <Para>To the maximum extent permitted by law, Poker Toolkit shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.</Para>

    <Heading>10. Changes to Terms</Heading>
    <Para>We may update these Terms from time to time. We will notify registered users of material changes via email. Continued use of the Service after changes constitutes acceptance of the updated Terms.</Para>

    <Heading>11. Governing Law</Heading>
    <Para>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</Para>

    <Heading>12. Contact</Heading>
    <Para>For questions about these Terms, please contact us at support@pokertoolkit.app.</Para>
  </LegalPage>
);

// ─── PRIVACY POLICY ───
const PrivacyPage = ({ onNavigate }) => (
  <LegalPage title="Privacy Policy" onNavigate={onNavigate}>
    <Heading>1. Introduction</Heading>
    <Para>Poker Toolkit ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our Service. We comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</Para>

    <Heading>2. Information We Collect</Heading>
    <Para>Account information: When you create an account, we collect your email address and a securely hashed version of your password. We do not store your password in plain text.</Para>
    <Para>Payment information: Payments are processed by Stripe. We do not store your credit card number, expiry date, or CVC. Stripe handles all payment data in accordance with PCI DSS standards. We receive only a Stripe customer ID and subscription status.</Para>
    <Para>Usage data: We may collect anonymous, aggregated usage data such as which features are used most frequently. This data cannot identify individual users.</Para>
    <Para>Bankroll data: If you use the Bankroll Tracker, session data (buy-in amounts, results, dates) is stored in your browser or device. We do not transmit this data to our servers.</Para>

    <Heading>3. How We Use Your Information</Heading>
    <Para>We use your information to: provide and maintain the Service; process subscription payments; send important service communications (e.g., billing confirmations, subscription changes); improve the Service based on aggregated usage patterns. We do not sell, rent, or share your personal information with third parties for marketing purposes.</Para>

    <Heading>4. Legal Basis for Processing</Heading>
    <Para>We process your data on the following legal bases: contractual necessity (to provide the Service you subscribed to); legitimate interests (to improve the Service and prevent fraud); consent (for any optional communications, which you can withdraw at any time).</Para>

    <Heading>5. Data Retention</Heading>
    <Para>We retain your account data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are legally required to retain it (e.g., financial records for tax purposes, which we retain for 7 years).</Para>

    <Heading>6. Your Rights</Heading>
    <Para>Under UK GDPR, you have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; request restriction of processing; data portability; object to processing; withdraw consent at any time. To exercise any of these rights, contact us at privacy@pokertoolkit.app.</Para>

    <Heading>7. Data Security</Heading>
    <Para>We use industry-standard security measures to protect your data, including encrypted connections (HTTPS), secure password hashing (bcrypt), and secure third-party payment processing (Stripe). However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</Para>

    <Heading>8. Third-Party Services</Heading>
    <Para>We use the following third-party services: Stripe (payment processing — see stripe.com/privacy); hosting providers for our servers and frontend. These providers process data in accordance with their own privacy policies and applicable law.</Para>

    <Heading>9. Cookies</Heading>
    <Para>Poker Toolkit uses essential cookies and local storage to maintain your login session. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</Para>

    <Heading>10. Children's Privacy</Heading>
    <Para>The Service is not intended for individuals under the age of 18. We do not knowingly collect data from children. If you believe a child has provided us with personal data, please contact us and we will delete it.</Para>

    <Heading>11. Changes to This Policy</Heading>
    <Para>We may update this Privacy Policy from time to time. We will notify registered users of material changes via email. The date at the top of this page indicates when the policy was last updated.</Para>

    <Heading>12. Contact</Heading>
    <Para>For privacy-related questions or to exercise your data rights, contact us at privacy@pokertoolkit.app.</Para>
  </LegalPage>
);

// ─── APP ROUTER ───
export default function App() {
  const [page, setPage] = useState(PAGES.HOME);

  const navigate = (p) => {
    setPage(p);
    window.scrollTo(0, 0);
  };

  switch (page) {
    case PAGES.TERMS: return <TermsPage onNavigate={navigate} />;
    case PAGES.PRIVACY: return <PrivacyPage onNavigate={navigate} />;
    default: return <LandingPage onNavigate={navigate} />;
  }
}
