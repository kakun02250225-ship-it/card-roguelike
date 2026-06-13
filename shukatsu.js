// ===== CONSTANTS =====
const STORAGE_KEY = 'shukatsu_v1';

const STATUS_OPTIONS = [
  { value: 'interested',     label: '気になる',     color: '#6B7280', bg: '#F3F4F6' },
  { value: 'info_done',      label: '説明会済み',   color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'es_preparing',   label: 'ES準備中',     color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'es_submitted',   label: 'ES提出済み',   color: '#06B6D4', bg: '#CFFAFE' },
  { value: 'screening',      label: '書類選考中',   color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'aptitude',       label: '適性検査済み', color: '#F97316', bg: '#FFEDD5' },
  { value: 'gd',             label: 'GD済み',       color: '#EF4444', bg: '#FEE2E2' },
  { value: 'interview_1',    label: '一次面接済み', color: '#EC4899', bg: '#FCE7F3' },
  { value: 'interview_2',    label: '二次面接済み', color: '#A855F7', bg: '#F3E8FF' },
  { value: 'interview_final',label: '最終面接済み', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'offer',          label: '内定',         color: '#16A34A', bg: '#DCFCE7' },
  { value: 'offer_accepted', label: '内定承諾',     color: '#15803D', bg: '#BBF7D0' },
  { value: 'rejected',       label: '落選',         color: '#DC2626', bg: '#FEE2E2' },
  { value: 'declined',       label: '辞退',         color: '#9CA3AF', bg: '#F3F4F6' },
];

const EVENT_TYPES = [
  { value: 'es_deadline',    label: 'ES締切',    color: '#EF4444', icon: '📝' },
  { value: 'info_session',   label: '説明会',    color: '#8B5CF6', icon: 'ℹ️' },
  { value: 'aptitude_test',  label: '適性検査',  color: '#F97316', icon: '📊' },
  { value: 'gd',             label: 'GD',        color: '#F59E0B', icon: '👥' },
  { value: 'interview_1',    label: '一次面接',  color: '#3B82F6', icon: '🗣️' },
  { value: 'interview_2',    label: '二次面接',  color: '#6366F1', icon: '🗣️' },
  { value: 'interview_final',label: '最終面接',  color: '#A855F7', icon: '🎯' },
  { value: 'intern',         label: 'インターン', color: '#22C55E', icon: '💼' },
  { value: 'other',          label: 'その他',    color: '#6B7280', icon: '📌' },
];

const INDUSTRIES = [
  'IT・通信', 'メーカー', '商社', '金融・保険', '不動産・建設',
  'サービス', '小売・流通', 'マスコミ・広告', '医療・福祉', '教育',
  'コンサルティング', '公務員・非営利', 'エネルギー', 'その他',
];

const COMPANY_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#EC4899', '#F97316', '#14B8A6', '#6366F1',
  '#84CC16', '#DC2626', '#0EA5E9', '#D946EF',
];

const PRIORITY_INFO = {
  1: { label: '低', color: '#22C55E' },
  2: { label: '中', color: '#F59E0B' },
  3: { label: '高', color: '#EF4444' },
};

// ===== STATE =====
let companies = [];
let currentPage = 'dashboard';
let calYear, calMonth;
let filterStatus = '';
let filterIndustry = '';
let searchQuery = '';
let sortBy = 'createdAt';
let viewMode = 'card';
let editingId = null;
let editPriority = 2;
let modalEvents = [];
let lastDeleted = null;

// ===== STORAGE =====
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(companies)); } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    companies = raw ? JSON.parse(raw) : [];
  } catch (e) { companies = []; }
}

// ===== UTILS =====
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getStatusInfo(val) {
  return STATUS_OPTIONS.find(s => s.value === val) || STATUS_OPTIONS[0];
}

function getEventTypeInfo(val) {
  return EVENT_TYPES.find(t => t.value === val) || EVENT_TYPES[EVENT_TYPES.length - 1];
}

function getCompanyColor(company) {
  const idx = companies.findIndex(c => c.id === company.id);
  return COMPANY_COLORS[idx % COMPANY_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d - today) / 86400000);
}

function getNextEvent(company) {
  if (!company.events || company.events.length === 0) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const future = company.events
    .filter(e => e.date && new Date(e.date + 'T00:00:00') >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return future[0] || null;
}

function getAllEvents() {
  const evs = [];
  companies.forEach(c => {
    (c.events || []).forEach(e => {
      if (e.date) evs.push({ ...e, companyId: c.id, companyName: c.name });
    });
  });
  return evs;
}

function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function showUndoToast(msg, ms=5000) {
  const t = document.getElementById('toast');
  t.innerHTML = `${msg} <button onclick="undoDelete()" style="margin-left:10px;background:rgba(255,255,255,.25);border:none;color:#fff;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">元に戻す</button>`;
  t.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

function undoDelete() {
  if (!lastDeleted) return;
  companies.splice(lastDeleted.index, 0, lastDeleted.company);
  lastDeleted = null;
  save();
  if (currentPage === 'dashboard') renderDashboard(); else renderCompanies();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社';
  showToast('↩️ 元に戻しました');
}

// ===== THEME =====
function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  localStorage.setItem('shukatsu_theme', dark ? 'dark' : 'light');
  const btns = document.querySelectorAll('.theme-btn');
  btns.forEach(b => b.classList.toggle('active', b.dataset.theme === (dark ? 'dark' : 'light')));
}

// ===== NAVIGATION =====
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pEl = document.getElementById('page-' + page);
  if (pEl) pEl.classList.add('active');
  const nEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nEl) nEl.classList.add('active');
  const titles = { dashboard: 'ダッシュボード', companies: '企業一覧', calendar: 'カレンダー', export: 'エクスポート' };
  document.getElementById('page-title').textContent = titles[page] || page;

  if (page === 'dashboard') renderDashboard();
  else if (page === 'companies') renderCompanies();
  else if (page === 'calendar') renderCalendar();
  else if (page === 'export') renderExport();

  // Close sidebar on mobile
  closeMobileSidebar();
}

// ===== DASHBOARD =====
function renderDashboard() {
  renderStats();
  renderUpcoming();
  renderDeadlines();
  renderStatusOverview();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社登録中';
}

function renderStats() {
  const total = companies.length;
  const active = companies.filter(c =>
    !['rejected','declined','offer_accepted'].includes(c.status)).length;
  const offers = companies.filter(c => ['offer','offer_accepted'].includes(c.status)).length;
  const today = new Date(); today.setHours(0,0,0,0);
  const thisWeek = getAllEvents().filter(e => {
    const d = daysUntil(e.date);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  const stats = [
    { icon: '🏢', value: total, label: '登録企業数' },
    { icon: '🔄', value: active, label: '選考中' },
    { icon: '📅', value: thisWeek, label: '今週の予定' },
    { icon: '🎉', value: offers, label: '内定' },
  ];

  document.getElementById('stats-row').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>
  `).join('');
}

function renderUpcoming() {
  const all = getAllEvents()
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days !== null && e.days >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const el = document.getElementById('upcoming-list');
  document.getElementById('upcoming-badge').textContent = all.length;

  if (all.length === 0) {
    el.innerHTML = '<div class="empty-msg">予定はありません</div>';
    return;
  }

  el.innerHTML = all.map(e => {
    const ti = getEventTypeInfo(e.type);
    const daysLabel = e.days === 0 ? '今日' : e.days === 1 ? '明日' : `${e.days}日後`;
    const urgentClass = e.days <= 1 ? 'urgent' : e.days <= 3 ? 'soon' : '';
    return `
      <div class="event-item" style="border-left-color:${ti.color}" onclick="openModal('${e.companyId}')">
        <span class="ev-dot" style="background:${ti.color}"></span>
        <div class="ev-info">
          <div class="ev-company">${esc(e.companyName)}</div>
          <div class="ev-type">${ti.icon} ${ti.label}</div>
        </div>
        <span class="ev-date">${formatDate(e.date)}</span>
        <span class="ev-days ${urgentClass}">${daysLabel}</span>
      </div>`;
  }).join('');
}

function renderDeadlines() {
  const es_deadlines = getAllEvents()
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.type === 'es_deadline' && e.days !== null && e.days >= 0 && e.days <= 7)
    .sort((a, b) => a.days - b.days);

  const el = document.getElementById('deadline-list');
  if (es_deadlines.length === 0) {
    el.innerHTML = '<div class="empty-msg">直近7日のES締切はありません</div>';
    return;
  }
  el.innerHTML = es_deadlines.map(e => {
    const daysLabel = e.days === 0 ? '今日締切!' : e.days === 1 ? '明日締切!' : `${e.days}日後`;
    const urgentClass = e.days <= 1 ? 'urgent' : e.days <= 3 ? 'soon' : '';
    return `
      <div class="event-item" style="border-left-color:#EF4444" onclick="openModal('${e.companyId}')">
        <span class="ev-dot" style="background:#EF4444"></span>
        <div class="ev-info">
          <div class="ev-company">${esc(e.companyName)}</div>
          <div class="ev-type">📝 ES締切</div>
        </div>
        <span class="ev-days ${urgentClass}">${daysLabel}</span>
      </div>`;
  }).join('');
}

function renderStatusOverview() {
  const counts = {};
  companies.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  const el = document.getElementById('status-overview');
  if (companies.length === 0) {
    el.innerHTML = '<div class="empty-msg">企業を追加してください</div>';
    return;
  }
  el.innerHTML = STATUS_OPTIONS
    .filter(s => counts[s.value])
    .map(s => `
      <span class="status-chip" style="color:${s.color};border-color:${s.color};background:${s.bg}"
            onclick="filterByStatus('${s.value}')">
        ${s.label}
        <span class="chip-count">${counts[s.value]}</span>
      </span>`)
    .join('');
}

function filterByStatus(status) {
  filterStatus = status;
  navigate('companies');
  document.getElementById('filter-status').value = status;
}

// ===== COMPANIES =====
function renderCompanies() {
  populateFilters();
  let filtered = companies.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchQ = !q || c.name.toLowerCase().includes(q) || (c.industry || '').toLowerCase().includes(q);
    const matchS = !filterStatus || c.status === filterStatus;
    const matchI = !filterIndustry || c.industry === filterIndustry;
    return matchQ && matchS && matchI;
  });

  if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  else if (sortBy === 'priority') filtered.sort((a, b) => (b.priority || 2) - (a.priority || 2));
  else if (sortBy === 'nextEvent') {
    filtered.sort((a, b) => {
      const na = getNextEvent(a), nb = getNextEvent(b);
      if (!na && !nb) return 0;
      if (!na) return 1;
      if (!nb) return -1;
      return na.date.localeCompare(nb.date);
    });
  } else {
    filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  document.getElementById('companies-count').textContent = `${filtered.length} 社`;
  const container = document.getElementById('companies-container');

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:60px;color:var(--text-muted)">
      ${companies.length === 0 ? '「＋ 企業を追加」から企業を登録しましょう！' : '条件に一致する企業がありません'}
    </div>`;
    return;
  }

  if (viewMode === 'list') {
    container.innerHTML = `<div class="companies-list">${filtered.map(companyRow).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="companies-grid">${filtered.map(companyCard).join('')}</div>`;
  }
}

function companyCard(c) {
  const color = getCompanyColor(c);
  const si = getStatusInfo(c.status);
  const pi = PRIORITY_INFO[c.priority || 2];
  const next = getNextEvent(c);
  const days = next ? daysUntil(next.date) : null;
  const ti = next ? getEventTypeInfo(next.type) : null;
  let nextHtml = '';
  if (next) {
    const urgentClass = days <= 1 ? 'ev-urgent' : '';
    nextHtml = `<div class="cc-next-event">
      📅 ${ti.icon} ${ti.label} ${formatDate(next.date)}
      <span class="${urgentClass}">${days === 0 ? '今日' : days === 1 ? '明日' : days + '日後'}</span>
    </div>`;
  }

  return `
    <div class="company-card" onclick="openModal('${c.id}')" style="--cc:${color}">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};border-radius:10px 10px 0 0"></div>
      <div class="cc-header">
        <div class="cc-name">${esc(c.name)}</div>
        <span class="cc-priority" style="color:${pi.color}">● ${pi.label}</span>
      </div>
      <div class="cc-meta">
        ${c.industry ? `<span class="meta-tag">${esc(c.industry)}</span>` : ''}
        ${c.jobType ? `<span class="meta-tag">${esc(c.jobType)}</span>` : ''}
        ${c.internType ? `<span class="meta-tag">${internTypeLabel(c.internType)}</span>` : ''}
        ${c.location ? `<span class="meta-tag">📍 ${esc(c.location)}</span>` : ''}
      </div>
      <div class="cc-status">
        <span class="status-badge" style="color:${si.color};background:${si.bg};border-color:${si.color}">
          ${si.label}
        </span>
      </div>
      ${nextHtml}
    </div>`;
}

function companyRow(c) {
  const si = getStatusInfo(c.status);
  const pi = PRIORITY_INFO[c.priority || 2];
  const next = getNextEvent(c);
  return `
    <div class="company-row" onclick="openModal('${c.id}')">
      <div>
        <div class="row-name">${esc(c.name)}</div>
        <div class="row-industry">${c.industry || ''} ${c.jobType ? '/ ' + esc(c.jobType) : ''}</div>
      </div>
      <div class="row-next">${next ? `📅 ${formatDate(next.date)}` : ''}</div>
      <span class="status-badge" style="color:${si.color};background:${si.bg};border-color:${si.color}">${si.label}</span>
      <div class="row-pri"><span style="color:${pi.color}">● ${pi.label}</span></div>
    </div>`;
}

function internTypeLabel(v) {
  const map = {summer:'サマーインターン', winter:'冬インターン', spring:'春インターン',
    year_round:'通年インターン', open:'オープンカンパニー', main:'本選考'};
  return map[v] || v;
}

function populateFilters() {
  const statusEl = document.getElementById('filter-status');
  const industryEl = document.getElementById('filter-industry');
  if (statusEl.options.length <= 1) {
    STATUS_OPTIONS.forEach(s => {
      const o = document.createElement('option');
      o.value = s.value; o.textContent = s.label;
      statusEl.appendChild(o);
    });
  }
  const industries = [...new Set(companies.map(c => c.industry).filter(Boolean))];
  while (industryEl.options.length > 1) industryEl.remove(1);
  industries.forEach(i => {
    const o = document.createElement('option');
    o.value = i; o.textContent = i;
    industryEl.appendChild(o);
  });
  statusEl.value = filterStatus;
  industryEl.value = filterIndustry;
}

// ===== CALENDAR =====
function renderCalendar() {
  const now = new Date();
  if (calYear == null) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  buildCalendar();
  buildLegend();
}

function buildCalendar() {
  document.getElementById('cal-month-title').textContent =
    `${calYear}年 ${calMonth + 1}月`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();

  const allEvs = getAllEvents();
  const evMap = {};
  allEvs.forEach(e => {
    if (!evMap[e.date]) evMap[e.date] = [];
    evMap[e.date].push(e);
  });

  const today = new Date();
  const todayStr = toDateStr(today);

  let cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrev - firstDay + i + 1, month: calMonth - 1, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: calMonth, other: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - firstDay - daysInMonth + 1, month: calMonth + 1, other: true });
  }

  document.getElementById('cal-grid').innerHTML = cells.map(cell => {
    const actualMonth = cell.month < 0 ? calMonth - 1 : cell.month > 11 ? calMonth + 1 : cell.month;
    const actualYear = cell.month < 0 ? calYear - 1 : cell.month > 11 ? calYear + 1 : calYear;
    const dateStr = `${actualYear}-${String(actualMonth + 1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`;
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
    const isToday = dateStr === todayStr;
    const evs = evMap[dateStr] || [];

    let classes = 'cal-day';
    if (cell.other) classes += ' other-month';
    if (isToday) classes += ' today';
    if (dayOfWeek === 0) classes += ' sunday';
    if (dayOfWeek === 6) classes += ' saturday';
    if (evs.length > 0) classes += ' has-events';

    const maxShow = 3;
    const chips = evs.slice(0, maxShow).map(e => {
      const ci = getCompanyColor({ id: e.companyId });
      const ti = getEventTypeInfo(e.type);
      return `<div class="cal-event-chip" style="background:${ci}"
                   onclick="event.stopPropagation();showCalDetail('${dateStr}')"
                   title="${esc(e.companyName)} - ${ti.label}">
                ${ti.icon} ${esc(e.companyName)}
              </div>`;
    }).join('');
    const moreHtml = evs.length > maxShow
      ? `<div class="more-events">+${evs.length - maxShow}件</div>` : '';

    return `<div class="${classes}" onclick="showCalDetail('${dateStr}')">
      <div class="day-num">${cell.day}</div>
      <div class="cal-events">${chips}${moreHtml}</div>
    </div>`;
  }).join('');
}

function buildLegend() {
  const el = document.getElementById('calendar-legend');
  const usedIds = [...new Set(getAllEvents().map(e => e.companyId))];
  if (usedIds.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = usedIds.slice(0, 10).map(id => {
    const c = companies.find(x => x.id === id);
    if (!c) return '';
    const color = getCompanyColor(c);
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${color}"></span>
      ${esc(c.name)}
    </div>`;
  }).join('');
}

function showCalDetail(dateStr) {
  const allEvs = getAllEvents().filter(e => e.date === dateStr);
  const el = document.getElementById('cal-event-detail');
  if (allEvs.length === 0) { el.classList.add('hidden'); return; }

  el.classList.remove('hidden');
  const dayLabel = formatDate(dateStr);
  el.innerHTML = `
    <h3>${dayLabel} の予定 (${allEvs.length}件)</h3>
    <div class="detail-events">
      ${allEvs.map(e => {
        const ti = getEventTypeInfo(e.type);
        const color = getCompanyColor({ id: e.companyId });
        const timeStr = e.startTime ? `${e.startTime}${e.endTime ? '〜' + e.endTime : ''}` : '';
        return `<div class="detail-ev" style="border-left-color:${color};cursor:pointer"
                     onclick="openModal('${e.companyId}')">
          <div>
            <div class="dev-company">${esc(e.companyName)}</div>
            <div class="dev-type">${ti.icon} ${ti.label}${e.location ? ' / ' + esc(e.location) : ''}</div>
          </div>
          ${timeStr ? `<div class="dev-time">${timeStr}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ===== EXPORT =====
function renderExport() {
  const sel = document.getElementById('export-company-filter');
  while (sel.options.length > 1) sel.remove(1);
  companies.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = c.name;
    sel.appendChild(o);
  });
}

function exportICS() {
  const companyFilter = document.getElementById('export-company-filter').value;
  const fromVal = document.getElementById('export-from').value;
  const toVal = document.getElementById('export-to').value;

  let evs = getAllEvents();
  if (companyFilter !== 'all') evs = evs.filter(e => e.companyId === companyFilter);
  if (fromVal) evs = evs.filter(e => e.date >= fromVal);
  if (toVal) evs = evs.filter(e => e.date <= toVal);

  if (evs.length === 0) { showToast('エクスポートする予定がありません'); return; }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//就活カレンダー//JP',
    'X-WR-CALNAME:就活スケジュール',
    'X-WR-TIMEZONE:Asia/Tokyo',
    'CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  evs.forEach(e => {
    const ti = getEventTypeInfo(e.type);
    const dateCompact = e.date.replace(/-/g, '');
    let dtStart, dtEnd;
    if (e.startTime) {
      const st = e.startTime.replace(':', '');
      const et = e.endTime ? e.endTime.replace(':', '') : String(parseInt(st.slice(0,2)) + 1).padStart(2,'0') + st.slice(2);
      dtStart = `DTSTART;TZID=Asia/Tokyo:${dateCompact}T${st}00`;
      dtEnd   = `DTEND;TZID=Asia/Tokyo:${dateCompact}T${et}00`;
    } else {
      const next = new Date(e.date + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      const nextStr = toDateStr(next).replace(/-/g, '');
      dtStart = `DTSTART;VALUE=DATE:${dateCompact}`;
      dtEnd   = `DTEND;VALUE=DATE:${nextStr}`;
    }
    const company = companies.find(c => c.id === e.companyId);
    const summary = `[${e.companyName}] ${ti.label}`;
    const desc = [
      e.location ? `場所: ${e.location}` : '',
      e.notes ? `備考: ${e.notes}` : '',
      company?.url ? `URL: ${company.url}` : '',
    ].filter(Boolean).join('\\n');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${e.companyId}@shukatsu-app`,
      dtStart, dtEnd,
      `SUMMARY:${summary}`,
      desc ? `DESCRIPTION:${desc}` : '',
      e.location ? `LOCATION:${e.location}` : '',
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}Z`,
      'END:VEVENT',
    ).filter(Boolean);
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  downloadBlob(blob, 'shukatsu_schedule.ics');
  showToast(`✅ ${evs.length}件の予定をエクスポートしました`);
}

function exportCSV() {
  const header = ['企業名','業種','職種','種別','ステータス','優先度','場所','URL','志望動機','選考メモ','ESメモ'];
  const rows = companies.map(c => {
    const si = getStatusInfo(c.status);
    const pi = PRIORITY_INFO[c.priority || 2];
    return [
      c.name, c.industry||'', c.jobType||'', internTypeLabel(c.internType||''),
      si.label, pi.label, c.location||'', c.url||'',
      c.motivation||'', c.notes||'', c.esNotes||''
    ].map(v => `"${String(v).replace(/"/g,'""')}"`);
  });
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, 'shukatsu_companies.csv');
  showToast('✅ CSVをエクスポートしました');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(companies, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'shukatsu_backup.json');
  showToast('✅ バックアップを保存しました');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('invalid');
      if (!confirm(`${data.length}社のデータを復元します。現在のデータは上書きされます。続けますか？`)) return;
      companies = data;
      save();
      navigate('dashboard');
      showToast(`✅ ${data.length}社のデータを復元しました`);
    } catch {
      showToast('⚠️ ファイルの形式が正しくありません');
    }
  };
  reader.readAsText(file);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== MODAL =====
function openModal(companyId) {
  editingId = companyId || null;
  const company = companyId ? companies.find(c => c.id === companyId) : null;

  document.getElementById('modal-title').textContent = company ? company.name : '企業を追加';
  document.getElementById('btn-delete-company').style.display = company ? '' : 'none';

  // Populate industries
  const indEl = document.getElementById('f-industry');
  if (indEl.options.length <= 1) {
    INDUSTRIES.forEach(i => {
      const o = document.createElement('option');
      o.value = i; o.textContent = i;
      indEl.appendChild(o);
    });
  }

  // Populate status
  const statusEl = document.getElementById('f-status');
  statusEl.innerHTML = STATUS_OPTIONS.map(s =>
    `<option value="${s.value}">${s.label}</option>`
  ).join('');

  // Fill fields
  document.getElementById('f-name').value = company?.name || '';
  document.getElementById('f-industry').value = company?.industry || '';
  document.getElementById('f-job-type').value = company?.jobType || '';
  document.getElementById('f-intern-type').value = company?.internType || '';
  document.getElementById('f-status').value = company?.status || 'interested';
  document.getElementById('f-location').value = company?.location || '';
  document.getElementById('f-url').value = company?.url || '';
  document.getElementById('f-motivation').value = company?.motivation || '';
  document.getElementById('f-notes').value = company?.notes || '';
  document.getElementById('f-es-notes').value = company?.esNotes || '';

  editPriority = company?.priority || 2;
  document.querySelectorAll('.pri-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.dataset.v) === editPriority);
  });

  // Events
  modalEvents = JSON.parse(JSON.stringify(company?.events || []));
  renderModalEvents();

  // Reset tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
  document.getElementById('tab-basic').classList.add('active');

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingId = null;
}

function saveModal() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { showToast('⚠️ 企業名を入力してください'); return; }

  const data = {
    name,
    industry: document.getElementById('f-industry').value,
    jobType: document.getElementById('f-job-type').value.trim(),
    internType: document.getElementById('f-intern-type').value,
    status: document.getElementById('f-status').value,
    priority: editPriority,
    location: document.getElementById('f-location').value.trim(),
    url: document.getElementById('f-url').value.trim(),
    motivation: document.getElementById('f-motivation').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    esNotes: document.getElementById('f-es-notes').value.trim(),
    events: modalEvents,
  };

  if (editingId) {
    const idx = companies.findIndex(c => c.id === editingId);
    if (idx !== -1) companies[idx] = { ...companies[idx], ...data };
    showToast('✅ 更新しました');
  } else {
    companies.push({ id: uuid(), createdAt: Date.now(), ...data });
    showToast('✅ 追加しました');
  }

  save();
  closeModal();
  if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'companies') renderCompanies();
  else if (currentPage === 'calendar') renderCalendar();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社登録中';
}

function deleteCompany() {
  if (!editingId) return;
  const idx = companies.findIndex(x => x.id === editingId);
  if (idx === -1) return;
  const c = companies[idx];
  if (!confirm(`「${c.name}」を削除しますか？`)) return;
  lastDeleted = { company: c, index: idx };
  companies.splice(idx, 1);
  save();
  closeModal();
  if (currentPage === 'dashboard') renderDashboard();
  else renderCompanies();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社登録中';
  showUndoToast('🗑️ 削除しました');
}

// ===== MODAL EVENTS =====
function renderModalEvents() {
  const container = document.getElementById('events-container');
  if (modalEvents.length === 0) {
    container.innerHTML = '<div class="empty-msg" style="padding:16px 0">予定を追加してください</div>';
    return;
  }
  container.innerHTML = modalEvents.map((e, i) => `
    <div class="event-row" id="evrow-${i}">
      <button class="remove-ev" onclick="removeEvent(${i})">✕</button>
      <div class="event-row-top">
        <div class="form-group">
          <label>種別</label>
          <select class="form-control" onchange="updateEvent(${i},'type',this.value)">
            ${EVENT_TYPES.map(t => `<option value="${t.value}" ${e.type===t.value?'selected':''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>日付</label>
          <input type="date" class="form-control" value="${e.date||''}" onchange="updateEvent(${i},'date',this.value)">
        </div>
      </div>
      <div class="event-row-bottom">
        <div class="form-group">
          <label>開始時間</label>
          <input type="time" class="form-control" value="${e.startTime||''}" onchange="updateEvent(${i},'startTime',this.value)">
        </div>
        <div class="form-group">
          <label>終了時間</label>
          <input type="time" class="form-control" value="${e.endTime||''}" onchange="updateEvent(${i},'endTime',this.value)">
        </div>
        <div class="form-group flex-2">
          <label>場所</label>
          <input type="text" class="form-control" value="${esc(e.location||'')}" placeholder="オンライン / 東京本社" oninput="updateEvent(${i},'location',this.value)">
        </div>
      </div>
      <div class="form-group">
        <label>メモ</label>
        <input type="text" class="form-control" value="${esc(e.notes||'')}" placeholder="持ち物、注意事項など" oninput="updateEvent(${i},'notes',this.value)">
      </div>
    </div>`).join('');
}

function addEvent() {
  modalEvents.push({ id: uuid(), type: 'other', date: '', startTime: '', endTime: '', location: '', notes: '' });
  renderModalEvents();
}

function removeEvent(i) {
  modalEvents.splice(i, 1);
  renderModalEvents();
}

function updateEvent(i, key, val) {
  if (modalEvents[i]) modalEvents[i][key] = val;
}

// ===== HELPERS =====
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== MOBILE SIDEBAR =====
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  let bd = document.getElementById('sidebar-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'sidebar-backdrop';
    bd.className = 'sidebar-backdrop';
    bd.onclick = closeMobileSidebar;
    document.body.appendChild(bd);
  }
  bd.classList.add('show');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const bd = document.getElementById('sidebar-backdrop');
  if (bd) bd.classList.remove('show');
}

// ===== EVENT LISTENERS =====
function initListeners() {
  // Nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Add company
  document.getElementById('btn-add-company').addEventListener('click', () => openModal(null));

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveModal);
  document.getElementById('btn-delete-company').addEventListener('click', deleteCompany);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  // Priority buttons
  document.querySelectorAll('.pri-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editPriority = parseInt(btn.dataset.v);
      document.querySelectorAll('.pri-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Add event in modal
  document.getElementById('btn-add-event').addEventListener('click', addEvent);

  // Search/filter
  document.getElementById('search-input').addEventListener('input', e => {
    searchQuery = e.target.value;
    renderCompanies();
  });
  document.getElementById('filter-status').addEventListener('change', e => {
    filterStatus = e.target.value;
    renderCompanies();
  });
  document.getElementById('filter-industry').addEventListener('change', e => {
    filterIndustry = e.target.value;
    renderCompanies();
  });
  document.getElementById('sort-select').addEventListener('change', e => {
    sortBy = e.target.value;
    renderCompanies();
  });

  // View toggle
  document.getElementById('view-card').addEventListener('click', () => {
    viewMode = 'card';
    document.getElementById('view-card').classList.add('active');
    document.getElementById('view-list').classList.remove('active');
    renderCompanies();
  });
  document.getElementById('view-list').addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById('view-list').classList.add('active');
    document.getElementById('view-card').classList.remove('active');
    renderCompanies();
  });

  // Calendar
  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
    buildCalendar();
    document.getElementById('cal-event-detail').classList.add('hidden');
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
    buildCalendar();
    document.getElementById('cal-event-detail').classList.add('hidden');
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    const n = new Date();
    calYear = n.getFullYear(); calMonth = n.getMonth();
    buildCalendar();
    document.getElementById('cal-event-detail').classList.add('hidden');
  });

  // Export
  document.getElementById('btn-export-ics').addEventListener('click', exportICS);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('import-json').addEventListener('change', e => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = '';
  });
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (!confirm('全データを削除します。この操作は元に戻せません。よろしいですか？')) return;
    companies = [];
    save();
    navigate('dashboard');
    showToast('🗑️ 全データを削除しました');
  });

  // Mobile menu
  document.getElementById('menu-toggle').addEventListener('click', openMobileSidebar);

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => setTheme(btn.dataset.theme === 'dark'));
  });
}

// ===== SAMPLE DATA =====
function addSampleData() {
  if (companies.length > 0) return;
  const today = new Date();
  function addDays(d, n) {
    const r = new Date(d); r.setDate(r.getDate() + n);
    return toDateStr(r);
  }

  companies = [
    {
      id: uuid(), createdAt: Date.now() - 3000,
      name: '株式会社サンプルテック',
      industry: 'IT・通信', jobType: 'エンジニア',
      internType: 'summer', status: 'interview_1',
      priority: 3, location: 'オンライン',
      url: '', motivation: '最先端技術に携わりたい',
      notes: '一次面接では技術的な質問が中心', esNotes: '',
      events: [
        { id: uuid(), type: 'es_deadline', date: addDays(today, 3), startTime: '', endTime: '', location: '', notes: '' },
        { id: uuid(), type: 'interview_1', date: addDays(today, 7), startTime: '14:00', endTime: '15:00', location: 'Zoom', notes: '' },
      ]
    },
    {
      id: uuid(), createdAt: Date.now() - 2000,
      name: 'グローバル商事株式会社',
      industry: '商社', jobType: '総合職',
      internType: 'winter', status: 'es_submitted',
      priority: 2, location: '東京',
      url: '', motivation: '',
      notes: '', esNotes: '400字×3問',
      events: [
        { id: uuid(), type: 'es_deadline', date: addDays(today, 1), startTime: '', endTime: '', location: '', notes: '' },
        { id: uuid(), type: 'info_session', date: addDays(today, 10), startTime: '10:00', endTime: '12:00', location: 'オンライン', notes: '' },
      ]
    },
    {
      id: uuid(), createdAt: Date.now() - 1000,
      name: '未来銀行',
      industry: '金融・保険', jobType: '総合職',
      internType: 'main', status: 'gd',
      priority: 2, location: '大阪',
      url: '', motivation: '',
      notes: '', esNotes: '',
      events: [
        { id: uuid(), type: 'gd', date: addDays(today, 14), startTime: '13:00', endTime: '15:00', location: '梅田本社', notes: '' },
      ]
    },
  ];
  save();
}

// ===== INIT =====
function init() {
  load();
  initListeners();
  // Restore theme preference
  const savedTheme = localStorage.getItem('shukatsu_theme');
  if (savedTheme === 'dark') setTheme(true);
  navigate('dashboard');
}

init();
