var SHEET_NAME = 'events';
var SPREADSHEET_NAME = 'student-events-data';
var SPREADSHEET_ID = '1Ij0EfvD8AW8gz3tffG1Yz7fPJMHa2vnh5MgnFau_bss';
var EVENTS_CACHE_KEY = 'events_json';
var EVENTS_CACHE_SECONDS = 600;
var EVENTS_SCHEMA_VERSION = '20260611-format-label';

var HEADERS = [
  'timestamp',
  'title',
  'posterImage',
  'type',
  'category',
  'organizer',
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'teamMemberCount',
  'registrationFee',
  'activityFormat',
  'location',
  'interestTags',
  'featureTags',
  'portfolioTags',
  'registerOpenDate',
  'registerOpenTime',
  'registerCloseDate',
  'registerCloseTime',
  'submissionDate',
  'eventStartDate',
  'eventEndDate',
  'summary',
  'sourceLink',
  'documentLinks',
  'contactTeacher',
  'isPublished'
];

var LEVEL_KEYS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
var TAG_KEYS = ['interestTags', 'featureTags', 'portfolioTags'];
var DATE_KEYS = ['registerOpenDate', 'registerCloseDate', 'submissionDate', 'eventStartDate', 'eventEndDate'];
var TIME_KEYS = ['registerOpenTime', 'registerCloseTime'];
var AUTO_FEATURE_TAGS = ['แข่งขันเดี่ยว', 'แข่งขันทีม', 'ฟรี', 'มีค่าสมัคร', 'ออนไลน์', 'ต้องเดินทาง'];
var REMOVED_INTEREST_TAGS = ['ทำงานเป็นทีม'];
var MIXED_ACTIVITY_FORMAT = 'ออนไลน์+ออนไซต์';
var LEGACY_MIXED_ACTIVITY_FORMAT = 'ผสม';
var ACTIVITY_FORMATS = ['ออนไลน์', 'ออนไซต์', MIXED_ACTIVITY_FORMAT];

function doGet(e) {
  // ใช้ endpoint เดียวกันทั้งฟอร์มครูและ JSON สำหรับ GitHub Pages
  if (e && e.parameter && e.parameter.action === 'events') {
    return createJsonResponse_(getEventsJson_());
  }

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('ฟอร์มบันทึกกิจกรรมนักเรียน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveEvent(form) {
  var sheet = ensureEventsSheet_();
  var data = normalizeEventInput_(form || {});

  // เรียงค่าตาม HEADERS เสมอ เพื่อให้หัวตารางใน Google Sheet ไม่สลับตำแหน่ง
  var row = HEADERS.map(function(header) {
    if (header === 'timestamp') return new Date();
    if (LEVEL_KEYS.indexOf(header) !== -1) return parseBoolean_(data[header]);
    if (TAG_KEYS.indexOf(header) !== -1) return joinTags_(data[header]);
    if (header === 'teamMemberCount') return data.teamMemberCount;
    if (header === 'registrationFee') return data.registrationFee;
    if (header === 'eventStartDate') return cleanText_(data.eventStartDate || data.eventDate);
    if (header === 'isPublished') return data.isPublished === undefined ? true : parseBoolean_(data.isPublished);
    return cleanText_(data[header]);
  });

  sheet.appendRow(row);
  clearEventsCache_();

  return {
    ok: true,
    message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
  };
}

function getEvents() {
  return JSON.parse(getEventsJson_());
}

function getEventsJson_() {
  var cachedJson = getCachedEventsJson_();
  if (cachedJson) return cachedJson;

  var payload = buildEventsPayload_();
  var json = JSON.stringify(payload);
  cacheEventsJson_(json);
  return json;
}

function buildEventsPayload_() {
  var sheet = ensureEventsSheet_();
  var values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      ok: true,
      schemaVersion: EVENTS_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      events: []
    };
  }

  var headerMap = buildHeaderMap_(values[0]);
  var events = [];

  values.slice(1).forEach(function(row) {
    var event = rowToEvent_(row, headerMap);
    if (event && event.isPublished === true) {
      events.push(event);
    }
  });

  return {
    ok: true,
    schemaVersion: EVENTS_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    events: events
  };
}

function getCachedEventsJson_() {
  try {
    var cachedJson = CacheService.getScriptCache().get(EVENTS_CACHE_KEY);
    if (!cachedJson) return null;

    // ป้องกันการเสิร์ฟ cache เก่าหลังอัปเดต schema ของข้อมูล
    var cachedPayload = JSON.parse(cachedJson);
    if (cachedPayload && cachedPayload.schemaVersion === EVENTS_SCHEMA_VERSION) {
      return cachedJson;
    }

    CacheService.getScriptCache().remove(EVENTS_CACHE_KEY);
    return null;
  } catch (error) {
    return null;
  }
}

function cacheEventsJson_(json) {
  try {
    CacheService.getScriptCache().put(EVENTS_CACHE_KEY, json, EVENTS_CACHE_SECONDS);
  } catch (error) {
    // ถ้า JSON ใหญ่เกิน cache quota ให้ส่งข้อมูลสดต่อไปโดยไม่ทำให้ API ล้ม
  }
}

function clearEventsCache_() {
  try {
    CacheService.getScriptCache().remove(EVENTS_CACHE_KEY);
  } catch (error) {
    // การล้าง cache ไม่ควรทำให้การบันทึกข้อมูลล้มเหลว
  }
}

function ensureEventsSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet && SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  if (!spreadsheet) {
    throw new Error('ไม่พบ Google Sheet ที่ผูกกับ Apps Script นี้');
  }

  ensureSpreadsheetName_(spreadsheet);

  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  // ถ้าเป็นชีตใหม่หรือหัวตารางยังว่าง ให้สร้างหัวตารางอัตโนมัติ
  if (sheet.getLastRow() === 0) {
    writeHeaderRow_(sheet);
    return sheet;
  }

  var headerWidth = Math.max(sheet.getLastColumn(), HEADERS.length);
  var existingHeaders = sheet.getRange(1, 1, 1, headerWidth).getValues()[0].map(cleanText_);
  var headerIsEmpty = existingHeaders.every(function(value) {
    return value === '';
  });

  if (headerIsEmpty) {
    writeHeaderRow_(sheet);
    return sheet;
  }

  if (!headerRowMatches_(existingHeaders)) {
    migrateHeaderRow_(sheet, existingHeaders);
  }

  return sheet;
}

function ensureSpreadsheetName_(spreadsheet) {
  if (spreadsheet.getName() !== SPREADSHEET_NAME) {
    spreadsheet.rename(SPREADSHEET_NAME);
  }
}

function writeHeaderRow_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
}

function headerRowMatches_(existingHeaders) {
  return HEADERS.every(function(header, index) {
    return existingHeaders[index] === header;
  });
}

function migrateHeaderRow_(sheet, existingHeaders) {
  var existingMap = buildHeaderMap_(existingHeaders);
  var extraHeaders = existingHeaders.filter(function(header) {
    return header && HEADERS.indexOf(header) === -1 && header !== 'eventDate';
  });
  var targetHeaders = HEADERS.concat(extraHeaders);
  var lastRow = sheet.getLastRow();
  var lastColumn = Math.max(sheet.getLastColumn(), existingHeaders.length, targetHeaders.length);
  var rows = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues()
    : [];

  // ย้ายข้อมูลเดิมตามชื่อหัวตาราง เพื่อเพิ่มคอลัมน์ใหม่โดยไม่ทำให้ข้อมูลเก่าสลับช่อง
  var migratedRows = rows.map(function(row) {
    return targetHeaders.map(function(header) {
      if (existingMap[header] !== undefined) return row[existingMap[header]];
      if (header === 'eventStartDate' && existingMap.eventDate !== undefined) return row[existingMap.eventDate];
      return '';
    });
  });

  sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
  if (migratedRows.length) {
    sheet.getRange(2, 1, migratedRows.length, targetHeaders.length).setValues(migratedRows);
  }

  if (lastColumn > targetHeaders.length) {
    sheet.getRange(1, targetHeaders.length + 1, lastRow, lastColumn - targetHeaders.length).clearContent();
  }

  sheet.setFrozenRows(1);
}

function buildHeaderMap_(headerRow) {
  var map = {};
  headerRow.forEach(function(header, index) {
    map[String(header || '').trim()] = index;
  });
  return map;
}

function rowToEvent_(row, headerMap) {
  var event = {};

  // ปรับชนิดข้อมูลก่อนส่งออก เพื่อให้หน้า GitHub Pages ใช้งานได้ตรงไปตรงมา
  HEADERS.forEach(function(header) {
    var value = getCellValue_(row, headerMap, header);
    if (header === 'eventStartDate' && !value) {
      value = getCellValue_(row, headerMap, 'eventDate');
    }

    if (header === 'timestamp') {
      event[header] = normalizeDateTime_(value);
      return;
    }

    if (LEVEL_KEYS.indexOf(header) !== -1 || header === 'isPublished') {
      event[header] = parseBoolean_(value);
      return;
    }

    if (TAG_KEYS.indexOf(header) !== -1) {
      event[header] = splitTags_(value);
      return;
    }

    if (DATE_KEYS.indexOf(header) !== -1) {
      event[header] = normalizeDate_(value);
      return;
    }

    if (TIME_KEYS.indexOf(header) !== -1) {
      event[header] = normalizeTime_(value);
      return;
    }

    event[header] = cleanText_(value);
  });

  var rawRegistrationFee = event.registrationFee;
  var rawActivityFormat = event.activityFormat;

  event.teamMemberCount = normalizeTeamMemberCount_(event.teamMemberCount);
  event.registrationFee = normalizeRegistrationFee_(event.registrationFee);
  event.activityFormat = normalizeActivityFormat_(event.activityFormat);
  event.interestTags = filterRemovedInterestTags_(event.interestTags);
  event.featureTags = buildFeatureTags_(event.featureTags, event, {
    hasRegistrationFee: cleanText_(rawRegistrationFee) !== '',
    hasActivityFormat: cleanText_(rawActivityFormat) !== ''
  });

  // Alias สำหรับหน้าเว็บเวอร์ชันเก่าที่อาจยังอ่าน eventDate อยู่
  event.eventDate = event.eventStartDate;

  return event;
}

function getCellValue_(row, headerMap, header) {
  if (headerMap[header] === undefined) return '';
  return row[headerMap[header]];
}

function createJsonResponse_(payload) {
  var json = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeEventInput_(data) {
  var normalized = {};

  Object.keys(data || {}).forEach(function(key) {
    normalized[key] = data[key];
  });

  normalized.teamMemberCount = normalizeTeamMemberCount_(normalized.teamMemberCount);
  normalized.registrationFee = normalizeRegistrationFee_(normalized.registrationFee);
  normalized.activityFormat = normalizeActivityFormat_(normalized.activityFormat);
  normalized.interestTags = filterRemovedInterestTags_(normalizeTags_(normalized.interestTags));
  normalized.portfolioTags = normalizeTags_(normalized.portfolioTags);
  normalized.featureTags = buildFeatureTags_(normalized.featureTags, normalized);

  return normalized;
}

function joinTags_(value) {
  return normalizeTags_(value).join(', ');
}

function splitTags_(value) {
  return normalizeTags_(value);
}

function normalizeTags_(value) {
  var tags = Array.isArray(value)
    ? value
    : cleanText_(value).split(',');

  return dedupeTags_(tags.map(cleanText_).filter(Boolean));
}

function dedupeTags_(tags) {
  var seen = {};
  return tags.filter(function(tag) {
    if (seen[tag]) return false;
    seen[tag] = true;
    return true;
  });
}

function filterRemovedInterestTags_(tags) {
  return normalizeTags_(tags).filter(function(tag) {
    return REMOVED_INTEREST_TAGS.indexOf(tag) === -1;
  });
}

function buildFeatureTags_(value, data, options) {
  options = options || {};
  var originalTags = normalizeTags_(value);
  var tags = originalTags.filter(function(tag) {
    return AUTO_FEATURE_TAGS.indexOf(tag) === -1;
  });
  var teamMemberCount = normalizeTeamMemberCount_(data.teamMemberCount);
  var registrationFee = normalizeRegistrationFee_(data.registrationFee);
  var activityFormat = normalizeActivityFormat_(data.activityFormat);

  tags.push(teamMemberCount === 1 ? 'แข่งขันเดี่ยว' : 'แข่งขันทีม');

  if (options.hasRegistrationFee === false) {
    preserveTags_(tags, originalTags, ['ฟรี', 'มีค่าสมัคร']);
  } else {
    tags.push(registrationFee > 0 ? 'มีค่าสมัคร' : 'ฟรี');
  }

  if (options.hasActivityFormat === false) {
    preserveTags_(tags, originalTags, ['ออนไลน์', 'ต้องเดินทาง']);
  } else {
    if (activityFormat === 'ออนไลน์' || activityFormat === MIXED_ACTIVITY_FORMAT) {
      tags.push('ออนไลน์');
    }

    if (activityFormat === 'ออนไซต์' || activityFormat === MIXED_ACTIVITY_FORMAT) {
      tags.push('ต้องเดินทาง');
    }
  }

  return dedupeTags_(tags);
}

function preserveTags_(targetTags, sourceTags, tagsToPreserve) {
  tagsToPreserve.forEach(function(tag) {
    if (sourceTags.indexOf(tag) !== -1) {
      targetTags.push(tag);
    }
  });
}

function normalizeTeamMemberCount_(value) {
  var number = parseInt(cleanText_(value).replace(/,/g, ''), 10);
  if (!number || number < 1) return 1;
  return number;
}

function normalizeRegistrationFee_(value) {
  var number = Number(cleanText_(value).replace(/,/g, ''));
  if (!isFinite(number) || number < 0) return 0;
  return number;
}

function normalizeActivityFormat_(value) {
  var text = cleanText_(value);
  if (text === LEGACY_MIXED_ACTIVITY_FORMAT) return MIXED_ACTIVITY_FORMAT;
  return ACTIVITY_FORMATS.indexOf(text) !== -1 ? text : '';
}

function parseBoolean_(value) {
  // รองรับค่าจาก checkbox, TRUE/FALSE ในชีต และข้อความที่ผู้ดูแลอาจกรอกเอง
  if (value === true) return true;
  if (value === false) return false;
  if (value === 1) return true;
  if (value === 0) return false;

  var text = String(value || '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'published', 'เผยแพร่'].indexOf(text) !== -1;
}

function normalizeDate_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return cleanText_(value);
}

function normalizeDateTime_(value) {
  if (!value) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value.toISOString();
  }

  return cleanText_(value);
}

function normalizeTime_(value) {
  if (!value && value !== 0) return '';

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }

  if (typeof value === 'number' && value >= 0 && value < 1) {
    var totalMinutes = Math.round(value * 24 * 60);
    var hours = Math.floor(totalMinutes / 60) % 24;
    var minutes = totalMinutes % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
  }

  return cleanText_(value);
}
