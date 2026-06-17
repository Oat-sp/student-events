// ใส่ URL ของ Google Apps Script Web App ที่ลงท้ายด้วย ?action=events
const DATA_URL = 'https://script.google.com/macros/s/AKfycbwUt_kyuMqXbPnEWx2CLNDGl2RHaCt-jXVeLkVeps-q6-2OXbNa2M0Npxz4yykn8Q6o/exec?action=events';
const MORE_EVENTS_URL = 'https://www.camphub.in.th/medical-health/doctor/';

const TYPES = ['การแข่งขัน', 'จิตอาสา', 'งานแนะแนว', 'ค่าย/อบรม', 'ทุนการศึกษา', 'กิจกรรมอื่น ๆ'];
const CATEGORIES = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'เทคโนโลยี', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'ศิลปะ', 'กีฬา', 'สิ่งแวดล้อม', 'แนะแนวการศึกษา', 'จิตอาสา', 'ทั่วไป'];
const INTEREST_TAGS = ['วิทยาศาสตร์', 'คณิตศาสตร์', 'เทคโนโลยี', 'Coding', 'AI / Robot', 'โครงงาน', 'ทดลอง', 'นวัตกรรม', 'ภาษาไทย', 'ภาษาอังกฤษ', 'สังคมศึกษา', 'ศิลปะ', 'กีฬา', 'สิ่งแวดล้อม', 'การนำเสนอ', 'เขียนเรียงความ', 'การตอบปัญหา', 'การสอบ'];
const FEATURE_TAGS = ['ฟรี', 'ออนไลน์', 'มีเกียรติบัตร', 'เหมาะสำหรับมือใหม่', 'แข่งขันเดี่ยว', 'แข่งขันทีม', 'มีค่าสมัคร', 'ต้องส่งผลงาน', 'มีรอบคัดเลือก', 'จำกัดจำนวนผู้สมัคร', 'ต้องเดินทาง'];
const PORTFOLIO_TAGS = ['วิชาการ', 'วิทยาศาสตร์', 'วิศวกรรม', 'แพทย์ / สุขภาพ', 'คอมพิวเตอร์ / AI', 'คณิตศาสตร์', 'ภาษา', 'สังคมศาสตร์', 'รัฐศาสตร์ / กฎหมาย', 'ศิลปกรรม', 'นิเทศ / สื่อสาร', 'ธุรกิจ / บริหาร', 'สิ่งแวดล้อม', 'จิตอาสา', 'ภาวะผู้นำ', 'นวัตกรรม', 'ทักษะการนำเสนอ'];
const AUTO_FEATURE_TAGS = ['แข่งขันเดี่ยว', 'แข่งขันทีม', 'ฟรี', 'มีค่าสมัคร', 'ออนไลน์', 'ต้องเดินทาง'];
const MIXED_ACTIVITY_FORMAT = 'ออนไลน์+ออนไซต์';
const LEGACY_MIXED_ACTIVITY_FORMAT = 'ผสม';
const LEVEL_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const LEVEL_LABELS = {
  p1: 'ป.1',
  p2: 'ป.2',
  p3: 'ป.3',
  p4: 'ป.4',
  p5: 'ป.5',
  p6: 'ป.6',
  m1: 'ม.1',
  m2: 'ม.2',
  m3: 'ม.3',
  m4: 'ม.4',
  m5: 'ม.5',
  m6: 'ม.6'
};
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EVENTS_STORAGE_KEY = 'student_events_data_cache_v6';
const FETCH_TIMEOUT_MS = 8000;
const IMAGE_LOAD_TIMEOUT_MS = 7000;
let isApplyingRoute = false;
let managedImageObserver = null;

const state = {
  events: [],
  activeTab: 'home',
  selectedEventId: '',
  calendarCursor: getTodayLocal(),
  selectedCalendarDate: toDateKey(getTodayLocal()),
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
  applyRouteFromLocation();
  updateHistory({ replace: true });
  loadEvents();
}

function cacheElements() {
  elements.appShell = document.querySelector('#appShell');
  elements.totalCount = document.querySelector('#totalCount');
  elements.resultNote = document.querySelector('#resultNote');
  elements.loadingPanel = document.querySelector('#loadingPanel');
  elements.errorPanel = document.querySelector('#errorPanel');
  elements.errorMessage = document.querySelector('#errorMessage');
  elements.filterPanel = document.querySelector('#filterPanel');
  elements.homeView = document.querySelector('#homeView');
  elements.allView = document.querySelector('#allView');
  elements.deadlineView = document.querySelector('#deadlineView');
  elements.calendarView = document.querySelector('#calendarView');
  elements.detailView = document.querySelector('#detailView');
  elements.summaryView = document.querySelector('#summaryView');
  elements.summaryContent = document.querySelector('#summaryContent');
  elements.copySummaryButton = document.querySelector('#copySummaryButton');
  elements.toast = document.querySelector('#toast');
  elements.sidebarToggle = document.querySelector('#sidebarToggle');
  elements.mobileSidebarToggle = document.querySelector('#mobileSidebarToggle');
  elements.navButtons = Array.from(document.querySelectorAll('[data-tab]'));
  elements.sideFilterButtons = Array.from(document.querySelectorAll('[data-side-filter]'));
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
    { value: 'p1', label: 'ป.1' },
    { value: 'p2', label: 'ป.2' },
    { value: 'p3', label: 'ป.3' },
    { value: 'p4', label: 'ป.4' },
    { value: 'p5', label: 'ป.5' },
    { value: 'p6', label: 'ป.6' },
    { value: 'm1', label: 'ม.1' },
    { value: 'm2', label: 'ม.2' },
    { value: 'm3', label: 'ม.3' },
    { value: 'm4', label: 'ม.4' },
    { value: 'm5', label: 'ม.5' },
    { value: 'm6', label: 'ม.6' },
    { value: 'primary', label: 'ประถม' },
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

  elements.sidebarToggle.addEventListener('click', () => {
    elements.appShell.classList.toggle('is-sidebar-collapsed');
  });

  elements.mobileSidebarToggle.addEventListener('click', () => {
    elements.appShell.classList.toggle('is-sidebar-open');
  });

  elements.navButtons.forEach(button => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tab);
      elements.appShell.classList.remove('is-sidebar-open');
    });
  });

  elements.sideFilterButtons.forEach(button => {
    button.addEventListener('click', () => {
      applyQuickFilter(button.dataset.sideFilter, button.dataset.value);
      elements.appShell.classList.remove('is-sidebar-open');
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

  document.body.addEventListener('load', event => {
    const image = event.target.closest && event.target.closest('[data-managed-image]');
    if (image) markManagedImageLoaded(image);
  }, true);

  document.body.addEventListener('error', event => {
    const image = event.target.closest && event.target.closest('[data-managed-image]');
    if (image) markManagedImageFailed(image);
  }, true);

  window.addEventListener('popstate', () => {
    isApplyingRoute = true;
    applyRouteFromLocation();
    render();
    isApplyingRoute = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.body.addEventListener('click', event => {
    const button = event.target.closest('[data-copy-event]');
    if (button) {
      const item = state.events.find(eventItem => eventItem.id === button.dataset.copyEvent);
      if (item) copyText(buildEventPromotionText(item));
      return;
    }

    const quickButton = event.target.closest('[data-quick-filter]');
    if (quickButton) {
      applyQuickFilter(quickButton.dataset.quickFilter, quickButton.dataset.value || '');
      return;
    }

    const openTarget = event.target.closest('[data-open-event]');
    if (openTarget && !event.target.closest('a, button')) {
      openEventDetail(openTarget.dataset.openEvent);
      return;
    }

    const calendarDay = event.target.closest('[data-calendar-date]');
    if (calendarDay) {
      state.selectedCalendarDate = calendarDay.dataset.calendarDate;
      renderCalendarView(getFilteredEvents());
      return;
    }

    const calendarNav = event.target.closest('[data-calendar-nav]');
    if (calendarNav) {
      moveCalendar(calendarNav.dataset.calendarNav);
      return;
    }
  });

  document.body.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const openTarget = event.target.closest('[data-open-event]');
    if (!openTarget || event.target !== openTarget) return;
    event.preventDefault();
    openEventDetail(openTarget.dataset.openEvent);
  });
}

function applyRouteFromLocation() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const eventId = params.get('event');
  const tab = params.get('tab');

  if (eventId) {
    state.activeTab = 'detail';
    state.selectedEventId = eventId;
    return;
  }

  const validTabs = ['home', 'all', 'deadline', 'calendar', 'summary'];
  state.activeTab = validTabs.includes(tab) ? tab : 'home';
  state.selectedEventId = '';
}

function updateHistory(options = {}) {
  if (isApplyingRoute) return;

  const hash = state.activeTab === 'detail' && state.selectedEventId
    ? `#event=${encodeURIComponent(state.selectedEventId)}`
    : `#tab=${encodeURIComponent(state.activeTab || 'home')}`;
  if (window.location.hash === hash) return;

  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  const historyState = {
    tab: state.activeTab,
    eventId: state.selectedEventId
  };

  if (options.replace) {
    window.history.replaceState(historyState, '', nextUrl);
  } else {
    window.history.pushState(historyState, '', nextUrl);
  }
}

async function loadEvents() {
  hideError();

  if (DATA_URL.startsWith('PUT_YOUR_')) {
    setLoading(false);
    showError('ยังไม่ได้ตั้งค่า DATA_URL ในไฟล์ docs/script.js ให้เป็น URL ของ Apps Script Web App');
    render();
    return;
  }

  const cachedData = readCachedEventsData();
  if (cachedData) {
    applyEventsData(cachedData);
    setLoading(false);
    render();
    refreshEvents({ hasCache: true });
    return;
  }

  setLoading(true);
  await refreshEvents({ hasCache: false });
}

async function refreshEvents(options) {
  const hasCache = options && options.hasCache;

  try {
    const data = await fetchEventsData();
    writeCachedEventsData(data);
    applyEventsData(data);
    hideError();
    render();
  } catch (error) {
    if (hasCache) {
      hideError();
      showToast('แสดงข้อมูลเดิมที่บันทึกไว้ อัปเดตข้อมูลใหม่ไม่ได้ชั่วคราว');
    } else {
      showError('โหลดข้อมูลไม่สำเร็จ กรุณาตรวจสอบ URL, สิทธิ์ Web App และการ Deploy ล่าสุด');
      render();
    }
  } finally {
    setLoading(false);
  }
}

async function fetchEventsData() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(DATA_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function applyEventsData(data) {
  const rows = Array.isArray(data) ? data : data.events || [];
  state.events = rows
    .map(normalizeEvent)
    .filter(event => !isPastEvent(event));
}

function readCachedEventsData() {
  try {
    const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!raw) return null;

    const cache = JSON.parse(raw);
    if (!cache || !cache.data) return null;

    const rows = Array.isArray(cache.data) ? cache.data : cache.data.events;
    if (!Array.isArray(rows)) return null;

    return cache.data;
  } catch (error) {
    return null;
  }
}

function writeCachedEventsData(data) {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      data
    }));
  } catch (error) {
    // localStorage อาจเต็มหรือถูกปิดไว้ หน้าเว็บยังใช้ข้อมูลสดได้ตามปกติ
  }
}

function normalizeEvent(rawEvent) {
  const eventStartDate = stringValue(rawEvent.eventStartDate) || stringValue(rawEvent.eventDate);
  const teamMemberCount = normalizeTeamMemberCount(rawEvent.teamMemberCount);
  const rawRegistrationFee = stringValue(rawEvent.registrationFee);
  const registrationFee = normalizeRegistrationFee(rawEvent.registrationFee);
  const rawActivityFormat = stringValue(rawEvent.activityFormat);
  const activityFormat = normalizeActivityFormat(rawActivityFormat);
  const rawFeatureTags = toArray(rawEvent.featureTags);

  const event = {
    id: createEventId(rawEvent),
    timestamp: stringValue(rawEvent.timestamp),
    title: stringValue(rawEvent.title),
    posterImage: safeImageUrl(rawEvent.posterImage),
    type: stringValue(rawEvent.type),
    category: stringValue(rawEvent.category),
    organizer: stringValue(rawEvent.organizer),
    p1: toBoolean(rawEvent.p1),
    p2: toBoolean(rawEvent.p2),
    p3: toBoolean(rawEvent.p3),
    p4: toBoolean(rawEvent.p4),
    p5: toBoolean(rawEvent.p5),
    p6: toBoolean(rawEvent.p6),
    m1: toBoolean(rawEvent.m1),
    m2: toBoolean(rawEvent.m2),
    m3: toBoolean(rawEvent.m3),
    m4: toBoolean(rawEvent.m4),
    m5: toBoolean(rawEvent.m5),
    m6: toBoolean(rawEvent.m6),
    teamMemberCount,
    registrationFee,
    activityFormat,
    interestTags: toArray(rawEvent.interestTags).filter(tag => tag !== 'ทำงานเป็นทีม'),
    featureTags: buildFeatureTags(rawFeatureTags, teamMemberCount, registrationFee, activityFormat, {
      hasRegistrationFee: rawRegistrationFee !== '',
      hasActivityFormat: rawActivityFormat !== ''
    }),
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
    summary: stringValue(rawEvent.summary),
    sourceLink: safeUrl(rawEvent.sourceLink),
    documentLinks: stringValue(rawEvent.documentLinks),
    contactTeacher: stringValue(rawEvent.contactTeacher),
    isClosed: toBoolean(rawEvent.isClosed),
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

  if (elements.totalCount) elements.totalCount.textContent = state.events.length;
  elements.resultNote.textContent = `พบ ${activeEvents.length} รายการ`;

  elements.filterPanel.hidden = state.activeTab !== 'all' && state.activeTab !== 'deadline';
  elements.homeView.hidden = state.activeTab !== 'home';
  elements.allView.hidden = state.activeTab !== 'all';
  elements.deadlineView.hidden = state.activeTab !== 'deadline';
  elements.calendarView.hidden = state.activeTab !== 'calendar';
  elements.detailView.hidden = state.activeTab !== 'detail';
  elements.summaryView.hidden = state.activeTab !== 'summary';

  updateNavigationState();

  if (state.activeTab === 'home') {
    renderHomeView(filteredEvents);
  }

  if (state.activeTab === 'all') {
    elements.allView.innerHTML = renderListView('กิจกรรมทั้งหมด', activeEvents, 'ยังไม่มีกิจกรรมที่ตรงกับเงื่อนไข');
  }

  if (state.activeTab === 'deadline') {
    elements.deadlineView.innerHTML = renderListView('ใกล้หมดเขตรับสมัคร', activeEvents, 'ยังไม่มีกิจกรรมที่ใกล้หมดเขตในช่วงนี้');
  }

  if (state.activeTab === 'calendar') {
    renderCalendarView(filteredEvents);
  }

  if (state.activeTab === 'detail') {
    renderDetailView();
  }

  if (state.activeTab === 'summary') {
    renderSummaryView(filteredEvents);
  }

  hydrateManagedImages();
}

function renderHomeView(events) {
  const featuredEvents = sortByDeadlineProximity(events
    .filter(event => event.status.code === 'closing' || event.status.code === 'open')
  ).slice(0, 4);
  const fallbackEvents = featuredEvents.length ? featuredEvents : sortByDeadlineProximity(events).slice(0, 4);

  elements.homeView.innerHTML = `
    <section class="hero-panel">
      <picture>
        <source srcset="assets/home-banner.webp" type="image/webp">
        <img class="hero-banner-image" src="assets/home-banner.png" width="1916" height="821" alt="ค้นหาโอกาส พัฒนาตัวเอง กับการแข่งขันและกิจกรรมดี ๆ สำหรับนักเรียนมัธยมศึกษา" loading="eager" decoding="async" fetchpriority="high">
      </picture>
    </section>

    <section class="quick-grid" aria-label="ทางลัดประเภทกิจกรรม">
      ${renderQuickCard('ทั้งหมด', 'grid-fill', 'all', '')}
      ${renderQuickCard('การแข่งขัน', 'trophy-fill', 'type', 'การแข่งขัน')}
      ${renderQuickCard('จิตอาสา', 'heart-fill', 'type', 'จิตอาสา')}
      ${renderQuickCard('งานแนะแนว', 'mortarboard-fill', 'type', 'งานแนะแนว')}
      ${renderQuickCard('กิจกรรมอื่น ๆ', 'flag-fill', 'type', 'กิจกรรมอื่น ๆ')}
      ${renderExternalQuickCard('ค้นหากิจกรรมเพิ่มเติม', 'search', MORE_EVENTS_URL)}
    </section>

    <section>
      <div class="section-heading">
        <h2>ใกล้หมดเขตสมัคร</h2>
        <button class="section-link" type="button" data-quick-filter="deadline">ดูทั้งหมด ${renderIcon('arrow-right-short')}</button>
      </div>
      ${renderCardGrid(fallbackEvents, 'ยังไม่มีกิจกรรมที่ตรงกับเงื่อนไข', { variant: 'home' })}
    </section>
  `;
}

function renderQuickCard(label, iconName, filter, value) {
  return `
    <button class="quick-card" type="button" data-quick-filter="${escapeAttr(filter)}" data-value="${escapeAttr(value)}">
      <span class="quick-icon">${renderIcon(iconName)}</span>
      <span>${escapeHTML(label)}</span>
    </button>
  `;
}

function renderExternalQuickCard(label, iconName, url) {
  return `
    <a class="quick-card quick-card-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">
      <span class="quick-icon">${renderIcon(iconName)}</span>
      <span>${escapeHTML(label)}</span>
    </a>
  `;
}

function renderIcon(iconName) {
  return `<i class="bi bi-${escapeAttr(iconName)}" aria-hidden="true"></i>`;
}

function renderListView(title, events, emptyText) {
  return `
    <div class="section-heading">
      <h2>${escapeHTML(title)}</h2>
    </div>
    ${renderCardGrid(events, emptyText)}
  `;
}

function updateNavigationState() {
  elements.navButtons.forEach(button => {
    button.classList.toggle('is-active', button.dataset.tab === state.activeTab);
  });
}

function setActiveTab(tab) {
  state.activeTab = tab;
  if (tab !== 'detail') state.selectedEventId = '';
  render();
  updateHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyQuickFilter(filterKey, value) {
  resetFilters({ renderAfterReset: false });
  state.selectedEventId = '';

  if (filterKey === 'all') {
    state.activeTab = 'all';
  } else if (filterKey === 'home') {
    state.activeTab = 'home';
  } else if (filterKey === 'deadline') {
    state.activeTab = 'deadline';
  } else if (filterKey && Object.prototype.hasOwnProperty.call(state.filters, filterKey)) {
    state.filters[filterKey] = value;
    const elementKey = `${filterKey}Filter`;
    if (elements[elementKey]) elements[elementKey].value = value;
    state.activeTab = 'all';
  }

  render();
  updateHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
    return sortByDeadlineProximity(events.filter(event => event.status.code === 'closing' || event.status.code === 'open'));
  }

  return events;
}

function matchesLevel(event, level) {
  if (!level) return true;
  if (LEVEL_KEYS.includes(level)) return event[level] === true;
  if (level === 'primary') return event.p1 || event.p2 || event.p3 || event.p4 || event.p5 || event.p6;
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

function sortByDeadlineProximity(events) {
  return [...events].sort((a, b) => compareByDeadlineProximity(a, b));
}

function compareByDeadlineProximity(a, b) {
  const timeA = getDeadlineSortTime(a);
  const timeB = getDeadlineSortTime(b);

  if (timeA === null && timeB === null) return a.title.localeCompare(b.title, 'th');
  if (timeA === null) return 1;
  if (timeB === null) return -1;

  return timeA - timeB || a.title.localeCompare(b.title, 'th');
}

function getDeadlineSortTime(event) {
  const closeAt = parseLocalDateTime(event.registerCloseDate, event.registerCloseTime, 'end');
  if (closeAt) return closeAt.getTime();

  const eventDate = parseLocalDate(event.eventStartDate || event.eventDate) || parseLocalDate(event.eventEndDate);
  return eventDate ? eventDate.getTime() : null;
}

function renderCardGrid(events, emptyText, options = {}) {
  if (!events.length) {
    return `<div class="empty-state"><p>${escapeHTML(emptyText)}</p></div>`;
  }

  const gridClass = options.variant === 'home' ? 'card-grid home-card-grid' : 'card-grid';
  return `<div class="${gridClass}">${events.map((event, index) => renderEventCard(event, { ...options, index })).join('')}</div>`;
}

function renderEventCard(event, options = {}) {
  const isHomeCard = options.variant === 'home';
  const className = isHomeCard ? 'event-card media-event-card home-event-card' : 'event-card media-event-card';

  return `
    <article class="${className}" data-open-event="${escapeAttr(event.id)}" tabindex="0" role="button" aria-label="เปิดรายละเอียด ${escapeAttr(event.title || 'กิจกรรม')}">
      ${renderCardMedia(event, { eager: isHomeCard && options.index < 2 })}
      <div class="card-content">
        <div class="card-topline">
          <span class="pill ${getStatusPillClass(event.status)}">${escapeHTML(event.status.label)}</span>
          ${renderIcon('star')}
        </div>
        <h3 class="card-title">${escapeHTML(event.title || 'ไม่ระบุชื่อกิจกรรม')}</h3>
        <p class="card-subtitle">${escapeHTML(event.organizer || 'ไม่ระบุผู้จัด')}</p>
        <div class="mini-meta">
          <div><strong>${renderIcon('calendar-event')}เปิดรับสมัคร</strong>${formatDateTime(event.registerOpenDate, event.registerOpenTime) || '-'}</div>
          <div><strong>${renderIcon('calendar-x')}ปิดรับสมัคร</strong>${formatDateTime(event.registerCloseDate, event.registerCloseTime) || '-'}</div>
          <div><strong>${renderIcon('trophy')}วันกิจกรรม</strong>${formatEventDateRange(event)}</div>
          <div><strong>${renderIcon('people')}ระดับ</strong>${escapeHTML(event.autoLevelTags.join(', '))}</div>
        </div>
        ${renderTags(event)}
        <div class="card-actions">
          <button class="copy-button" type="button" data-copy-event="${escapeAttr(event.id)}">${renderIcon('clipboard')}คัดลอก</button>
        </div>
      </div>
    </article>
  `;
}

function renderCardMedia(event, options = {}) {
  const hasImage = Boolean(event.posterImage);

  return `
    <div class="event-card-media image-frame ${hasImage ? '' : 'is-placeholder'}" aria-hidden="true">
      ${hasImage
        ? `${renderManagedImage(event.posterImage, '', { className: 'event-card-image', width: 640, height: 360, eager: Boolean(options.eager) })}${renderImageFallback('กำลังโหลดรูป...')}`
        : renderImageFallback('ไม่มีรูปประชาสัมพันธ์')}
    </div>
  `;
}

function getStatusPillClass(status) {
  if (!status) return '';
  if (status.code === 'open') return 'green';
  if (status.code === 'closing') return 'orange';
  if (status.code === 'manual-closed') return 'closed';
  return '';
}

function renderManagedImage(src, alt, options = {}) {
  const loading = options.eager ? 'eager' : 'lazy';
  const fetchPriority = options.eager ? 'high' : 'low';
  const className = ['managed-image', options.className].filter(Boolean).join(' ');
  const dimensions = [
    options.width ? `width="${escapeAttr(options.width)}"` : '',
    options.height ? `height="${escapeAttr(options.height)}"` : ''
  ].filter(Boolean).join(' ');

  return `<img class="${className}" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="${loading}" decoding="async" fetchpriority="${fetchPriority}" referrerpolicy="no-referrer" data-managed-image ${dimensions}>`;
}

function renderImageFallback(text) {
  return `
    <span class="image-fallback">
      <span class="image-fallback-icon">${renderIcon('image')}</span>
      <span data-image-fallback-text>${escapeHTML(text)}</span>
    </span>
  `;
}

function hydrateManagedImages() {
  document.querySelectorAll('[data-managed-image]').forEach(image => {
    const frame = image.closest('.image-frame');
    if (!frame || image.dataset.imageWatchStarted === 'true') return;

    image.dataset.imageWatchStarted = 'true';
    frame.classList.add('is-loading');

    if (image.complete) {
      if (image.naturalWidth > 0) {
        markManagedImageLoaded(image);
      } else {
        markManagedImageFailed(image);
      }
      return;
    }

    if (image.getAttribute('loading') === 'eager') {
      startManagedImageTimer(image);
    } else if ('IntersectionObserver' in window) {
      getManagedImageObserver().observe(image);
    } else {
      startManagedImageTimer(image);
    }
  });
}

function getManagedImageObserver() {
  if (managedImageObserver) return managedImageObserver;

  managedImageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      managedImageObserver.unobserve(entry.target);
      startManagedImageTimer(entry.target);
    });
  }, { rootMargin: '360px 0px' });

  return managedImageObserver;
}

function startManagedImageTimer(image) {
  if (!image.isConnected || image.complete || image.dataset.imageTimeoutId) return;

  const timeoutId = window.setTimeout(() => {
    markManagedImageSlow(image);
  }, IMAGE_LOAD_TIMEOUT_MS);
  image.dataset.imageTimeoutId = String(timeoutId);
}

function markManagedImageLoaded(image) {
  if (!image.isConnected) return;

  clearManagedImageTimer(image);
  const frame = image.closest('.image-frame');
  if (!frame) return;

  frame.classList.add('is-loaded');
  frame.classList.remove('is-loading', 'is-error', 'is-placeholder', 'is-slow');
}

function markManagedImageFailed(image) {
  if (!image.isConnected) return;

  clearManagedImageTimer(image);
  const frame = image.closest('.image-frame');
  if (!frame) return;

  frame.classList.add('is-error', 'is-placeholder');
  frame.classList.remove('is-loading', 'is-loaded', 'is-slow');
  updateImageFallbackText(frame, 'รูปต้นทางโหลดไม่ได้');
}

function markManagedImageSlow(image) {
  if (!image.isConnected || image.complete) return;

  const frame = image.closest('.image-frame');
  if (!frame) return;

  frame.classList.add('is-slow');
  updateImageFallbackText(frame, 'รูปกำลังโหลดช้า แสดงข้อมูลไว้ก่อน');
}

function clearManagedImageTimer(image) {
  const timeoutId = Number(image.dataset.imageTimeoutId);
  if (timeoutId) window.clearTimeout(timeoutId);
  delete image.dataset.imageTimeoutId;

  if (managedImageObserver) {
    managedImageObserver.unobserve(image);
  }
}

function updateImageFallbackText(frame, text) {
  const fallbackText = frame.querySelector('[data-image-fallback-text]');
  if (fallbackText) fallbackText.textContent = text;
}

function renderDetailView() {
  const event = state.events.find(item => item.id === state.selectedEventId);
  if (!event) {
    elements.detailView.innerHTML = '<div class="empty-state"><p>ไม่พบรายละเอียดกิจกรรมนี้</p></div>';
    return;
  }

  const documentButtons = parseDocumentLinks(event.documentLinks)
    .map(link => `<a class="link-button" href="${escapeAttr(link.url)}" target="_blank" rel="noopener">${renderIcon('file-earmark-text')}เอกสาร: ${escapeHTML(link.label)}</a>`)
    .join('');
  const sourceButton = event.sourceLink
    ? `<a class="primary-button" href="${escapeAttr(event.sourceLink)}" target="_blank" rel="noopener">${renderIcon('info-circle')}เปิดประกาศต้นทาง</a>`
    : '';
  const relatedEvents = getRelatedEvents(event, 4);

  elements.detailView.innerHTML = `
    <article class="detail-shell">
      <div class="detail-hero">
        <div class="poster-frame image-frame ${event.posterImage ? '' : 'is-placeholder'}">
          ${event.posterImage
            ? `${renderManagedImage(event.posterImage, `โปสเตอร์ ${event.title || 'กิจกรรม'}`, { className: 'poster-image', width: 800, height: 1000, eager: true })}${renderImageFallback('กำลังโหลดรูปประชาสัมพันธ์...')}`
            : renderImageFallback('ไม่มีรูปประชาสัมพันธ์')}
        </div>
        <div class="detail-title">
          <button class="secondary-button" type="button" data-quick-filter="${escapeAttr(state.filters.query ? 'all' : 'home')}">${renderIcon('arrow-left')}กลับ</button>
          <div class="chip-row">
            <span class="pill">${escapeHTML(event.type || 'ไม่ระบุประเภท')}</span>
            <span class="status-pill ${event.status.className}">${escapeHTML(event.status.label)}</span>
            ${event.autoLevelTags.map(tag => `<span class="chip">${escapeHTML(tag)}</span>`).join('')}
          </div>
          <h1>${escapeHTML(event.title || 'ไม่ระบุชื่อกิจกรรม')}</h1>
          ${event.summary ? `<p class="summary">${escapeHTML(event.summary)}</p>` : ''}
          ${renderTags(event)}
        </div>
      </div>

      <div class="detail-section">
        <h2>รายละเอียดสำคัญ</h2>
        <div class="detail-meta">
          ${renderMetaTile('ผู้จัด', event.organizer || '-', 'building')}
          ${renderMetaTile('รับสมัคร', formatRegistrationRange(event), 'calendar-event')}
          ${renderMetaTile('ส่งผลงาน', event.submissionDate ? formatThaiDate(event.submissionDate) : '-', 'upload')}
          ${renderMetaTile('วันกิจกรรม', formatEventDateRange(event), 'trophy')}
          ${renderMetaTile('รูปแบบกิจกรรม', event.activityFormat || '-', 'tags')}
          ${renderMetaTile('สถานที่', event.location || '-', 'geo-alt')}
          ${renderMetaTile('จำนวนสมาชิกทีม', shouldShowTeamMemberCount(event) ? formatTeamMemberCount(event.teamMemberCount) : 'แข่งขันเดี่ยว', 'people')}
          ${renderMetaTile('ค่าสมัคร', shouldShowRegistrationFee(event) ? formatRegistrationFee(event.registrationFee) : 'ฟรีหรือไม่ระบุ', 'patch-check')}
          ${renderMetaTile('ครูผู้ประสานงาน', event.contactTeacher || '-', 'person-badge')}
        </div>
      </div>

      <div class="detail-section">
        <h2>ลิงก์และเอกสาร</h2>
        <div class="card-actions">
          ${sourceButton}
          ${documentButtons || '<span class="chip">ยังไม่มีเอกสารแนบ</span>'}
          <button class="copy-button" type="button" data-copy-event="${escapeAttr(event.id)}">${renderIcon('clipboard')}คัดลอกข้อความประชาสัมพันธ์</button>
        </div>
      </div>

      <div class="detail-section">
        <div class="section-heading">
          <h2>รายการที่แท็กใกล้เคียงกัน</h2>
        </div>
        ${renderCardGrid(relatedEvents, 'ยังไม่มีรายการที่มีแท็กใกล้เคียงกัน')}
      </div>
    </article>
  `;
}

function renderMetaTile(label, value, iconName) {
  return `<div class="meta-tile"><span>${renderIcon(iconName)}${escapeHTML(label)}</span><strong>${escapeHTML(value)}</strong></div>`;
}

function openEventDetail(eventId) {
  state.selectedEventId = eventId;
  state.activeTab = 'detail';
  render();
  updateHistory();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getRelatedEvents(event, limit) {
  const sourceTags = new Set(getRecommendationTokens(event));

  return state.events
    .filter(candidate => candidate.id !== event.id)
    .map(candidate => {
      const candidateTags = getRecommendationTokens(candidate);
      const score = candidateTags.reduce((sum, tag) => sum + (sourceTags.has(tag) ? 1 : 0), 0);
      return { event: candidate, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || compareByDate(a.event, b.event, 'registerCloseDate'))
    .slice(0, limit)
    .map(item => item.event);
}

function getRecommendationTokens(event) {
  return [
    event.type,
    event.category,
    ...event.autoLevelTags,
    ...event.interestTags,
    ...event.featureTags,
    ...event.portfolioTags
  ].map(stringValue).filter(Boolean);
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
  const entries = getCalendarEntries(events);
  const entryMap = groupCalendarEntries(entries);
  const cursor = state.calendarCursor;
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const selectedEntries = entryMap.get(state.selectedCalendarDate) || [];

  elements.calendarView.innerHTML = `
    <div class="calendar-shell">
      <div class="calendar-top">
        <button class="calendar-back icon-only" type="button" data-quick-filter="home" aria-label="กลับหน้าแรก">${renderIcon('arrow-left')}</button>
        <div class="calendar-title">
          <h1>ปฏิทินการแข่งขัน</h1>
          <p>${formatThaiMonthYear(cursor)}</p>
        </div>
        <div class="calendar-nav">
          <button class="icon-only" type="button" data-calendar-nav="prev" aria-label="เดือนก่อนหน้า">${renderIcon('chevron-left')}</button>
          <button class="icon-only" type="button" data-calendar-nav="next" aria-label="เดือนถัดไป">${renderIcon('chevron-right')}</button>
        </div>
      </div>

      <div class="calendar-weekdays" aria-hidden="true">
        ${['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, index) => `<span class="weekday ${index === 0 ? 'is-sunday' : ''}">${day}</span>`).join('')}
      </div>

      <div class="calendar-grid">
        ${Array.from({ length: 42 }, (_, index) => {
          const date = addDays(gridStart, index);
          const dateKey = toDateKey(date);
          const dayEntries = entryMap.get(dateKey) || [];
          const markers = dayEntries.slice(0, 4).map(entry => `<span class="marker marker-${entry.kind}"></span>`).join('');
          return `
            <button class="calendar-day-button ${date.getMonth() !== cursor.getMonth() ? 'is-muted' : ''} ${dateKey === toDateKey(getTodayLocal()) ? 'is-today' : ''} ${dateKey === state.selectedCalendarDate ? 'is-selected' : ''}" type="button" data-calendar-date="${dateKey}">
              ${date.getDate()}
              ${markers ? `<span class="day-markers">${markers}</span>` : ''}
            </button>
          `;
        }).join('')}
      </div>

      <div class="calendar-legend">
        ${renderLegendRow('open', 'เปิดรับสมัคร')}
        ${renderLegendRow('close', 'ปิดรับสมัคร')}
        ${renderLegendRow('submit', 'ส่งผลงาน')}
        ${renderLegendRow('event', 'วันแข่งขัน')}
        ${renderLegendRow('end', 'กิจกรรม')}
      </div>

      <div class="selected-day-list">
        <h2>รายการในวันนี้ (${formatThaiDate(state.selectedCalendarDate)})</h2>
        ${selectedEntries.length ? selectedEntries.map(renderCalendarEntry).join('') : '<p class="summary">ยังไม่มีรายการในวันนี้</p>'}
      </div>
    </div>
  `;
}

function getCalendarEntries(events) {
  const entries = [];

  events.forEach(event => {
    addCalendarEntry(entries, event.registerOpenDate, event.registerOpenTime ? `เปิดรับสมัคร ${formatTime(event.registerOpenTime)}` : 'เปิดรับสมัคร', 'open', event);
    addCalendarEntry(entries, event.registerCloseDate, event.registerCloseTime ? `ปิดรับสมัคร ${formatTime(event.registerCloseTime)}` : 'ปิดรับสมัคร', 'close', event);
    addCalendarEntry(entries, event.submissionDate, 'ส่งผลงาน', 'submit', event);
    addCalendarEntry(entries, event.eventStartDate, 'วันแข่งขัน/กิจกรรม', 'event', event);

    const startDate = parseLocalDate(event.eventStartDate);
    const endDate = parseLocalDate(event.eventEndDate);
    if (endDate && (!startDate || toDateKey(endDate) !== toDateKey(startDate))) {
      addCalendarEntry(entries, event.eventEndDate, 'จบกิจกรรม', 'end', event);
    }
  });

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function addCalendarEntry(entries, dateValue, label, kind, event) {
  const date = parseLocalDate(dateValue);
  if (!date) return;
  entries.push({ date, label, kind, event });
}

function groupCalendarEntries(entries) {
  const map = new Map();
  entries.forEach(entry => {
    const dateKey = toDateKey(entry.date);
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey).push(entry);
  });
  return map;
}

function renderLegendRow(kind, label) {
  return `<div class="legend-row"><span class="marker marker-${kind}"></span><span>${escapeHTML(label)}</span></div>`;
}

function renderCalendarEntry(entry) {
  return `
    <div class="calendar-event-row" data-open-event="${escapeAttr(entry.event.id)}" tabindex="0" role="button">
      <span class="calendar-label marker-${entry.kind}">${renderIcon(getCalendarEntryIcon(entry.kind))}${escapeHTML(entry.label)}</span>
      <strong>${escapeHTML(entry.event.title || 'ไม่ระบุชื่อกิจกรรม')}</strong>
      <span>${escapeHTML(entry.event.type || 'กิจกรรม')} · ${escapeHTML(entry.event.autoLevelTags.join(', '))}</span>
    </div>
  `;
}

function getCalendarEntryIcon(kind) {
  if (kind === 'open') return 'calendar-event';
  if (kind === 'close') return 'calendar-x';
  if (kind === 'submit') return 'upload';
  if (kind === 'event') return 'trophy';
  return 'calendar-check';
}

function moveCalendar(direction) {
  const next = new Date(state.calendarCursor);
  next.setMonth(next.getMonth() + (direction === 'next' ? 1 : -1), 1);
  state.calendarCursor = next;
  state.selectedCalendarDate = toDateKey(new Date(next.getFullYear(), next.getMonth(), 1));
  renderCalendarView(getFilteredEvents());
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
      event.activityFormat ? `รูปแบบกิจกรรม: ${event.activityFormat}` : '',
      event.location ? `สถานที่: ${event.location}` : '',
      shouldShowTeamMemberCount(event) ? `จำนวนสมาชิกทีม: ${formatTeamMemberCount(event.teamMemberCount)}` : '',
      shouldShowRegistrationFee(event) ? `ค่าสมัคร: ${formatRegistrationFee(event.registrationFee)}` : '',
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
    event.activityFormat ? `รูปแบบกิจกรรม: ${event.activityFormat}` : '',
    event.location ? `สถานที่: ${event.location}` : '',
    shouldShowTeamMemberCount(event) ? `จำนวนสมาชิกทีม: ${formatTeamMemberCount(event.teamMemberCount)}` : '',
    shouldShowRegistrationFee(event) ? `ค่าสมัคร: ${formatRegistrationFee(event.registrationFee)}` : '',
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
  if (event.p1 || event.p2 || event.p3 || event.p4 || event.p5 || event.p6) tags.push('ประถม');
  if (event.m1 || event.m2 || event.m3) tags.push('ม.ต้น');
  if (event.m4 || event.m5 || event.m6) tags.push('ม.ปลาย');

  return tags.length ? tags : ['ไม่ระบุระดับ'];
}

function getStatus(event) {
  // ใช้เวลาเปิด/ปิดเมื่อมีข้อมูล แต่ยังเทียบวันกิจกรรมแบบ date-only เพื่อลดปัญหา timezone
  const now = new Date();
  const openAt = parseLocalDateTime(event.registerOpenDate, event.registerOpenTime, 'start');
  const closeAt = parseLocalDateTime(event.registerCloseDate, event.registerCloseTime, 'end');

  if (event.isClosed === true) {
    return { code: 'manual-closed', label: 'ปิดรับสมัคร', className: 'status-manual-closed' };
  }

  if (openAt && now < openAt) {
    return { code: 'upcoming', label: 'ยังไม่เปิดรับสมัคร', className: 'status-upcoming' };
  }

  if (closeAt && now > closeAt) {
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

function isPastEvent(event) {
  const eventEndDate = parseLocalDate(event.eventEndDate || event.eventStartDate || event.eventDate);
  if (!eventEndDate) return false;

  return getTodayLocal() > eventEndDate;
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

function formatThaiMonthYear(value) {
  const date = value instanceof Date ? value : parseLocalDate(value);
  if (!date) return '-';

  return new Intl.DateTimeFormat('th-TH', {
    year: 'numeric',
    month: 'long'
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

function shouldShowTeamMemberCount(event) {
  return !isSoloTeamMemberCount(event.teamMemberCount);
}

function formatTeamMemberCount(value) {
  return `${normalizeTeamMemberCount(value)} คน`;
}

function shouldShowRegistrationFee(event) {
  return normalizeRegistrationFee(event.registrationFee) > 0;
}

function formatRegistrationFee(value) {
  return `${formatNumber(normalizeRegistrationFee(value))} บาท`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('th-TH', {
    maximumFractionDigits: 2
  }).format(value);
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

function resetFilters(options = {}) {
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
  if (options.renderAfterReset !== false) render();
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

function buildFeatureTags(values, teamMemberCount, registrationFee, activityFormat, options = {}) {
  const originalTags = toArray(values);
  const tags = originalTags.filter(tag => !AUTO_FEATURE_TAGS.includes(tag));

  tags.push(isSoloTeamMemberCount(teamMemberCount) ? 'แข่งขันเดี่ยว' : 'แข่งขันทีม');

  if (options.hasRegistrationFee === false) {
    preserveTags(tags, originalTags, ['ฟรี', 'มีค่าสมัคร']);
  } else {
    tags.push(normalizeRegistrationFee(registrationFee) > 0 ? 'มีค่าสมัคร' : 'ฟรี');
  }

  if (options.hasActivityFormat === false) {
    preserveTags(tags, originalTags, ['ออนไลน์', 'ต้องเดินทาง']);
  } else {
    const normalizedActivityFormat = normalizeActivityFormat(activityFormat);

    if (normalizedActivityFormat === 'ออนไลน์' || normalizedActivityFormat === MIXED_ACTIVITY_FORMAT) {
      tags.push('ออนไลน์');
    }

    if (normalizedActivityFormat === 'ออนไซต์' || normalizedActivityFormat === MIXED_ACTIVITY_FORMAT) {
      tags.push('ต้องเดินทาง');
    }
  }

  return Array.from(new Set(tags));
}

function normalizeActivityFormat(value) {
  const text = stringValue(value);
  if (text === LEGACY_MIXED_ACTIVITY_FORMAT) return MIXED_ACTIVITY_FORMAT;
  return text;
}

function preserveTags(targetTags, sourceTags, tagsToPreserve) {
  tagsToPreserve.forEach(tag => {
    if (sourceTags.includes(tag)) {
      targetTags.push(tag);
    }
  });
}

function normalizeTeamMemberCount(value) {
  const text = stringValue(value).replace(/,/g, '');
  if (!text) return '1';

  const rangeMatch = text.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
  if (rangeMatch) {
    const first = parseInt(rangeMatch[1], 10);
    const second = parseInt(rangeMatch[2], 10);
    if (!first || !second || first < 1 || second < 1) return '1';

    const min = Math.min(first, second);
    const max = Math.max(first, second);
    return min === max ? String(min) : `${min} - ${max}`;
  }

  const number = parseInt(text, 10);
  return Number.isFinite(number) && number >= 1 ? String(number) : '1';
}

function isSoloTeamMemberCount(value) {
  return normalizeTeamMemberCount(value) === '1';
}

function normalizeRegistrationFee(value) {
  const number = Number(stringValue(value).replace(/,/g, ''));
  return Number.isFinite(number) && number >= 0 ? number : 0;
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

function safeImageUrl(value) {
  const text = stringValue(value);
  if (!text) return '';

  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';

    // ลิงก์ Google Drive แบบ share เป็นหน้า HTML ไม่ใช่รูปโดยตรง จึงแปลงเป็น thumbnail endpoint
    const driveFileId = getGoogleDriveFileId(url);
    if (driveFileId) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveFileId)}&sz=w1200`;
    }

    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.href;
  } catch (error) {
    return '';
  }
}

function getGoogleDriveFileId(url) {
  if (!/(\.|^)drive\.google\.com$/i.test(url.hostname)) return '';

  const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
  if (pathMatch) return pathMatch[1];

  return url.searchParams.get('id') || '';
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
