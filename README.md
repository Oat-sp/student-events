# เว็บประชาสัมพันธ์กิจกรรมนักเรียน

โปรเจกต์นี้เป็นระบบฟรีสำหรับโรงเรียนที่ไม่มี Google Workspace โดยใช้ Google Sheet เป็นฐานข้อมูล, Google Apps Script Web App เป็นฟอร์มสำหรับครู และ GitHub Pages เป็นหน้าเว็บให้นักเรียนดูข้อมูลกิจกรรม/การแข่งขัน

## โครงสร้างไฟล์

```text
apps-script/
  Code.gs
  Index.html
docs/
  index.html
  style.css
  script.js
README.md
```

## 1. สร้าง Google Sheet

1. เปิด Google Drive ด้วยบัญชี Google ฟรี
2. สร้าง Google Sheet ใหม่
3. ตั้งชื่อไฟล์เป็น `student-events-data`
4. ไม่จำเป็นต้องสร้างชีตหรือหัวตารางเอง ระบบจะสร้างชีตชื่อ `events` และหัวตารางให้อัตโนมัติเมื่อบันทึกข้อมูลครั้งแรก

หัวตารางที่ระบบใช้คือ:

```text
timestamp, title, posterImage, type, category, organizer, m1, m2, m3, m4, m5, m6, interestTags, featureTags, portfolioTags, registerOpenDate, registerOpenTime, registerCloseDate, registerCloseTime, submissionDate, eventStartDate, eventEndDate, location, teamMemberCount, summary, sourceLink, documentLinks, contactTeacher, isPublished
```

ถ้าเคยใช้หัวตารางรุ่นเก่าที่มี `eventDate` ระบบจะย้ายค่าเดิมไปที่ `eventStartDate` ให้อัตโนมัติเมื่อ Apps Script ถูกเรียกใช้งานครั้งถัดไป

## 2. วางโค้ด Google Apps Script

1. ใน Google Sheet ไปที่ `Extensions > Apps Script`
2. เปิดไฟล์ `Code.gs` ใน Apps Script แล้ววางโค้ดจาก `apps-script/Code.gs`
3. สร้างไฟล์ HTML ใหม่ชื่อ `Index`
4. วางโค้ดจาก `apps-script/Index.html` ลงในไฟล์ `Index.html`
5. กด Save

Apps Script นี้มีฟังก์ชันหลัก:

- `doGet(e)` แสดงฟอร์มครู และส่ง JSON เมื่อเรียกด้วย `?action=events`
- `saveEvent(form)` บันทึกข้อมูลกิจกรรมลงชีต `events`
- `getEvents()` ส่งข้อมูลกิจกรรมที่เผยแพร่แล้ว โดยแปลงระดับชั้นเป็น boolean และแปลงแท็กเป็น array
- ระบบจะตรวจชื่อไฟล์ Google Sheet และเปลี่ยนเป็น `student-events-data` ให้อัตโนมัติ

## 3. Deploy เป็น Web App

1. ใน Apps Script กด `Deploy > New deployment`
2. เลือกประเภทเป็น `Web app`
3. ตั้งค่า:
   - `Execute as`: Me
   - `Who has access`: Anyone
4. กด Deploy
5. อนุญาตสิทธิ์ตามที่ Google แจ้ง
6. คัดลอก Web App URL ที่ได้ ซึ่งมักมีรูปแบบประมาณ:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

ทดสอบฟอร์มครูโดยเปิด URL นี้ในเบราว์เซอร์ ถ้าต้องการดู JSON สำหรับหน้า GitHub Pages ให้เติม:

```text
?action=events
```

เช่น:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=events
```

## 4. ตั้งค่า DATA_URL สำหรับ GitHub Pages

โปรเจกต์นี้ตั้งค่า `DATA_URL` ไว้แล้วเป็น:

```text
https://script.google.com/macros/s/AKfycbwUt_kyuMqXbPnEWx2CLNDGl2RHaCt-jXVeLkVeps-q6-2OXbNa2M0Npxz4yykn8Q6o/exec?action=events
```

ถ้าต้อง deploy Apps Script ใหม่ในอนาคต ให้เปิดไฟล์ `docs/script.js` แล้วแก้บรรทัดนี้:

```js
const DATA_URL = 'PUT_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE?action=events';
```

ให้เป็น URL จริงของ Web App เช่น:

```js
const DATA_URL = 'https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=events';
```

หลังแก้แล้ว commit และ push ขึ้น GitHub

## 5. เปิด GitHub Pages

1. ไปที่ repository บน GitHub
2. เปิด `Settings > Pages`
3. ในส่วน `Build and deployment` เลือก:
   - `Source`: Deploy from a branch
   - `Branch`: `main`
   - Folder: `/docs`
4. กด Save
5. รอสักครู่ GitHub จะแสดง URL ของเว็บไซต์

## การใช้งาน

### ครู

1. เปิด URL ของ Apps Script Web App
2. กรอกข้อมูลกิจกรรม
3. เลือกระดับชั้นและแท็กที่เกี่ยวข้อง
4. ใส่วันเปิด/ปิดรับสมัคร พร้อมเวลาได้ถ้าประกาศระบุไว้
5. ใส่วันเริ่มและวันจบแข่งขัน/กิจกรรม ถ้ามีหลายวัน
6. ใส่จำนวนสมาชิกในทีมถ้าต้องการแสดงบนหน้าเว็บ ถ้าเว้นว่าง ระบบจะไม่แสดงช่องนี้
7. ใส่ลิงก์รูปประชาสัมพันธ์จากต้นทาง
8. ใส่ลิงก์เอกสารแบบหลายบรรทัด เช่น:

```text
ระเบียบการแข่งขัน: https://example.com/rules.pdf
ใบสมัคร: https://example.com/form
```

9. กดบันทึกข้อมูล

### นักเรียน

1. เปิด URL GitHub Pages
2. ค้นหาหรือกรองกิจกรรมตามประเภท หมวดหมู่ ระดับชั้น และแท็ก
3. เปิดลิงก์ประกาศต้นทางหรือเอกสารที่เกี่ยวข้อง
4. ถ้าสนใจเข้าร่วม ให้ติดต่อครูผู้ประสานงานตามข้อมูลในการ์ดกิจกรรม

## หมายเหตุ

- ระบบไม่เก็บไฟล์รูปภาพหรือเอกสารไว้เอง ใช้เป็นลิงก์จากต้นทางเท่านั้น
- ถ้าไม่ต้องการเผยแพร่รายการใด ให้เอาเครื่องหมายถูกออกจาก `เผยแพร่ให้นักเรียนเห็น` ในฟอร์ม หรือแก้ค่า `isPublished` ในชีตเป็น `FALSE`
- หน้าเว็บจะคำนวณสถานะรับสมัครจากวันที่/เวลาเปิดรับสมัคร วันที่/เวลาปิดรับสมัคร และวันกิจกรรมโดยอัตโนมัติ
- แท็บ `สรุปประชาสัมพันธ์` มีข้อความพร้อมคัดลอกสำหรับส่งต่อใน LINE หรือช่องทางประชาสัมพันธ์ของโรงเรียน
