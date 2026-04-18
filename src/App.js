import { useState, useEffect, useRef } from "react";

const PROFILE = {
  weeklyIncome: 1300,
  weeklyExpenseTarget: 420,
  weeklySurplus: 880,
  debts: [
    { id: "car", name: "Car (Uncle)", total: 6900, paid: 3532, priority: 1, color: "#FF6B35" },
    { id: "latitude", name: "Latitude", total: 6300, paid: 0, priority: 2, color: "#E63946" },
    { id: "zip", name: "Zip", total: 1000, paid: 0, priority: 3, color: "#457B9D" },
    { id: "afterpay", name: "Afterpay", total: 200, paid: 0, priority: 4, color: "#2A9D8F" },
    { id: "steppay", name: "StepPay", total: 300, paid: 0, priority: 5, color: "#E9C46A" },
    { id: "friend", name: "Friend (Trip)", total: 700, paid: 0, priority: 6, color: "#8338EC" },
  ],
  rules: [
    "No new debt (Zip / Afterpay / etc.)",
    "No overspending during trip",
    "All income must be assigned immediately",
    "Weekly structure must be followed strictly",
    "Focus on cash flow, not emotions",
  ],
  phases: [
    { id: 1, name: "Stabilize", range: "Now – End April", status: "active" },
    { id: 2, name: "Clear Obligations", range: "May", status: "upcoming" },
    { id: 3, name: "Aggressive Payoff", range: "June+", status: "upcoming" },
  ],
  expenseCategories: [
    { id: "transport", name: "Transport", budget: 100, icon: "\u{1F697}" },
    { id: "subscriptions", name: "Subscriptions", budget: 25, icon: "\u{1F4F1}" },
    { id: "car_insurance", name: "Car Insurance", budget: 70, icon: "\u{1F6E1}" },
    { id: "health_insurance", name: "Health Insurance", budget: 30, icon: "\u{1F3E5}" },
    { id: "emi", name: "EMI (House)", budget: 50, icon: "\u{1F3E0}" },
    { id: "family", name: "Family Support", budget: 25, icon: "\u{1F468}\u200D\u{1F469}\u200D\u{1F466}" },
    { id: "rego", name: "Rego", budget: 20, icon: "\u{1F4CB}" },
    { id: "lifestyle", name: "Lifestyle", budget: 100, icon: "\u{1F3AF}" },
  ],
};

// Storage helpers
const store = {
  get: (key, fallback) => { try { const v = localStorage.getItem(`ta_${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, val) => { try { localStorage.setItem(`ta_${key}`, JSON.stringify(val)); } catch {} },
};

// Get API key
const getApiKey = () => store.get("apikey", "");

// AI call helper
const callAI = async (systemPrompt, userMessage) => {
  const apiKey = getApiKey();
  if (!apiKey) return "\u26A0\uFE0F No API key set. Go to Settings (gear icon) to add your Anthropic API key.";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) return "\u26A0\uFE0F Invalid API key. Check your key in Settings.";
      return `\u26A0\uFE0F API error: ${err.error?.message || res.statusText}`;
    }
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "No response received.";
  } catch (e) {
    return "\u26A0\uFE0F Couldn't connect. Check your internet and try again.";
  }
};

const callAIChat = async (systemPrompt, messages) => {
  const apiKey = getApiKey();
  if (!apiKey) return "\u26A0\uFE0F No API key set. Go to Settings (gear icon) to add your Anthropic API key.";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages,
      }),
    });
    if (!res.ok) {
      if (res.status === 401) return "\u26A0\uFE0F Invalid API key. Check your key in Settings.";
      return "\u26A0\uFE0F API error. Try again.";
    }
    const data = await res.json();
    return data.content?.map(b => b.text || "").join("") || "No response.";
  } catch {
    return "\u26A0\uFE0F Couldn't connect. Try again.";
  }
};

// ─── Animated Number ───
const AnimNum = ({ value, prefix = "", suffix = "" }) => {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const start = display;
    const diff = value - start;
    if (Math.abs(diff) < 1) { setDisplay(value); return; }
    let frame = 0;
    const total = 20;
    const step = () => {
      frame++;
      setDisplay(Math.round(start + diff * (frame / total)));
      if (frame < total) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    // eslint-disable-next-line
  }, [value]);
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
};

// ─── Progress Ring ───
const ProgressRing = ({ percent, size = 120, stroke = 8, color = "#34C759", bgColor = "rgba(120,120,128,0.12)", children }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bgColor} strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
};

// ─── Tab Bar ───
const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "\u{1F4CA}" },
  { id: "checkin", label: "Check-in", icon: "\u270F\uFE0F" },
  { id: "think", label: "Think Again", icon: "\u{1F9E0}" },
  { id: "coach", label: "Coach", icon: "\u{1F4AC}" },
  { id: "debts", label: "Debts", icon: "\u{1F4C9}" },
];

const TabBar = ({ active, onChange }) => (
  <div style={{
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
    background: "rgba(22,22,24,0.82)", backdropFilter: "blur(40px) saturate(180%)",
    WebkitBackdropFilter: "blur(40px) saturate(180%)",
    borderTop: "0.5px solid rgba(255,255,255,0.08)",
    display: "flex", justifyContent: "space-around",
    padding: "6px 0 calc(env(safe-area-inset-bottom, 8px) + 8px)",
  }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => onChange(t.id)} style={{
        background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center",
        gap: 2, padding: "4px 12px", cursor: "pointer", transition: "all .2s",
        opacity: active === t.id ? 1 : 0.45,
      }}>
        <span style={{ fontSize: 22 }}>{t.icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, letterSpacing: 0.2,
          color: active === t.id ? "#34C759" : "rgba(255,255,255,0.6)",
        }}>{t.label}</span>
      </button>
    ))}
  </div>
);

// ─── Card ───
const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "rgba(255,255,255,0.05)", borderRadius: 16,
    border: "0.5px solid rgba(255,255,255,0.08)",
    padding: 20, ...style,
    ...(onClick ? { cursor: "pointer" } : {}),
  }}>{children}</div>
);

const SectionHead = ({ title, subtitle }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.35)" }}>{title}</div>
    {subtitle && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{subtitle}</div>}
  </div>
);

const inputStyle = {
  background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)",
  borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 16, width: "100%",
  fontFamily: "'SF Mono', ui-monospace, monospace", outline: "none", boxSizing: "border-box",
};

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
const Settings = ({ onClose }) => {
  const [key, setKey] = useState(() => getApiKey());
  const [saved, setSaved] = useState(false);

  const save = () => {
    store.set("apikey", key);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      padding: "env(safe-area-inset-top, 20px) 20px 20px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Settings</div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 20,
          width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>\u2715</button>
      </div>

      <Card>
        <SectionHead title="Anthropic API Key" subtitle="Required for AI features" />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, margin: "0 0 16px" }}>
          This key stays on your phone only. It is never sent anywhere except directly to Anthropic's servers.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            style={inputStyle}
          />
          <button onClick={save} style={{
            background: saved ? "#34C759" : "linear-gradient(135deg, #34C759, #30B350)",
            border: "none", borderRadius: 12, padding: "14px", color: "#fff",
            fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all .3s",
          }}>
            {saved ? "\u2713 Saved!" : "Save Key"}
          </button>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHead title="How to get your API key" />
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          <div style={{ marginBottom: 8 }}><span style={{ color: "#34C759", fontWeight: 700 }}>1.</span> Go to <span style={{ color: "#fff", fontWeight: 600 }}>console.anthropic.com</span></div>
          <div style={{ marginBottom: 8 }}><span style={{ color: "#34C759", fontWeight: 700 }}>2.</span> Sign up or log in</div>
          <div style={{ marginBottom: 8 }}><span style={{ color: "#34C759", fontWeight: 700 }}>3.</span> Click <span style={{ color: "#fff", fontWeight: 600 }}>API Keys</span> in the sidebar</div>
          <div style={{ marginBottom: 8 }}><span style={{ color: "#34C759", fontWeight: 700 }}>4.</span> Click <span style={{ color: "#fff", fontWeight: 600 }}>Create Key</span></div>
          <div><span style={{ color: "#34C759", fontWeight: 700 }}>5.</span> Copy and paste it above</div>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHead title="Reset All Data" />
        <button onClick={() => {
          if (window.confirm("This will delete ALL your check-in history and debt payment records. Are you sure?")) {
            localStorage.clear();
            window.location.reload();
          }
        }} style={{
          background: "rgba(255,59,48,0.1)", border: "0.5px solid rgba(255,59,48,0.2)",
          borderRadius: 12, padding: "12px", color: "#FF3B30", width: "100%",
          fontSize: 15, fontWeight: 600, cursor: "pointer",
        }}>
          Reset Everything
        </button>
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
const Dashboard = ({ weeklyData, debtPayments }) => {
  const currentWeek = weeklyData[weeklyData.length - 1] || { spent: 0, income: 0 };
  const totalSpent = currentWeek.spent || 0;
  const spentPercent = (totalSpent / PROFILE.weeklyExpenseTarget) * 100;
  const remaining = PROFILE.weeklyExpenseTarget - totalSpent;

  const totalDebt = PROFILE.debts.reduce((s, d) => s + d.total, 0);
  const totalPaid = PROFILE.debts.reduce((s, d) => {
    const extra = (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0);
    return s + d.paid + extra;
  }, 0);
  const debtPercent = (totalPaid / totalDebt) * 100;
  const weeksToFree = Math.ceil((totalDebt - totalPaid) / PROFILE.weeklySurplus);
  const currentPhase = PROFILE.phases.find(p => p.status === "active");
  const streak = weeklyData.filter(w => (w.spent || 0) <= PROFILE.weeklyExpenseTarget).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: "linear-gradient(135deg, rgba(52,199,89,0.12) 0%, rgba(52,199,89,0.03) 100%)", border: "0.5px solid rgba(52,199,89,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#34C759" }}>
              Phase {currentPhase?.id} \u2014 {currentPhase?.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{currentPhase?.range}</div>
          </div>
          <div style={{ fontSize: 32 }}>\u26A1</div>
        </div>
      </Card>

      <Card>
        <SectionHead title="This Week's Spending" />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <ProgressRing percent={spentPercent} color={spentPercent > 100 ? "#FF3B30" : spentPercent > 80 ? "#FF9500" : "#34C759"}>
            <span style={{ fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'SF Mono', ui-monospace, monospace" }}>
              <AnimNum value={Math.round(spentPercent)} suffix="%" />
            </span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>of budget</span>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>SPENT</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${totalSpent}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>REMAINING</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: remaining >= 0 ? "#34C759" : "#FF3B30", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${remaining}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              Target: <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>${PROFILE.weeklyExpenseTarget}/week</span>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead title="Debt Freedom Progress" />
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <ProgressRing percent={debtPercent} size={100} color="#8338EC">
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "'SF Mono', ui-monospace, monospace" }}>
              <AnimNum value={Math.round(debtPercent)} suffix="%" />
            </span>
          </ProgressRing>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 20, fontFamily: "'SF Mono', ui-monospace, monospace" }}>${(totalDebt - totalPaid).toLocaleString()}</span> left
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>
              ~{weeksToFree} weeks to debt-free at current pace
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#34C759", fontFamily: "'SF Mono', ui-monospace, monospace" }}>{streak}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>Week Streak</div>
        </Card>
        <Card style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#FF9500", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${PROFILE.weeklySurplus}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 4 }}>Weekly Surplus</div>
        </Card>
      </div>

      <Card>
        <SectionHead title="Your Rules" subtitle="Non-negotiable" />
        {PROFILE.rules.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
            borderBottom: i < PROFILE.rules.length - 1 ? "0.5px solid rgba(255,255,255,0.06)" : "none" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#FF3B30", width: 18, textAlign: "center", fontFamily: "'SF Mono', ui-monospace, monospace" }}>{i + 1}</span>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)" }}>{r}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════
// WEEKLY CHECK-IN
// ═══════════════════════════════════════════════
const WeeklyCheckin = ({ weeklyData, setWeeklyData }) => {
  const [expenses, setExpenses] = useState({});
  const [incomeOFM, setIncomeOFM] = useState("");
  const [incomeDD, setIncomeDD] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [review, setReview] = useState("");
  const [loading, setLoading] = useState(false);

  const totalSpent = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalIncome = (parseFloat(incomeOFM) || 0) + (parseFloat(incomeDD) || 0);

  const handleSubmit = async () => {
    setLoading(true);
    const weekData = { date: new Date().toISOString(), spent: totalSpent, income: totalIncome, breakdown: { ...expenses } };
    const updated = [...weeklyData, weekData];
    setWeeklyData(updated);
    store.set("weeks", updated);

    const text = await callAI(
      `You are Het's financial coach inside "Think Again!". Be direct, honest, tough but supportive. Weekly expense target: $${PROFILE.weeklyExpenseTarget}. Weekly income target: $${PROFILE.weeklyIncome}. Total remaining debt: ~$${PROFILE.debts.reduce((s,d) => s + d.total - d.paid, 0).toLocaleString()}. Respond in 3-4 short paragraphs. Start with verdict emoji + one-line verdict. Analyze spending. Give specific next-week advice. Be real.`,
      `Weekly check-in:\n\nIncome: OFM $${incomeOFM || 0}, DoorDash $${incomeDD || 0} = $${totalIncome}\n\nExpenses:\n${PROFILE.expenseCategories.map(c => `- ${c.name}: $${expenses[c.id] || 0} (budget: $${c.budget})`).join("\n")}\n\nTotal spent: $${totalSpent} (target: $${PROFILE.weeklyExpenseTarget})\nSurplus: $${totalIncome - totalSpent}\n\nGive me your honest review.`
    );
    setReview(text);
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ background: "linear-gradient(135deg, rgba(52,199,89,0.1) 0%, rgba(52,199,89,0.02) 100%)", border: "0.5px solid rgba(52,199,89,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#34C759", marginBottom: 8 }}>Weekly Review</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>SPENT</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: totalSpent <= PROFILE.weeklyExpenseTarget ? "#34C759" : "#FF3B30", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${totalSpent}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>EARNED</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${totalIncome}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>AI Coach Says</div>
          <div style={{ fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap" }}>{review}</div>
        </Card>
        <button onClick={() => { setSubmitted(false); setExpenses({}); setIncomeOFM(""); setIncomeDD(""); setReview(""); }}
          style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          New Check-in
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionHead title="Income This Week" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 4, display: "block" }}>OFM</label>
            <input type="number" inputMode="numeric" value={incomeOFM} onChange={e => setIncomeOFM(e.target.value)} placeholder="1000" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 4, display: "block" }}>DoorDash</label>
            <input type="number" inputMode="numeric" value={incomeDD} onChange={e => setIncomeDD(e.target.value)} placeholder="300" style={inputStyle} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead title="Expenses" subtitle={`Total: $${totalSpent} / $${PROFILE.weeklyExpenseTarget}`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PROFILE.expenseCategories.map(cat => (
            <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20, width: 32, textAlign: "center" }}>{cat.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{cat.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Budget: ${cat.budget}</div>
              </div>
              <input type="number" inputMode="numeric" value={expenses[cat.id] || ""} onChange={e => setExpenses(p => ({ ...p, [cat.id]: e.target.value }))}
                placeholder={`${cat.budget}`}
                style={{ ...inputStyle, width: 90, textAlign: "right", padding: "8px 10px" }} />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{
        background: totalSpent <= PROFILE.weeklyExpenseTarget
          ? "linear-gradient(135deg, rgba(52,199,89,0.1), rgba(52,199,89,0.02))"
          : "linear-gradient(135deg, rgba(255,59,48,0.1), rgba(255,59,48,0.02))",
        border: `0.5px solid ${totalSpent <= PROFILE.weeklyExpenseTarget ? "rgba(52,199,89,0.2)" : "rgba(255,59,48,0.2)"}`
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>TOTAL SPENT</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'SF Mono', ui-monospace, monospace", color: totalSpent <= PROFILE.weeklyExpenseTarget ? "#34C759" : "#FF3B30" }}>${totalSpent}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
              {totalSpent <= PROFILE.weeklyExpenseTarget ? "UNDER BUDGET" : "OVER BUDGET"}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'SF Mono', ui-monospace, monospace", color: totalSpent <= PROFILE.weeklyExpenseTarget ? "#34C759" : "#FF3B30" }}>
              ${Math.abs(PROFILE.weeklyExpenseTarget - totalSpent)}
            </div>
          </div>
        </div>
      </Card>

      <button onClick={handleSubmit} disabled={loading}
        style={{
          background: loading ? "rgba(52,199,89,0.3)" : "linear-gradient(135deg, #34C759, #30B350)",
          border: "none", borderRadius: 14, padding: "16px", color: "#fff",
          fontSize: 17, fontWeight: 700, cursor: loading ? "default" : "pointer", letterSpacing: 0.3,
        }}>
        {loading ? "Analyzing..." : "Submit & Get Review"}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════
// THINK AGAIN
// ═══════════════════════════════════════════════
const ThinkAgain = ({ debtPayments }) => {
  const [item, setItem] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const totalRemaining = PROFILE.debts.reduce((s, d) => {
    const extra = (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0);
    return s + (d.total - d.paid - extra);
  }, 0);

  const analyze = async () => {
    setLoading(true);
    const text = await callAI(
      `You are the "Think Again!" purchase advisor for Het. Brutally honest. Het's profile:\n- Weekly income: $${PROFILE.weeklyIncome}\n- Weekly expenses: $${PROFILE.weeklyExpenseTarget}\n- Weekly surplus: $${PROFILE.weeklySurplus}\n- Total remaining debt: $${totalRemaining.toLocaleString()}\n- Credit score: 275 (very low, recovering)\n- Currently in debt payoff mode\n\nResponse format:\n1. Start with EXACTLY one of: "\u2705 GO FOR IT", "\u23F3 NOT YET", or "\u{1F6AB} HARD NO"\n2. Blank line\n3. THE MATH: exact financial impact in 2-3 points\n4. THE REALITY CHECK: 2-3 sentences honest analysis\n5. THE VERDICT: specific advice\n\nBe specific with numbers. Show how many weeks it delays debt freedom.`,
      `I want to buy: ${item}\nCost: $${cost}\nWhy: ${reason}\nMy plan to afford it: ${plan}\n\nShould I do this?`
    );
    setResult(text);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: "linear-gradient(135deg, rgba(131,56,236,0.1), rgba(131,56,236,0.02))", border: "0.5px solid rgba(131,56,236,0.15)" }}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{"\u{1F9E0}"}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>Think Again!</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Pitch your purchase. Get the truth.</div>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6, display: "block" }}>What do you want to buy?</label>
            <input value={item} onChange={e => setItem(e.target.value)} placeholder="e.g. iPhone 17 Pro" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6, display: "block" }}>How much?</label>
            <input type="number" inputMode="numeric" value={cost} onChange={e => setCost(e.target.value)} placeholder="1399" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6, display: "block" }}>Why do you want it?</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Gift for my girlfriend's birthday..."
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 6, display: "block" }}>Your plan to afford it</label>
            <textarea value={plan} onChange={e => setPlan(e.target.value)} placeholder="I'll do extra DoorDash shifts for 3 weeks..."
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>
      </Card>

      <button onClick={analyze} disabled={loading || !item || !cost}
        style={{
          background: loading ? "rgba(131,56,236,0.3)" : "linear-gradient(135deg, #8338EC, #6B2DC3)",
          border: "none", borderRadius: 14, padding: "16px", color: "#fff",
          fontSize: 17, fontWeight: 700, cursor: loading || !item || !cost ? "default" : "pointer",
          opacity: !item || !cost ? 0.4 : 1, transition: "all .2s",
        }}>
        {loading ? "Analyzing..." : "Think Again! \u{1F9E0}"}
      </button>

      {result && (
        <Card style={{
          background: result.startsWith("\u2705") ? "rgba(52,199,89,0.06)" : result.startsWith("\u23F3") ? "rgba(255,149,0,0.06)" : "rgba(255,59,48,0.06)",
          border: `0.5px solid ${result.startsWith("\u2705") ? "rgba(52,199,89,0.15)" : result.startsWith("\u23F3") ? "rgba(255,149,0,0.15)" : "rgba(255,59,48,0.15)"}`,
        }}>
          <div style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)", whiteSpace: "pre-wrap" }}>{result}</div>
        </Card>
      )}

      {result && (
        <button onClick={() => { setResult(null); setItem(""); setCost(""); setReason(""); setPlan(""); }}
          style={{ background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px", color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
          New Purchase Check
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// AI COACH
// ═══════════════════════════════════════════════
const CoachChat = ({ debtPayments, weeklyData }) => {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey Het! I'm your financial coach. Ask me anything \u2014 spending decisions, debt strategy, motivation, or just vent about money stress. I've got your full financial picture and I'll give it to you straight. \u{1F4AA}" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const totalRemaining = PROFILE.debts.reduce((s, d) => {
    const extra = (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0);
    return s + (d.total - d.paid - extra);
  }, 0);

  const sysPrompt = `You are Het's personal financial coach inside "Think Again!". Be direct, warm, honest. Het's profile:\n- Weekly income: $1300 (OFM $1000 + DoorDash $300)\n- Weekly expense target: $420, surplus: $880\n- Total remaining debt: $${totalRemaining.toLocaleString()}\n- Credit score: 275 (recovering)\n- Lives in Australia, no rent, partner covers groceries/bills\n- Debts: ${PROFILE.debts.map(d => `${d.name}: $${d.total - d.paid - ((debtPayments[d.id] || []).reduce((a,p) => a + p.amount, 0))} remaining`).join(", ")}\n- Core issue: cash flow mismanagement, not income\nKeep responses concise (2-4 paragraphs). Use specific numbers. Be a coach, not a cheerleader.`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    const apiMessages = history.filter((_, i) => i > 0).map(m => ({ role: m.role, content: m.content }));
    const text = await callAIChat(sysPrompt, apiMessages);
    setMessages([...history, { role: "assistant", content: text }]);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%",
            background: m.role === "user" ? "linear-gradient(135deg, #34C759, #30B350)" : "rgba(255,255,255,0.06)",
            borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            padding: "12px 16px",
            border: m.role === "user" ? "none" : "0.5px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ fontSize: 15, lineHeight: 1.6, color: m.role === "user" ? "#fff" : "rgba(255,255,255,0.8)", whiteSpace: "pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.06)", borderRadius: "18px 18px 18px 4px", padding: "12px 16px", border: "0.5px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.3)", animation: `pulse 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={chatEnd} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask your coach..." style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 22, padding: "12px 18px", color: "#fff", fontSize: 15, outline: "none" }} />
        <button onClick={send} disabled={loading || !input.trim()}
          style={{ background: "linear-gradient(135deg, #34C759, #30B350)", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, opacity: !input.trim() ? 0.4 : 1, flexShrink: 0, color: "#fff", fontWeight: 700 }}>
          \u2191
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// DEBT TRACKER
// ═══════════════════════════════════════════════
const DebtTracker = ({ debtPayments, setDebtPayments }) => {
  const [addingTo, setAddingTo] = useState(null);
  const [payAmount, setPayAmount] = useState("");

  const addPayment = (debtId) => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;
    const updated = { ...debtPayments, [debtId]: [...(debtPayments[debtId] || []), { amount: amt, date: new Date().toISOString() }] };
    setDebtPayments(updated);
    store.set("debtPay", updated);
    setAddingTo(null);
    setPayAmount("");
  };

  const totalDebt = PROFILE.debts.reduce((s, d) => s + d.total, 0);
  const totalPaid = PROFILE.debts.reduce((s, d) => s + d.paid + (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0), 0);
  const totalRemaining = totalDebt - totalPaid;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Total Remaining Debt</div>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#FF3B30", fontFamily: "'SF Mono', ui-monospace, monospace" }}>
          $<AnimNum value={totalRemaining} />
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>${totalPaid.toLocaleString()} paid of ${totalDebt.toLocaleString()}</div>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", marginTop: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 3, width: `${(totalPaid / totalDebt) * 100}%`, background: "linear-gradient(90deg, #34C759, #30D158)", transition: "width 1s" }} />
        </div>
      </Card>

      {PROFILE.debts.map(debt => {
        const extraPaid = (debtPayments[debt.id] || []).reduce((a, p) => a + p.amount, 0);
        const paid = debt.paid + extraPaid;
        const remaining = debt.total - paid;
        const percent = (paid / debt.total) * 100;
        const isCleared = remaining <= 0;

        return (
          <Card key={debt.id} style={isCleared ? { opacity: 0.5, border: "0.5px solid rgba(52,199,89,0.2)" } : {}}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: debt.color }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{debt.name}</span>
                {isCleared && <span style={{ fontSize: 11, fontWeight: 700, color: "#34C759", background: "rgba(52,199,89,0.15)", padding: "2px 8px", borderRadius: 6 }}>CLEARED</span>}
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>P{debt.priority}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Remaining</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'SF Mono', ui-monospace, monospace" }}>${Math.max(0, remaining).toLocaleString()}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${debt.color}, ${debt.color}dd)`, transition: "width 0.8s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>${paid.toLocaleString()} / ${debt.total.toLocaleString()}</span>
              {!isCleared && (
                addingTo === debt.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="number" inputMode="numeric" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="Amount" autoFocus
                      style={{ background: "rgba(255,255,255,0.08)", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 14, width: 90, fontFamily: "'SF Mono', ui-monospace, monospace", outline: "none" }} />
                    <button onClick={() => addPayment(debt.id)} style={{ background: "#34C759", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
                    <button onClick={() => { setAddingTo(null); setPayAmount(""); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>\u2715</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTo(debt.id)} style={{ background: "rgba(52,199,89,0.1)", border: "0.5px solid rgba(52,199,89,0.2)", borderRadius: 8, padding: "6px 14px", color: "#34C759", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Payment</button>
                )
              )}
            </div>
            {(debtPayments[debt.id] || []).length > 0 && (
              <div style={{ marginTop: 12, borderTop: "0.5px solid rgba(255,255,255,0.06)", paddingTop: 8 }}>
                {(debtPayments[debt.id] || []).slice(-3).map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                    <span style={{ color: "rgba(255,255,255,0.3)" }}>{new Date(p.date).toLocaleDateString()}</span>
                    <span style={{ color: "#34C759", fontWeight: 600, fontFamily: "'SF Mono', ui-monospace, monospace" }}>-${p.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function ThinkAgainApp() {
  const [tab, setTab] = useState("dashboard");
  const [weeklyData, setWeeklyData] = useState(() => store.get("weeks", []));
  const [debtPayments, setDebtPayments] = useState(() => store.get("debtPay", {}));
  const [showSettings, setShowSettings] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  const titles = { dashboard: "Dashboard", checkin: "Weekly Check-in", think: "Think Again!", coach: "AI Coach", debts: "Debt Tracker" };

  return (
    <div style={{
      minHeight: "100vh", background: "#000", color: "#fff",
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif",
      WebkitFontSmoothing: "antialiased", opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease",
    }}>
      <style>{`
        @keyframes pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2); }
        input:focus, textarea:focus { border-color: rgba(52,199,89,0.4) !important; }
        ::-webkit-scrollbar { display: none; }
        body { margin: 0; background: #000; overscroll-behavior: none; }
      `}</style>

      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "env(safe-area-inset-top, 12px) 20px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.8, color: "#fff" }}>
            {tab === "think" ? "\u{1F9E0} " : ""}{titles[tab]}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(52,199,89,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: 0.5 }}>
              Phase {PROFILE.phases.find(p => p.status === "active")?.id}
            </div>
            <button onClick={() => setShowSettings(true)} style={{
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.5)",
            }}>{"\u2699\uFE0F"}</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px", maxWidth: 500, margin: "0 auto" }}>
        {tab === "dashboard" && <Dashboard weeklyData={weeklyData} debtPayments={debtPayments} />}
        {tab === "checkin" && <WeeklyCheckin weeklyData={weeklyData} setWeeklyData={setWeeklyData} />}
        {tab === "think" && <ThinkAgain debtPayments={debtPayments} />}
        {tab === "coach" && <CoachChat debtPayments={debtPayments} weeklyData={weeklyData} />}
        {tab === "debts" && <DebtTracker debtPayments={debtPayments} setDebtPayments={setDebtPayments} />}
      </div>

      <TabBar active={tab} onChange={setTab} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
