const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const STORE_PATH = path.join(__dirname, 'data', 'bookings.json');

const OPEN_HOUR = Number(process.env.OPEN_HOUR || 10);
const CLOSE_HOUR = Number(process.env.CLOSE_HOUR || 22);
const TABLE_COUNT = Number(process.env.TABLE_COUNT || 10);
const SLOT_MINUTES = Number(process.env.SLOT_MINUTES || 60);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function ensureStore() {
  const dirPath = path.dirname(STORE_PATH);
  await fs.mkdir(dirPath, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify([], null, 2), 'utf8');
  }
}

async function readBookings() {
  const content = await fs.readFile(STORE_PATH, 'utf8');
  return JSON.parse(content);
}

async function writeBookings(bookings) {
  await fs.writeFile(STORE_PATH, JSON.stringify(bookings, null, 2), 'utf8');
}

function buildSlots() {
  const slots = [];
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += SLOT_MINUTES / 60) {
    const h = String(hour).padStart(2, '0');
    slots.push(`${h}:00`);
  }
  return slots;
}

function validateBooking(payload) {
  const required = ['date', 'time', 'people', 'name', 'phone'];
  for (const key of required) {
    if (!payload[key]) {
      return `${key} is required`;
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return 'date must be YYYY-MM-DD';
  }

  if (!/^\d{2}:\d{2}$/.test(payload.time)) {
    return 'time must be HH:mm';
  }

  const people = Number(payload.people);
  if (!Number.isInteger(people) || people <= 0 || people > 20) {
    return 'people must be an integer between 1 and 20';
  }

  return null;
}

app.get('/api/config', (_req, res) => {
  res.json({
    openHour: OPEN_HOUR,
    closeHour: CLOSE_HOUR,
    tableCount: TABLE_COUNT,
    slotMinutes: SLOT_MINUTES,
    slots: buildSlots(),
    liffId: process.env.LIFF_ID || ''
  });
});

app.get('/api/bookings', async (req, res) => {
  try {
    const { date } = req.query;
    const bookings = await readBookings();
    const result = date ? bookings.filter((b) => b.date === date) : bookings;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Cannot read bookings', detail: error.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const validationError = validateBooking(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const bookings = await readBookings();
    const existing = bookings.filter((b) => b.date === req.body.date && b.time === req.body.time);

    if (existing.length >= TABLE_COUNT) {
      return res.status(409).json({ error: 'โต๊ะเต็มในช่วงเวลานี้ กรุณาเลือกเวลาอื่น' });
    }

    const record = {
      id: crypto.randomUUID(),
      date: req.body.date,
      time: req.body.time,
      people: Number(req.body.people),
      name: req.body.name,
      phone: req.body.phone,
      note: req.body.note || '',
      lineUserId: req.body.lineUserId || '',
      createdAt: new Date().toISOString()
    };

    bookings.push(record);
    await writeBookings(bookings);

    return res.status(201).json(record);
  } catch (error) {
    return res.status(500).json({ error: 'Cannot create booking', detail: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

ensureStore()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LINE Mini App booking server running at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize data store:', error);
    process.exit(1);
  });
