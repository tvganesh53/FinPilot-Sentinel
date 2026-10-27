import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownLeft, ArrowUpRight, Bell, Bot, CalendarClock, Check,
  ChevronDown, CircleAlert, CircleDollarSign, Download, FileChartColumn,
  Gauge, Goal, LayoutDashboard, Lightbulb, Menu, Plus, ReceiptText, Search,
  Settings, ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingDown,
  TrendingUp, Wallet, X, ChartNoAxesCombined, GitCompareArrows, PiggyBank,
  CalendarDays, RefreshCw, MessageCircle, Clock3, CircleCheck, Filter
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Workspace" },
  { id: "transactions", label: "Transactions", icon: ReceiptText, group: "Workspace" },
  { id: "spending", label: "Spending Analysis", icon: ChartNoAxesCombined, group: "Workspace" },
  { id: "simulator", label: "What-if Simulator", icon: GitCompareArrows, group: "Planning" },
  { id: "insights", label: "Financial Insights", icon: Lightbulb, group: "Planning" },
  { id: "goals", label: "Financial Goals", icon: Goal, group: "Planning" },
  { id: "budget", label: "Budget Planner", icon: Gauge, group: "Planning" },
  { id: "bills", label: "Bills & Recurring", icon: CalendarClock, group: "Planning" },
  { id: "scenarios", label: "Scenario Planning", icon: SlidersHorizontal, group: "Intelligence" },
  { id: "assistant", label: "Financial Assistant", icon: Bot, group: "Intelligence" },
  { id: "reports", label: "Reports & Activity", icon: FileChartColumn, group: "Intelligence" },
];
const CURRENCY = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const MONEY = (v) => CURRENCY.format(Number(v || 0));
const DATE = (value) => {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const DEMO_NOTICE = "Prototype screen — this feature is not yet saved to SQLite.";

function IconButton({ children, label, onClick, className = "" }) {
  return <button type="button" aria-label={label} title={label} className={`icon-button ${className}`} onClick={onClick}>{children}</button>;
}
function Panel({ title, subtitle, action, children, className = "" }) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function Metric({ label, value, detail, icon: Icon, tone = "green" }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={18}/></span></div><div className="metric-value">{value}</div>{detail && <div className="metric-detail">{detail}</div>}</article>;
}
function Badge({ children, tone = "neutral" }) { return <span className={`badge ${tone}`}>{children}</span>; }
function EmptyState({ title, text }) { return <div className="empty-state"><Sparkles size={24}/><strong>{title}</strong><span>{text}</span></div>; }
function LoadingBlock() { return <div className="loading-block"><RefreshCw size={16} className="spin"/> Loading live SQLite data…</div>; }

function TransactionModal({ onClose, onSave, saving, error }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ name: "", category: "Food", date: today, amount: "", type: "expense" });
  const change = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="modal" onSubmit={(e) => { e.preventDefault(); onSave({ ...form, amount: Number(form.amount) }); }}><div className="modal-heading"><div><span className="eyebrow">SQLITE TRANSACTION</span><h2>Add transaction</h2></div><IconButton label="Close" onClick={onClose}><X/></IconButton></div><label>Transaction name<input autoFocus required maxLength={100} value={form.name} onChange={(e) => change("name", e.target.value)} placeholder="e.g. Grocery shopping"/></label><div className="form-grid"><label>Type<select value={form.type} onChange={(e) => change("type", e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Category<input required maxLength={50} value={form.category} onChange={(e) => change("category", e.target.value)} placeholder="e.g. Food"/></label><label>Amount (₹)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => change("amount", e.target.value)} placeholder="0.00"/></label><label>Date<input required type="date" value={form.date} onChange={(e) => change("date", e.target.value)}/></label></div>{error && <div className="inline-error">{error}</div>}<div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancel</button><button className="button primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save transaction"}</button></div></form></div>;
}

function Overview({ analytics, transactions, forecast, alerts, loading, onAdd, navigate }) {
  const categoryData = Object.entries(analytics?.expense_categories || {}).map(([name, value]) => ({ name, value: Number(value) })).sort((a,b)=>b.value-a.value);
  const forecastData = (forecast?.daily_forecast || []).map((d) => ({ date: DATE(d.date).replace(/\s\d{4}$/, ""), balance: Number(d.projected_balance || 0), income: Number(d.projected_income || 0), expenses: Number(d.projected_expenses || 0) }));
  const latest = [...transactions].sort((a,b) => String(b.date).localeCompare(String(a.date)) || Number(b.id)-Number(a.id)).slice(0,5);
  return <div className="page-stack">
    <div className="hero-strip"><div className="hero-mark"><ShieldCheck size={20}/></div><div className="hero-copy"><div className="hero-title-row"><h2>Financial command center</h2><Badge tone="success"><span className="live-dot"/> SQLite connected</Badge></div><p>Transparent, transaction-grounded financial monitoring. Estimates are labeled separately from recorded totals.</p></div><div className="hero-status"><span className="status-dot"/> FastAPI data source</div></div>
    {loading ? <LoadingBlock/> : <div className="metrics-grid"><Metric label="Recorded income" value={MONEY(analytics?.income)} detail="From saved income transactions" icon={ArrowDownLeft}/><Metric label="Recorded expenses" value={MONEY(analytics?.expenses)} detail={`${analytics?.transaction_count ?? transactions.length} total transactions`} icon={ArrowUpRight} tone="blue"/><Metric label="Net recorded cash flow" value={MONEY(analytics?.remaining)} detail="Income minus expenses; not bank balance" icon={Wallet} tone={Number(analytics?.remaining)<0?"red":"green"}/><Metric label="Active rule-based alerts" value={alerts.length} detail="Generated from saved transactions" icon={CircleAlert} tone="amber"/></div>}
    <div className="content-grid overview-grid">
      <Panel title="7-day cash-flow estimate" subtitle={forecast?.warning || "Rule-based estimate using historical transaction averages."} className="span-2" action={<Badge tone="neutral">Estimate</Badge>}>
        {forecastData.length ? <div className="chart-wrap large-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecastData} margin={{top:12,right:12,left:0,bottom:0}}><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#07845b" stopOpacity={0.2}/><stop offset="95%" stopColor="#07845b" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf1ed" vertical={false}/><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{fill:"#78857d",fontSize:12}}/><YAxis tickLine={false} axisLine={false} tick={{fill:"#78857d",fontSize:11}} tickFormatter={(v)=>`₹${Math.round(v/1000)}k`} width={48}/><Tooltip formatter={(v)=>MONEY(v)} contentStyle={{borderRadius:12,border:"1px solid #e4ebe5"}}/><Area type="monotone" dataKey="balance" name="Projected net cash flow" stroke="#07845b" strokeWidth={2.5} fill="url(#balanceFill)"/></AreaChart></ResponsiveContainer></div> : <EmptyState title="Forecast unavailable" text={forecast?.message || "Add valid-dated transactions to generate an estimate."}/>}
      </Panel>
      <Panel title="Expense categories" subtitle="Recorded expense totals" action={<button className="text-button" onClick={()=>navigate("spending")}>View analysis ↗</button>}>
        {categoryData.length ? <><div className="chart-wrap donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3} stroke="none">{categoryData.map((_,i)=><Cell key={i} fill={["#087f5b","#4eab87","#8cc8a9","#e3b35a","#7195d0","#b6c5bd"][i%6]}/>)}</Pie><Tooltip formatter={(v)=>MONEY(v)}/></PieChart></ResponsiveContainer></div><div className="category-list">{categoryData.slice(0,5).map((c,i)=><div className="category-line" key={c.name}><span className="category-dot" style={{background:["#087f5b","#4eab87","#8cc8a9","#e3b35a","#7195d0"][i%5]}}/><span>{c.name}</span><strong>{MONEY(c.value)}</strong></div>)}</div></> : <EmptyState title="No expense categories" text="Expense categories appear after transactions are recorded."/>}
      </Panel>
      <Panel title="Recent transactions" subtitle="Latest records from SQLite" action={<button className="text-button" onClick={()=>navigate("transactions")}>View all ↗</button>} className="span-2">
        {latest.length ? <div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Type</th><th className="align-right">Amount</th></tr></thead><tbody>{latest.map((t)=><tr key={t.id}><td><div className="transaction-name"><span className={`transaction-symbol ${t.type==="income"?"income":"expense"}`}>{t.type==="income"?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><strong>{t.name}</strong></div></td><td>{t.category}</td><td>{DATE(t.date)}</td><td><Badge tone={t.type==="income"?"success":"neutral"}>{t.type}</Badge></td><td className={`align-right amount ${t.type==="income"?"positive":""}`}>{t.type==="income"?"+":"−"}{MONEY(t.amount)}</td></tr>)}</tbody></table></div> : <EmptyState title="No transactions yet" text="Add your first transaction to populate the dashboard."/>}
      </Panel>
      <Panel title="Priority insights" subtitle="Rule-based alerts, not AI-generated advice" action={<button className="text-button" onClick={()=>navigate("insights")}>Open insights ↗</button>}>
        {alerts.length ? <div className="alert-list compact">{alerts.slice(0,3).map((a)=><AlertCard key={a.id} alert={a}/>)}</div> : <EmptyState title="No alerts returned" text="Alerts will appear when the API returns them."/>}
      </Panel>
    </div>
  </div>;
}
function AlertCard({ alert }) {
  const tone = alert.level === "warning" ? "warning" : alert.level === "success" ? "success" : "info";
  return <article className={`alert-card ${tone}`}><span className="alert-icon">{alert.level==="warning"?<CircleAlert size={18}/>:alert.level==="success"?<CircleCheck size={18}/>:<Lightbulb size={18}/>}</span><div><div className="alert-title-row"><strong>{alert.title}</strong><Badge tone={tone}>{alert.level}</Badge></div><p>{alert.message}</p></div></article>;
}
function Transactions({ transactions, onAdd, loading }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const filtered = useMemo(()=>transactions.filter(t=>(type==="all"||t.type===type)&&`${t.name} ${t.category} ${t.date}`.toLowerCase().includes(search.toLowerCase())),[transactions,type,search]);
  const exportCsv = () => {
    const rows = [["id","name","category","date","type","amount"], ...filtered.map(t=>[t.id,t.name,t.category,t.date,t.type,t.amount])];
    const csv = rows.map(row=>row.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"})); const a=document.createElement("a");a.href=url;a.download="finpilot-transactions.csv";a.click();URL.revokeObjectURL(url);
  };
  return <div className="page-stack"><PageTitle eyebrow="YOUR MONEY, IN ONE PLACE" title="Transaction ledger" subtitle="Review the records saved in your local SQLite database." actions={<><button className="button secondary" onClick={exportCsv}><Download size={16}/> Export CSV</button><button className="button primary" onClick={onAdd}><Plus size={17}/> New transaction</button></>}/><div className="metrics-grid three"><Metric label="Transactions shown" value={filtered.length} detail="After current filters" icon={ReceiptText}/><Metric label="Income in view" value={MONEY(filtered.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0))} icon={TrendingUp}/><Metric label="Expenses in view" value={MONEY(filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0))} icon={TrendingDown} tone="blue"/></div><Panel title="All transactions" subtitle="Values are read directly from the SQLite API"><div className="table-tools"><div className="search-field"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, category, date…"/></div><div className="filter-pills"><button className={type==="all"?"selected":""} onClick={()=>setType("all")}><Filter size={14}/> All</button><button className={type==="income"?"selected":""} onClick={()=>setType("income")}>Income</button><button className={type==="expense"?"selected":""} onClick={()=>setType("expense")}>Expenses</button></div></div>{loading?<LoadingBlock/>:filtered.length?<div className="table-scroll"><table><thead><tr><th>Transaction</th><th>Category</th><th>Date</th><th>Type</th><th className="align-right">Amount</th></tr></thead><tbody>{filtered.map(t=><tr key={t.id}><td><div className="transaction-name"><span className={`transaction-symbol ${t.type==="income"?"income":"expense"}`}>{t.type==="income"?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><strong>{t.name}</strong></div></td><td>{t.category}</td><td>{DATE(t.date)}</td><td><Badge tone={t.type==="income"?"success":"neutral"}>{t.type}</Badge></td><td className={`align-right amount ${t.type==="income"?"positive":""}`}>{t.type==="income"?"+":"−"}{MONEY(t.amount)}</td></tr>)}</tbody></table></div>:<EmptyState title="No matching transactions" text="Try changing the search or filters."/>}</Panel></div>;
}
function PageTitle({ eyebrow, title, subtitle, actions }) { return <div className="page-title"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>; }
function Spending({ analytics, transactions }) {
  const cats = Object.entries(analytics?.expense_categories||{}).map(([name,value])=>({name,value:Number(value)})).sort((a,b)=>b.value-a.value);
  const total=Number(analytics?.expenses||0);
  return <div className="page-stack"><PageTitle eyebrow="SPENDING PATTERNS" title="Spending analysis" subtitle="Understand where recorded expenses are going, using SQLite-backed transaction data."/><div className="metrics-grid three"><Metric label="Total recorded expenses" value={MONEY(total)} icon={Wallet}/><Metric label="Categories" value={cats.length} detail="Expense categories represented" icon={ChartNoAxesCombined} tone="blue"/><Metric label="Average expense" value={MONEY(transactions.filter(t=>t.type==="expense").length?total/transactions.filter(t=>t.type==="expense").length:0)} detail="Per expense transaction" icon={Activity} tone="amber"/></div><div className="content-grid"><Panel title="Spending by category" subtitle="Actual category totals from SQLite" className="span-2">{cats.length?<div className="chart-wrap tall-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={cats} layout="vertical" margin={{left:12,right:24,top:4,bottom:4}}><CartesianGrid stroke="#edf1ed" horizontal={false}/><XAxis type="number" tickLine={false} axisLine={false} tickFormatter={v=>`₹${Math.round(v/1000)}k`} tick={{fontSize:11,fill:"#78857d"}}/><YAxis type="category" dataKey="name" width={112} tickLine={false} axisLine={false} tick={{fontSize:12,fill:"#536158"}}/><Tooltip formatter={v=>MONEY(v)}/><Bar dataKey="value" name="Expenses" fill="#07845b" radius={[0,7,7,0]} barSize={25}/></BarChart></ResponsiveContainer></div>:<EmptyState title="No spending data" text="Add expense transactions to see a category analysis."/>}</Panel><Panel title="Category breakdown" subtitle="Share of recorded expenses">{cats.map((c,i)=><div className="budget-line" key={c.name}><div className="budget-line-top"><span>{c.name}</span><strong>{MONEY(c.value)}</strong></div><div className="progress-track"><span style={{width:`${total?Math.min(100,c.value/total*100):0}%`,background:["#087f5b","#57ad88","#e1ad50","#7195d0"][i%4]}}/></div><div className="budget-meta"><span>{total?(c.value/total*100).toFixed(1):"0.0"}% of expenses</span></div></div>)}</Panel></div></div>;
}
function Insights({ alerts }) { return <div className="page-stack"><PageTitle eyebrow="PROACTIVE MONITORING" title="Financial insights" subtitle="Explainable rules evaluated against your recorded transaction history."/><div className="hero-strip"><div className="hero-mark"><ShieldCheck size={20}/></div><div className="hero-copy"><h2>Transparent by design</h2><p>These alerts are rule-based. They are not a guarantee of financial safety or personalized professional advice.</p></div><Badge tone="success">SQLite-derived</Badge></div><Panel title={`Current alerts (${alerts.length})`} subtitle="Refresh the dashboard to retrieve the latest alert results">{alerts.length?<div className="alert-list">{alerts.map(a=><AlertCard key={a.id} alert={a}/>)}</div>:<EmptyState title="No alert data" text="The backend has not returned any alerts."/>}</Panel></div>; }
function Simulator({ analytics }) {
  const [reduce, setReduce] = useState(10); const [extraIncome,setExtraIncome]=useState(0);
  const expenses=Number(analytics?.expenses||0), income=Number(analytics?.income||0), saved=expenses*reduce/100;
  return <div className="page-stack"><PageTitle eyebrow="TEST BEFORE YOU DECIDE" title="What-if simulator" subtitle="Explore simple scenarios without changing your saved transactions."/><div className="prototype-banner"><Sparkles size={17}/><span>Simulation only. These assumptions do not change SQLite records or predict guaranteed outcomes.</span></div><div className="content-grid"><Panel title="Adjust your scenario" subtitle="Change the values to compare outcomes"><div className="slider-control"><div className="slider-heading"><label htmlFor="reduce">Reduce recorded expenses</label><strong>{reduce}%</strong></div><input id="reduce" type="range" min="0" max="50" step="5" value={reduce} onChange={e=>setReduce(Number(e.target.value))}/><div className="slider-range"><span>0%</span><span>50%</span></div></div><div className="slider-control"><div className="slider-heading"><label htmlFor="extraIncome">Additional income per month</label><strong>{MONEY(extraIncome)}</strong></div><input id="extraIncome" type="range" min="0" max="50000" step="1000" value={extraIncome} onChange={e=>setExtraIncome(Number(e.target.value))}/><div className="slider-range"><span>₹0</span><span>₹50,000</span></div></div></Panel><Panel title="Scenario result" subtitle="Calculated from current recorded totals"><div className="scenario-result"><span>Current net cash flow</span><strong className={income-expenses<0?"negative":""}>{MONEY(income-expenses)}</strong><span>Estimated improvement from changes</span><strong className="positive">{MONEY(saved+extraIncome)}</strong><div className="result-divider"/><span>Adjusted scenario cash flow</span><strong className={(income+extraIncome-(expenses-saved))<0?"negative":"positive"}>{MONEY(income+extraIncome-(expenses-saved))}</strong></div></Panel></div></div>;
}
function PrototypePage({ id }) {
  const config = {
    goals:{eyebrow:"PLAN FOR WHAT MATTERS",title:"Financial goals",subtitle:"Create a savings target and track progress toward a future purchase.",icon:Target,features:["Set a goal amount and target date","Track saved amount and progress","Estimate a monthly savings target"],sample:"Example goal: Laptop fund — ₹20,000 target"},
    budget:{eyebrow:"SPEND WITH INTENTION",title:"Budget planner",subtitle:"Plan category limits and compare them with recorded expenses.",icon:PiggyBank,features:["Set monthly limits by category","See remaining budget and usage","Receive warnings near a threshold"],sample:"Budget limits are a prototype and are not yet persisted."},
    bills:{eyebrow:"STAY AHEAD OF DUE DATES",title:"Bills & recurring expenses",subtitle:"A planned view for recurring payments and upcoming bills.",icon:CalendarDays,features:["Track due dates and payment status","List recurring amounts and frequency","Identify upcoming obligations"],sample:"Bills are not yet saved to SQLite."},
    scenarios:{eyebrow:"COMPARE POSSIBLE FUTURES",title:"Scenario planning",subtitle:"Compare alternative monthly assumptions side by side.",icon:GitCompareArrows,features:["Compare baseline and adjusted cash flow","Try income or spending changes","Review the assumptions behind each scenario"],sample:"Scenario assumptions are temporary and remain in this browser session."},
    assistant:{eyebrow:"ASK ABOUT YOUR RECORDS",title:"Financial assistant",subtitle:"A future conversational interface for transaction-grounded financial questions.",icon:Bot,features:["Summarize recorded spending by category","Explain how a metric was calculated","Ask follow-up questions about saved records"],sample:"AI chat is not connected. Mesh API calls are not being made by this screen."},
    reports:{eyebrow:"YOUR FINANCIAL ACTIVITY",title:"Reports & activity",subtitle:"A reporting workspace for financial summaries and calculation transparency.",icon:FileChartColumn,features:["Review recorded income and expenses","Export transaction records as CSV","Trace insights to their underlying rules"],sample:"The transaction CSV export is available on the Transactions screen."},
  };
  const c=config[id]; const Icon=c.icon;
  return <div className="page-stack"><PageTitle eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle}/><div className="prototype-banner"><Sparkles size={17}/><span>{DEMO_NOTICE}</span></div><div className="prototype-hero"><div className="prototype-icon"><Icon size={28}/></div><div><h2>{c.sample}</h2><p>This screen is part of the Stitch-inspired interface. Its future data features need additional API endpoints and persistence before they can be considered live.</p></div><Badge tone="warning">Prototype</Badge></div><div className="content-grid">{c.features.map((f,i)=><section className="feature-card" key={f}><div className="feature-number">0{i+1}</div><h3>{f}</h3><p>{["A clear form and readable status indicators will make this action easy to understand.","The interface will distinguish recorded facts from estimates and user assumptions.","The implementation will be connected to a backend endpoint before displaying saved data."][i]}</p></section>)}</div></div>;
}

  
function AssistantPage({ analytics, transactions }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = [
    "How much did I spend?",
    "What is my recorded income?",
    "Which category is largest?",
    "How many transactions do I have?",
    "What is my net cash flow?",
  ];

  async function ask(value) {
    const q = value.trim();
    if (!q || loading) return;

    setQuestion(q);
    setAnswer("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/db/assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.detail === "string"
            ? payload.detail
            : `Assistant request failed (HTTP ${response.status}).`
        );
      }

      setAnswer(payload.answer || "No answer was returned.");
    } catch (err) {
      setError(
        `${err.message || "Could not contact the backend."} Check that FinPilot's API is running.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <PageTitle
        eyebrow="TRANSACTION-GROUNDED Q&A"
        title="Financial assistant"
        subtitle="Ask questions about your saved transaction records."
      />

      <div className="prototype-banner">
        <ShieldCheck size={17} />
        <span>
          Answers use recorded SQLite data and deterministic rules.
          No Mesh API call is made by this assistant yet.
        </span>
      </div>

      <Panel
        title="Ask about your recorded finances"
        subtitle="Your answers are based on saved transactions, not your live bank account."
      >
        <div className="suggested-questions">
          {suggestions.map((item) => (
            <button
              className="suggestion"
              key={item}
              type="button"
              disabled={loading}
              onClick={() => ask(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <form
          className="assistant-form"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <MessageCircle size={19} />
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask about your recorded transactions..."
            maxLength={500}
            aria-label="Ask a financial question"
          />
          <button
            className="button primary"
            type="submit"
            disabled={loading || !question.trim()}
          >
            {loading ? "Asking..." : "Ask"}
          </button>
        </form>

        {loading && (
          <p role="status">Checking your saved transaction records...</p>
        )}

        {error && (
          <div className="assistant-answer" role="alert">
            <div>
              <strong>Unable to answer</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {answer && !loading && (
          <div className="assistant-answer" aria-live="polite">
            <span className="answer-icon">
              <Bot size={18} />
            </span>
            <div>
              <strong>FinPilot · recorded-data answer</strong>
              <p>{answer}</p>
              <small>Source: saved SQLite transactions · Rule-based calculation</small>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

  
export default function App() {
  const [page,setPage]=useState("overview");
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [transactions,setTransactions]=useState([]);
  const [analytics,setAnalytics]=useState(null);
  const [forecast,setForecast]=useState(null);
  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [apiError,setApiError]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [lastUpdated,setLastUpdated]=useState(null);

  const loadDashboard=useCallback(async()=>{
    setLoading(true);setApiError("");
    try {
      const paths=["/db/transactions","/db/analytics","/db/forecast","/db/alerts"];
      const responses=await Promise.all(paths.map(async path=>{
        const res=await fetch(`${API_BASE}${path}`);
        if(!res.ok) throw new Error(`${path} returned HTTP ${res.status}`);
        return res.json();
      }));
      setTransactions(Array.isArray(responses[0].transactions)?responses[0].transactions:[]);
      setAnalytics(responses[1]);
      setForecast(responses[2]);
      setAlerts(Array.isArray(responses[3].alerts)?responses[3].alerts:[]);
      setLastUpdated(new Date());
    } catch(error) {
      setApiError(`${error.message}. Confirm that FastAPI is running at ${API_BASE}.`);
    } finally { setLoading(false); }
  },[]);
  useEffect(()=>{loadDashboard();},[loadDashboard]);

  const saveTransaction=async(data)=>{
    setSaving(true);setSaveError("");
    try{
      const res=await fetch(`${API_BASE}/db/transactions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
      const payload=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(typeof payload.detail==="string"?payload.detail:`Could not save transaction (HTTP ${res.status}).`);
      setModalOpen(false);await loadDashboard();
    }catch(error){setSaveError(error.message||"Could not save transaction.");}
    finally{setSaving(false);}
  };
  const active= NAV.find(n=>n.id===page)||NAV[0];
  const navigate=(id)=>{setPage(id);setSidebarOpen(false);window.scrollTo({top:0,behavior:"smooth"});};
  const renderPage=()=>{
    if(page==="overview")return <Overview analytics={analytics} transactions={transactions} forecast={forecast} alerts={alerts} loading={loading} onAdd={()=>setModalOpen(true)} navigate={navigate}/>;
    if(page==="transactions")return <Transactions transactions={transactions} onAdd={()=>setModalOpen(true)} loading={loading}/>;
    if(page==="spending")return <Spending analytics={analytics} transactions={transactions}/>;
    if(page==="simulator")return <Simulator analytics={analytics}/>;
    if(page==="insights")return <Insights alerts={alerts}/>;
    if(page==="assistant")return <AssistantPage analytics={analytics} transactions={transactions}/>;
    return <PrototypePage id={page}/>;
  };
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen?"open":""}`}>
      <div className="brand"><div className="brand-mark"><Activity size={23}/></div><div><div className="brand-name">FinPilot <span>Sentinel</span></div><div className="brand-subtitle">Proactive finance workspace</div></div><IconButton className="mobile-close" label="Close navigation" onClick={()=>setSidebarOpen(false)}><X size={18}/></IconButton></div>
      <div className="sentinel-status"><span className="status-pulse"/><div><strong>Sentinel monitor</strong><small>{apiError?"API connection needs attention":"Monitoring local financial data"}</small></div><span className={`connection-led ${apiError?"offline":"online"}`}/></div>
      <nav className="side-nav">{["Workspace","Planning","Intelligence"].map(group=><div className="nav-group" key={group}><div className="nav-group-label">{group}</div>{NAV.filter(n=>n.group===group).map(item=>{const Icon=item.icon;return <button key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>navigate(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id==="insights"&&alerts.length>0&&<span className="nav-count">{alerts.length}</span>}</button>;})}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-connection"><span className={`connection-led ${apiError?"offline":"online"}`}/><div><strong>{apiError?"Backend unavailable":"FastAPI connected"}</strong><small>{lastUpdated?`Updated ${lastUpdated.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`:"Waiting for first sync"}</small></div><IconButton label="Refresh data" onClick={loadDashboard}><RefreshCw size={16}/></IconButton></div><div className="profile-row"><div className="profile-avatar">F</div><div><strong>FinPilot user</strong><small>Local workspace</small></div><IconButton label="Settings (prototype)" onClick={()=>navigate("reports")}><Settings size={17}/></IconButton></div></div>
    </aside>
    {sidebarOpen&&<button className="mobile-scrim" aria-label="Close navigation overlay" onClick={()=>setSidebarOpen(false)}/>}
    <main className="main-area"><header className="topbar"><div className="topbar-left"><IconButton className="menu-button" label="Open navigation" onClick={()=>setSidebarOpen(true)}><Menu/></IconButton><div className="breadcrumb"><span>FinPilot Sentinel</span><span className="breadcrumb-sep">/</span><strong>{active.label}</strong></div></div><div className="topbar-actions"><div className="topbar-data"><span className="status-dot"/> SQLite data source</div><IconButton label="Refresh dashboard" onClick={loadDashboard}><RefreshCw size={17}/></IconButton><button className="button primary top-add" onClick={()=>setModalOpen(true)}><Plus size={17}/> <span>New transaction</span></button></div></header>
      <div className="page-container">{apiError&&<div className="api-error"><CircleAlert size={18}/><div><strong>Couldn't load live data</strong><p>{apiError}</p></div><button onClick={loadDashboard}>Retry</button></div>}{renderPage()}<footer className="app-footer"><span>FinPilot Sentinel</span><span>Recorded data and estimates are shown separately.</span><span>Local-first · FastAPI + SQLite</span></footer></div>
    </main>
    {modalOpen&&<TransactionModal onClose={()=>{setModalOpen(false);setSaveError("");}} onSave={saveTransaction} saving={saving} error={saveError}/>}
  </div>;
}
