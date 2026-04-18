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
    { id: "transport", name: "Transport", budget: 100, icon: "🚗" },
    { id: "subscriptions", name: "Subscriptions", budget: 25, icon: "📱" },
    { id: "car_insurance", name: "Car Insurance", budget: 70, icon: "🛡️" },
    { id: "health_insurance", name: "Health Insurance", budget: 30, icon: "🏥" },
    { id: "emi", name: "EMI (House)", budget: 50, icon: "🏠" },
    { id: "family", name: "Family Support", budget: 25, icon: "👨‍👩‍👦" },
    { id: "rego", name: "Rego", budget: 20, icon: "📋" },
    { id: "lifestyle", name: "Lifestyle", budget: 100, icon: "🎯" },
  ],
};

// Storage helpers
const store = {
  get: (key, fallback) => { try { const v = localStorage.getItem(`ta_${key}`); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set: (key, val) => { try { localStorage.setItem(`ta_${key}`, JSON.stringify(val)); } catch {} },
};

// Helper: open Claude.ai with a pre-filled prompt
const openClaude = (prompt) => {
  const encoded = encodeURIComponent(prompt);
  window.open(`https://claude.ai/new?q=${encoded}`, "_blank");
};

// Build financial context string for prompts
const getFinancialContext = (debtPayments) => {
  const totalRemaining = PROFILE.debts.reduce((s, d) => {
    const extra = (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0);
    return s + (d.total - d.paid - extra);
  }, 0);
  const debtDetails = PROFILE.debts.map(d => {
    const extra = (debtPayments[d.id] || []).reduce((a, p) => a + p.amount, 0);
    const remaining = d.total - d.paid - extra;
    return `${d.name}: $${remaining} remaining`;
  }).join(", ");

  return `MY FINANCIAL PROFILE:
- Weekly income: $1,300 (OFM $1,000 + DoorDash $300)
- Weekly expense target: $420
- Weekly surplus: $880
- Total remaining debt: $${totalRemaining.toLocaleString()}
- Credit score: 275 (recovering)
- Lives in Australia, no rent, partner covers groceries/bills
- Debts: ${debtDetails}
- Core issue: cash flow mismanagement, not income
- Phase: Stabilize → Clear obligations → Aggressive payoff`;
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
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "checkin", label: "Check-in", icon: "✏️" },
  { id: "think", label: "Think Again", icon: "🧠" },
  { id: "coach", label: "Coach", icon: "💬" },
  { id: "debts", label: "Debts", icon: "📉" },
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

const greenButton = {
  background: "linear-gradient(135deg, #34C759, #30B350)",
  border: "none", borderRadius: 14, padding: "16px", color: "#fff",
  fontSize: 17, fontWeight: 700, cursor: "pointer", letterSpacing: 0.3,
  width: "100%", textAlign: "center", display: "block",
};

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════
const Settings = ({ onClose }) => {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)",
      display: "flex", flexDirection: "column",
      padding: "env(safe-area-inset-top, 20px) 20px 20px",
      overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: "#fff" }}>Settings</div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 20,
          width: 36, height: 36, color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      <Card>
        <SectionHead title="How It Works" />
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
          <p style={{ margin: "0 0 12px" }}>This app uses your <span style={{ color: "#34C759", fontWeight: 700 }}>existing Claude Pro plan</span> for AI features — no extra cost.</p>
          <p style={{ margin: "0 0 12px" }}>When you use <span style={{ color: "#fff", fontWeight: 600 }}>Think Again</span>, <span style={{ color: "#fff", fontWeight: 600 }}>Weekly Review</span>, or <span style={{ color: "#fff", fontWeight: 600 }}>AI Coach</span>, it opens Claude.ai with your financial data pre-loaded in the message.</p>
          <p style={{ margin: 0 }}>Your tracking data (expenses, debt payments) is saved on your device.</p>
        </div>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <SectionHead title="Reset All Data" />
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 12px", lineHeight: 1.5 }}>This will delete all your check-in history and debt payment records from this device.</p>
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
              Phase {currentPhase?.id} — {currentPhase?.name}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{currentPhase?.range}</div>
          </div>
          <div style={{ fontSize: 32 }}>⚡</div>
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
const WeeklyCheckin = ({ weeklyData, setWeeklyData, debtPayments }) => {
  const [expenses, setExpenses] = useState({});
  const [incomeOFM, setIncomeOFM] = useState("");
  const [incomeDD, setIncomeDD] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const totalSpent = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalIncome = (parseFloat(incomeOFM) || 0) + (parseFloat(incomeDD) || 0);

  const handleSubmit = () => {
    const weekData = { date: new Date().toISOString(), spent: totalSpent, income: totalIncome, breakdown: { ...expenses } };
    const updated = [...weeklyData, weekData];
    setWeeklyData(updated);
    store.set("weeks", updated);
    setSubmitted(true);
  };

  const getReviewPrompt = () => {
    const context = getFinancialContext(debtPayments);
    return `You are my financial coach. Be direct, honest, tough but supportive. Give me a weekly spending review.

${context}

HERE IS MY WEEKLY CHECK-IN:

Income this week: OFM $${incomeOFM || 0}, DoorDash $${incomeDD || 0} = Total $${totalIncome}

Expenses breakdown:
${PROFILE.expenseCategories.map(c => `- ${c.name}: $${expenses[c.id] || 0} (budget: $${c.budget})`).join("\n")}

Total spent: $${totalSpent} (target was $${PROFILE.weeklyExpenseTarget})
${totalSpent <= PROFILE.weeklyExpenseTarget ? `UNDER budget by $${PROFILE.weeklyExpenseTarget - totalSpent}` : `OVER budget by $${totalSpent - PROFILE.weeklyExpenseTarget}`}
Surplus this week: $${totalIncome - totalSpent}

Give me your HONEST review: verdict emoji + one-line verdict, then analyze my spending, then specific advice for next week. Be real — if I overspent, say it plainly. If I did well, acknowledge it.`;
  };

  if (submitted) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card style={{ background: "linear-gradient(135deg, rgba(52,199,89,0.1) 0%, rgba(52,199,89,0.02) 100%)", border: "0.5px solid rgba(52,199,89,0.15)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#34C759", marginBottom: 8 }}>Week Logged ✓</div>
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
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            Surplus: <span style={{ color: "#34C759", fontWeight: 700 }}>${totalIncome - totalSpent}</span>
          </div>
        </Card>

        <button onClick={() => openClaude(getReviewPrompt())} style={{
          ...greenButton,
          background: "linear-gradient(135deg, #8338EC, #6B2DC3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <span>Get AI Review from Claude</span>
          <span style={{ fontSize: 14 }}>↗</span>
        </button>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>
          Opens Claude.ai with your spending data pre-loaded. Uses your existing Pro plan — no extra cost.
        </div>

        <button onClick={() => { setSubmitted(false); setExpenses({}); setIncomeOFM(""); setIncomeDD(""); }}
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

      <button onClick={handleSubmit} style={greenButton}>
        Save Week ✓
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════
// THINK AGAIN (Purchase Advisor)
// ═══════════════════════════════════════════════
const ThinkAgain = ({ debtPayments }) => {
  const [item, setItem] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState("");
  const [plan, setPlan] = useState("");

  const getPrompt = () => {
    const context = getFinancialContext(debtPayments);
    return `You are my "Think Again!" purchase advisor. Be BRUTALLY honest.

${context}

I WANT TO BUY: ${item}
COST: $${cost}
WHY: ${reason}
MY PLAN TO AFFORD IT: ${plan}

Give me your verdict:
1. Start with EXACTLY one of: "✅ GO FOR IT", "⏳ NOT YET", or "🚫 HARD NO"
2. THE MATH: Show exact financial impact — how many weeks this delays my debt freedom
3. THE REALITY CHECK: 2-3 sentences of honest analysis
4. THE VERDICT: Specific advice (when I could buy it, or what to do instead)

Be specific with numbers. Don't sugarcoat it.`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: "linear-gradient(135deg, rgba(131,56,236,0.1), rgba(131,56,236,0.02))", border: "0.5px solid rgba(131,56,236,0.15)" }}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
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

      <button onClick={() => openClaude(getPrompt())} disabled={!item || !cost}
        style={{
          ...greenButton,
          background: !item || !cost ? "rgba(131,56,236,0.3)" : "linear-gradient(135deg, #8338EC, #6B2DC3)",
          opacity: !item || !cost ? 0.4 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        <span>Think Again! 🧠</span>
        <span style={{ fontSize: 14 }}>↗</span>
      </button>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>
        Opens Claude.ai with your purchase details and full financial profile. Uses your existing Pro plan.
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════
// AI COACH
// ═══════════════════════════════════════════════
const CoachChat = ({ debtPayments }) => {
  const [message, setMessage] = useState("");

  const quickPrompts = [
    { label: "Am I on track?", icon: "📍", prompt: "Am I on track with my financial plan? Review my current situation and tell me what I should focus on this week." },
    { label: "Motivate me", icon: "💪", prompt: "I need motivation to stay on my financial plan. Remind me why I'm doing this and how close I am to being debt-free." },
    { label: "What if scenario", icon: "🔮", prompt: "I want to run a what-if scenario. If I increase my DoorDash hours and earn an extra $200/week, how much faster would I be debt-free?" },
    { label: "Spending check", icon: "🔍", prompt: "I'm about to spend money on something and I'm not sure if I should. Help me think through it." },
  ];

  const buildPrompt = (userMsg) => {
    const context = getFinancialContext(debtPayments);
    return `You are my personal financial coach. Be direct, warm, honest — a coach, not a cheerleader. Use specific numbers from my profile.

${context}

MY QUESTION: ${userMsg}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ background: "linear-gradient(135deg, rgba(52,199,89,0.08), rgba(52,199,89,0.02))", border: "0.5px solid rgba(52,199,89,0.15)" }}>
        <div style={{ textAlign: "center", padding: "8px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>AI Coach</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4, lineHeight: 1.5 }}>
            Ask anything about your finances. Opens Claude.ai with your full profile pre-loaded.
          </div>
        </div>
      </Card>

      {/* Quick prompts */}
      <SectionHead title="Quick Actions" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {quickPrompts.map((qp, i) => (
          <Card key={i} onClick={() => openClaude(buildPrompt(qp.prompt))} style={{ cursor: "pointer", padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{qp.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{qp.label}</div>
          </Card>
        ))}
      </div>

      {/* Custom message */}
      <SectionHead title="Ask Anything" />
      <Card>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. Should I take on a side project for extra income? What's the fastest way to clear Latitude?"
          style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "inherit" }}
        />
      </Card>

      <button onClick={() => { if (message.trim()) openClaude(buildPrompt(message)); }}
        disabled={!message.trim()}
        style={{
          ...greenButton,
          opacity: !message.trim() ? 0.4 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        <span>Ask Claude</span>
        <span style={{ fontSize: 14 }}>↗</span>
      </button>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.5 }}>
        Uses your existing Claude Pro plan — no extra cost.
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
                    <button onClick={() => { setAddingTo(null); setPayAmount(""); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "6px 10px", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>✕</button>
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
            {tab === "think" ? "🧠 " : ""}{titles[tab]}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(52,199,89,0.12)", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "#34C759", letterSpacing: 0.5 }}>
              Phase {PROFILE.phases.find(p => p.status === "active")?.id}
            </div>
            <button onClick={() => setShowSettings(true)} style={{
              background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",
              width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.5)",
            }}>⚙️</button>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 100px", maxWidth: 500, margin: "0 auto" }}>
        {tab === "dashboard" && <Dashboard weeklyData={weeklyData} debtPayments={debtPayments} />}
        {tab === "checkin" && <WeeklyCheckin weeklyData={weeklyData} setWeeklyData={setWeeklyData} debtPayments={debtPayments} />}
        {tab === "think" && <ThinkAgain debtPayments={debtPayments} />}
        {tab === "coach" && <CoachChat debtPayments={debtPayments} />}
        {tab === "debts" && <DebtTracker debtPayments={debtPayments} setDebtPayments={setDebtPayments} />}
      </div>

      <TabBar active={tab} onChange={setTab} />
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
