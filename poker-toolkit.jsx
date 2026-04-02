import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "https://poker-toolkit-production.up.railway.app";

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const RANK_NAMES = { "2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","T":"10","J":"J","Q":"Q","K":"K","A":"A" };

const HAND_RANKINGS = [
  { name: "Royal Flush", desc: "A, K, Q, J, 10 of the same suit", odds: "0.000154%", example: "A♠ K♠ Q♠ J♠ T♠" },
  { name: "Straight Flush", desc: "Five sequential cards of the same suit", odds: "0.00139%", example: "8♥ 7♥ 6♥ 5♥ 4♥" },
  { name: "Four of a Kind", desc: "Four cards of the same rank", odds: "0.0240%", example: "K♠ K♥ K♦ K♣ 3♠" },
  { name: "Full House", desc: "Three of a kind plus a pair", odds: "0.144%", example: "J♠ J♥ J♦ 8♣ 8♠" },
  { name: "Flush", desc: "Five cards of the same suit", odds: "0.197%", example: "A♦ J♦ 8♦ 6♦ 3♦" },
  { name: "Straight", desc: "Five sequential cards, any suits", odds: "0.392%", example: "9♣ 8♠ 7♥ 6♦ 5♣" },
  { name: "Three of a Kind", desc: "Three cards of the same rank", odds: "2.11%", example: "7♠ 7♥ 7♦ K♣ 2♠" },
  { name: "Two Pair", desc: "Two different pairs", odds: "4.75%", example: "A♠ A♥ 9♦ 9♣ 4♠" },
  { name: "One Pair", desc: "Two cards of the same rank", odds: "42.3%", example: "T♠ T♥ K♦ 7♣ 3♠" },
  { name: "High Card", desc: "No matching cards", odds: "50.1%", example: "A♠ J♦ 8♣ 6♥ 2♠" },
];

const POSITION_INFO = {
  "UTG": { name: "Under the Gun", range: "~15%", hands: "77+, ATs+, KQs, AJo+, KQo", tip: "Play tight. You have the worst position preflop." },
  "MP": { name: "Middle Position", range: "~18%", hands: "66+, A9s+, KJs+, QJs, ATo+, KQo", tip: "Slightly wider than UTG but still conservative." },
  "CO": { name: "Cutoff", range: "~25%", hands: "55+, A5s+, K9s+, QTs+, J9s+, ATo+, KJo+, QJo", tip: "Great steal position. Widen your range." },
  "BTN": { name: "Button", range: "~35%", hands: "22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, A7o+, K9o+, QTo+, JTo", tip: "Best position. Play the widest range here." },
  "SB": { name: "Small Blind", range: "~28%", hands: "44+, A3s+, K7s+, Q9s+, J9s+, T9s, A9o+, KTo+, QJo", tip: "Tough spot post-flop. 3-bet or fold > calling." },
  "BB": { name: "Big Blind", range: "~35%+ (defending)", hands: "Wide — defend with pot odds", tip: "You already invested. Defend wider vs steals." },
};

// Pot odds / equity calculator helpers
function calcPotOdds(potSize, betSize) {
  if (potSize <= 0 || betSize <= 0) return 0;
  return (betSize / (potSize + betSize)) * 100;
}

function calcEV(equity, potSize, betSize) {
  const eqDec = equity / 100;
  return eqDec * (potSize + betSize) - (1 - eqDec) * betSize;
}

// Preflop hand strength (simplified)
function getHandStrength(c1r, c2r, suited) {
  const r1 = RANKS.indexOf(c1r), r2 = RANKS.indexOf(c2r);
  const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  if (hi === lo) return 6 + hi * 0.5; // pairs
  const gap = hi - lo;
  let score = (hi + lo) / 2;
  if (suited) score += 2;
  if (gap <= 1) score += 1;
  if (gap <= 3) score += 0.5;
  if (hi >= 11) score += 2; // broadway
  if (hi === 12) score += 2; // ace
  return Math.min(score, 12);
}

const Card = ({ rank, suit, size = "md", onClick, selected, disabled, faceDown }) => {
  const isRed = suit === "♥" || suit === "♦";
  const sizes = {
    sm: { w: "w-10", h: "h-14", text: "text-xs", suit: "text-sm" },
    md: { w: "w-14", h: "h-20", text: "text-sm", suit: "text-lg" },
    lg: { w: "w-20", h: "h-28", text: "text-lg", suit: "text-2xl" },
  };
  const s = sizes[size] || sizes.md;

  if (faceDown) {
    return (
      <div className={`${s.w} ${s.h} rounded-lg flex items-center justify-center`}
        style={{
          background: "repeating-linear-gradient(45deg, #1a3a2a, #1a3a2a 4px, #1f4533 4px, #1f4533 8px)",
          border: "2px solid #c9a84c",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}>
        <span style={{ color: "#c9a84c", fontSize: "18px" }}>♠</span>
      </div>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`${s.w} ${s.h} rounded-lg flex flex-col items-center justify-center relative transition-all duration-200`}
      style={{
        background: selected ? "linear-gradient(135deg, #fffde8, #fff9c4)" : "linear-gradient(135deg, #ffffff, #f8f6f0)",
        border: selected ? "2px solid #c9a84c" : "2px solid #d0c8b8",
        boxShadow: selected ? "0 0 12px rgba(201,168,76,0.5), 0 4px 12px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.2)",
        cursor: disabled ? "default" : onClick ? "pointer" : "default",
        transform: selected ? "translateY(-4px)" : "none",
        color: isRed ? "#c0392b" : "#1a1a2e",
      }}
    >
      <span className={`${s.text} font-bold leading-none`}>{RANK_NAMES[rank]}</span>
      <span className={`${s.suit} leading-none`}>{suit}</span>
    </div>
  );
};

const TabButton = ({ active, onClick, children, icon }) => (
  <button
    onClick={onClick}
    className="relative px-3 py-3 transition-all duration-300 whitespace-nowrap"
    style={{
      color: active ? "#f0d78c" : "#8a9a8a",
      borderBottom: active ? "2px solid #c9a84c" : "2px solid transparent",
      background: active ? "rgba(201,168,76,0.08)" : "transparent",
      fontFamily: "'Playfair Display', serif",
      fontSize: "12px",
      fontWeight: active ? 700 : 500,
      letterSpacing: "0.3px",
    }}
  >
    <span className="mr-1">{icon}</span>{children}
  </button>
);

// ─── ODDS CALCULATOR TAB ───

const DRAW_TYPES = [
  { id: "flush", name: "Flush draw", desc: "4 cards to a flush", outs: 9, icon: "♦" },
  { id: "oesd", name: "Open-ended straight draw", desc: "e.g. 6-7 on a 8-9 board", outs: 8, icon: "↔" },
  { id: "gutshot", name: "Gutshot straight draw", desc: "Need one middle card", outs: 4, icon: "→" },
  { id: "overcards2", name: "Two overcards", desc: "e.g. AK on a low board", outs: 6, icon: "▲" },
  { id: "overcard1", name: "One overcard", desc: "One card above board", outs: 3, icon: "△" },
  { id: "pair_to_two", name: "Pair → two pair", desc: "Hit your kicker", outs: 3, icon: "②" },
  { id: "pair_to_trips", name: "Pair → three of a kind", desc: "Hit your set", outs: 2, icon: "③" },
  { id: "two_to_full", name: "Two pair → full house", desc: "Fill up", outs: 4, icon: "⬢" },
  { id: "set_to_full", name: "Set → full house / quads", desc: "Board pairs or quad", outs: 7, icon: "★" },
];

const OddsCalculator = () => {
  const [potSize, setPotSize] = useState("");
  const [betSize, setBetSize] = useState("");
  const [selectedDraws, setSelectedDraws] = useState([]);
  const [street, setStreet] = useState("flop");
  const [manualOuts, setManualOuts] = useState("");

  const toggleDraw = (id) => {
    setSelectedDraws(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };

  // Calculate total outs (cap overlapping draws - e.g. flush+straight share some outs)
  const rawOuts = selectedDraws.reduce((sum, id) => sum + (DRAW_TYPES.find(d => d.id === id)?.outs || 0), 0);
  // Rough overlap correction: if flush draw + straight draw both selected, ~2 outs overlap
  const hasFlush = selectedDraws.includes("flush");
  const hasStraightDraw = selectedDraws.includes("oesd") || selectedDraws.includes("gutshot");
  const overlapCorrection = (hasFlush && hasStraightDraw) ? 2 : 0;

  const useManual = manualOuts && parseFloat(manualOuts) > 0;
  const totalOuts = useManual ? parseFloat(manualOuts) : Math.max(0, rawOuts - overlapCorrection);

  // Equity via rule of 4/2
  const equityPct = street === "flop"
    ? Math.min(totalOuts * 4, 100)
    : Math.min(totalOuts * 2, 100);

  const potOdds = potSize && betSize && parseFloat(betSize) > 0
    ? calcPotOdds(parseFloat(potSize), parseFloat(betSize))
    : null;

  const ev = potOdds !== null && totalOuts > 0
    ? calcEV(equityPct, parseFloat(potSize), parseFloat(betSize))
    : null;

  const profitable = potOdds !== null && totalOuts > 0 ? equityPct > potOdds : null;

  return (
    <div className="space-y-5">
      {/* Step 1: What street */}
      <div>
        <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: "8px" }}>
          ① What street are you on?
        </div>
        <div className="flex gap-2">
          {[
            { val: "flop", label: "Flop", sub: "3 cards out · rule of 4" },
            { val: "turn", label: "Turn", sub: "4 cards out · rule of 2" },
          ].map(s => (
            <button key={s.val} onClick={() => setStreet(s.val)}
              className="rounded-xl px-4 py-3 transition-all duration-200 flex-1 text-left"
              style={{
                background: street === s.val ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                border: street === s.val ? "1px solid rgba(201,168,76,0.35)" : "1px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}>
              <div style={{ color: street === s.val ? "#f0d78c" : "#8a9a8a", fontSize: "14px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{s.label}</div>
              <div style={{ color: "#5a6a5a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", marginTop: "2px" }}>{s.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Select your draws */}
      <div>
        <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: "4px" }}>
          ② What draws do you have?
        </div>
        <div style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", marginBottom: "10px" }}>
          Tap all that apply — outs and equity auto-calculate
        </div>
        <div className="space-y-1.5">
          {DRAW_TYPES.map(d => {
            const active = selectedDraws.includes(d.id);
            return (
              <button key={d.id} onClick={() => toggleDraw(d.id)}
                className="w-full rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all duration-200 text-left"
                style={{
                  background: active ? "rgba(201,168,76,0.10)" : "rgba(255,255,255,0.02)",
                  border: active ? "1px solid rgba(201,168,76,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer",
                }}>
                <div className="rounded-lg w-8 h-8 flex items-center justify-center flex-shrink-0" style={{
                  background: active ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.05)",
                  fontSize: "14px",
                  color: active ? "#f0d78c" : "#5a6a5a",
                }}>{d.icon}</div>
                <div className="flex-1 min-w-0">
                  <div style={{ color: active ? "#f0d78c" : "#9a9a8a", fontSize: "13px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{d.name}</div>
                  <div style={{ color: "#4a5a4a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif" }}>{d.desc}</div>
                </div>
                <div className="rounded-md px-2 py-0.5 flex-shrink-0" style={{
                  background: active ? "rgba(39,174,96,0.15)" : "rgba(255,255,255,0.05)",
                  border: active ? "1px solid rgba(39,174,96,0.25)" : "1px solid rgba(255,255,255,0.08)",
                }}>
                  <span style={{ color: active ? "#27ae60" : "#5a6a5a", fontSize: "11px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{d.outs}</span>
                </div>
              </button>
            );
          })}
        </div>
        {/* Manual override */}
        <div className="mt-3 flex items-center gap-2">
          <span style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>or enter outs manually:</span>
          <input type="number" value={manualOuts} onChange={e => setManualOuts(e.target.value)} placeholder="—"
            className="rounded-lg px-2 py-1 outline-none"
            style={{
              width: "55px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#f0d78c", fontSize: "13px", fontFamily: "'DM Mono', monospace", textAlign: "center",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>
      </div>

      {/* Equity Result */}
      {totalOuts > 0 && (
        <div className="rounded-xl p-4" style={{ background: "rgba(39,174,96,0.06)", border: "1px solid rgba(39,174,96,0.15)" }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div style={{ color: "#8a9a8a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif" }}>Your Estimated Equity</div>
              <div style={{ color: "#27ae60", fontSize: "32px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>~{equityPct.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div style={{ color: "#8a9a8a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif" }}>Outs</div>
              <div style={{ color: "#f0d78c", fontSize: "28px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{totalOuts}</div>
            </div>
          </div>
          <div style={{ color: "#5a6a5a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>
            Using the {street === "flop" ? "Rule of 4 (outs × 4)" : "Rule of 2 (outs × 2)"} — approximation for quick decisions
            {overlapCorrection > 0 && ` · ${overlapCorrection} overlapping outs removed`}
          </div>
        </div>
      )}

      {/* Step 3: Pot & Bet */}
      <div>
        <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: "8px" }}>
          ③ Pot size &amp; bet to call
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <InputField label="Pot Size ($)" value={potSize} onChange={setPotSize} placeholder="e.g. 120" />
          <InputField label="Bet to Call ($)" value={betSize} onChange={setBetSize} placeholder="e.g. 40" />
        </div>
      </div>

      {/* Results */}
      {potOdds !== null && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <ResultBox label="Pot Odds" value={`${potOdds.toFixed(1)}%`} sub="Equity needed to call" />
          <ResultBox label="Your Equity" value={totalOuts > 0 ? `~${equityPct.toFixed(1)}%` : "—"} sub={totalOuts > 0 ? `from ${totalOuts} outs` : "Select draws above"} color={totalOuts > 0 ? (equityPct > potOdds ? "#27ae60" : "#c0392b") : undefined} />
        </div>
      )}

      {ev !== null && (
        <div className="rounded-xl p-4" style={{
          background: ev >= 0
            ? "linear-gradient(135deg, rgba(39,174,96,0.15), rgba(39,174,96,0.05))"
            : "linear-gradient(135deg, rgba(192,57,43,0.15), rgba(192,57,43,0.05))",
          border: `1px solid ${ev >= 0 ? "rgba(39,174,96,0.3)" : "rgba(192,57,43,0.3)"}`,
        }}>
          <div style={{ color: "#8a9a8a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif" }}>The Verdict</div>
          <div style={{ color: ev >= 0 ? "#27ae60" : "#c0392b", fontSize: "28px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            {ev >= 0 ? "✓ CALL" : "✗ FOLD"}
          </div>
          <div style={{ color: ev >= 0 ? "#27ae60" : "#c0392b", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", marginTop: "4px" }}>
            {ev >= 0
              ? `+EV play — your ${equityPct.toFixed(1)}% equity beats the ${potOdds.toFixed(1)}% pot odds`
              : `−EV play — you need ${potOdds.toFixed(1)}% equity but only have ~${equityPct.toFixed(1)}%`
            }
          </div>
          <div className="mt-2 rounded-lg px-3 py-1.5 inline-block" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#8a9a8a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif" }}>EV per call: </span>
            <span style={{ color: ev >= 0 ? "#27ae60" : "#c0392b", fontSize: "13px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>
              {ev >= 0 ? "+" : ""}{ev.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Tip if no draws selected and no manual outs */}
      {totalOuts === 0 && !potOdds && (
        <div className="rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
          <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: "6px" }}>How this works</div>
          <div style={{ color: "#8a9a8a", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", lineHeight: "18px" }}>
            Pick the street you're on, tap the draws you have on the board, then enter the pot size and bet you're facing. The calculator figures out your equity, pot odds, and whether calling is profitable — no mental math needed.
          </div>
        </div>
      )}
    </div>
  );
};

// ─── HAND EVALUATOR ───
const HandEvaluator = () => {
  const [card1Rank, setCard1Rank] = useState(null);
  const [card1Suit, setCard1Suit] = useState(null);
  const [card2Rank, setCard2Rank] = useState(null);
  const [card2Suit, setCard2Suit] = useState(null);
  const [selecting, setSelecting] = useState(1);

  const selectCard = (rank, suit) => {
    if (selecting === 1) {
      setCard1Rank(rank);
      setCard1Suit(suit);
      setSelecting(2);
    } else {
      setCard2Rank(rank);
      setCard2Suit(suit);
      setSelecting(1);
    }
  };

  const isSelected = (r, s) => (card1Rank === r && card1Suit === s) || (card2Rank === r && card2Suit === s);
  const bothSelected = card1Rank && card1Suit && card2Rank && card2Suit;
  const suited = card1Suit === card2Suit;
  const paired = card1Rank === card2Rank;
  const strength = bothSelected ? getHandStrength(card1Rank, card2Rank, suited) : 0;
  const strengthPct = Math.round((strength / 12) * 100);

  const getVerdict = () => {
    if (strengthPct >= 80) return { label: "Premium", color: "#27ae60", advice: "Raise or 3-bet from any position." };
    if (strengthPct >= 60) return { label: "Strong", color: "#c9a84c", advice: "Open-raise from most positions. 3-bet vs late position opens." };
    if (strengthPct >= 40) return { label: "Playable", color: "#e67e22", advice: "Open from CO/BTN. Suited connectors play well in multi-way pots." };
    if (strengthPct >= 25) return { label: "Marginal", color: "#c0392b", advice: "Only open from BTN/SB if folded to you. Fold to raises." };
    return { label: "Weak", color: "#7f8c8d", advice: "Fold in most situations. Not worth the chips." };
  };

  const verdict = bothSelected ? getVerdict() : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 justify-center">
        <div className="text-center">
          <div style={{ color: selecting === 1 ? "#c9a84c" : "#5a6a5a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
            {selecting === 1 ? "▸ " : ""}Card 1
          </div>
          {card1Rank ? <Card rank={card1Rank} suit={card1Suit} size="lg" /> : <div className="w-20 h-28 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: selecting === 1 ? "#c9a84c" : "#2a3a2a", color: "#5a6a5a" }}>?</div>}
        </div>
        <div className="text-center">
          <div style={{ color: selecting === 2 ? "#c9a84c" : "#5a6a5a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
            {selecting === 2 ? "▸ " : ""}Card 2
          </div>
          {card2Rank ? <Card rank={card2Rank} suit={card2Suit} size="lg" /> : <div className="w-20 h-28 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: selecting === 2 ? "#c9a84c" : "#2a3a2a", color: "#5a6a5a" }}>?</div>}
        </div>
      </div>

      {bothSelected && (
        <button onClick={() => { setCard1Rank(null); setCard1Suit(null); setCard2Rank(null); setCard2Suit(null); setSelecting(1); }}
          style={{ display: "block", margin: "0 auto", fontSize: "11px", color: "#8a9a8a", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Reset
        </button>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: "3px" }}>
        {SUITS.map(suit =>
          RANKS.map(rank => (
            <button key={rank + suit} onClick={() => selectCard(rank, suit)}
              disabled={isSelected(rank, suit)}
              className="rounded transition-all duration-150"
              style={{
                padding: "4px 0",
                fontSize: "11px",
                fontWeight: 600,
                background: isSelected(rank, suit) ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.05)",
                color: isSelected(rank, suit) ? "#c9a84c" : (suit === "♥" || suit === "♦") ? "#c0392b" : "#ccc",
                border: "1px solid rgba(255,255,255,0.08)",
                cursor: isSelected(rank, suit) ? "default" : "pointer",
                opacity: isSelected(rank, suit) ? 0.5 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}>
              {RANK_NAMES[rank]}{suit}
            </button>
          ))
        )}
      </div>

      {bothSelected && verdict && (
        <div className="space-y-3">
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: "#8a9a8a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif" }}>Hand Strength</span>
              <span style={{ color: verdict.color, fontSize: "14px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{verdict.label}</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${strengthPct}%`, background: `linear-gradient(90deg, ${verdict.color}, ${verdict.color}cc)` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: "10px", color: "#5a6a5a", fontFamily: "'DM Sans', sans-serif" }}>Weak</span>
              <span style={{ fontSize: "10px", color: "#5a6a5a", fontFamily: "'DM Sans', sans-serif" }}>Premium</span>
            </div>
          </div>
          <div className="rounded-xl p-3 flex gap-2" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
            <span style={{ color: "#c9a84c" }}>💡</span>
            <div>
              <span style={{ fontSize: "12px", color: "#d0c8b8", fontFamily: "'DM Sans', sans-serif" }}>{verdict.advice}</span>
              <div style={{ fontSize: "11px", color: "#6a7a6a", fontFamily: "'DM Sans', sans-serif", marginTop: "4px" }}>
                {suited && !paired && "Suited — extra flush potential adds value."}
                {paired && "Pocket pair — set-mining value in deeper stacks."}
                {!suited && !paired && "Offsuit — plays better heads-up than multi-way."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── POSITION GUIDE ───
const PositionGuide = () => {
  const [selected, setSelected] = useState("BTN");
  const info = POSITION_INFO[selected];

  const positions = ["UTG", "MP", "CO", "BTN", "SB", "BB"];
  const tableAngle = { "UTG": -120, "MP": -60, "CO": 0, "BTN": 60, "SB": 120, "BB": 180 };

  return (
    <div className="space-y-5">
      {/* Poker Table Visual */}
      <div className="relative flex items-center justify-center" style={{ height: "200px" }}>
        <div className="absolute rounded-full" style={{
          width: "240px", height: "140px",
          background: "radial-gradient(ellipse, #1a5c3a 0%, #0e3d26 70%, #0a2e1c 100%)",
          border: "6px solid #3a2a1a",
          boxShadow: "inset 0 0 30px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.3)",
        }} />
        <div className="absolute" style={{
          width: "220px", height: "120px",
          borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.2)",
        }} />
        {positions.map(pos => {
          const angle = (tableAngle[pos] - 90) * (Math.PI / 180);
          const rx = 140, ry = 85;
          const x = Math.cos(angle) * rx;
          const y = Math.sin(angle) * ry;
          const isActive = selected === pos;
          return (
            <button key={pos} onClick={() => setSelected(pos)}
              className="absolute rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                width: isActive ? "48px" : "40px",
                height: isActive ? "48px" : "40px",
                transform: `translate(${x}px, ${y}px)`,
                background: isActive
                  ? "linear-gradient(135deg, #c9a84c, #a08030)"
                  : "linear-gradient(135deg, #2a3a2a, #1a2a1a)",
                border: isActive ? "2px solid #f0d78c" : "2px solid #3a4a3a",
                color: isActive ? "#1a1a2e" : "#8a9a8a",
                fontSize: "11px",
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: isActive ? "0 0 16px rgba(201,168,76,0.4)" : "0 2px 6px rgba(0,0,0,0.3)",
                zIndex: isActive ? 10 : 1,
                cursor: "pointer",
              }}>
              {pos}
            </button>
          );
        })}
        <div className="absolute" style={{
          fontSize: "10px", color: "rgba(201,168,76,0.25)", fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "3px", textTransform: "uppercase",
        }}>DEALER</div>
      </div>

      {/* Position Info */}
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ color: "#f0d78c", fontSize: "20px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{info.name}</div>
            <div style={{ color: "#6a7a6a", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>Opening range: ~{info.range}</div>
          </div>
          <div className="rounded-lg px-3 py-1.5" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{selected}</span>
          </div>
        </div>

        <div>
          <div style={{ color: "#8a9a8a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>Recommended Hands</div>
          <div style={{ color: "#d0c8b8", fontSize: "13px", fontFamily: "'DM Mono', monospace", lineHeight: 1.6, wordBreak: "break-word" }}>{info.hands}</div>
        </div>

        <div className="flex gap-2 rounded-lg p-3" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.12)" }}>
          <span>🎯</span>
          <span style={{ color: "#d0c8b8", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>{info.tip}</span>
        </div>
      </div>
    </div>
  );
};

// ─── HAND RANKINGS ───
const HandRankings = () => {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="space-y-2">
      {HAND_RANKINGS.map((hand, i) => (
        <button key={hand.name} onClick={() => setExpanded(expanded === i ? null : i)}
          className="w-full text-left rounded-xl overflow-hidden transition-all duration-300"
          style={{
            background: expanded === i ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.02)",
            border: expanded === i ? "1px solid rgba(201,168,76,0.2)" : "1px solid rgba(255,255,255,0.06)",
          }}>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg w-8 h-8 flex items-center justify-center" style={{
                background: `rgba(201,168,76,${0.15 - i * 0.012})`,
                color: "#f0d78c",
                fontSize: "12px",
                fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {i + 1}
              </div>
              <span style={{ color: "#d0c8b8", fontSize: "14px", fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>{hand.name}</span>
            </div>
            <span style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{hand.odds}</span>
          </div>
          {expanded === i && (
            <div className="px-3 pb-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
              <div style={{ color: "#8a9a8a", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>{hand.desc}</div>
              <div className="flex gap-1 flex-wrap">
                {hand.example.split(" ").map((c, j) => {
                  const rank = c.charAt(0);
                  const suit = c.charAt(1);
                  return <Card key={j} rank={rank} suit={suit} size="sm" />;
                })}
              </div>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

// ─── BANKROLL TRACKER ───
const BankrollTracker = () => {
  const [bankroll, setBankroll] = useState(1000);
  const [buyIn, setBuyIn] = useState("");
  const [sessions, setSessions] = useState([
    { id: 1, buyIn: 200, result: 340, date: "Mar 8" },
    { id: 2, buyIn: 200, result: 120, date: "Mar 6" },
    { id: 3, buyIn: 100, result: 275, date: "Mar 3" },
    { id: 4, buyIn: 200, result: 0, date: "Feb 28" },
    { id: 5, buyIn: 200, result: 410, date: "Feb 25" },
  ]);
  const [newResult, setNewResult] = useState("");

  const totalProfit = sessions.reduce((sum, s) => sum + (s.result - s.buyIn), 0);
  const winRate = sessions.length ? ((sessions.filter(s => s.result > s.buyIn).length / sessions.length) * 100).toFixed(0) : 0;
  const avgProfit = sessions.length ? (totalProfit / sessions.length).toFixed(0) : 0;

  const addSession = () => {
    if (!buyIn || !newResult) return;
    const newS = { id: Date.now(), buyIn: parseFloat(buyIn), result: parseFloat(newResult), date: "Today" };
    setSessions([newS, ...sessions]);
    setBuyIn("");
    setNewResult("");
  };

  return (
    <div className="space-y-5">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        <ResultBox label="Total P/L" value={`${totalProfit >= 0 ? "+" : ""}$${totalProfit}`} color={totalProfit >= 0 ? "#27ae60" : "#c0392b"} />
        <ResultBox label="Win Rate" value={`${winRate}%`} />
        <ResultBox label="Avg/Session" value={`$${avgProfit}`} color={parseInt(avgProfit) >= 0 ? "#27ae60" : "#c0392b"} />
      </div>

      <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Log Session</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <InputField label="Buy-in ($)" value={buyIn} onChange={setBuyIn} placeholder="200" />
          <InputField label="Cash Out ($)" value={newResult} onChange={setNewResult} placeholder="340" />
        </div>
        <button onClick={addSession} className="w-full rounded-lg py-2 transition-all duration-200" style={{
          background: "linear-gradient(135deg, #c9a84c, #a08030)",
          color: "#1a1a2e",
          fontWeight: 700,
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          border: "none",
          cursor: "pointer",
          opacity: buyIn && newResult ? 1 : 0.4,
        }}>
          Add Session
        </button>
      </div>

      <div className="space-y-1.5">
        {sessions.slice(0, 8).map(s => {
          const profit = s.result - s.buyIn;
          const isWin = profit >= 0;
          return (
            <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: isWin ? "#27ae60" : "#c0392b" }} />
                <span style={{ color: "#8a9a8a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>{s.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>Buy: ${s.buyIn}</span>
                <span style={{ color: isWin ? "#27ae60" : "#c0392b", fontSize: "13px", fontWeight: 700, fontFamily: "'DM Mono', monospace", minWidth: "55px", textAlign: "right" }}>
                  {isWin ? "+" : ""}${profit}
                </span>
                <button onClick={() => setSessions(sessions.filter(x => x.id !== s.id))}
                  className="rounded-md flex items-center justify-center transition-all duration-200"
                  style={{
                    width: "22px", height: "22px", background: "rgba(192,57,43,0.1)",
                    border: "1px solid rgba(192,57,43,0.2)", color: "#c0392b",
                    fontSize: "12px", cursor: "pointer", lineHeight: 1, flexShrink: 0,
                  }}
                  onMouseEnter={e => { e.target.style.background = "rgba(192,57,43,0.25)"; }}
                  onMouseLeave={e => { e.target.style.background = "rgba(192,57,43,0.1)"; }}
                  title="Delete session"
                >×</button>
              </div>
            </div>
          );
        })}
        {sessions.length === 0 && (
          <div className="text-center py-4" style={{ color: "#4a5a4a", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>
            No sessions logged yet. Add your first one above.
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PREFLOP ADVISOR ───

const TIER_1 = ["AA", "KK", "QQ", "JJ", "AKs", "AKo", "AQs"];
const TIER_2 = ["TT", "99", "AQo", "AJs", "ATs", "KQs", "KJs", "QJs", "AJo"];
const TIER_3 = ["88", "77", "A9s", "A8s", "A7s", "A6s", "A5s", "KTs", "K9s", "QTs", "JTs", "T9s", "KQo", "ATo", "KJo"];
const TIER_4 = ["66", "55", "A4s", "A3s", "A2s", "K8s", "K7s", "K6s", "K5s", "Q9s", "J9s", "T8s", "98s", "87s", "76s", "65s", "QJo", "KTo", "QTo", "JTo", "A9o"];
const TIER_5 = ["44", "33", "22", "K4s", "K3s", "K2s", "Q8s", "Q7s", "Q6s", "J8s", "J7s", "T7s", "97s", "86s", "75s", "64s", "54s", "K9o", "Q9o", "J9o", "T9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o"];

function getPreflopHandKey(r1, r2, suited) {
  const i1 = RANKS.indexOf(r1), i2 = RANKS.indexOf(r2);
  const hi = Math.max(i1, i2), lo = Math.min(i1, i2);
  const hiR = RANKS[hi], loR = RANKS[lo];
  if (hi === lo) return hiR + loR;
  return hiR + loR + (suited ? "s" : "o");
}

function getHandTier(key) {
  if (TIER_1.includes(key)) return 1;
  if (TIER_2.includes(key)) return 2;
  if (TIER_3.includes(key)) return 3;
  if (TIER_4.includes(key)) return 4;
  if (TIER_5.includes(key)) return 5;
  return 6;
}

function getPreflopAdvice(r1, r2, s1, s2, position, facingRaise) {
  const suited = s1 === s2;
  const paired = r1 === r2;
  const key = getPreflopHandKey(r1, r2, suited);
  const tier = getHandTier(key);
  const posStrength = { "UTG": 1, "MP": 2, "CO": 3, "BTN": 4, "SB": 5, "BB": 6 };
  const posVal = posStrength[position] || 3;

  let action, confidence, reasoning, detailedPlay, sizing;

  if (tier === 1) {
    if (facingRaise) {
      action = "3-BET"; confidence = 95;
      reasoning = ["Premium hand — always 3-bet for value", "Build the pot and isolate the raiser", "Flatting lets too many players in cheaply"];
      detailedPlay = (key === "AA" || key === "KK")
        ? "3-bet to ~3x the raise. If they 4-bet, go all-in with 100bb or less."
        : "3-bet to ~3x. If 4-bet, call with AKs/QQ. Consider folding AQs vs tight 4-bettors.";
      sizing = "3x the open raise";
    } else {
      action = "RAISE"; confidence = 98;
      reasoning = ["Premium hand — always open-raise from any position", "Limping wastes value and invites multi-way action", "Standard open from all positions"];
      detailedPlay = "Open-raise. If someone 3-bets, 4-bet or call depending on stack depth.";
      sizing = "2.5–3x BB";
    }
  } else if (tier === 2) {
    if (facingRaise) {
      if (posVal >= 3) {
        action = "3-BET"; confidence = 78;
        reasoning = ["Strong hand in position — 3-bet for value", "Position amplifies your post-flop edge", "Calling is fine too but 3-betting is more +EV long-term"];
        detailedPlay = "3-bet to ~3x. Fold to a 4-bet unless you have TT+ or AQs+ specifically.";
        sizing = "3x the open raise";
      } else {
        action = "CALL"; confidence = 70;
        reasoning = ["Strong hand but out of position", "Calling keeps in hands you dominate", "3-betting JJ/TT is an option but flatting is safer OOP"];
        detailedPlay = "Call and play post-flop carefully. Set-mine with pairs, play cautiously with unpaired hands on missed boards.";
        sizing = "—";
      }
    } else {
      action = "RAISE"; confidence = 92;
      reasoning = ["Strong hand — open-raise from all positions", "Take the initiative and thin the field", "These hands play best heads-up or 3-way"];
      detailedPlay = "Standard open-raise. If 3-bet, call with pairs (set-mine) and broadway hands in position.";
      sizing = "2.5–3x BB";
    }
  } else if (tier === 3) {
    if (facingRaise) {
      if (suited && posVal >= 3) {
        action = "CALL"; confidence = 62;
        reasoning = ["Suited hand with implied odds in position", "You can realize equity post-flop with position", "Folding is fine vs EP raises from tight players"];
        detailedPlay = "Call and look to hit flops. Fold on bad boards if facing continued aggression.";
        sizing = "—";
      } else if (paired) {
        action = "CALL"; confidence = 65;
        reasoning = ["Set-mining opportunity with a medium pair", "You need ~15:1 implied odds to profitably set-mine", "If stacks are deep enough, this is a clear call"];
        detailedPlay = "Call to set-mine. If you don't flop a set, fold to significant action.";
        sizing = "—";
      } else {
        action = "FOLD"; confidence = 60;
        reasoning = ["Offsuit hand facing a raise out of position", "Hard to realize equity without position", "Save chips for better spots"];
        detailedPlay = "Fold and wait for a stronger hand or better position.";
        sizing = "—";
      }
    } else {
      if (posVal >= 2) {
        action = "RAISE"; confidence = 80;
        reasoning = ["Playable hand in mid-to-late position", "Opening these is profitable when folded to", "Suited connectors and broadway hands have good equity"];
        detailedPlay = "Open-raise. Be prepared to fold to a 3-bet unless you're at the top of this range.";
        sizing = "2.5x BB";
      } else {
        action = "FOLD"; confidence = 58;
        reasoning = ["Marginal hand from early position", "Too many players left to act behind you", "You'll face 3-bets and play OOP in big pots"];
        detailedPlay = "Fold from UTG. These hands don't play well from early position at a full table.";
        sizing = "—";
      }
    }
  } else if (tier === 4) {
    if (facingRaise) {
      if (suited && posVal >= 4) {
        action = "CALL"; confidence = 52;
        reasoning = ["Suited connector/gapper with implied odds on the button", "Can make big hidden hands — flushes and straights", "Only profitable with deep stacks and position"];
        detailedPlay = "Call on the button with deep stacks (100bb+). Fold if the raise is large or from a tight player.";
        sizing = "—";
      } else if (position === "BB") {
        action = "CALL"; confidence = 55;
        reasoning = ["You're already invested — getting good pot odds", "Defending the BB keeps you from being exploited", "Mix in some 3-bets with suited hands to stay unpredictable"];
        detailedPlay = "Defend your big blind at a reasonable price. Occasionally 3-bet suited hands as a bluff.";
        sizing = "—";
      } else {
        action = "FOLD"; confidence = 65;
        reasoning = ["Speculative hand facing a raise — insufficient implied odds", "These need multi-way pots or very deep stacks", "Tighter is righter when facing aggression"];
        detailedPlay = "Fold. You need a better situation to play these hands profitably.";
        sizing = "—";
      }
    } else {
      if (posVal >= 3) {
        action = "RAISE"; confidence = 72;
        reasoning = ["Speculative hand in late position — great steal opportunity", "Fold equity + hand equity make this a profitable open", "These hands perform well when you take initiative"];
        detailedPlay = "Open-raise from CO or BTN. Fold to a 3-bet unless you have a suited connector you want to peel with.";
        sizing = "2.2–2.5x BB";
      } else {
        action = "FOLD"; confidence = 68;
        reasoning = ["Too speculative for early/middle position", "Risk of being dominated or playing big pots OOP", "Wait for later position or stronger cards"];
        detailedPlay = "Fold. These hands lose money when opened from early position over the long run.";
        sizing = "—";
      }
    }
  } else if (tier === 5) {
    if (facingRaise) {
      if (position === "BB") {
        action = "FOLD"; confidence = 52;
        reasoning = ["Marginal hand — the price needs to be right to defend", "Fold vs standard raises; consider calling vs min-raises only", "Don't over-defend with the weakest part of your range"];
        detailedPlay = "Fold to standard raises. Only defend vs a min-raise with suited hands.";
        sizing = "—";
      } else {
        action = "FOLD"; confidence = 78;
        reasoning = ["Weak hand facing a raise — clear fold", "You're dominated too often and lack position", "Discipline here saves you money long-term"];
        detailedPlay = "Fold. No question — save your chips for better spots.";
        sizing = "—";
      }
    } else {
      if (posVal >= 4) {
        action = "RAISE"; confidence = 58;
        reasoning = ["Stealing opportunity from late position", "Fold equity makes this profitable if blinds fold often", "Don't attempt vs players who defend very wide"];
        detailedPlay = "Open-raise as a steal from BTN or SB. Fold to a 3-bet. If called, c-bet selectively.";
        sizing = "2–2.5x BB";
      } else {
        action = "FOLD"; confidence = 82;
        reasoning = ["Too weak to open from this position", "Likely dominated if called", "Patience pays — fold and wait"];
        detailedPlay = "Fold. This hand is not strong enough to play from here.";
        sizing = "—";
      }
    }
  } else {
    if (position === "BB" && !facingRaise) {
      action = "CHECK"; confidence = 95;
      reasoning = ["Free look from the big blind", "Don't invest more with this hand — just see a flop"];
      detailedPlay = "Check and hope for a miracle flop. Fold to any significant action if you miss.";
      sizing = "—";
    } else {
      action = "FOLD"; confidence = 95;
      reasoning = ["This hand has no business being played", "You'll lose money long-term with hands like this", "Wait for a real hand"];
      detailedPlay = "Fold immediately. No debate needed.";
      sizing = "—";
    }
  }

  return { action, confidence, reasoning, detailedPlay, sizing, tier, key, suited, paired };
}

const ACTION_STYLES = {
  "RAISE": { color: "#27ae60", bg: "rgba(39,174,96,0.12)", border: "rgba(39,174,96,0.3)", icon: "↑" },
  "3-BET": { color: "#e74c3c", bg: "rgba(231,76,60,0.12)", border: "rgba(231,76,60,0.3)", icon: "⇑" },
  "CALL": { color: "#f39c12", bg: "rgba(243,156,18,0.12)", border: "rgba(243,156,18,0.3)", icon: "→" },
  "FOLD": { color: "#7f8c8d", bg: "rgba(127,140,141,0.12)", border: "rgba(127,140,141,0.3)", icon: "↓" },
  "CHECK": { color: "#3498db", bg: "rgba(52,152,219,0.12)", border: "rgba(52,152,219,0.3)", icon: "✓" },
};

const TIER_LABELS = {
  1: { name: "Premium", color: "#e74c3c" },
  2: { name: "Strong", color: "#e67e22" },
  3: { name: "Playable", color: "#f1c40f" },
  4: { name: "Speculative", color: "#3498db" },
  5: { name: "Marginal", color: "#9b59b6" },
  6: { name: "Trash", color: "#7f8c8d" },
};

const PreflopAdvisor = () => {
  const [card1Rank, setCard1Rank] = useState(null);
  const [card1Suit, setCard1Suit] = useState(null);
  const [card2Rank, setCard2Rank] = useState(null);
  const [card2Suit, setCard2Suit] = useState(null);
  const [selecting, setSelecting] = useState(1);
  const [position, setPosition] = useState("BTN");
  const [facingRaise, setFacingRaise] = useState(false);
  const [numPlayers, setNumPlayers] = useState(6);
  const [showResult, setShowResult] = useState(false);

  const selectCard = (rank, suit) => {
    if (selecting === 1) { setCard1Rank(rank); setCard1Suit(suit); setSelecting(2); }
    else { setCard2Rank(rank); setCard2Suit(suit); setSelecting(1); }
    setShowResult(false);
  };

  const isSelected = (r, s) => (card1Rank === r && card1Suit === s) || (card2Rank === r && card2Suit === s);
  const bothSelected = card1Rank && card1Suit && card2Rank && card2Suit;

  const reset = () => {
    setCard1Rank(null); setCard1Suit(null); setCard2Rank(null); setCard2Suit(null);
    setSelecting(1); setShowResult(false);
  };

  const advice = (bothSelected && showResult) ? getPreflopAdvice(card1Rank, card2Rank, card1Suit, card2Suit, position, facingRaise) : null;
  const actionStyle = advice ? ACTION_STYLES[advice.action] : null;
  const tierInfo = advice ? TIER_LABELS[advice.tier] : null;

  return (
    <div className="space-y-5">
      {/* Card Selection */}
      <div className="flex items-center gap-4 justify-center">
        {[1, 2].map(n => {
          const r = n === 1 ? card1Rank : card2Rank;
          const s = n === 1 ? card1Suit : card2Suit;
          return (
            <div key={n} className="text-center">
              <div style={{ color: selecting === n ? "#c9a84c" : "#5a6a5a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
                {selecting === n ? "▸ " : ""}Card {n}
              </div>
              {r ? <Card rank={r} suit={s} size="lg" /> : (
                <div className="w-20 h-28 rounded-lg border-2 border-dashed flex items-center justify-center" style={{ borderColor: selecting === n ? "#c9a84c" : "#2a3a2a", color: "#5a6a5a", fontSize: "24px" }}>?</div>
              )}
            </div>
          );
        })}
      </div>

      {bothSelected && (
        <button onClick={reset} style={{ display: "block", margin: "0 auto", fontSize: "11px", color: "#8a9a8a", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Reset cards
        </button>
      )}

      {/* Card picker grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gap: "3px" }}>
        {SUITS.map(suit => RANKS.map(rank => (
          <button key={rank + suit} onClick={() => selectCard(rank, suit)} disabled={isSelected(rank, suit)}
            className="rounded transition-all duration-150"
            style={{
              padding: "4px 0", fontSize: "11px", fontWeight: 600,
              background: isSelected(rank, suit) ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.05)",
              color: isSelected(rank, suit) ? "#c9a84c" : (suit === "♥" || suit === "♦") ? "#c0392b" : "#ccc",
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: isSelected(rank, suit) ? "default" : "pointer",
              opacity: isSelected(rank, suit) ? 0.5 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}>
            {RANK_NAMES[rank]}{suit}
          </button>
        )))}
      </div>

      {/* Situation Inputs */}
      <div className="rounded-xl p-4 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#c9a84c", fontSize: "12px", fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>Your Situation</div>

        <div>
          <div style={{ color: "#6a7a6a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>Position</div>
          <div className="flex gap-2 flex-wrap">
            {["UTG", "MP", "CO", "BTN", "SB", "BB"].map(pos => (
              <button key={pos} onClick={() => { setPosition(pos); setShowResult(false); }}
                className="rounded-lg px-3 py-1.5 transition-all duration-200"
                style={{
                  background: position === pos ? "linear-gradient(135deg, #c9a84c, #a08030)" : "rgba(255,255,255,0.05)",
                  color: position === pos ? "#1a1a2e" : "#8a9a8a",
                  border: position === pos ? "1px solid #f0d78c" : "1px solid rgba(255,255,255,0.1)",
                  fontSize: "12px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", cursor: "pointer",
                }}>{pos}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: "#6a7a6a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>Action</div>
          <div className="flex gap-2">
            {[{ label: "Folded to you", val: false }, { label: "Facing a raise", val: true }].map(opt => (
              <button key={String(opt.val)} onClick={() => { setFacingRaise(opt.val); setShowResult(false); }}
                className="rounded-lg px-4 py-1.5 transition-all duration-200"
                style={{
                  background: facingRaise === opt.val ? "linear-gradient(135deg, #c9a84c, #a08030)" : "rgba(255,255,255,0.05)",
                  color: facingRaise === opt.val ? "#1a1a2e" : "#8a9a8a",
                  border: facingRaise === opt.val ? "1px solid #f0d78c" : "1px solid rgba(255,255,255,0.1)",
                  fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", flex: 1,
                }}>{opt.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: "#6a7a6a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>Table Size</div>
          <div className="flex gap-2">
            {[{ label: "6-max", val: 6 }, { label: "9-max", val: 9 }].map(opt => (
              <button key={opt.val} onClick={() => { setNumPlayers(opt.val); setShowResult(false); }}
                className="rounded-lg px-4 py-1.5 transition-all duration-200"
                style={{
                  background: numPlayers === opt.val ? "linear-gradient(135deg, #c9a84c, #a08030)" : "rgba(255,255,255,0.05)",
                  color: numPlayers === opt.val ? "#1a1a2e" : "#8a9a8a",
                  border: numPlayers === opt.val ? "1px solid #f0d78c" : "1px solid rgba(255,255,255,0.1)",
                  fontSize: "12px", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", cursor: "pointer", flex: 1,
                }}>{opt.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Get Advice */}
      {bothSelected && !showResult && (
        <button onClick={() => setShowResult(true)} className="w-full rounded-xl py-3 transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #c9a84c, #a08030)", color: "#1a1a2e",
            fontWeight: 700, fontSize: "14px", fontFamily: "'Playfair Display', serif",
            border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
          }}>
          ♠ Get Preflop Advice ♠
        </button>
      )}

      {/* Result Display */}
      {advice && actionStyle && tierInfo && (
        <div className="space-y-4" style={{ animation: "pfFadeIn 0.4s ease" }}>
          {/* Main action */}
          <div className="rounded-xl p-5 text-center" style={{ background: actionStyle.bg, border: `2px solid ${actionStyle.border}` }}>
            <div style={{ fontSize: "42px", marginBottom: "4px" }}>{actionStyle.icon}</div>
            <div style={{ color: actionStyle.color, fontSize: "28px", fontWeight: 900, fontFamily: "'Playfair Display', serif", letterSpacing: "2px" }}>
              {advice.action}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span style={{ color: "#8a9a8a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>Confidence</span>
              <div className="rounded-full overflow-hidden" style={{ width: "80px", height: "6px", background: "rgba(255,255,255,0.1)" }}>
                <div className="h-full rounded-full" style={{ width: `${advice.confidence}%`, background: actionStyle.color, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ color: actionStyle.color, fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{advice.confidence}%</span>
            </div>
            {advice.sizing !== "—" && (
              <div className="mt-2 inline-block rounded-lg px-3 py-1" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ color: "#8a9a8a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif" }}>Size: </span>
                <span style={{ color: "#f0d78c", fontSize: "12px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{advice.sizing}</span>
              </div>
            )}
          </div>

          {/* Hand tier */}
          <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="rounded-lg px-2.5 py-1" style={{ background: `${tierInfo.color}22`, border: `1px solid ${tierInfo.color}44` }}>
              <span style={{ color: tierInfo.color, fontSize: "11px", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>{tierInfo.name}</span>
            </div>
            <span style={{ color: "#d0c8b8", fontSize: "13px", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{advice.key}</span>
            <span style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>
              {advice.suited ? "Suited" : advice.paired ? "Pair" : "Offsuit"} · Tier {advice.tier}
            </span>
          </div>

          {/* Reasoning */}
          <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.12)" }}>
            <div style={{ color: "#c9a84c", fontSize: "11px", fontWeight: 700, fontFamily: "'Playfair Display', serif", textTransform: "uppercase", letterSpacing: "1px" }}>Why?</div>
            {advice.reasoning.map((r, i) => (
              <div key={i} className="flex gap-2">
                <span style={{ color: "#c9a84c", fontSize: "14px", lineHeight: "18px" }}>›</span>
                <span style={{ color: "#b0a898", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", lineHeight: "18px" }}>{r}</span>
              </div>
            ))}
          </div>

          {/* How to play */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#f0d78c", fontSize: "11px", fontWeight: 700, fontFamily: "'Playfair Display', serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>How to Play It</div>
            <div style={{ color: "#d0c8b8", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", lineHeight: "20px" }}>{advice.detailedPlay}</div>
          </div>

          <div style={{ color: "#3a4a3a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", textAlign: "center", fontStyle: "italic" }}>
            Based on standard TAG strategy · 100bb stacks · Adjust for opponents &amp; table dynamics
          </div>
        </div>
      )}

      <style>{`@keyframes pfFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// ─── SHARED COMPONENTS ───
const InputField = ({ label, value, onChange, placeholder }) => (
  <div>
    <label style={{ display: "block", color: "#6a7a6a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px", fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 outline-none transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "#f0d78c",
        fontSize: "14px",
        fontFamily: "'DM Mono', monospace",
      }}
      onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
      onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
    />
  </div>
);

const ResultBox = ({ label, value, sub, color }) => (
  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
    <div style={{ color: "#6a7a6a", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
    <div style={{ color: color || "#f0d78c", fontSize: "20px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginTop: "2px" }}>{value}</div>
    {sub && <div style={{ color: "#5a6a5a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
  </div>
);

// ─── GLOSSARY ───

const GLOSSARY_DATA = [
  { cat: "Positions", terms: [
    { term: "UTG", aka: "Under the Gun", def: "First player to act preflop, seated left of the big blind. The worst position because everyone acts after you." },
    { term: "MP", aka: "Middle Position", def: "Seats between early position and the cutoff. Moderate positional advantage." },
    { term: "CO", aka: "Cutoff", def: "Seat directly right of the dealer button. Second-best position — great for stealing blinds." },
    { term: "BTN", aka: "Button / Dealer", def: "Best seat at the table. You act last on every post-flop street, giving you maximum information." },
    { term: "SB", aka: "Small Blind", def: "Forced half-bet posted before cards are dealt. Worst post-flop position since you act first." },
    { term: "BB", aka: "Big Blind", def: "Forced full bet posted before cards are dealt. You close the action preflop but act early post-flop." },
  ]},
  { cat: "Actions", terms: [
    { term: "Fold", def: "Surrender your hand and forfeit any chips already in the pot." },
    { term: "Check", def: "Pass the action without betting. Only possible if no one has bet in the current round." },
    { term: "Call", def: "Match the current bet to stay in the hand." },
    { term: "Raise", def: "Increase the current bet, forcing others to put in more chips or fold." },
    { term: "3-Bet", def: "A re-raise over an initial raise. E.g., someone raises, and you raise again — that's a 3-bet." },
    { term: "4-Bet", def: "A re-raise over a 3-bet. Usually signals extreme strength or a bold bluff." },
    { term: "All-In", def: "Betting all your remaining chips. You can't be forced out but can only win from each player up to what you put in." },
    { term: "C-Bet", aka: "Continuation Bet", def: "A bet on the flop by the preflop raiser, continuing aggression regardless of whether the flop helped." },
    { term: "Donk Bet", def: "A bet from out of position into the preflop aggressor. Generally considered non-standard." },
    { term: "Limp", def: "Calling the big blind preflop instead of raising. Usually a passive, weaker play." },
  ]},
  { cat: "Streets & Board", terms: [
    { term: "Preflop", def: "The first betting round, after players receive their two hole cards but before any community cards." },
    { term: "Flop", def: "The first three community cards dealt face-up. The second betting round follows." },
    { term: "Turn", def: "The fourth community card. Also called 'Fourth Street.' Pot sizes tend to grow here." },
    { term: "River", def: "The fifth and final community card. Last chance to bet, bluff, or make your hand." },
    { term: "Board", def: "The community cards visible to all players (flop + turn + river)." },
    { term: "Hole Cards", def: "Your two private cards that only you can see." },
  ]},
  { cat: "Hand Types", terms: [
    { term: "Suited", def: "Two cards of the same suit (e.g., A♥ K♥). Adds flush potential — roughly +3% equity over offsuit." },
    { term: "Offsuit", def: "Two cards of different suits (e.g., A♠ K♥). Less potential than suited but still playable with high ranks." },
    { term: "Connectors", def: "Two cards of consecutive rank (e.g., 8-9, J-T). They can make straights easily." },
    { term: "Suited Connectors", def: "Consecutive cards of the same suit (e.g., 7♦ 8♦). Very strong speculative hands — can make flushes and straights." },
    { term: "Pocket Pair", def: "Two cards of the same rank as hole cards (e.g., 9♠ 9♥). Set-mining potential." },
    { term: "Broadway", def: "Any card Ten or higher (T, J, Q, K, A). Broadway hands have top-pair potential." },
  ]},
  { cat: "Key Concepts", terms: [
    { term: "Pot Odds", def: "The ratio of the current pot to the cost of calling. If pot is $100 and the call is $20, you're getting 5:1." },
    { term: "Equity", def: "Your percentage chance of winning the hand at showdown. E.g., a flush draw on the flop has ~35% equity." },
    { term: "Outs", def: "Cards remaining in the deck that will complete your drawing hand. A flush draw has 9 outs." },
    { term: "EV", aka: "Expected Value", def: "The average amount you win or lose on a play over time. Positive EV (+EV) plays make money long-term." },
    { term: "Implied Odds", def: "Pot odds adjusted for future bets you expect to win if you hit your hand. Justifies calling with draws." },
    { term: "Fold Equity", def: "The value gained from the chance your opponent folds to your bet. A key bluffing concept." },
    { term: "Set Mining", def: "Calling preflop with a small/medium pair hoping to flop three of a kind (a set). Needs deep stacks." },
    { term: "Range", def: "The full spectrum of hands a player could hold in a given situation, not just one specific hand." },
    { term: "TAG", aka: "Tight-Aggressive", def: "A playing style where you play few hands but bet/raise aggressively when you do. The most profitable baseline strategy." },
    { term: "LAG", aka: "Loose-Aggressive", def: "Playing many hands aggressively. Higher variance but can be very profitable against the right opponents." },
    { term: "Tilt", def: "Emotional state causing poor decisions, usually after a bad beat. Recognizing and managing tilt is a critical skill." },
    { term: "Variance", def: "The natural ups and downs in poker results due to luck. Even the best players have losing streaks." },
  ]},
  { cat: "Bet Sizing", terms: [
    { term: "Min-Raise", def: "Raising by the minimum allowed amount — double the big blind or previous bet." },
    { term: "Pot-Sized Bet", def: "A bet equal to the total pot. Maximum pressure — charges draws the most." },
    { term: "Overbet", def: "A bet larger than the pot. Used to polarize your range or maximize value with very strong hands." },
    { term: "Value Bet", def: "A bet made with a strong hand, hoping a weaker hand calls. The primary way to make money in poker." },
    { term: "Bluff", def: "A bet or raise with a weak hand, aiming to make opponents fold better hands." },
    { term: "Semi-Bluff", def: "Betting or raising with a drawing hand that could improve. Combines fold equity with equity if called." },
  ]},
];

const Glossary = () => {
  const [openCat, setOpenCat] = useState("Positions");
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? GLOSSARY_DATA.map(cat => ({
        ...cat,
        terms: cat.terms.filter(t =>
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          (t.aka && t.aka.toLowerCase().includes(search.toLowerCase())) ||
          t.def.toLowerCase().includes(search.toLowerCase())
        )
      })).filter(cat => cat.terms.length > 0)
    : GLOSSARY_DATA;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="w-full rounded-xl px-4 py-2.5 pl-9 outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#f0d78c", fontSize: "13px", fontFamily: "'DM Sans', sans-serif",
          }}
          onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.4)"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#5a6a5a", fontSize: "14px" }}>⌕</span>
      </div>

      {/* Categories */}
      {filtered.map(cat => (
        <div key={cat.cat}>
          <button onClick={() => setOpenCat(openCat === cat.cat ? null : cat.cat)}
            className="w-full flex items-center justify-between py-2 px-1 transition-all duration-200"
            style={{ cursor: "pointer", background: "none", border: "none" }}>
            <div className="flex items-center gap-2">
              <span style={{
                color: openCat === cat.cat ? "#c9a84c" : "#5a6a5a",
                fontSize: "12px", transition: "transform 0.2s",
                display: "inline-block", transform: openCat === cat.cat ? "rotate(90deg)" : "rotate(0)",
              }}>▸</span>
              <span style={{
                color: openCat === cat.cat ? "#f0d78c" : "#8a9a8a",
                fontSize: "14px", fontWeight: 700, fontFamily: "'Playfair Display', serif",
              }}>{cat.cat}</span>
            </div>
            <span style={{ color: "#3a4a3a", fontSize: "11px", fontFamily: "'DM Mono', monospace" }}>{cat.terms.length}</span>
          </button>

          {(openCat === cat.cat || search.trim()) && (
            <div className="space-y-1.5 ml-1" style={{ animation: "glsFadeIn 0.25s ease" }}>
              {cat.terms.map(t => (
                <div key={t.term} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span style={{ color: "#f0d78c", fontSize: "13px", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{t.term}</span>
                    {t.aka && <span style={{ color: "#5a6a5a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif" }}>({t.aka})</span>}
                  </div>
                  <div style={{ color: "#9a9080", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", lineHeight: "18px" }}>{t.def}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-6" style={{ color: "#4a5a4a", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>
          No terms match "{search}"
        </div>
      )}

      <style>{`@keyframes glsFadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

// ─── PAYWALL SCREEN ───
const Paywall = ({ onSubscribe, onRestore }) => {
  const [annual, setAnnual] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubscribe = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem("poker_token");
      const res = await fetch(`${API_URL}/subscribe/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan: annual ? "annual" : "monthly" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
        setProcessing(false);
      }
    } catch (err) {
      alert("Failed to connect to server. Please try again.");
      setProcessing(false);
    }
  };

  const features = [
    { icon: "🧠", name: "Preflop Advisor", desc: "Position-aware action recommendations" },
    { icon: "🎲", name: "Odds Calculator", desc: "Draw-based equity & EV analysis" },
    { icon: "🃏", name: "Hand Evaluator", desc: "Strength ratings with play advice" },
    { icon: "🎯", name: "Position Guide", desc: "Interactive table with opening ranges" },
    { icon: "💰", name: "Bankroll Tracker", desc: "Log sessions, track profit & win rate" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a12 0%, #0d1f17 30%, #0a1610 60%, #0f1a14 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#d0c8b8",
      padding: "0 20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    }}>
      {/* Noise */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <div style={{ maxWidth: "420px", width: "100%", position: "relative", paddingTop: "40px", paddingBottom: "40px" }}>
        {/* Logo */}
        <div className="text-center" style={{ marginBottom: "32px", animation: "pwFadeDown 0.6s ease" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>♠</div>
          <h1 style={{
            fontSize: "36px", fontWeight: 900, fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, #f0d78c 0%, #c9a84c 50%, #f0d78c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1.1, marginBottom: "8px",
          }}>
            Poker Toolkit
          </h1>
          <div style={{ color: "#6a7a6a", fontSize: "14px" }}>
            Make smarter decisions at the table
          </div>
        </div>

        {/* Features list */}
        <div className="space-y-2" style={{ marginBottom: "28px", animation: "pwFadeUp 0.6s 0.15s ease both" }}>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <span style={{ fontSize: "20px" }}>{f.icon}</span>
              <div>
                <div style={{ color: "#d0c8b8", fontSize: "13px", fontWeight: 600 }}>{f.name}</div>
                <div style={{ color: "#5a6a5a", fontSize: "11px" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing toggle */}
        <div style={{ animation: "pwFadeUp 0.6s 0.3s ease both" }}>
          <div className="flex items-center justify-center gap-3" style={{ marginBottom: "16px" }}>
            <span style={{ color: !annual ? "#f0d78c" : "#5a6a5a", fontSize: "13px", fontWeight: 600, transition: "color 0.2s" }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)}
              className="relative rounded-full transition-all duration-300"
              style={{
                width: "48px", height: "26px", cursor: "pointer", border: "none",
                background: annual ? "linear-gradient(135deg, #c9a84c, #a08030)" : "rgba(255,255,255,0.15)",
              }}>
              <div className="absolute rounded-full transition-all duration-300" style={{
                width: "20px", height: "20px", top: "3px",
                left: annual ? "25px" : "3px",
                background: annual ? "#1a1a2e" : "#8a9a8a",
              }} />
            </button>
            <div className="flex items-center gap-1.5">
              <span style={{ color: annual ? "#f0d78c" : "#5a6a5a", fontSize: "13px", fontWeight: 600, transition: "color 0.2s" }}>Annual</span>
              <span className="rounded-full px-2 py-0.5" style={{ background: "rgba(39,174,96,0.15)", border: "1px solid rgba(39,174,96,0.25)", color: "#27ae60", fontSize: "10px", fontWeight: 700 }}>SAVE 37%</span>
            </div>
          </div>

          {/* Price card */}
          <div className="rounded-2xl p-5 text-center" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.03))",
            border: "1px solid rgba(201,168,76,0.2)",
            marginBottom: "16px",
          }}>
            <div style={{ color: "#8a9a8a", fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px" }}>
              {annual ? "Annual Plan" : "Monthly Plan"}
            </div>
            <div className="flex items-baseline justify-center gap-1">
              <span style={{ color: "#f0d78c", fontSize: "42px", fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>
                ${annual ? "67.97" : "8.97"}
              </span>
              <span style={{ color: "#6a7a6a", fontSize: "14px" }}>
                /{annual ? "year" : "month"}
              </span>
            </div>
            {annual && (
              <div style={{ color: "#27ae60", fontSize: "12px", marginTop: "4px" }}>
                That's $5.66/month — save $39.67/year
              </div>
            )}
            {!annual && (
              <div style={{ color: "#5a6a5a", fontSize: "12px", marginTop: "4px" }}>
                Cancel anytime · No commitment
              </div>
            )}
          </div>

          {/* Subscribe button */}
          <button onClick={handleSubscribe} disabled={processing}
            className="w-full rounded-xl py-4 transition-all duration-300"
            style={{
              background: processing
                ? "rgba(201,168,76,0.3)"
                : "linear-gradient(135deg, #c9a84c, #a08030)",
              color: "#1a1a2e",
              fontWeight: 800,
              fontSize: "16px",
              fontFamily: "'Playfair Display', serif",
              border: "none",
              cursor: processing ? "wait" : "pointer",
              boxShadow: processing ? "none" : "0 4px 20px rgba(201,168,76,0.35)",
              letterSpacing: "0.5px",
              marginBottom: "12px",
            }}>
            {processing ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <span className="inline-block" style={{ animation: "pwSpin 1s linear infinite", width: "16px", height: "16px", border: "2px solid rgba(26,26,46,0.3)", borderTopColor: "#1a1a2e", borderRadius: "50%" }} />
                Processing...
              </span>
            ) : (
              `Start ${annual ? "Annual" : "Monthly"} Plan — $${annual ? "67.97" : "8.97"}`
            )}
          </button>

          {/* 3-day trial note */}
          <div className="text-center" style={{ color: "#5a6a5a", fontSize: "11px", marginBottom: "20px" }}>
            Includes 3-day free trial · You won't be charged today
          </div>

          {/* Restore / free tier */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={onRestore} style={{ background: "none", border: "none", color: "#6a7a6a", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>
              Restore Purchase
            </button>
            <span style={{ color: "#2a3a2a" }}>·</span>
            <button onClick={onSubscribe} style={{ background: "none", border: "none", color: "#6a7a6a", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>
              Continue with Free
            </button>
          </div>

          {/* Legal */}
          <div className="text-center" style={{ color: "#2a3a2a", fontSize: "9px", marginTop: "20px", lineHeight: "14px" }}>
            By subscribing you agree to our Terms of Service and Privacy Policy.
            {annual ? " $67.97 billed annually." : " $8.97 billed monthly."}
            {" "}Cancel anytime in your account settings. Free trial converts to paid subscription unless cancelled.
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pwFadeDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pwFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pwSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// ─── AUTH SCREEN ───
const AuthScreen = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      localStorage.setItem("poker_token", data.token);
      onAuth(data.user);
    } catch (err) {
      setError("Failed to connect to server");
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
    color: "#d0c8b8",
    fontSize: "14px",
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    marginBottom: "12px",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a12 0%, #0d1f17 30%, #0a1610 60%, #0f1a14 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#d0c8b8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
    }}>
      <div style={{ maxWidth: "380px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "8px" }}>♠</div>
          <h1 style={{
            fontSize: "36px", fontWeight: 900, fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, #f0d78c 0%, #c9a84c 50%, #f0d78c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1.1, marginBottom: "8px",
          }}>
            Poker Toolkit
          </h1>
          <div style={{ color: "#6a7a6a", fontSize: "14px" }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{ color: "#e74c3c", fontSize: "13px", marginBottom: "12px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #c9a84c, #a08030)",
              color: "#1a1a2e",
              fontWeight: 800,
              fontSize: "15px",
              fontFamily: "'Playfair Display', serif",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
              marginBottom: "16px",
            }}
          >
            {loading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "#6a7a6a",
              fontSize: "13px",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "underline",
            }}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ───
const FREE_TABS = ["rankings", "glossary"];

export default function PokerToolkit() {
  const [tab, setTab] = useState("preflop");
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showPaywall, setShowPaywall] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    // Handle Stripe checkout redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
    }

    const token = localStorage.getItem("poker_token");
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          setUser(data.user || data);
          const status = data.user?.subscriptionStatus || data.subscriptionStatus;
          if (status === "active" || status === "trialing") {
            setSubscribed(true);
            setShowPaywall(false);
          } else if (params.get("checkout") === "success") {
            // Webhook may not have fired yet — poll briefly
            const poll = setInterval(() => {
              fetch(`${API_URL}/subscribe/status`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then((r) => r.json())
                .then((s) => {
                  if (s.isPro) {
                    setSubscribed(true);
                    setShowPaywall(false);
                    clearInterval(poll);
                  }
                });
            }, 2000);
            setTimeout(() => clearInterval(poll), 20000);
          }
        })
        .catch(() => {
          localStorage.removeItem("poker_token");
        })
        .finally(() => {
          setAuthChecked(true);
          setTimeout(() => setLoaded(true), 100);
        });
    } else {
      setAuthChecked(true);
      setTimeout(() => setLoaded(true), 100);
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    const status = userData.subscriptionStatus;
    if (status === "active" || status === "trialing") {
      setSubscribed(true);
      setShowPaywall(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("poker_token");
    setUser(null);
    setSubscribed(false);
    setShowPaywall(true);
  };

  const handleSubscribe = () => {
    setSubscribed(true);
    setShowPaywall(false);
    setShowUpgrade(false);
  };

  const handleContinueFree = () => {
    setShowPaywall(false);
    setSubscribed(false);
    setTab("rankings");
  };

  if (!authChecked) return null;

  if (!user) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const handleTabClick = (key) => {
    if (!subscribed && !FREE_TABS.includes(key)) {
      setShowUpgrade(true);
      return;
    }
    setTab(key);
    setShowUpgrade(false);
  };

  if (showPaywall) {
    return <Paywall onSubscribe={handleSubscribe} onRestore={handleContinueFree} />;
  }

  const tabs = {
    preflop: { label: "Preflop", icon: "🧠", component: <PreflopAdvisor />, premium: true },
    odds: { label: "Odds", icon: "🎲", component: <OddsCalculator />, premium: true },
    hand: { label: "Hand", icon: "🃏", component: <HandEvaluator />, premium: true },
    position: { label: "Position", icon: "🎯", component: <PositionGuide />, premium: true },
    rankings: { label: "Rankings", icon: "👑", component: <HandRankings />, premium: false },
    bankroll: { label: "Bankroll", icon: "💰", component: <BankrollTracker />, premium: true },
    glossary: { label: "Glossary", icon: "📖", component: <Glossary />, premium: false },
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a1a12 0%, #0d1f17 30%, #0a1610 60%, #0f1a14 100%)",
      fontFamily: "'DM Sans', sans-serif",
      color: "#d0c8b8",
    }}>
      {/* Noise overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "0 16px", position: "relative" }}>
        {/* Header */}
        <div className="text-center" style={{
          paddingTop: "32px", paddingBottom: "16px",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(-10px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{ fontSize: "10px", color: "#5a6a5a", letterSpacing: "4px", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }}>
            ♠ ♥ ♦ ♣
          </div>
          <h1 style={{
            fontSize: "32px", fontWeight: 900, fontFamily: "'Playfair Display', serif",
            background: "linear-gradient(135deg, #f0d78c 0%, #c9a84c 50%, #f0d78c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            lineHeight: 1.1,
          }}>
            Poker Toolkit
          </h1>
          <div style={{ fontSize: "12px", color: "#4a5a4a", fontFamily: "'DM Sans', sans-serif", marginTop: "4px" }}>
            {subscribed ? "Pro Member ✦" : "Free Plan · Rankings & Glossary"}
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex justify-center overflow-x-auto" style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "20px",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.6s 0.2s",
        }}>
          {Object.entries(tabs).map(([key, { label, icon, premium }]) => (
            <div key={key} className="relative">
              <TabButton active={tab === key} onClick={() => handleTabClick(key)} icon={icon}>
                {label}
              </TabButton>
              {premium && !subscribed && (
                <div className="absolute -top-1 -right-0.5 rounded-full w-3.5 h-3.5 flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #c9a84c, #a08030)",
                  fontSize: "7px", color: "#1a1a2e", fontWeight: 900,
                }}>♦</div>
              )}
            </div>
          ))}
        </div>

        {/* Upgrade prompt */}
        {showUpgrade && !subscribed && (
          <div className="rounded-2xl p-5 text-center" style={{
            background: "linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.03))",
            border: "1px solid rgba(201,168,76,0.25)",
            marginBottom: "20px",
            animation: "pwFadeUp 0.3s ease",
          }}>
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>🔒</div>
            <div style={{ color: "#f0d78c", fontSize: "18px", fontWeight: 700, fontFamily: "'Playfair Display', serif", marginBottom: "4px" }}>
              Pro Feature
            </div>
            <div style={{ color: "#8a9a8a", fontSize: "13px", marginBottom: "16px" }}>
              Unlock all tools including the Preflop Advisor, Odds Calculator, Hand Evaluator, Position Guide, and Bankroll Tracker.
            </div>
            <div className="flex items-baseline justify-center gap-1 mb-3">
              <span style={{ color: "#f0d78c", fontSize: "32px", fontWeight: 900, fontFamily: "'Playfair Display', serif" }}>$8.97</span>
              <span style={{ color: "#6a7a6a", fontSize: "13px" }}>/month</span>
            </div>
            <button onClick={() => setShowPaywall(true)}
              className="w-full rounded-xl py-3 transition-all duration-300"
              style={{
                background: "linear-gradient(135deg, #c9a84c, #a08030)",
                color: "#1a1a2e", fontWeight: 800, fontSize: "14px",
                fontFamily: "'Playfair Display', serif",
                border: "none", cursor: "pointer",
                boxShadow: "0 4px 16px rgba(201,168,76,0.3)",
                marginBottom: "8px",
              }}>
              Upgrade to Pro
            </button>
            <div style={{ color: "#4a5a4a", fontSize: "10px" }}>3-day free trial · Cancel anytime</div>
          </div>
        )}

        {/* Content */}
        <div style={{
          paddingBottom: "40px",
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(10px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
        }}>
          {(!showUpgrade || subscribed) && tabs[tab].component}
        </div>
      </div>

      <style>{`
        @keyframes pwFadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
