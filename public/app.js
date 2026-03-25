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
const today = new Date();
const yyyyMmDd = today.toISOString().slice(0, 10);
dateInput.min = yyyyMmDd;
dateInput.value = yyyyMmDd;

function showResult(message, type = 'success') {
  resultBox.className = `card ${type}`;
  resultBox.textContent = message;
  resultBox.classList.remove('hidden');
}

function renderTimeOptions(slots) {
  timeInput.innerHTML = '';
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
  state.config = await fetchJson('/api/config');
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

  const status = available > 0 ? 'ว่าง' : 'เต็ม';
}

async function initLine() {
  if (!state.config.liffId) {
    lineStatus.textContent = 'ยังไม่ได้ตั้งค่า LIFF_ID (โหมดทดสอบบนเบราว์เซอร์)';
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

    lineStatus.textContent = `เชื่อมต่อ LINE แล้ว: ${profile.displayName}`;
  } catch (error) {
    lineStatus.textContent = `เชื่อมต่อ LINE ไม่สำเร็จ: ${error.message}`;
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



(async () => {
  try {
    await loadConfig();
    await initLine();
    await updateAvailability();
    syncPeopleChips();
  } catch (error) {
    showResult(error.message, 'error');
  }
})();
