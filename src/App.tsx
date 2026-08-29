import { useMemo, useState } from "react";
import {
  Activity,
  CalendarRange,
  CircleDollarSign,
  Download,
  Gauge,
  Info,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dashboardData from "./data/dashboard-data.json";
import liveRecommendations from "./data/live-recommendations.json";

type ChartView = "equity" | "drawdown" | "profit" | "exposure";
type RangePreset = "all" | "development" | "validation" | "last12m";
type ResultFilter = "all" | "win" | "loss";

type DailyPoint = {
  date: string;
  bets: number;
  wins: number;
  bankroll_start: number;
  bankroll_end: number;
  running_peak: number;
  day_profit: number;
  day_return: number;
  drawdown_amount: number;
  drawdown_pct: number;
  drawdown_before_day: number;
  drawdown_factor: number;
  drawdown_regime: string;
  drawdown_active: boolean;
  total_fraction: number;
  total_stake: number;
  daily_scale: number;
};

type ChartDailyPoint = DailyPoint & {
  drawdownDisplay: number;
  exposureDisplay: number;
  factorDisplay: number;
};

type BetPoint = {
  date: string;
  match_key: string;
  league?: string;
  season?: string;
  validation_phase?: string;
  home_team?: string;
  away_team?: string;
  selection?: string;
  odds_open: number;
  odds_close?: number;
  model_p: number;
  model_ev?: number;
  q_open?: number;
  clv_odds?: number;
  won: number;
  raw_kelly: number;
  drawdown_factor: number;
  drawdown_regime: string;
  drawdown_before_day: number;
  actual_fraction: number;
  stake_amount: number;
  profit_amount: number;
  bankroll_day_start: number;
  bankroll_day_end: number;
};

type Summary = typeof dashboardData.summary;

const daily = dashboardData.daily as unknown as DailyPoint[];
const bets = dashboardData.bets as BetPoint[];
const summary = dashboardData.summary as Summary;
const leagues = dashboardData.metadata.leagues as string[];
const liveBoard = liveRecommendations;

const COLORS = {
  mint: "#36d6a8",
  amber: "#f0a84b",
  coral: "#ff6b6b",
  cyan: "#62b6ff",
  violet: "#a78bfa",
  grid: "rgba(144, 164, 188, .16)",
};

const formatCurrency = (value: number, digits = 0) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: digits,
  }).format(value);

const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat("zh-CN", { maximumFractionDigits: digits }).format(value);

const formatPercent = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`;
const formatShortDate = (date: string) => date.slice(2).replaceAll("-", "/");

function MetricCard({
  label,
  value,
  sub,
  tone = "mint",
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "mint" | "amber" | "coral" | "cyan";
  icon: React.ReactNode;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-head">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function StrategySidebar() {
  const tiers = [
    { range: "回撤 < 6%", factor: "100%", maxBet: "2,000", day: "6,000", color: COLORS.mint },
    { range: "6% — 9%", factor: "80%", maxBet: "1,600", day: "4,800", color: COLORS.amber },
    { range: "≥ 9%", factor: "60%", maxBet: "1,200", day: "3,600", color: COLORS.coral },
  ];
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">K¼</div>
        <div>
          <span className="eyebrow">FROZEN STRATEGY</span>
          <h2>Quarter Kelly</h2>
        </div>
      </div>

      <div className="status-chip"><span /> 稳健执行版 · v2.1</div>

      <section className="side-section">
        <div className="side-title"><ShieldCheck size={16} />执行规则</div>
        <div className="rule-grid">
          <div><span>Kelly 倍数</span><b>0.25×</b></div>
          <div><span>单笔硬上限</span><b>2.00%</b></div>
          <div><span>单日硬上限</span><b>6.00%</b></div>
          <div><span>同日结算</span><b>日初定仓</b></div>
        </div>
      </section>

      <section className="side-section">
        <div className="side-title"><Gauge size={16} />回撤降仓阶梯</div>
        <div className="tier-list">
          {tiers.map((tier) => (
            <div className="tier" key={tier.range}>
              <i style={{ background: tier.color }} />
              <div><b>{tier.range}</b><span>仓位系数 {tier.factor}</span></div>
              <small>单笔 ¥{tier.maxBet}<br />单日 ¥{tier.day}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="side-section">
        <div className="side-title"><Activity size={16} />联赛资金权重</div>
        <div className="league-weight-grid">
          <div className="priority"><span>西甲</span><b>1.30×</b></div>
          <div><span>英超</span><b>1.00×</b></div>
          <div><span>法甲</span><b>1.00×</b></div>
          <div><span>意甲</span><b>1.00×</b></div>
          <div><span>德甲</span><b>1.00×</b></div>
        </div>
      </section>

      <section className="side-section data-proof">
        <div className="side-title"><Activity size={16} />数据足迹</div>
        <div className="proof-number">{summary.bets} <span>笔</span></div>
        <p>{leagues.length}个主流联赛 · {summary.betting_days}个投注日<br />{summary.start_date.slice(0, 7).replace("-", "/")} — {summary.end_date.slice(0, 7).replace("-", "/")}</p>
      </section>

      <div className="risk-note">
        <Info size={16} />
        <p>开发期锁定并通过2024年至今留出验证。每笔按实际赔率重算Kelly，非正值不下注。</p>
      </div>
    </aside>
  );
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-date">{point.date}</div>
      <div><span>日终资金</span><b>{formatCurrency(point.bankroll_end)}</b></div>
      <div><span>当日盈亏</span><b className={point.day_profit >= 0 ? "positive" : "negative"}>{formatCurrency(point.day_profit)}</b></div>
      <div><span>当前回撤</span><b>{formatPercent(point.drawdown_pct)}</b></div>
      <div><span>日资金暴露</span><b>{formatPercent(point.total_fraction)}</b></div>
      <div><span>风控档位</span><b>{point.drawdown_regime}</b></div>
    </div>
  );
}

function EquityChart({ data, view }: { data: ChartDailyPoint[]; view: ChartView }) {
  const validationStart = data.find((point) => point.date >= "2024-01-01")?.date;
  const common = (
    <>
      <CartesianGrid stroke={COLORS.grid} vertical={false} />
      <XAxis dataKey="date" tickFormatter={formatShortDate} minTickGap={42} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} />
      <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,.22)", strokeDasharray: "4 4" }} />
      {validationStart && <ReferenceLine x={validationStart} stroke="#f0a84b" strokeDasharray="4 5" label={{ value: "留出期", fill: "#f0a84b", fontSize: 11, position: "insideTopRight" }} />}
      <Brush dataKey="date" height={24} stroke="#33465d" fill="#101b2a" travellerWidth={8} tickFormatter={() => ""} />
    </>
  );

  if (view === "drawdown") {
    return (
      <ResponsiveContainer width="100%" height={410}>
        <AreaChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
          <defs><linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.coral} stopOpacity={0.48} /><stop offset="100%" stopColor={COLORS.coral} stopOpacity={0.04} /></linearGradient></defs>
          {common}
          <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} domain={["auto", 0]} width={52} />
          <ReferenceLine y={-3} stroke={COLORS.cyan} strokeDasharray="3 4" />
          <ReferenceLine y={-6} stroke={COLORS.amber} strokeDasharray="3 4" />
          <ReferenceLine y={-9} stroke={COLORS.coral} strokeDasharray="3 4" />
          <Area type="monotone" dataKey="drawdownDisplay" name="回撤" stroke={COLORS.coral} fill="url(#drawdownFill)" strokeWidth={2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (view === "profit") {
    return (
      <ResponsiveContainer width="100%" height={410}>
        <BarChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
          {common}
          <YAxis tickFormatter={(v) => `¥${formatNumber(v / 1000, 0)}k`} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,.32)" />
          <Bar dataKey="day_profit" name="当日盈亏" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((entry) => <Cell key={entry.date} fill={entry.day_profit >= 0 ? COLORS.mint : COLORS.coral} opacity={0.82} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (view === "exposure") {
    return (
      <ResponsiveContainer width="100%" height={410}>
        <ComposedChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
          <defs><linearGradient id="exposureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.violet} stopOpacity={0.45} /><stop offset="100%" stopColor={COLORS.violet} stopOpacity={0.03} /></linearGradient></defs>
          {common}
          <YAxis yAxisId="left" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} width={52} domain={[0, 6.5]} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v.toFixed(0)}%`} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} width={52} domain={[0, 100]} />
          <ReferenceLine yAxisId="left" y={6} stroke={COLORS.coral} strokeDasharray="4 5" label={{ value: "单日6%上限", fill: COLORS.coral, fontSize: 10 }} />
          <Area yAxisId="left" type="monotone" dataKey="exposureDisplay" name="资金暴露" stroke={COLORS.violet} fill="url(#exposureFill)" strokeWidth={1.8} isAnimationActive={false} />
          <Line yAxisId="right" type="stepAfter" dataKey="factorDisplay" name="回撤仓位系数" stroke={COLORS.amber} dot={false} strokeWidth={1.6} isAnimationActive={false} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#9dafc4" }} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={410}>
      <ComposedChart data={data} margin={{ top: 18, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.mint} stopOpacity={0.34} /><stop offset="100%" stopColor={COLORS.mint} stopOpacity={0.02} /></linearGradient>
        </defs>
        {common}
        <YAxis tickFormatter={(v) => `¥${formatNumber(v / 1000, 0)}k`} tick={{ fill: "#8092a8", fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 3500", "dataMax + 3500"]} width={58} />
        <Area type="monotone" dataKey="bankroll_end" name="账户资金" stroke={COLORS.mint} fill="url(#equityFill)" strokeWidth={2.4} isAnimationActive={false} />
        <Line type="monotone" dataKey="running_peak" name="历史峰值" stroke={COLORS.amber} dot={false} strokeWidth={1.2} strokeDasharray="5 5" opacity={0.72} isAnimationActive={false} />
        <Legend wrapperStyle={{ fontSize: 12, color: "#9dafc4" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function App() {
  const [preset, setPreset] = useState<RangePreset>("all");
  const [fromDate, setFromDate] = useState(daily[0].date);
  const [toDate, setToDate] = useState(daily[daily.length - 1].date);
  const [view, setView] = useState<ChartView>("equity");
  const [league, setLeague] = useState("all");
  const [result, setResult] = useState<ResultFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const applyPreset = (next: RangePreset) => {
    setPreset(next);
    if (next === "all") {
      setFromDate(daily[0].date);
      setToDate(daily[daily.length - 1].date);
    } else if (next === "development") {
      setFromDate(daily[0].date);
      setToDate("2023-12-31");
    } else if (next === "validation") {
      setFromDate("2024-01-01");
      setToDate(daily[daily.length - 1].date);
    } else {
      const last = new Date(daily[daily.length - 1].date);
      last.setFullYear(last.getFullYear() - 1);
      setFromDate(last.toISOString().slice(0, 10));
      setToDate(daily[daily.length - 1].date);
    }
    setPage(1);
  };

  const filteredDaily = useMemo(
    () => daily.filter((point) => point.date >= fromDate && point.date <= toDate),
    [fromDate, toDate],
  );

  const chartData = useMemo(
    () => filteredDaily.map((point) => ({
      ...point,
      drawdownDisplay: -point.drawdown_pct * 100,
      exposureDisplay: point.total_fraction * 100,
      factorDisplay: point.drawdown_factor * 100,
    })),
    [filteredDaily],
  );

  const rangeBets = useMemo(
    () => bets.filter((bet) => bet.date >= fromDate && bet.date <= toDate),
    [fromDate, toDate],
  );

  const filteredBets = useMemo(() => {
    const rows = rangeBets.filter((bet) => {
      const leagueMatch = league === "all" || bet.league === league;
      const resultMatch = result === "all" || (result === "win" ? bet.won === 1 : bet.won === 0);
      return leagueMatch && resultMatch;
    });
    return [...rows].sort((a, b) => b.date.localeCompare(a.date) || b.match_key.localeCompare(a.match_key));
  }, [rangeBets, league, result]);

  const rangeMetrics = useMemo(() => {
    if (!filteredDaily.length) return null;
    const start = filteredDaily[0].bankroll_start;
    const end = filteredDaily[filteredDaily.length - 1].bankroll_end;
    let peak = start;
    let maxDrawdown = 0;
    for (const point of filteredDaily) {
      peak = Math.max(peak, point.bankroll_end);
      maxDrawdown = Math.max(maxDrawdown, (peak - point.bankroll_end) / peak);
    }
    return {
      start,
      end,
      profit: end - start,
      returnRate: end / start - 1,
      maxDrawdown,
      wins: rangeBets.reduce((sum, bet) => sum + bet.won, 0),
      betCount: rangeBets.length,
      activeDays: filteredDaily.filter((point) => point.drawdown_active).length,
      maxExposure: Math.max(...filteredDaily.map((point) => point.total_fraction)),
    };
  }, [filteredDaily, rangeBets]);

  const leagueContribution = useMemo(() => {
    const grouped = new Map<string, { profit: number; stake: number; bets: number }>();
    rangeBets.forEach((bet) => {
      const key = bet.league ?? "其他";
      const row = grouped.get(key) ?? { profit: 0, stake: 0, bets: 0 };
      row.profit += bet.profit_amount;
      row.stake += bet.stake_amount;
      row.bets += 1;
      grouped.set(key, row);
    });
    return [...grouped.entries()]
      .map(([name, row]) => ({ name, ...row, roi: row.stake ? row.profit / row.stake : 0 }))
      .sort((a, b) => b.profit - a.profit);
  }, [rangeBets]);

  const currentRegime = filteredDaily.at(-1)?.drawdown_regime ?? "—";
  const currentFactor = filteredDaily.at(-1)?.drawdown_factor ?? 1;
  const totalPages = Math.max(1, Math.ceil(filteredBets.length / pageSize));
  const tableRows = filteredBets.slice((page - 1) * pageSize, page * pageSize);

  const resetFilters = () => {
    applyPreset("all");
    setLeague("all");
    setResult("all");
    setView("equity");
  };

  const exportCsv = () => {
    const columns: Array<keyof BetPoint> = ["date", "league", "home_team", "away_team", "selection", "odds_open", "model_p", "won", "drawdown_regime", "actual_fraction", "stake_amount", "profit_amount"];
    const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [columns.join(","), ...filteredBets.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quarter-kelly-${fromDate}-${toDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <StrategySidebar />
      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">BACKTEST CONTROL ROOM</span>
            <h1>实用1/4 Kelly <em>+ 回撤降仓</em></h1>
            <p>真实{summary.bets}笔历史信号 · 西甲1.30× · 其余五大联赛1.00× · 稳健执行版</p>
          </div>
          <div className="header-stamp">
            <span>历史区间</span>
            <b>{summary.start_date.slice(0, 7).replace("-", ".")} — {summary.end_date.slice(0, 7).replace("-", ".")}</b>
            <small>最后数据日 {summary.end_date}</small>
          </div>
        </header>

        <section className="live-board panel">
          <div className="live-board-head">
            <div>
              <span className="panel-kicker">LIVE RECOMMENDATIONS</span>
              <h3><Activity size={18} />最新推荐与执行记录</h3>
              <p>今后所有通过审批的比赛统一在此更新，状态分为待复核、已批准、已执行与已结算。</p>
            </div>
            <div className="live-update"><i />最后更新 {liveBoard.updated_at.replace("T", " ").slice(0, 16)} GMT+2</div>
          </div>

          <div className="live-account-grid">
            <div><span>账户权益</span><b>{formatCurrency(liveBoard.account.bankroll_equity_cny)}</b></div>
            <div><span>可用现金</span><b>{formatCurrency(liveBoard.account.available_cash_cny)}</b></div>
            <div><span>未结算暴露</span><b className="live-amber">{formatCurrency(liveBoard.account.open_exposure_cny)}</b></div>
            <div><span>今日剩余额度</span><b>{formatCurrency(liveBoard.account.remaining_daily_cap_cny)}</b><small>单日上限 {formatCurrency(liveBoard.account.daily_cap_cny)}</small></div>
          </div>

          <div className="screening-summary">
            <div className="screening-title">
              <div><span>{liveBoard.screening_summary.date} · 已核验 {liveBoard.screening_summary.fixtures_checked} 场</span><b>{liveBoard.screening_summary.status}</b></div>
              <strong>批准金额 {formatCurrency(liveBoard.screening_summary.approved_stake_cny)}</strong>
            </div>
            <p>{liveBoard.screening_summary.notes} 当前清单按“{liveBoard.screening_summary.strategy}”预审批。</p>
            <div className="screening-candidates">
              {liveBoard.screening_summary.candidates.map((candidate) => (
                <div key={candidate.match}>
                  <span>{candidate.league} · {candidate.match}</span>
                  <b>{candidate.selection} · B版 {formatPercent(candidate.model_probability, 1)}</b>
                  <small>公开价 {candidate.public_odds} · 最低 {candidate.minimum_odds.toFixed(3)} · {candidate.status}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="live-records">
            {liveBoard.records.map((record) => (
              <article className="live-record" key={record.record_id}>
                <div className="live-record-main">
                  <div className="live-badges"><span>{record.league}</span><span>{record.market}</span><strong>{record.status}</strong></div>
                  <h4>{record.home_team} <small>vs</small> {record.away_team}</h4>
                  <p>{record.date} · {record.kickoff_gmt2.slice(11)} GMT+2 · 选择 <b>{record.selection}</b> · {record.settlement}</p>
                </div>
                <div className="live-record-stats">
                  <div><span>成交赔率</span><b>{record.executed_odds.toFixed(2)}</b></div>
                  <div><span>投注金额</span><b>{formatCurrency(record.stake_cny)}</b></div>
                  <div><span>模型概率</span><b>{formatPercent(record.model_probability, 1)}</b></div>
                  <div><span>模型EV</span><b className="positive">+{formatPercent(record.model_ev, 2)}</b></div>
                  <div><span>盈亏区间</span><b><em>+{formatCurrency(record.potential_profit_cny)}</em> / <i>-{formatCurrency(record.maximum_loss_cny)}</i></b></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="control-strip">
          <div className="preset-group">
            <CalendarRange size={16} />
            {([
              ["all", "全区间"],
              ["development", "开发期"],
              ["validation", "留出期"],
              ["last12m", "近12月"],
            ] as Array<[RangePreset, string]>).map(([value, label]) => (
              <button className={preset === value ? "active" : ""} onClick={() => applyPreset(value)} key={value}>{label}</button>
            ))}
          </div>
          <div className="date-inputs">
            <label>起始<input type="date" value={fromDate} min={daily[0].date} max={toDate} onChange={(event) => { setFromDate(event.target.value); setPreset("all"); setPage(1); }} /></label>
            <span>→</span>
            <label>结束<input type="date" value={toDate} min={fromDate} max={daily[daily.length - 1].date} onChange={(event) => { setToDate(event.target.value); setPreset("all"); setPage(1); }} /></label>
          </div>
          <button className="icon-button" title="重置筛选" onClick={resetFilters}><RotateCcw size={16} /></button>
        </section>

        {rangeMetrics && (
          <section className="metric-grid">
            <MetricCard label="区间期末资金" value={formatCurrency(rangeMetrics.end)} sub={`起始 ${formatCurrency(rangeMetrics.start)}`} icon={<WalletCards size={17} />} />
            <MetricCard label="区间净利润" value={formatCurrency(rangeMetrics.profit)} sub={`本金收益 ${formatPercent(rangeMetrics.returnRate)}`} tone="cyan" icon={<TrendingUp size={17} />} />
            <MetricCard label="区间最大回撤" value={formatPercent(rangeMetrics.maxDrawdown)} sub={`全样本 ${formatPercent(summary.max_drawdown_pct)}`} tone="coral" icon={<TrendingDown size={17} />} />
            <MetricCard label="命中率" value={rangeMetrics.betCount ? formatPercent(rangeMetrics.wins / rangeMetrics.betCount) : "—"} sub={`${rangeMetrics.wins} 红 / ${rangeMetrics.betCount - rangeMetrics.wins} 黑`} tone="amber" icon={<CircleDollarSign size={17} />} />
            <MetricCard label="降仓状态" value={currentRegime} sub={`当前系数 ${Math.round(currentFactor * 100)}% · ${rangeMetrics.activeDays}个降仓日 · 峰值暴露 ${formatPercent(rangeMetrics.maxExposure)}`} tone="cyan" icon={<Gauge size={17} />} />
          </section>
        )}

        <section className="chart-layout">
          <article className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">CAPITAL PATH</span>
                <h3>资金路径与风险暴露</h3>
              </div>
              <div className="view-tabs">
                {([
                  ["equity", "资金"], ["drawdown", "回撤"], ["profit", "日盈亏"], ["exposure", "仓位"],
                ] as Array<[ChartView, string]>).map(([value, label]) => <button key={value} className={view === value ? "active" : ""} onClick={() => setView(value)}>{label}</button>)}
              </div>
            </div>
            {chartData.length ? <EquityChart data={chartData} view={view} /> : <div className="empty-state">当前日期区间没有投注记录</div>}
          </article>

          <aside className="panel insight-panel">
            <span className="panel-kicker">FULL SAMPLE</span>
            <h3>冻结版绩效</h3>
            <div className="hero-number">{formatCurrency(summary.ending_bankroll)}</div>
            <span className="profit-tag">+{formatPercent(summary.return_on_initial)} 累计</span>
            <div className="insight-list">
              <div><span>净利润</span><b>{formatCurrency(summary.net_profit)}</b></div>
              <div><span>年化收益</span><b>{formatPercent(summary.annualized_return)}</b></div>
              <div><span>最大回撤</span><b className="negative">{formatPercent(summary.max_drawdown_pct)}</b></div>
              <div><span>总下注流水</span><b>{formatCurrency(summary.total_staked)}</b></div>
              <div><span>流水ROI</span><b>{formatPercent(summary.turnover_roi)}</b></div>
            </div>
            <div className="formula-card">
              <span>实际仓位</span>
              <code>min(0.25 × Kelly, 2%) × 回撤系数</code>
              <small>同日合计再压缩至 ≤ 6%</small>
            </div>
          </aside>
        </section>

        <section className="lower-grid">
          <article className="panel league-panel">
            <div className="panel-heading compact"><div><span className="panel-kicker">LEAGUE ATTRIBUTION</span><h3>联赛利润贡献</h3></div></div>
            <div className="league-bars">
              {leagueContribution.map((row) => {
                const max = Math.max(...leagueContribution.map((item) => Math.abs(item.profit)), 1);
                const width = Math.max(4, Math.abs(row.profit) / max * 100);
                return (
                  <div className="league-row" key={row.name}>
                    <div><b>{row.name}</b><span>{row.bets}笔 · ROI {formatPercent(row.roi, 1)}</span></div>
                    <div className="bar-track"><i style={{ width: `${width}%`, background: row.profit >= 0 ? COLORS.mint : COLORS.coral }} /></div>
                    <strong className={row.profit >= 0 ? "positive" : "negative"}>{row.profit >= 0 ? "+" : ""}{formatCurrency(row.profit)}</strong>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="panel execution-panel">
            <div className="panel-heading compact"><div><span className="panel-kicker">EXECUTION CHECK</span><h3>实际运行边界</h3></div></div>
            <div className="check-list">
              <div><i>01</i><p><b>使用实际可成交赔率</b><span>赔率变化后重新计算Kelly，非正值直接跳过。</span></p></div>
              <div><i>02</i><p><b>按比赛日统一定仓</b><span>同日多场共享日初本金，避免结算顺序制造虚假复利。</span></p></div>
              <div><i>03</i><p><b>不追补亏损</b><span>任何情况下都不能突破单笔2%和单日6%硬上限。</span></p></div>
            </div>
          </article>
        </section>

        <section className="panel table-panel">
          <div className="panel-heading table-heading">
            <div><span className="panel-kicker">BET LEDGER</span><h3><Table2 size={18} />逐笔下注明细</h3></div>
            <div className="table-tools">
              <label><SlidersHorizontal size={14} />联赛<select value={league} onChange={(event) => { setLeague(event.target.value); setPage(1); }}><option value="all">全部联赛</option>{leagues.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              <label>结果<select value={result} onChange={(event) => { setResult(event.target.value as ResultFilter); setPage(1); }}><option value="all">全部</option><option value="win">红</option><option value="loss">黑</option></select></label>
              <button className="export-button" onClick={exportCsv}><Download size={15} />导出CSV</button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>日期</th><th>联赛</th><th>比赛 / 选择</th><th>赔率</th><th>模型概率</th><th>风控档位</th><th>仓位</th><th>下注额</th><th>盈亏</th></tr></thead>
              <tbody>
                {tableRows.map((bet) => (
                  <tr key={bet.match_key}>
                    <td className="mono">{bet.date}</td>
                    <td><span className="league-badge">{bet.league}</span></td>
                    <td><b>{bet.home_team} <span>vs</span> {bet.away_team}</b><small>选择 {bet.selection}</small></td>
                    <td className="mono">{bet.odds_open.toFixed(2)}</td>
                    <td className="mono">{formatPercent(bet.model_p, 1)}</td>
                    <td><span className={`regime regime-${Math.round(bet.drawdown_factor * 100)}`}>{bet.drawdown_regime}</span></td>
                    <td className="mono">{formatPercent(bet.actual_fraction)}</td>
                    <td className="mono">{formatCurrency(bet.stake_amount)}</td>
                    <td className={`mono strong ${bet.profit_amount >= 0 ? "positive" : "negative"}`}>{bet.profit_amount >= 0 ? "+" : ""}{formatCurrency(bet.profit_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>筛选后 {filteredBets.length} 笔 · 第 {Math.min(page, totalPages)} / {totalPages} 页</span>
            <div><button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>上一页</button><button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>下一页</button></div>
          </div>
        </section>

        <footer>
          <span>Quarter Kelly Backtest · Standalone Build</span>
          <span>开发期锁定 · 2024年至今留出验证通过 · 最新推荐与执行记录持续更新</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
