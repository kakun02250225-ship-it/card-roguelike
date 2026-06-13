// ===== CONSTANTS =====
const STORAGE_KEY = 'shukatsu_v2';

const STATUS_OPTIONS = [
  { value: 'interested',      label: '気になる',     color: '#6B7280', bg: '#F3F4F6' },
  { value: 'info_done',       label: '説明会済み',   color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'es_preparing',    label: 'ES準備中',     color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'es_submitted',    label: 'ES提出済み',   color: '#06B6D4', bg: '#CFFAFE' },
  { value: 'screening',       label: '書類選考中',   color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'aptitude',        label: '適性検査済み', color: '#F97316', bg: '#FFEDD5' },
  { value: 'gd',              label: 'GD済み',       color: '#EF4444', bg: '#FEE2E2' },
  { value: 'interview_1',     label: '一次面接済み', color: '#EC4899', bg: '#FCE7F3' },
  { value: 'interview_2',     label: '二次面接済み', color: '#A855F7', bg: '#F3E8FF' },
  { value: 'interview_final', label: '最終面接済み', color: '#7C3AED', bg: '#EDE9FE' },
  { value: 'offer',           label: '内定',         color: '#10B981', bg: '#D1FAE5' },
  { value: 'offer_accepted',  label: '内定承諾',     color: '#059669', bg: '#A7F3D0' },
  { value: 'rejected',        label: '落選',         color: '#EF4444', bg: '#FEE2E2' },
  { value: 'declined',        label: '辞退',         color: '#9CA3AF', bg: '#F3F4F6' },
];

const EVENT_TYPES = [
  { value: 'es_deadline',     label: 'ES締切',    color: '#EF4444', icon: '📝' },
  { value: 'info_session',    label: '説明会',    color: '#8B5CF6', icon: 'ℹ️' },
  { value: 'aptitude_test',   label: '適性検査',  color: '#F97316', icon: '📊' },
  { value: 'gd',              label: 'GD',        color: '#F59E0B', icon: '👥' },
  { value: 'interview_1',     label: '一次面接',  color: '#3B82F6', icon: '🗣️' },
  { value: 'interview_2',     label: '二次面接',  color: '#6366F1', icon: '🗣️' },
  { value: 'interview_final', label: '最終面接',  color: '#A855F7', icon: '🎯' },
  { value: 'intern',          label: 'インターン', color: '#10B981', icon: '💼' },
  { value: 'other',           label: 'その他',    color: '#6B7280', icon: '📌' },
];

const INDUSTRIES = [
  'IT・通信', 'メーカー', '商社', '金融・保険', '不動産・建設',
  'サービス', '小売・流通', 'マスコミ・広告', '医療・福祉', '教育',
  'コンサルティング', '公務員・非営利', 'エネルギー', 'その他',
];

const COMPANY_COLORS = [
  '#6366F1','#EC4899','#10B981','#F59E0B','#8B5CF6',
  '#06B6D4','#EF4444','#F97316','#14B8A6','#84CC16',
  '#3B82F6','#A855F7','#0EA5E9','#D946EF',
];

const PRIORITY_INFO = {
  1: { label: '低', color: '#10B981' },
  2: { label: '中', color: '#F59E0B' },
  3: { label: '高', color: '#EF4444' },
};

// Pipeline stages shown on dashboard
const PIPELINE_STAGES = [
  { key: 'es',        label: 'ES',    statuses: ['es_preparing','es_submitted','screening'] },
  { key: 'test',      label: '適性',  statuses: ['aptitude'] },
  { key: 'gd',        label: 'GD',    statuses: ['gd'] },
  { key: 'interview', label: '面接',  statuses: ['interview_1','interview_2','interview_final'] },
  { key: 'offer',     label: '内定',  statuses: ['offer','offer_accepted'] },
];

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

// ===== STORAGE =====
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(companies)); } catch(e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    companies = raw ? JSON.parse(raw) : [];
  } catch(e) { companies = []; }
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
function getCompanyInitial(name) {
  return name ? name.replace(/株式会社|合同会社|有限会社/g,'').trim().charAt(0) : '?';
}
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth()+1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.ceil((d - today) / 86400000);
}
function getNextEvent(company) {
  if (!company.events?.length) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  return company.events
    .filter(e => e.date && new Date(e.date + 'T00:00:00') >= today)
    .sort((a,b) => a.date.localeCompare(b.date))[0] || null;
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
function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function internTypeLabel(v) {
  return {summer:'サマーインターン',winter:'冬インターン',spring:'春インターン',
    year_round:'通年インターン',open:'オープンカンパニー',main:'本選考'}[v] || v;
}
function showToast(msg, ms=2400) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// ===== NAVIGATION =====
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item,.bn-item').forEach(n => n.classList.remove('active'));
  const pEl = document.getElementById('page-' + page);
  if (pEl) pEl.classList.add('active');
  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));
  const titles = { dashboard:'ダッシュボード', companies:'企業一覧', calendar:'カレンダー', export:'設定・出力' };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (page === 'dashboard') renderDashboard();
  else if (page === 'companies') renderCompanies();
  else if (page === 'calendar') renderCalendar();
  else if (page === 'export') renderExport();
}

// ===== DASHBOARD =====
function renderDashboard() {
  renderStats();
  renderUpcoming();
  renderDeadlines();
  renderPipeline();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社';
}

function renderStats() {
  const total = companies.length;
  const active = companies.filter(c => !['rejected','declined','offer_accepted'].includes(c.status)).length;
  const offers = companies.filter(c => ['offer','offer_accepted'].includes(c.status)).length;
  const today = new Date(); today.setHours(0,0,0,0);
  const thisWeek = getAllEvents().filter(e => { const d = daysUntil(e.date); return d !== null && d >= 0 && d <= 7; }).length;

  document.getElementById('stats-row').innerHTML = [
    { cls:'s1', icon:'🏢', value:total,    label:'登録企業数' },
    { cls:'s2', icon:'🔄', value:active,   label:'選考中' },
    { cls:'s3', icon:'📅', value:thisWeek, label:'今週の予定' },
    { cls:'s4', icon:'🎉', value:offers,   label:'内定' },
  ].map(s => `
    <div class="stat-card ${s.cls}">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-info">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');
}

function renderUpcoming() {
  const all = getAllEvents()
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.days !== null && e.days >= 0)
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  document.getElementById('upcoming-badge').textContent = all.length;
  const el = document.getElementById('upcoming-list');
  if (!all.length) { el.innerHTML = '<div class="empty-msg">直近の予定はありません</div>'; return; }
  el.innerHTML = all.map(e => {
    const ti = getEventTypeInfo(e.type);
    const dLabel = e.days === 0 ? '今日' : e.days === 1 ? '明日' : `${e.days}日後`;
    const uc = e.days <= 1 ? 'urgent' : e.days <= 3 ? 'soon' : '';
    return `<div class="event-item" style="border-left-color:${ti.color}" onclick="openModal('${e.companyId}')">
      <span class="ev-dot" style="background:${ti.color}"></span>
      <div class="ev-info">
        <div class="ev-company">${esc(e.companyName)}</div>
        <div class="ev-type">${ti.icon} ${ti.label}</div>
      </div>
      <span class="ev-date">${formatDate(e.date)}</span>
      <span class="ev-days ${uc}">${dLabel}</span>
    </div>`;
  }).join('');
}

function renderDeadlines() {
  const ds = getAllEvents()
    .map(e => ({ ...e, days: daysUntil(e.date) }))
    .filter(e => e.type === 'es_deadline' && e.days !== null && e.days >= 0 && e.days <= 7)
    .sort((a,b) => a.days - b.days);
  const el = document.getElementById('deadline-list');
  if (!ds.length) { el.innerHTML = '<div class="empty-msg">直近7日のES締切はありません</div>'; return; }
  el.innerHTML = ds.map(e => {
    const dLabel = e.days === 0 ? '今日締切!' : e.days === 1 ? '明日締切!' : `${e.days}日後`;
    const uc = e.days <= 1 ? 'urgent' : e.days <= 3 ? 'soon' : '';
    return `<div class="event-item" style="border-left-color:#EF4444" onclick="openModal('${e.companyId}')">
      <span class="ev-dot" style="background:#EF4444"></span>
      <div class="ev-info">
        <div class="ev-company">${esc(e.companyName)}</div>
        <div class="ev-type">📝 ES締切</div>
      </div>
      <span class="ev-days ${uc}">${dLabel}</span>
    </div>`;
  }).join('');
}

function renderPipeline() {
  const el = document.getElementById('pipeline');
  if (!companies.length) { el.innerHTML = '<div class="empty-msg">企業を追加するとパイプラインが表示されます</div>'; return; }
  el.innerHTML = PIPELINE_STAGES.map((stage, i) => {
    const count = companies.filter(c => stage.statuses.includes(c.status)).length;
    const colors = ['#6366F1','#F59E0B','#EF4444','#EC4899','#10B981'];
    const c = colors[i];
    return `<div class="pipe-step" onclick="filterByStatuses(${JSON.stringify(stage.statuses)})">
      ${i > 0 ? `<div class="pipe-arrow">▶</div>` : ''}
      <span class="pipe-count" style="color:${c}">${count}</span>
      <span class="pipe-label">${stage.label}</span>
      <div class="pipe-bar" style="background:${count > 0 ? c : '#E5E7EB'}"></div>
    </div>`;
  }).join('');
}

function filterByStatuses(statuses) {
  filterStatus = statuses[0];
  navigate('companies');
  document.getElementById('filter-status').value = statuses[0];
}

// ===== COMPANIES =====
function renderCompanies() {
  populateFilters();
  let list = companies.filter(c => {
    const q = searchQuery.toLowerCase();
    const mQ = !q || c.name.toLowerCase().includes(q) || (c.industry||'').toLowerCase().includes(q) || (c.jobType||'').toLowerCase().includes(q);
    const mS = !filterStatus || c.status === filterStatus;
    const mI = !filterIndustry || c.industry === filterIndustry;
    return mQ && mS && mI;
  });
  if (sortBy === 'name') list.sort((a,b) => a.name.localeCompare(b.name,'ja'));
  else if (sortBy === 'priority') list.sort((a,b) => (b.priority||2) - (a.priority||2));
  else if (sortBy === 'nextEvent') {
    list.sort((a,b) => {
      const na = getNextEvent(a), nb = getNextEvent(b);
      if (!na && !nb) return 0; if (!na) return 1; if (!nb) return -1;
      return na.date.localeCompare(nb.date);
    });
  } else list.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  document.getElementById('companies-count').textContent = `${list.length}社`;
  const container = document.getElementById('companies-container');
  if (!list.length) {
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:40px;margin-bottom:12px">🏢</div>
      ${companies.length === 0 ? '<strong>企業を追加してみましょう！</strong><br>右上の「＋ 企業を追加」から登録できます。' : '条件に一致する企業がありません'}
    </div>`;
    return;
  }
  if (viewMode === 'list') {
    container.innerHTML = `<div class="companies-list">${list.map(companyRow).join('')}</div>`;
  } else {
    container.innerHTML = `<div class="companies-grid">${list.map(companyCard).join('')}</div>`;
  }
}

function companyCard(c) {
  const color = getCompanyColor(c);
  const si = getStatusInfo(c.status);
  const pi = PRIORITY_INFO[c.priority||2];
  const next = getNextEvent(c);
  const days = next ? daysUntil(next.date) : null;
  const ti = next ? getEventTypeInfo(next.type) : null;
  const initial = getCompanyInitial(c.name);
  let nextHtml = '';
  if (next) {
    const uc = days <= 1 ? 'urgent' : '';
    nextHtml = `<div class="cc-next">
      📅 ${ti.icon} ${ti.label} ${formatDate(next.date)}
      <span class="${uc}" style="margin-left:auto">${days===0?'今日':days===1?'明日':days+'日後'}</span>
    </div>`;
  }
  return `
    <div class="company-card" onclick="openModal('${c.id}')">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${color};border-radius:14px 14px 0 0"></div>
      <div class="cc-top">
        <div class="company-avatar-sm" style="background:linear-gradient(135deg,${color},${color}cc)">${initial}</div>
        <div class="cc-name-wrap">
          <div class="cc-name">${esc(c.name)}</div>
          <div class="cc-meta">
            ${c.industry?`<span class="meta-tag">${esc(c.industry)}</span>`:''}
            ${c.jobType?`<span class="meta-tag">${esc(c.jobType)}</span>`:''}
            ${c.internType?`<span class="meta-tag">${internTypeLabel(c.internType)}</span>`:''}
            ${c.location?`<span class="meta-tag">📍${esc(c.location)}</span>`:''}
          </div>
        </div>
        <span class="cc-priority" style="color:${pi.color}">● ${pi.label}</span>
      </div>
      <div class="cc-status-row">
        <span class="status-badge" style="color:${si.color};background:${si.bg};border-color:${si.color}">${si.label}</span>
        ${c.mypageUrl?`<a href="${esc(c.mypageUrl)}" target="_blank" onclick="event.stopPropagation()" style="font-size:11px;color:var(--primary);font-weight:700;text-decoration:none">🔗 マイページ</a>`:''}
      </div>
      ${nextHtml}
    </div>`;
}

function companyRow(c) {
  const color = getCompanyColor(c);
  const si = getStatusInfo(c.status);
  const pi = PRIORITY_INFO[c.priority||2];
  const next = getNextEvent(c);
  return `
    <div class="company-row" onclick="openModal('${c.id}')">
      <div class="row-avatar" style="background:linear-gradient(135deg,${color},${color}cc)">${getCompanyInitial(c.name)}</div>
      <div class="row-info">
        <div class="row-name">${esc(c.name)}</div>
        <div class="row-sub">${c.industry||''} ${c.jobType?'/ '+esc(c.jobType):''}</div>
      </div>
      <div class="row-next">${next?`📅 ${formatDate(next.date)}`:''}</div>
      <span class="status-badge" style="color:${si.color};background:${si.bg};border-color:${si.color}">${si.label}</span>
    </div>`;
}

function populateFilters() {
  const sEl = document.getElementById('filter-status');
  const iEl = document.getElementById('filter-industry');
  if (sEl.options.length <= 1) {
    STATUS_OPTIONS.forEach(s => { const o = document.createElement('option'); o.value=s.value; o.textContent=s.label; sEl.appendChild(o); });
  }
  while (iEl.options.length > 1) iEl.remove(1);
  [...new Set(companies.map(c=>c.industry).filter(Boolean))].forEach(i => {
    const o = document.createElement('option'); o.value=i; o.textContent=i; iEl.appendChild(o);
  });
  sEl.value = filterStatus; iEl.value = filterIndustry;
}

// ===== CALENDAR =====
function renderCalendar() {
  const now = new Date();
  if (calYear == null) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  buildCalendar();
  buildLegend();
}

function buildCalendar() {
  document.getElementById('cal-month-title').textContent = `${calYear}年 ${calMonth+1}月`;
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev = new Date(calYear, calMonth, 0).getDate();
  const allEvs = getAllEvents();
  const evMap = {};
  allEvs.forEach(e => { if (!evMap[e.date]) evMap[e.date]=[]; evMap[e.date].push(e); });
  const todayStr = toDateStr(new Date());

  let cells = [];
  for (let i=0; i<firstDay; i++) cells.push({ day: daysInPrev-firstDay+i+1, month: calMonth-1, other: true });
  for (let d=1; d<=daysInMonth; d++) cells.push({ day: d, month: calMonth, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length-firstDay-daysInMonth+1, month: calMonth+1, other: true });

  document.getElementById('cal-grid').innerHTML = cells.map(cell => {
    const aM = cell.month < 0 ? calMonth-1 : cell.month > 11 ? calMonth+1 : cell.month;
    const aY = cell.month < 0 ? calYear-1 : cell.month > 11 ? calYear+1 : calYear;
    const realM = ((aM % 12) + 12) % 12;
    const realY = aM < 0 ? aY-1 : aM > 11 ? aY+1 : aY;
    const ds = `${realY}-${String(realM+1).padStart(2,'0')}-${String(cell.day).padStart(2,'0')}`;
    const dow = new Date(ds+'T00:00:00').getDay();
    const isToday = ds === todayStr;
    const evs = evMap[ds] || [];
    let cls = 'cal-day';
    if (cell.other) cls += ' other-month';
    if (isToday) cls += ' today';
    if (dow === 0) cls += ' sunday';
    if (dow === 6) cls += ' saturday';
    if (evs.length) cls += ' has-events';
    const maxShow = 3;
    const chips = evs.slice(0, maxShow).map(e => {
      const c = companies.find(x => x.id === e.companyId);
      const color = c ? getCompanyColor(c) : '#6366F1';
      const ti = getEventTypeInfo(e.type);
      const shortName = e.companyName.replace(/株式会社|合同会社|有限会社/g,'').slice(0,4);
      return `<div class="cal-event-chip" style="background:${color}"
                   onclick="event.stopPropagation();showCalDetail('${ds}')"
                   title="${esc(e.companyName)} ${ti.label}">
                ${ti.icon}${shortName}
              </div>`;
    }).join('');
    const more = evs.length > maxShow ? `<div class="more-events">+${evs.length-maxShow}</div>` : '';
    return `<div class="${cls}" onclick="showCalDetail('${ds}')">
      <div class="day-num">${cell.day}</div>
      <div class="cal-events">${chips}${more}</div>
    </div>`;
  }).join('');
}

function buildLegend() {
  const ids = [...new Set(getAllEvents().map(e=>e.companyId))];
  const el = document.getElementById('calendar-legend');
  if (!ids.length) { el.innerHTML=''; return; }
  el.innerHTML = ids.slice(0,8).map(id => {
    const c = companies.find(x=>x.id===id); if(!c) return '';
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${getCompanyColor(c)}"></span>${esc(c.name)}
    </div>`;
  }).join('');
}

function showCalDetail(ds) {
  const evs = getAllEvents().filter(e => e.date === ds);
  const el = document.getElementById('cal-event-detail');
  if (!evs.length) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <h3>${formatDate(ds)} の予定 (${evs.length}件)</h3>
    <div class="detail-events">
      ${evs.map(e => {
        const ti = getEventTypeInfo(e.type);
        const c = companies.find(x=>x.id===e.companyId);
        const color = c ? getCompanyColor(c) : '#6366F1';
        const timeStr = e.startTime ? `${e.startTime}${e.endTime?'〜'+e.endTime:''}` : '';
        return `<div class="detail-ev" style="border-left-color:${color}" onclick="openModal('${e.companyId}')">
          <div>
            <div class="dev-company">${esc(e.companyName)}</div>
            <div class="dev-type">${ti.icon} ${ti.label}${e.location?' / '+esc(e.location):''}</div>
          </div>
          ${timeStr?`<div class="dev-time">${timeStr}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
}

// ===== EXPORT =====
function renderExport() {
  const sel = document.getElementById('export-company-filter');
  while (sel.options.length > 1) sel.remove(1);
  companies.forEach(c => { const o=document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o); });
}

function exportICS() {
  const cf = document.getElementById('export-company-filter').value;
  const fv = document.getElementById('export-from').value;
  const tv = document.getElementById('export-to').value;
  let evs = getAllEvents();
  if (cf !== 'all') evs = evs.filter(e => e.companyId === cf);
  if (fv) evs = evs.filter(e => e.date >= fv);
  if (tv) evs = evs.filter(e => e.date <= tv);
  if (!evs.length) { showToast('エクスポートする予定がありません'); return; }
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//就活カレンダー//JP',
    'X-WR-CALNAME:就活スケジュール','X-WR-TIMEZONE:Asia/Tokyo','CALSCALE:GREGORIAN',
    'BEGIN:VTIMEZONE','TZID:Asia/Tokyo','BEGIN:STANDARD',
    'DTSTART:19700101T000000','TZOFFSETFROM:+0900','TZOFFSETTO:+0900','TZNAME:JST',
    'END:STANDARD','END:VTIMEZONE',
  ];
  evs.forEach(e => {
    const ti = getEventTypeInfo(e.type);
    const dc = e.date.replace(/-/g,'');
    let dtS, dtE;
    if (e.startTime) {
      const st = e.startTime.replace(':','');
      const et = e.endTime ? e.endTime.replace(':','') : String(parseInt(st.slice(0,2))+1).padStart(2,'0')+st.slice(2);
      dtS = `DTSTART;TZID=Asia/Tokyo:${dc}T${st}00`;
      dtE = `DTEND;TZID=Asia/Tokyo:${dc}T${et}00`;
    } else {
      const nx = new Date(e.date+'T00:00:00'); nx.setDate(nx.getDate()+1);
      dtS = `DTSTART;VALUE=DATE:${dc}`;
      dtE = `DTEND;VALUE=DATE:${toDateStr(nx).replace(/-/g,'')}`;
    }
    const comp = companies.find(c=>c.id===e.companyId);
    const desc = [e.location?`場所: ${e.location}`:'', e.notes?`備考: ${e.notes}`:'', comp?.url?`URL: ${comp.url}`:''].filter(Boolean).join('\\n');
    lines.push('BEGIN:VEVENT', `UID:${e.id}@shukatsu`, dtS, dtE,
      `SUMMARY:[${e.companyName}] ${ti.label}`,
      ...(desc?[`DESCRIPTION:${desc}`]:[]),
      ...(e.location?[`LOCATION:${e.location}`]:[]),
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}Z`,
      'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], {type:'text/calendar;charset=utf-8'});
  dlBlob(blob, 'shukatsu.ics');
  showToast(`✅ ${evs.length}件をエクスポートしました`);
}

function exportCSV() {
  const header = ['企業名','業種','職種','種別','ステータス','優先度','場所','マイページURL','ログインID','志望動機','選考メモ','ESメモ'];
  const rows = companies.map(c => {
    const si = getStatusInfo(c.status); const pi = PRIORITY_INFO[c.priority||2];
    return [c.name, c.industry||'', c.jobType||'', internTypeLabel(c.internType||''),
      si.label, pi.label, c.location||'', c.mypageUrl||'', c.mypageId||'',
      c.motivation||'', c.notes||'', c.esNotes||''].map(v=>`"${String(v).replace(/"/g,'""')}"`);
  });
  dlBlob(new Blob(['﻿'+[header.join(','),...rows.map(r=>r.join(','))].join('\n')],{type:'text/csv;charset=utf-8'}), 'shukatsu.csv');
  showToast('✅ CSVをエクスポートしました');
}

function exportJSON() {
  dlBlob(new Blob([JSON.stringify(companies,null,2)],{type:'application/json'}), 'shukatsu_backup.json');
  showToast('✅ バックアップ完了');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error();
      if (!confirm(`${data.length}社のデータを復元します（現在のデータは上書き）。続けますか？`)) return;
      companies = data; save(); navigate('dashboard');
      showToast(`✅ ${data.length}社を復元しました`);
    } catch { showToast('⚠️ ファイルが正しくありません'); }
  };
  reader.readAsText(file);
}

function dlBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(a.href);
}

// ===== MODAL =====
function openModal(companyId) {
  editingId = companyId || null;
  const c = companyId ? companies.find(x => x.id === companyId) : null;

  // Avatar
  const av = document.getElementById('modal-avatar');
  if (c) {
    const color = getCompanyColor(c);
    av.style.background = `linear-gradient(135deg,${color},${color}cc)`;
    av.textContent = getCompanyInitial(c.name);
    av.classList.remove('new');
  } else {
    av.style.background = ''; av.textContent = '✨'; av.classList.add('new');
  }
  document.getElementById('modal-title').textContent = c ? c.name : '企業を追加';
  document.getElementById('modal-subtitle').textContent = c ? (getStatusInfo(c.status).label) : '';
  document.getElementById('btn-delete-company').style.display = c ? '' : 'none';

  // Populate selects
  const indEl = document.getElementById('f-industry');
  if (indEl.options.length <= 1) INDUSTRIES.forEach(i => { const o=document.createElement('option'); o.value=i; o.textContent=i; indEl.appendChild(o); });
  document.getElementById('f-status').innerHTML = STATUS_OPTIONS.map(s => `<option value="${s.value}">${s.label}</option>`).join('');

  // Fill fields
  document.getElementById('f-name').value = c?.name || '';
  document.getElementById('f-industry').value = c?.industry || '';
  document.getElementById('f-job-type').value = c?.jobType || '';
  document.getElementById('f-intern-type').value = c?.internType || '';
  document.getElementById('f-status').value = c?.status || 'interested';
  document.getElementById('f-location').value = c?.location || '';
  document.getElementById('f-motivation').value = c?.motivation || '';
  document.getElementById('f-notes').value = c?.notes || '';
  document.getElementById('f-es-notes').value = c?.esNotes || '';
  document.getElementById('f-mypage-url').value = c?.mypageUrl || '';
  document.getElementById('f-mypage-id').value = c?.mypageId || '';
  document.getElementById('f-mypage-pass').value = c?.mypagePass || '';
  document.getElementById('f-portal-id').value = c?.portalId || '';

  // Ensure password is hidden on open
  document.getElementById('f-mypage-pass').type = 'password';
  document.getElementById('pass-toggle').textContent = '👁';

  // Priority
  editPriority = c?.priority || 2;
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.v) === editPriority));

  // Events
  modalEvents = JSON.parse(JSON.stringify(c?.events || []));
  renderModalEvents();

  // Reset tabs
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  document.querySelector('.tab-btn[data-tab="basic"]').classList.add('active');
  document.getElementById('tab-basic').classList.add('active');

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.classList.remove('modal-open');
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
    motivation: document.getElementById('f-motivation').value.trim(),
    notes: document.getElementById('f-notes').value.trim(),
    esNotes: document.getElementById('f-es-notes').value.trim(),
    mypageUrl: document.getElementById('f-mypage-url').value.trim(),
    mypageId: document.getElementById('f-mypage-id').value.trim(),
    mypagePass: document.getElementById('f-mypage-pass').value,
    portalId: document.getElementById('f-portal-id').value.trim(),
    events: modalEvents,
  };
  if (editingId) {
    const idx = companies.findIndex(c=>c.id===editingId);
    if (idx !== -1) companies[idx] = { ...companies[idx], ...data };
    showToast('✅ 更新しました');
  } else {
    companies.push({ id: uuid(), createdAt: Date.now(), ...data });
    showToast('✅ 追加しました！');
  }
  save(); closeModal();
  if (currentPage === 'dashboard') renderDashboard();
  else if (currentPage === 'companies') renderCompanies();
  else if (currentPage === 'calendar') renderCalendar();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社';
}

function deleteCompany() {
  if (!editingId) return;
  const c = companies.find(x=>x.id===editingId);
  if (!confirm(`「${c?.name}」を削除しますか？`)) return;
  companies = companies.filter(x=>x.id!==editingId);
  save(); closeModal();
  if (currentPage==='dashboard') renderDashboard(); else renderCompanies();
  document.getElementById('sidebar-count').textContent = companies.length + ' 社';
  showToast('🗑️ 削除しました');
}

// ===== MODAL EVENTS =====
function renderModalEvents() {
  const el = document.getElementById('events-container');
  if (!modalEvents.length) {
    el.innerHTML = '<div class="empty-msg" style="padding:20px 0">「＋ 予定を追加」で選考日程を登録できます</div>';
    return;
  }
  el.innerHTML = modalEvents.map((e,i) => `
    <div class="event-row">
      <button class="remove-ev" onclick="removeEvent(${i})">✕</button>
      <div class="event-row-top">
        <div class="form-group">
          <label>種別</label>
          <select class="form-control" onchange="updateEvent(${i},'type',this.value)">
            ${EVENT_TYPES.map(t=>`<option value="${t.value}"${e.type===t.value?' selected':''}>${t.icon} ${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>日付</label>
          <input type="date" class="form-control" value="${e.date||''}" onchange="updateEvent(${i},'date',this.value)">
        </div>
      </div>
      <div class="event-row-bottom">
        <div class="form-group">
          <label>開始</label>
          <input type="time" class="form-control" value="${e.startTime||''}" onchange="updateEvent(${i},'startTime',this.value)">
        </div>
        <div class="form-group">
          <label>終了</label>
          <input type="time" class="form-control" value="${e.endTime||''}" onchange="updateEvent(${i},'endTime',this.value)">
        </div>
        <div class="form-group flex-2">
          <label>場所</label>
          <input type="text" class="form-control" value="${esc(e.location||'')}" placeholder="オンライン / 東京本社" oninput="updateEvent(${i},'location',this.value)">
        </div>
      </div>
      <div class="form-group" style="margin-top:8px">
        <label>メモ</label>
        <input type="text" class="form-control" value="${esc(e.notes||'')}" placeholder="持ち物、注意事項など" oninput="updateEvent(${i},'notes',this.value)">
      </div>
    </div>`).join('');
}

function addEvent() {
  modalEvents.push({ id: uuid(), type: 'other', date:'', startTime:'', endTime:'', location:'', notes:'' });
  renderModalEvents();
}
function removeEvent(i) { modalEvents.splice(i,1); renderModalEvents(); }
function updateEvent(i,key,val) { if (modalEvents[i]) modalEvents[i][key]=val; }

function togglePass() {
  const inp = document.getElementById('f-mypage-pass');
  const btn = document.getElementById('pass-toggle');
  if (inp.type === 'password') { inp.type='text'; btn.textContent='🙈'; }
  else { inp.type='password'; btn.textContent='👁'; }
}

// ===== INIT =====
function initListeners() {
  document.querySelectorAll('.nav-item,.bn-item').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });
  document.getElementById('btn-add-company').addEventListener('click', () => openModal(null));
  document.getElementById('bn-add-company').addEventListener('click', () => openModal(null));
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', saveModal);
  document.getElementById('btn-delete-company').addEventListener('click', deleteCompany);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
    });
  });
  document.querySelectorAll('.pri-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editPriority = parseInt(btn.dataset.v);
      document.querySelectorAll('.pri-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.getElementById('btn-add-event').addEventListener('click', addEvent);
  document.getElementById('pass-toggle').addEventListener('click', togglePass);
  document.getElementById('search-input').addEventListener('input', e => { searchQuery=e.target.value; renderCompanies(); });
  document.getElementById('filter-status').addEventListener('change', e => { filterStatus=e.target.value; renderCompanies(); });
  document.getElementById('filter-industry').addEventListener('change', e => { filterIndustry=e.target.value; renderCompanies(); });
  document.getElementById('sort-select').addEventListener('change', e => { sortBy=e.target.value; renderCompanies(); });
  document.getElementById('view-card').addEventListener('click', () => {
    viewMode='card';
    document.getElementById('view-card').classList.add('active');
    document.getElementById('view-list').classList.remove('active');
    renderCompanies();
  });
  document.getElementById('view-list').addEventListener('click', () => {
    viewMode='list';
    document.getElementById('view-list').classList.add('active');
    document.getElementById('view-card').classList.remove('active');
    renderCompanies();
  });
  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--; if(calMonth<0){calMonth=11;calYear--;}
    buildCalendar(); document.getElementById('cal-event-detail').classList.add('hidden');
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calMonth++; if(calMonth>11){calMonth=0;calYear++;}
    buildCalendar(); document.getElementById('cal-event-detail').classList.add('hidden');
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    const n=new Date(); calYear=n.getFullYear(); calMonth=n.getMonth();
    buildCalendar(); document.getElementById('cal-event-detail').classList.add('hidden');
  });
  document.getElementById('btn-export-ics').addEventListener('click', exportICS);
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('import-json').addEventListener('change', e => { if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value=''; });
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    if (!confirm('全データを削除します。元に戻せません。')) return;
    companies=[]; save(); navigate('dashboard'); showToast('🗑️ 全データを削除しました');
  });
  document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });
  // Menu toggle (mobile): hamburger not shown on mobile but just in case
  const mt = document.getElementById('menu-toggle');
  if (mt) mt.addEventListener('click', () => navigate(currentPage));
}

// No sample data — start clean for new users

function init() {
  load();
  initListeners();
  navigate('dashboard');
}

init();
