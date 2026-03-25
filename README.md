# LINE Mini App: ระบบจองโต๊ะ

โปรเจกต์ตัวอย่าง LINE Mini App สำหรับร้านอาหาร โดยใช้ LIFF + Node.js/Express

## ความสามารถ

- ลูกค้าเลือกวันที่ เวลา จำนวนคน แล้วส่งจองโต๊ะ
- ตรวจจำนวนโต๊ะว่างตามช่วงเวลาอัตโนมัติ
- เชื่อมต่อบัญชี LINE ผ่าน LIFF (ถ้ากำหนด `LIFF_ID`)
- มี REST API สำหรับดึง/เพิ่มรายการจอง

## วิธีใช้งาน

1. ติดตั้ง dependency

   ```bash
   npm install
   ```

2. ตั้งค่า environment (คัดลอก `.env.example` แล้วแก้ไข)

   ```bash
   cp .env.example .env
   ```

3. รันเซิร์ฟเวอร์

   ```bash
   npm start
   ```

4. เปิดที่ `http://localhost:3000`

## ตั้งค่า LIFF

1. สร้าง LIFF App ใน LINE Developers Console
2. นำ `LIFF_ID` มาใส่ใน `.env`
3. ตั้งค่า Endpoint URL ให้ตรงกับโดเมนที่ deploy

## API

- `GET /api/config` ดูค่าคอนฟิกของระบบ
- `GET /api/bookings?date=YYYY-MM-DD` ดูรายการจองของวันนั้น
- `POST /api/bookings` เพิ่มรายการจอง

ตัวอย่าง request สำหรับ `POST /api/bookings`

```json
{
  "date": "2026-03-25",
  "time": "18:00",
  "people": 4,
  "name": "สมหญิง",
  "phone": "0812345678",
  "note": "ขอโต๊ะด้านใน"
}
```

## หมายเหตุ production

- ควรใช้ฐานข้อมูลจริง (PostgreSQL/MySQL) แทนไฟล์ JSON
- ควรเพิ่มระบบยืนยัน OTP หรือ anti-spam
- ควรเพิ่มหน้าแอดมินจัดการการจอง
