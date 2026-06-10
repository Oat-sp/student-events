// ใส่ URL ของ Google Apps Script Web App ที่ลงท้ายด้วย ?action=events
const DATA_URL = 'https://script.google.com/macros/s/AKfycbwUt_kyuMqXbPnEWx2CLNDGl2RHaCt-jXVeLkVeps-q6-2OXbNa2M0Npxz4yykn8Q6o/exec?action=events';

const TYPES = ['การแข่งขัน', 'จิตอาสา', 'งานแนะแนว', 'ค่าย/อบรม', 'ทุนการศึกษา', 'กิจกรรมอื่น ๆ'];
const CATEGORIES = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'เทคโนโลยี', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'ศิลปะ', 'กีฬา', 'สิ่งแวดล้อม', 'แนะแนวการศึกษา', 'จิตอาสา', 'ทั่วไป'];
const INTEREST_TAGS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'เทคโนโลยี', 'Coding', 'AI / Robot', 'โครงงาน', 'ทดลอง', 'นวัตกรรม', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'ศิลปะ', 'กีฬา', 'สิ่งแวดล้อม', 'การนำเสนอ', 'เขียนเรียงความ', 'ทำงานเป็นทีม', 'การตอบปัญหา', 'การสอบ'];
const FEATURE_TAGS = ['ฟรี', 'ออนไลน์', 'มีเกียรติบัตร', 'เหมาะสำหรับมือใหม่', 'แข่งขันเดี่ยว', 'แข่งขันทีม', 'มีค่าสมัคร', 'ต้องส่งผลงาน', 'มีรอบคัดเลือก', 'จำกัดจำนวนผู้สมัคร', 'ต้องเดินทาง'];
const PORTFOLIO_TAGS = ['วิชาการ', 'วิทยาศาสตร์', 'วิศวกรรม', 'แพทย์ / สุขภาพ', 'คอมพิวเตอร์ / AI', 'คณิตศาสตร์', 'ภาษา', 'สังคมศาสตร์', 'รัฐศาสตร์ / กฎหมาย', 'ศิลปกรรม', 'นิเทศ / สื่อสาร', 'ธุรกิจ / บริหาร', 'สิ่งแวดล้อม', 'จิตอาสา', 'ภาวะผู้นำ', 'นวัตกรรม', 'ทักษะการนำเสนอ'];
const LEVEL_KEYS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const LEVEL_LABELS = {
  m1: 'ม.1',
  m2: 'ม.2',
  m3: 'ม.3',
  m4: 'ม.4',
  m5: 'ม.5',
  m6: 'ม.6'
};
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const state = {
  events: [],
  activeTab: 'all',
  summaryMode: 'week',
  filters: {
    query: '',
    type: '',
    category: '',
    level: '',
    interest: '',
    feature: '',
    portfolio: '',
    sort: 'registerOpenDate'
  }
};

const elements = {};

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheElements();
  populateFilters();
  bindEvents();
  loadEvents();
}

function cacheElements() {
  elements.totalCount = document.querySelector('#totalCount');
  elements.resultNote = document.querySelector('#resultNote');
  elements.loadingPanel = document.querySelector('#loadingPanel');
  elements.errorPanel = document.querySelector('#errorPanel');
  elements.errorMessage = document.querySelector('#errorMessage');
  elements.allView = document.querySelector('#allView');
  elements.deadlineView = document.querySelector('#deadlineView');
  elements.calendarView = document.querySelector('#calendarView');
  elements.summaryView = document.querySelector('#summaryView');
  elements.summaryContent = document.querySelector('#summaryContent');
  elements.copySummaryButton = document.querySelector('#copySummaryButton');
  elements.toast = document.querySelector('#toast');
  elements.searchInput = document.querySelector('#searchInput');
  elements.typeFilter = document.querySelector('#typeFilter');
  elements.categoryFilter = document.querySelector('#categoryFilter');
  elements.levelFilter = document.querySelector('#levelFilter');
  elements.interestFilter = document.querySelector('#interestFilter');
  elements.featureFilter = document.querySelector('#featureFilter');
  elements.portfolioFilter = document.querySelector('#portfolioFilter');
  elements.sortSelect = document.querySelector('#sortSelect');
}

function populateFilters() {
  fillSelect(elements.typeFilter, TYPES, 'ทุกประเภท');
  fillSelect(elements.categoryFilter, CATEGORIES, 'ทุกหมวดหมู่');
  fillSelect(elements.levelFilter, [
    { value: 'm1', label: 'ม.1' },
    { value: 'm2', label: 'ม.2' },
    { value: 'm3', label: 'ม.3' },
    { value: 'm4', label: 'ม.4' },
    { value: 'm5', label: 'ม.5' },
    { value: 'm6', label: 'ม.6' },
    { value: 'lower', label: 'ม.ต้น' },
    { value: 'upper', label: 'ม.ปลาย' },
    { value: 'all', label: 'ทุกระดับ' }
  ], 'ทุกระดับชั้น');
  fillSelect(elements.interestFilter, INTEREST_TAGS, 'ทุกแท็กความสนใจ');
  fillSelect(elements.featureFilter, FEATURE_TAGS, 'ทุกแท็กคุณสมบัติ');
  fillSelect(elements.portfolioFilter, PORTFOLIO_TAGS, 'ทุกแท็ก Portfolio');
}

function fillSelect(select, options, firstLabel) {
  const normalized = options.map(option => {
    if (typeof option === 'string') return { value: option, label: option };
    return option;
  });

  select.innerHTML = [
    `<option value="">${escapeHTML(firstLabel)}</option>`,
    ...normalized.map(option => `<option value="${escapeAttr(option.value)}">${escapeHTML(option.label)}</option>`)
  ].join('');
}

function bindEvents() {
  elements.searchInput.addEventListener('input', event => {
    state.filters.query = event.target.value.trim().toLowerCase();
    render();
  });

  [
    ['typeFilter', 'type'],
    ['categoryFilter', 'category'],
    ['levelFilter', 'level'],
    ['interestFilter', 'interest'],
    ['featureFilter', 'feature'],
    ['portfolioFilter', 'portfolio'],
    ['sortSelect', 'sort']
  ].forEach(([elementKey, filterKey]) => {
    elements[elementKey].addEventListener('change', event => {
      state.filters[filterKey] = event.target.value;
      render();
    });
  });

  document.querySelector('#resetFiltersButton').addEventListener('click', resetFilters);

  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      state.activeTab = button.dataset.tab;
      document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('is-active', tab === button));
      render();
    });
  });

  document.querySelectorAll('[data-summary-mode]').forEach(button => {
    button.addEventListener('click', () => {
      state.summaryMode = button.dataset.summaryMode;
      document.querySelectorAll('[data-summary-mode]').forEach(item => item.classList.toggle('is-active', item === button));
      renderSummaryView(getFilteredEvents());
    });
  });

  elements.copySummaryButton.addEventListener('click', () => {
    copyText(buildSummaryText(getSummaryEvents(getFilteredEvents())));
  });

  document.body.addEventListener('click', event => {
    const button = event.target.closest('[data-copy-event]');
    if (!button) return;
    const item = state.events.find(eventItem => eventItem.id === button.dataset.copyEvent);
    if (item) copyText(buildEventPromotionText(item));
  });
}

async function loadEvents() {
  setLoading(true);
  hideError();

  if (DATA_URL.startsWith('PUT_YOUR_')) {
    setLoading(false);
    showError('ยังไม่ได้ตั้งค่า DATA_URL ในไฟล์ docs/script.js ให้เป็น URL ของ Apps Script Web App');
    render();
    return;
  }

  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const rows = Array.isArray(data) ? data : data.events || [];
    state.events = rows.map(normalizeEvent);
    setLoading(false);
    render();
  } catch (error) {
    setLoading(false);
    showError('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ URL, สิทธิ์ Web App และการ Deploy ล่าสุด');
    render();
  }
}

function normalizeEvent(rawEvent) {
  const eventStartDate = stringValue(rawEvent.eventStartDate) || stringValue(rawEvent.eventDate);

  const event = {
    id: createEventId(rawEvent),
    timestamp: stringValue(rawEvent.timestamp),
    title: stringValue(rawEvent.title),
    posterImage: safeUrl(rawEvent.posterImage),
    type: stringValue(rawEvent.type),
    category: stringValue(rawEvent.category),
    organizer: stringValue(rawEvent.organizer),
    m1: toBoolean(rawEvent.m1),
    m2: toBoolean(rawEvent.m2),
    m3: toBoolean(rawEvent.m3),
    m4: toBoolean(rawEvent.m4),
    m5: toBoolean(rawEvent.m5),
    m6: toBoolean(rawEvent.m6),
    interestTags: toArray(rawEvent.interestTags),
    featureTags: toArray(rawEvent.featureTags),
    portfolioTags: toArray(rawEvent.portfolioTags),
    registerOpenDate: stringValue(rawEvent.registerOpenDate),
    registerOpenTime: stringValue(rawEvent.registerOpenTime),
    registerCloseDate: stringValue(rawEvent.registerCloseDate),
    registerCloseTime: stringValue(rawEvent.registerCloseTime),
    submissionDate: stringValue(rawEvent.submissionDate),
    eventStartDate,
    eventEndDate: stringValue(rawEvent.eventEndDate),
    eventDate: eventStartDate,
    location: stringValue(rawEvent.location),
    teamMemberCount: stringValue(rawEvent.teamMemberCount),
    summary: stringValue(rawEvent.summary),
    sourceLink: safeUrl(rawEvent.sourceLink),
    documentLinks: stringValue(rawEvent.documentLinks),
    contactTeacher: stringValue(rawEvent.contactTeacher),
    isPublished: toBoolean(rawEvent.isPublished)
  };

  event.levels = LEVEL_KEYS.filter(key => event[key]);
  event.autoLevelTags = getAutoLevelTags(event);
  event.status = getStatus(event);

  return event;
}

function createEventId(event) {
  return [
    stringValue(event.timestamp),
    stringValue(event.title),
    stringValue(event.registerCloseDate),
    stringValue(event.eventStartDate || event.eventDate),
    stringValue(event.eventEndDate)
  ].join('|');
}

function render() {
  const filteredEvents = getFilteredEvents();
  const activeEvents = getEventsForActiveTab(filteredEvents);

  elements.totalCount.textContent = state.events.length;
  elements.resultNote.textContent = `พบ ${activeEvents.length} รายการ`;

  elements.allView.hidden = state.activeTab !== 'all';
  elements.deadlineView.hidden = state.activeTab !== 'deadline';
  elements.calendarView.hidden = state.activeTab !== 'calendar';
  elements.summaryView.hidden = state.activeTab !== 'summary';

  if (state.activeTab === 'all') {
    elements.allView.innerHTML = renderCardGrid(activeEvents, 'ยังไม่มีกิจกรรมที่ตรงกับเงื่อนไข');
  }

  if (state.activeTab === 'deadline') {
    elements.deadlineView.innerHTML = renderCardGrid(activeEvents, 'ยังไม่มีกิจกรรมที่ใกล้หมดเขตในช่วงนี้');
  }

  if (state.activeTab === 'calendar') {
    renderCalendarView(filteredEvents);
  }

  if (state.activeTab === 'summary') {
    renderSummaryView(filteredEvents);
  }
}

function getFilteredEvents() {
  const query = state.filters.query;

  // ใช้ filter ทั้งหมดร่วมกัน และ sort ให้รายการที่ไม่มีวันที่ไปท้ายสุด
  return state.events
    .filter(event => {
      const searchable = [event.title, event.organizer, event.summary].join(' ').toLowerCase();

      return (!query || searchable.includes(query)) &&
        (!state.filters.type || event.type === state.filters.type) &&
        (!state.filters.category || event.category === state.filters.category) &&
        matchesLevel(event, state.filters.level) &&
        (!state.filters.interest || event.interestTags.includes(state.filters.interest)) &&
        (!state.filters.feature || event.featureTags.includes(state.filters.feature)) &&
        (!state.filters.portfolio || event.portfolioTags.includes(state.filters.portfolio));
    })
    .sort((a, b) => compareByDate(a, b, state.filters.sort));
}

function getEventsForActiveTab(events) {
  if (state.activeTab === 'deadline') {
    return events.filter(event => event.status.code === 'closing');
  }

  return events;
}

function matchesLevel(event, level) {
  if (!level) return true;
  if (LEVEL_KEYS.includes(level)) return event[level] === true;
  if (level === 'lower') return event.m1 || event.m2 || event.m3;
  if (level === 'upper') return event.m4 || event.m5 || event.m6;
  if (level === 'all') return LEVEL_KEYS.every(key => event[key]);
  return true;
}

function compareByDate(a, b, field) {
  const dateA = parseLocalDate(a[field]);
  const dateB = parseLocalDate(b[field]);

  if (!dateA && !dateB) return a.title.localeCompare(b.title, 'th');
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateA.getTime() - dateB.getTime();
}

function renderCardGrid(events, emptyText) {
  if (!events.length) {
    return `<div class="empty-state"><p>${escapeHTML(emptyText)}</p></div>`;
  }

  return `<div class="card-grid">${events.map(renderEventCard).join('')}</div>`;
}

function renderEventCard(event) {
  const documentButtons = parseDocumentLinks(event.documentLinks)
    .map(link => `<a class="link-button" href="${escapeAttr(link.url)}" target="_blank" rel="noopener">เอกสาร: ${escapeHTML(link.label)}</a>`)
    .join('');
  const sourceButton = event.sourceLink
    ? `<a class="link-button" href="${escapeAttr(event.sourceLink)}" target="_blank" rel="noopener">ประกาศต้นทาง</a>`
    : '';

  return `
    <article class="event-card">
      <div class="poster-frame">
        ${event.posterImage
          ? `<img src="${escapeAttr(event.posterImage)}" alt="โปสเตอร์ ${escapeAttr(event.title)}" loading="lazy" onerror="this.remove(); this.parentElement.innerHTML='<div class=&quot;poster-placeholder&quot;>ไม่มีรูปประชาสัมพันธ์</div>';">`
          : '<div class="poster-placeholder">ไม่มีรูปประชาสัมพันธ์</div>'}
      </div>
      <div class="card-body">
        <div class="card-topline">
          <span class="pill">${escapeHTML(event.type || 'ไม่ระบุประเภท')}</span>
          <span class="status-pill ${event.status.className}">${escapeHTML(event.status.label)}</span>
        </div>
        <div class="chip-row">
          <span class="pill category">${escapeHTML(event.category || 'ไม่ระบุหมวดหมู่')}</span>
          ${event.autoLevelTags.map(tag => `<span class="chip">${escapeHTML(tag)}</span>`).join('')}
        </div>
        <h2 class="event-title">${escapeHTML(event.title || 'ไม่ระบุชื่อกิจกรรม')}</h2>
        ${event.summary ? `<p class="summary">${escapeHTML(event.summary)}</p>` : ''}
        <div class="meta-list">
          ${event.organizer ? `<div><strong>ผู้จัด:</strong> ${escapeHTML(event.organizer)}</div>` : ''}
          ${event.registerOpenDate || event.registerCloseDate ? `<div><strong>รับสมัคร:</strong> ${formatRegistrationRange(event)}</div>` : ''}
          ${event.submissionDate ? `<div><strong>ส่งผลงาน:</strong> ${formatThaiDate(event.submissionDate)}</div>` : ''}
          ${event.eventStartDate || event.eventEndDate ? `<div><strong>วันกิจกรรม:</strong> ${formatEventDateRange(event)}</div>` : ''}
          ${event.location ? `<div><strong>สถานที่:</strong> ${escapeHTML(event.location)}</div>` : ''}
          ${event.teamMemberCount ? `<div><strong>จำนวนสมาชิกทีม:</strong> ${escapeHTML(event.teamMemberCount)}</div>` : ''}
          ${event.contactTeacher ? `<div><strong>ติดต่อ:</strong> ${escapeHTML(event.contactTeacher)}</div>` : ''}
        </div>
        ${renderTags(event)}
        <div class="card-actions">
          ${sourceButton}
          ${documentButtons}
          <button class="copy-button" type="button" data-copy-event="${escapeAttr(event.id)}">คัดลอกข้อความ</button>
        </div>
      </div>
    </article>
  `;
}

function renderTags(event) {
  const tags = [
    ...event.interestTags.slice(0, 5),
    ...event.featureTags.slice(0, 4),
    ...event.portfolioTags.slice(0, 4)
  ];

  if (!tags.length) return '';

  return `<div class="chip-row">${tags.map(tag => `<span class="chip">${escapeHTML(tag)}</span>`).join('')}</div>`;
}

function renderCalendarView(events) {
  const entries = [];

  events.forEach(event => {
    const startDate = parseLocalDate(event.eventStartDate);
    const endDate = parseLocalDate(event.eventEndDate);

    [
      ['registerOpenDate', event.registerOpenTime ? `เปิดรับสมัคร ${formatTime(event.registerOpenTime)}` : 'เปิดรับสมัคร'],
      ['registerCloseDate', event.registerCloseTime ? `ปิดรับสมัคร ${formatTime(event.registerCloseTime)}` : 'ปิดรับสมัคร'],
      ['submissionDate', 'ส่งผลงาน'],
      ['eventStartDate', 'เริ่มกิจกรรม']
    ].forEach(([field, label]) => {
      const date = parseLocalDate(event[field]);
      if (date) entries.push({ date, label, event });
    });

    if (endDate && (!startDate || toDateKey(endDate) !== toDateKey(startDate))) {
      entries.push({ date: endDate, label: 'จบกิจกรรม', event });
    }
  });

  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (!entries.length) {
    elements.calendarView.innerHTML = '<div class="empty-state"><p>ยังไม่มีวันที่สำคัญให้แสดงในปฏิทิน</p></div>';
    return;
  }

  const groups = new Map();
  entries.forEach(entry => {
    const key = toDateKey(entry.date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });

  elements.calendarView.innerHTML = `
    <div class="calendar-list">
      ${Array.from(groups.entries()).map(([dateKey, dayEntries]) => `
        <section class="calendar-day">
          <h3>${formatThaiDate(dateKey)}</h3>
          ${dayEntries.map(entry => `
            <div class="calendar-item">
              <span class="calendar-label">${escapeHTML(entry.label)}</span>
              <strong>${escapeHTML(entry.event.title || 'ไม่ระบุชื่อกิจกรรม')}</strong>
              <span>${escapeHTML(entry.event.type || 'กิจกรรม')} · ${escapeHTML(entry.event.autoLevelTags.join(', '))}</span>
            </div>
          `).join('')}
        </section>
      `).join('')}
    </div>
  `;
}

function renderSummaryView(events) {
  const summaryEvents = getSummaryEvents(events);
  const heading = state.summaryMode === 'week' ? 'สรุปรายสัปดาห์' : 'สรุปรายเดือน';

  elements.summaryContent.innerHTML = `
    <div class="summary-box">
      <h2>${heading}</h2>
      <p class="summary-text">${escapeHTML(buildSummaryText(summaryEvents))}</p>
    </div>
  `;
}

function getSummaryEvents(events) {
  const today = getTodayLocal();
  const endDate = state.summaryMode === 'week'
    ? addDays(today, 6)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return events.filter(event => {
    const startDate = parseLocalDate(event.eventStartDate) || parseLocalDate(event.registerCloseDate);
    const endDateForEvent = parseLocalDate(event.eventEndDate) || startDate;
    if (!startDate || !endDateForEvent) return false;
    return startDate <= endDate && endDateForEvent >= today;
  });
}

function buildSummaryText(events) {
  const today = getTodayLocal();
  const endDate = state.summaryMode === 'week'
    ? addDays(today, 6)
    : new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const period = `${formatThaiDate(toDateKey(today))} - ${formatThaiDate(toDateKey(endDate))}`;
  const title = state.summaryMode === 'week'
    ? `ประชาสัมพันธ์กิจกรรมนักเรียน รายสัปดาห์ (${period})`
    : `ประชาสัมพันธ์กิจกรรมนักเรียน รายเดือน (${period})`;

  if (!events.length) {
    return `${title}\n\nยังไม่มีกิจกรรมในช่วงเวลานี้`;
  }

  return [
    title,
    '',
    ...events.map((event, index) => [
      `${index + 1}. ${event.title || 'ไม่ระบุชื่อกิจกรรม'}`,
      `ประเภท: ${event.type || '-'} | หมวดหมู่: ${event.category || '-'}`,
      `ระดับชั้น: ${event.autoLevelTags.join(', ') || '-'}`,
      `รับสมัคร: ${formatRegistrationRange(event)}`,
      event.submissionDate ? `ส่งผลงาน: ${formatThaiDate(event.submissionDate)}` : '',
      event.eventStartDate || event.eventEndDate ? `วันกิจกรรม: ${formatEventDateRange(event)}` : '',
      event.location ? `สถานที่: ${event.location}` : '',
      event.teamMemberCount ? `จำนวนสมาชิกทีม: ${event.teamMemberCount}` : '',
      event.summary ? `รายละเอียด: ${event.summary}` : '',
      event.sourceLink ? `ประกาศต้นทาง: ${event.sourceLink}` : '',
      event.contactTeacher ? `ติดต่อ: ${event.contactTeacher}` : ''
    ].filter(Boolean).join('\n'))
  ].join('\n\n');
}

function buildEventPromotionText(event) {
  return [
    `ประชาสัมพันธ์กิจกรรมนักเรียน: ${event.title || 'ไม่ระบุชื่อกิจกรรม'}`,
    `ประเภท: ${event.type || '-'} | หมวดหมู่: ${event.category || '-'}`,
    `ระดับชั้น: ${event.autoLevelTags.join(', ') || '-'}`,
    `สถานะ: ${event.status.label}`,
    `รับสมัคร: ${formatRegistrationRange(event)}`,
    event.submissionDate ? `ส่งผลงาน: ${formatThaiDate(event.submissionDate)}` : '',
    event.eventStartDate || event.eventEndDate ? `วันกิจกรรม: ${formatEventDateRange(event)}` : '',
    event.location ? `สถานที่: ${event.location}` : '',
    event.teamMemberCount ? `จำนวนสมาชิกทีม: ${event.teamMemberCount}` : '',
    event.summary ? `รายละเอียด: ${event.summary}` : '',
    event.sourceLink ? `ประกาศต้นทาง: ${event.sourceLink}` : '',
    event.contactTeacher ? `ติดต่อครูผู้ประสานงาน: ${event.contactTeacher}` : ''
  ].filter(Boolean).join('\n');
}

function getAutoLevelTags(event) {
  // ลดระดับชั้นรายชั้นให้เป็นกลุ่มที่นักเรียนอ่านเร็วขึ้นบนการ์ด
  const allLevels = LEVEL_KEYS.every(key => event[key]);
  if (allLevels) return ['ทุกระดับ'];

  const tags = [];
  if (event.m1 || event.m2 || event.m3) tags.push('ม.ต้น');
  if (event.m4 || event.m5 || event.m6) tags.push('ม.ปลาย');

  return tags.length ? tags : ['ไม่ระบุระดับ'];
}

function getStatus(event) {
  // ใช้เวลาเปิด/ปิดเมื่อมีข้อมูล แต่ยังเทียบวันกิจกรรมแบบ date-only เพื่อลดปัญหา timezone
  const now = new Date();
  const today = getTodayLocal();
  const openAt = parseLocalDateTime(event.registerOpenDate, event.registerOpenTime, 'start');
  const closeAt = parseLocalDateTime(event.registerCloseDate, event.registerCloseTime, 'end');
  const eventEndDate = parseLocalDate(event.eventEndDate || event.eventStartDate);

  if (eventEndDate && today > eventEndDate) {
    return { code: 'done', label: 'เสร็จสิ้นแล้ว', className: 'status-done' };
  }

  if (openAt && now < openAt) {
    return { code: 'upcoming', label: 'ยังไม่เปิดรับสมัคร', className: 'status-upcoming' };
  }

  if (closeAt && now > closeAt && (!eventEndDate || today <= eventEndDate)) {
    return { code: 'closed', label: 'ปิดรับสมัครแล้ว / รอกิจกรรม', className: 'status-closed' };
  }

  if (closeAt && (!openAt || now >= openAt) && now <= closeAt) {
    const daysLeft = Math.ceil((closeAt.getTime() - now.getTime()) / MS_PER_DAY);
    if (daysLeft <= 7) {
      return { code: 'closing', label: 'ใกล้ปิดรับสมัคร', className: 'status-closing' };
    }
    return { code: 'open', label: 'เปิดรับสมัคร', className: 'status-open' };
  }

  if (openAt && now >= openAt && !closeAt) {
    return { code: 'open', label: 'เปิดรับสมัคร', className: 'status-open' };
  }

  return { code: 'unknown', label: 'รอข้อมูลกำหนดการ', className: 'status-closed' };
}

function parseDocumentLinks(text) {
  // รองรับรูปแบบ "ชื่อเอกสาร: URL" โดยไม่ตัด https:// ผิดตำแหน่ง
  return stringValue(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const namedMatch = line.match(/^(.+?)\s*:\s*(https?:\/\/.+)$/i);
      if (namedMatch) {
        return {
          label: namedMatch[1].trim(),
          url: safeUrl(namedMatch[2].trim())
        };
      }

      return {
        label: 'เอกสาร',
        url: safeUrl(line)
      };
    })
    .filter(link => link.url);
}

function parseLocalDate(value) {
  const text = stringValue(value);
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseLocalDateTime(dateValue, timeValue, boundary) {
  const date = parseLocalDate(dateValue);
  if (!date) return null;

  const time = stringValue(timeValue);
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return date;
  }

  if (boundary === 'end') {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
}

function getTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatThaiDate(value) {
  const date = parseLocalDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function formatRegistrationRange(event) {
  const startText = formatDateTime(event.registerOpenDate, event.registerOpenTime);
  const endText = formatDateTime(event.registerCloseDate, event.registerCloseTime);

  if (startText && endText) return `${startText} - ${endText}`;
  if (endText) return `ถึง ${endText}`;
  if (startText) return `ตั้งแต่ ${startText}`;
  return '-';
}

function formatEventDateRange(event) {
  const startDate = parseLocalDate(event.eventStartDate);
  const endDate = parseLocalDate(event.eventEndDate);
  const startText = startDate ? formatThaiDate(event.eventStartDate) : '';
  const endText = endDate ? formatThaiDate(event.eventEndDate) : '';

  if (startText && endText && toDateKey(startDate) !== toDateKey(endDate)) return `${startText} - ${endText}`;
  if (startText) return startText;
  if (endText) return endText;
  return '-';
}

function formatDateTime(dateValue, timeValue) {
  const dateText = formatThaiDate(dateValue);
  if (dateText === '-') return '';

  const timeText = formatTime(timeValue);
  return timeText ? `${dateText} ${timeText} น.` : dateText;
}

function formatTime(value) {
  const match = stringValue(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';

  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`;
}

function formatDateRange(start, end) {
  const startText = start ? formatThaiDate(start) : '';
  const endText = end ? formatThaiDate(end) : '';

  if (startText && endText) return `${startText} - ${endText}`;
  if (endText) return `ถึง ${endText}`;
  if (startText) return `ตั้งแต่ ${startText}`;
  return '-';
}

function setLoading(isLoading) {
  elements.loadingPanel.hidden = !isLoading;
}

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorPanel.hidden = false;
}

function hideError() {
  elements.errorPanel.hidden = true;
}

function resetFilters() {
  state.filters = {
    query: '',
    type: '',
    category: '',
    level: '',
    interest: '',
    feature: '',
    portfolio: '',
    sort: 'registerOpenDate'
  };

  elements.searchInput.value = '';
  elements.typeFilter.value = '';
  elements.categoryFilter.value = '';
  elements.levelFilter.value = '';
  elements.interestFilter.value = '';
  elements.featureFilter.value = '';
  elements.portfolioFilter.value = '';
  elements.sortSelect.value = 'registerOpenDate';
  render();
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    showToast('คัดลอกข้อความแล้ว');
  } catch (error) {
    fallbackCopy(text);
    showToast('คัดลอกข้อความแล้ว');
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2400);
}

function stringValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  return stringValue(value).split(',').map(item => item.trim()).filter(Boolean);
}

function toBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;
  return ['true', '1', 'yes', 'y', 'เผยแพร่'].includes(stringValue(value).toLowerCase());
}

function safeUrl(value) {
  const text = stringValue(value);
  if (!text) return '';

  try {
    const url = new URL(text);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch (error) {
    return '';
  }

  return '';
}

function escapeHTML(value) {
  return stringValue(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHTML(value);
}
