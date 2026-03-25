const state = {
  config: null,
  lineUserId: '',
  lineDisplayName: ''
};

const form = document.getElementById('booking-form');
const dateInput = document.getElementById('date');
const timeInput = document.getElementById('time');
const submitBtn = document.getElementById('submit-btn');
const resultBox = document.getElementById('result');
const availabilityText = document.getElementById('availability-text');
const lineStatus = document.getElementById('line-status');
const peopleInput = document.getElementById('people');
const decreasePeopleBtn = document.getElementById('decrease-people');
const increasePeopleBtn = document.getElementById('increase-people');
const langThBtn = document.getElementById('lang-th');
const langEnBtn = document.getElementById('lang-en');
const i18nNodes = document.querySelectorAll('[data-i18n]');

const i18n = {
  th: {
    heroSubtitle: 'ไก่ทอดเกาหลีสูตรพิเศษ กรอบนอกนุ่มใน',
    lineConnecting: 'กำลังเชื่อมต่อ LINE...',
    lineConnected: 'เชื่อมต่อ LINE แล้ว',
    lineNotConfigured: 'ยังไม่ได้ตั้งค่า LIFF_ID (โหมดทดสอบบนเบราว์เซอร์)',
    lineFailed: 'เชื่อมต่อ LINE ไม่สำเร็จ',
    bookTable: 'จองโต๊ะ',
    branchPlaceholder: 'เลือกสาขาที่ต้องการ',
    timePlaceholder: 'เลือกเวลา',
    next: 'ถัดไป',
    availabilityTitle: 'สถานะโต๊ะว่าง',
    availabilityHint: 'เลือกวันที่และเวลาเพื่อดูสถานะ',
    availability: 'เวลา {time} • {status} • เหลือ {available} / {total} โต๊ะ',
    statusAvailable: 'ว่าง',
    statusFull: 'เต็ม',
    navBooking: 'จองโต๊ะ',
    navMenu: 'เมนู',
    navReservations: 'การจอง',
    navProfile: 'โปรไฟล์'
  },
  en: {
    heroSubtitle: 'Special Korean fried chicken, crispy outside and juicy inside',
    lineConnecting: 'Connecting to LINE...',
    lineConnected: 'Connected to LINE',
    lineNotConfigured: 'LIFF_ID is not configured (browser test mode)',
    lineFailed: 'LINE connection failed',
    bookTable: 'Book a Table',
    branchPlaceholder: 'Select branch',
    timePlaceholder: 'Select time',
    next: 'Next',
    availabilityTitle: 'Table Availability',
    availabilityHint: 'Select date and time to view availability',
    availability: 'Time {time} • {status} • {available} / {total} tables left',
    statusAvailable: 'Available',
    statusFull: 'Full',
    navBooking: 'Book',
    navMenu: 'Menu',
    navReservations: 'Reservations',
    navProfile: 'Profile'
  }
};

const today = new Date();
const yyyyMmDd = today.toISOString().slice(0, 10);
dateInput.min = yyyyMmDd;
dateInput.value = yyyyMmDd;
state.lang = 'th';

function showResult(message, type = 'success') {
  resultBox.className = `card ${type}`;
  resultBox.textContent = message;
  resultBox.classList.remove('hidden');
}

function renderTimeOptions(slots) {
  timeInput.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = t('timePlaceholder');
  placeholder.disabled = true;
  placeholder.selected = true;
  timeInput.appendChild(placeholder);

  for (const slot of slots) {
    const option = document.createElement('option');
    option.value = slot;
    option.textContent = slot;
    timeInput.appendChild(option);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

async function loadConfig() {
  try {
    state.config = await fetchJson('/api/config');
  } catch {
    const fallbackSlots = [];
    for (let hour = 10; hour <= 21; hour += 1) {
      fallbackSlots.push(`${String(hour).padStart(2, '0')}:00`);
    }

    state.config = {
      tableCount: 10,
      slots: fallbackSlots,
      liffId: ''
    };
  }

  renderTimeOptions(state.config.slots);
}

async function updateAvailability() {
  const date = dateInput.value;
  const time = timeInput.value;
  if (!date || !time) {
    return;
  }

  const bookings = await fetchJson(`/api/bookings?date=${date}`);
  const occupied = bookings.filter((booking) => booking.time === time).length;
  const available = state.config.tableCount - occupied;

  const status = available > 0 ? t('statusAvailable') : t('statusFull');
  availabilityText.textContent = t('availability')
    .replace('{time}', time)
    .replace('{status}', status)
    .replace('{available}', String(available))
    .replace('{total}', String(state.config.tableCount));
}

function t(key) {
  return i18n[state.lang][key] || key;
}

function applyLanguage(lang) {
  state.lang = lang;
  for (const node of i18nNodes) {
    const key = node.dataset.i18n;
    if (i18n[lang][key]) {
      node.textContent = i18n[lang][key];
    }
  }

  langThBtn.classList.toggle('active', lang === 'th');
  langEnBtn.classList.toggle('active', lang === 'en');

  if (state.config?.slots?.length) {
    const currentTime = timeInput.value;
    renderTimeOptions(state.config.slots);
    if (state.config.slots.includes(currentTime)) {
      timeInput.value = currentTime;
    }
  }
}

async function initLine() {
  if (!state.config.liffId) {
    lineStatus.textContent = t('lineNotConfigured');
    return;
  }

  try {
    await liff.init({ liffId: state.config.liffId });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    state.lineUserId = profile.userId;
    state.lineDisplayName = profile.displayName;

    lineStatus.textContent = `${t('lineConnected')}: ${profile.displayName}`;
  } catch (error) {
    lineStatus.textContent = `${t('lineFailed')}: ${error.message}`;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.lineUserId = state.lineUserId;

  try {
    const booking = await fetchJson('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showResult(`จองสำเร็จ เลขที่การจอง: ${booking.id.slice(0, 8)} (${booking.date} ${booking.time})`, 'success');
    await updateAvailability();
  } catch (error) {
    showResult(error.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

for (const element of [dateInput, timeInput]) {
  element.addEventListener('change', () => {
    updateAvailability().catch((error) => {
      showResult(error.message, 'error');
    });
  });
}

function adjustPeople(delta) {
  const current = Number.parseInt(peopleInput.value, 10) || 1;
  const next = Math.max(1, Math.min(20, current + delta));
  peopleInput.value = String(next);
}

decreasePeopleBtn.addEventListener('click', () => adjustPeople(-1));
increasePeopleBtn.addEventListener('click', () => adjustPeople(1));
langThBtn.addEventListener('click', () => {
  applyLanguage('th');
  updateAvailability().catch(() => {});
});
langEnBtn.addEventListener('click', () => {
  applyLanguage('en');
  updateAvailability().catch(() => {});
});

(async () => {
  try {
    applyLanguage('th');
    await loadConfig();
    await initLine();
    await updateAvailability();
  } catch (error) {
    showResult(error.message, 'error');
  }
})();
