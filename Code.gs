/**
 * ASM KhamYai Dashboard Web App
 * เชื่อมข้อมูล Google Sheet: ทะเบียนรายชื่อ อสม.ตำบลคำใหญ่
 * เพิ่ม Dashboard: อายุ / การศึกษา / ระยะเวลาเป็น อสม.
 */
const SPREADSHEET_ID = '1ybtPvvV3cbzdB7fDFPu4Rov44eIWPaVxm87wX2mGgzE';
const DEFAULT_SHEET_NAME = 'ตำบลคำใหญ่';

function doGet() {
  return HtmlService
    .createTemplateFromFile('index')
    .evaluate()
    .setTitle('Dashboard ชมรม อสม.ตำบลคำใหญ่')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getDashboardData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(DEFAULT_SHEET_NAME) || ss.getSheets()[0];
  const values = sheet.getDataRange().getDisplayValues();
  if (!values || values.length < 2) {
    return { rows: [], meta: { total: 0, updatedAt: new Date().toISOString(), sheetName: sheet.getName() } };
  }

  const headers = values[0].map(h => String(h || '').trim());
  const rows = values.slice(1)
    .filter(r => r.some(c => String(c || '').trim() !== ''))
    .map((r, index) => {
      const obj = {};
      headers.forEach((h, i) => {
        const key = h || `col_${i}`;
        // รองรับกรณีหัวคอลัมน์ซ้ำ โดยเก็บชื่อ key_ตำแหน่ง เพิ่มเติม
        obj[key] = r[i] || '';
        obj[`${key}_${i}`] = r[i] || '';
      });
      return normalizeRow_(obj, r, index + 1);
    });

  return {
    rows,
    meta: {
      total: rows.length,
      updatedAt: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm'),
      sheetName: sheet.getName(),
      spreadsheetId: SPREADSHEET_ID
    }
  };
}

function normalizeRow_(obj, row, fallbackNo) {
  const get = keys => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, k) && String(obj[k]).trim() !== '') return String(obj[k]).trim();
    }
    return '';
  };
  const cell = i => String(row[i] || '').trim();

  const phoneRaw = cell(12) || get(['เบอร์โทรศัพท์', 'โทรศัพท์', 'เบอร์โทร', 'phone']);
  const phone = normalizePhone_(phoneRaw);
  const villageNo = cell(4) || get(['หมู่ที่', 'หมู่', 'village']);
  const zone = cell(13) || get(['เขต', 'zone']);
  const name = cell(1) || get(['ชื่อ - สกุล อสม.', 'ชื่อ-สกุล', 'ชื่อ สกุล', 'ชื่อ']);
  const position = cell(2) || get(['ตำแหน่ง', 'position']) || 'อสม.';

  const ageText = cell(7) || get(['อายุ(ปี,เดือน)', 'อายุ']);
  const durationText = cell(10) || get(['นับระยะเป็น อสม.(ปี,เดือน)', 'ระยะเวลาเป็น อสม.']);
  const education = cell(11) || get(['วุฒิการศึกษา', 'การศึกษา']) || '-';
  const ageYears = parseYears_(ageText);
  const durationYears = parseYears_(durationText);

  return {
    no: cell(0) || get(['ลำดับ']) || String(fallbackNo),
    name,
    position,
    houseNo: cell(3) || get(['บ้านเลขที่']),
    villageNo,
    villageName: villageNo ? `หมู่ ${villageNo}` : '-',
    birthDate: cell(5) || get(['วดป.เกิด', 'วันเกิด']),
    birthDateAD: cell(6) || get(['วดป.เกิด คศ.']),
    ageText,
    ageYears,
    ageGroup: getAgeGroup_(ageYears),
    startYear: cell(8) || get(['ปีที่เป็น อสม.', 'เริ่มเป็น อสม.']),
    startDateAD: cell(9) || get(['ปีที่เป็น อสม.คศ']),
    education,
    workDuration: durationText,
    durationYears,
    durationGroup: getDurationGroup_(durationYears),
    phone,
    phoneRaw,
    zone,
    searchText: [name, position, villageNo, zone, phone, cell(3), education, ageText, durationText].join(' ').toLowerCase()
  };
}

function parseYears_(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/(\d+)\s*ปี/);
  if (match) return Number(match[1]);
  const onlyNumber = text.match(/^\d+$/);
  if (onlyNumber) return Number(text);
  return null;
}

function getAgeGroup_(years) {
  if (years === null || isNaN(years)) return 'ไม่ระบุอายุ';
  if (years < 30) return 'ต่ำกว่า 30 ปี';
  if (years <= 39) return '30-39 ปี';
  if (years <= 49) return '40-49 ปี';
  if (years <= 59) return '50-59 ปี';
  if (years <= 69) return '60-69 ปี';
  return '70 ปีขึ้นไป';
}

function getDurationGroup_(years) {
  if (years === null || isNaN(years)) return 'ไม่ระบุระยะเวลา';
  if (years < 5) return 'น้อยกว่า 5 ปี';
  if (years <= 9) return '5-9 ปี';
  if (years <= 14) return '10-14 ปี';
  if (years <= 19) return '15-19 ปี';
  if (years <= 24) return '20-24 ปี';
  return '25 ปีขึ้นไป';
}

function normalizePhone_(value) {
  if (!value) return '';
  let phone = String(value).replace(/[^0-9]/g, '');
  if (phone.length === 9) phone = '0' + phone;
  if (phone.length > 10) phone = phone.slice(-10);
  return phone;
}
