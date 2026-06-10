var SHEET_NAME = 'events';
var SPREADSHEET_ID = '1Ij0EfvD8AW8gz3tffG1Yz7fPJMHa2vnh5MgnFau_bss';

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
  'interestTags',
  'featureTags',
  'portfolioTags',
  'registerOpenDate',
  'registerCloseDate',
  'submissionDate',
  'eventDate',
  'location',
  'summary',
  'sourceLink',
  'documentLinks',
  'contactTeacher',
  'isPublished'
];

var LEVEL_KEYS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
var TAG_KEYS = ['interestTags', 'featureTags', 'portfolioTags'];
var DATE_KEYS = ['registerOpenDate', 'registerCloseDate', 'submissionDate', 'eventDate'];

function doGet(e) {
  // ใช้ endpoint เดียวกันทั้งฟอร์มครูและ JSON สำหรับ GitHub Pages
  if (e && e.parameter && e.parameter.action === 'events') {
    return createJsonResponse_(getEvents());
  }

  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('ฟอร์มบันทึกกิจกรรมนักเรียน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveEvent(form) {
  var sheet = ensureEventsSheet_();
  var data = form || {};

  // เรียงค่าตาม HEADERS เสมอ เพื่อให้หัวตารางใน Google Sheet ไม่สลับตำแหน่ง
  var row = HEADERS.map(function(header) {
    if (header === 'timestamp') return new Date();
    if (LEVEL_KEYS.indexOf(header) !== -1) return parseBoolean_(data[header]);
    if (TAG_KEYS.indexOf(header) !== -1) return joinTags_(data[header]);
    if (header === 'isPublished') return data.isPublished === undefined ? true : parseBoolean_(data.isPublished);
    return cleanText_(data[header]);
  });

  sheet.appendRow(row);

  return {
    ok: true,
    message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
  };
}

function getEvents() {
  var sheet = ensureEventsSheet_();
  var values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return {
      ok: true,
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
    generatedAt: new Date().toISOString(),
    events: events
  };
}

function ensureEventsSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet && SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  if (!spreadsheet) {
    throw new Error('ไม่พบ Google Sheet ที่ผูกกับ Apps Script นี้');
  }

  var sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  // ถ้าเป็นชีตใหม่หรือหัวตารางยังว่าง ให้สร้างหัวตารางอัตโนมัติ
  if (sheet.getLastRow() === 0) {
    writeHeaderRow_(sheet);
    return sheet;
  }

  var existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var headerIsEmpty = existingHeaders.every(function(value) {
    return String(value || '').trim() === '';
  });

  if (headerIsEmpty) {
    writeHeaderRow_(sheet);
    return sheet;
  }

  var headerIsValid = HEADERS.every(function(header, index) {
    return String(existingHeaders[index] || '').trim() === header;
  });

  if (!headerIsValid) {
    throw new Error('หัวตารางในชีต events ไม่ตรงกับระบบ กรุณาตรวจแถวที่ 1 ให้ตรงกับ README');
  }

  return sheet;
}

function writeHeaderRow_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
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
    var value = row[headerMap[header]];

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

    event[header] = cleanText_(value);
  });

  return event;
}

function createJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function cleanText_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function joinTags_(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText_).filter(Boolean).join(', ');
  }

  return cleanText_(value);
}

function splitTags_(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText_).filter(Boolean);
  }

  return cleanText_(value)
    .split(',')
    .map(function(tag) {
      return tag.trim();
    })
    .filter(Boolean);
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
