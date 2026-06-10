var SHEET_NAME = 'events';
var SPREADSHEET_NAME = 'student-events-data';
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
  'registerOpenTime',
  'registerCloseDate',
  'registerCloseTime',
  'submissionDate',
  'eventStartDate',
  'eventEndDate',
  'location',
  'teamMemberCount',
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
    if (header === 'eventStartDate') return cleanText_(data.eventStartDate || data.eventDate);
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

  // Alias สำหรับหน้าเว็บเวอร์ชันเก่าที่อาจยังอ่าน eventDate อยู่
  event.eventDate = event.eventStartDate;

  return event;
}

function getCellValue_(row, headerMap, header) {
  if (headerMap[header] === undefined) return '';
  return row[headerMap[header]];
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
