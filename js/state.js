export const state = {
  trades: [],
  strategies: [],
  settings: {
    lang: 'sk',
    theme: 'dark',
    balance: 0,
    accounts: [{ id: 1, name: 'Účet 1', balance: 0 }],
    activeAccount: 1,
    mults: {
      NQ: 20, MNQ: 2, ES: 50, MES: 5, YM: 5, MYM: 0.5, RTY: 50, M2K: 5,
      GC: 100, MGC: 10, SI: 5000, SIL: 1000, CL: 1000, MCL: 100, NG: 10000,
      XAUUSD: 100, XAGUSD: 5000,
    },
    maxRiskPerTradePct: 0, // 0 = limit nesledovaný
    maxDailyLossPct: 0,
    gClientId: '',
    gConnected: false,
    gLastSync: null,
    anthropicKey: '',
    aiChatModel: 'claude-sonnet-5',
    aiInsightModel: 'claude-haiku-4-5-20251001',
    aiReviewModel: 'claude-sonnet-5',
    aiReviewPromptTemplate: '', // prázdne = použiť DEFAULT_TRADE_REVIEW_PROMPT z trade-modal.js
  },
  currentStrategyId: null,
  strategyDetailId: null,
  strategyDetailTab: 'rules',
  ohlcSets: [],
  dayNotes: [], // denník: {date:'YYYY-MM-DD', rating, mood, wentWell, toImprove, text, updated}
  journalSearch: '',
  journalOpenDate: null, // deň otvorený na písanie v záložke Denník
  calDate: new Date(),
  calSelectedDay: null,
  eqChartObj: null,
  eqChartMode: 'usd', // 'usd' | 'pct' - equity krivka v dolároch alebo % voči počiat. kapitálu
  dailyChartObj: null,
  excChartObj: null,
  currentTradeId: null,
  pendingShots: [],
  removedShotIds: [],
  modalChart: null,
  modalChartTf: null,
  modalChartRsi: null,
  modalSyncing: false,
  modalIndicators: {
    sma: false, smaPeriod: 20, ema: false, emaPeriod: 50,
    vwap: false, rsi: false, rsiPeriod: 14,
  },
  gBootDone: false,
};

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme === 'light' ? 'light' : 'dark';
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = state.settings.theme === 'light' ? '☀️' : '🌙';
}

export function toggleTheme() {
  state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
  applyTheme();
  // Lazy imports avoid circular dependency with init/dashboard/gdrive.
  if (state.gBootDone) {
    import('./dashboard.js').then(m => m.renderDashboard());
  }
  import('./init.js').then(m => m.saveSettings());
  import('./gdrive.js').then(m => m.scheduleAutoSync());
}
