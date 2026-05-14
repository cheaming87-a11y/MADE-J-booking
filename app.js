const businessHours = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

let selectedTime = "";
let client = null;

const form = document.querySelector("#bookingForm");
const dateInput = document.querySelector("#bookingDate");
const timeGrid = document.querySelector("#timeGrid");
const message = document.querySelector("#formMessage");
const submitButton = document.querySelector("#submitButton");

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function getToday() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function normalizeDbTime(value) {
  return String(value).slice(0, 5);
}

function initSupabase() {
  const config = window.MADE_J_SUPABASE;
  if (!config || config.url.includes("YOUR_PROJECT") || config.anonKey.includes("YOUR_SUPABASE")) {
    setMessage("Supabase 설정이 필요합니다. supabase-config.js를 먼저 수정하세요.", "error");
    submitButton.disabled = true;
    return null;
  }

  return window.supabase.createClient(config.url, config.anonKey);
}

async function loadBookedTimes() {
  selectedTime = "";
  const bookingDate = dateInput.value;
  renderTimeButtons(new Set());

  if (!client || !bookingDate) return;

  const { data, error } = await client
    .from("booked_slots")
    .select("booking_time")
    .eq("booking_date", bookingDate)
    .order("booking_time", { ascending: true });

  if (error) {
    setMessage("예약 시간을 불러오지 못했습니다.", "error");
    return;
  }

  const booked = new Set((data || []).map((item) => normalizeDbTime(item.booking_time)));
  renderTimeButtons(booked);
}

function renderTimeButtons(booked) {
  timeGrid.innerHTML = "";

  businessHours.forEach((time) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-option";
    button.textContent = time;
    button.disabled = booked.has(time);
    button.setAttribute("aria-pressed", selectedTime === time ? "true" : "false");

    button.addEventListener("click", () => {
      selectedTime = time;
      document.querySelectorAll(".time-option").forEach((item) => {
        item.setAttribute("aria-pressed", item.textContent === time ? "true" : "false");
      });
    });

    timeGrid.appendChild(button);
  });
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!client) return;
  if (!selectedTime) {
    setMessage("예약 시간을 선택하세요.", "error");
    return;
  }

  submitButton.disabled = true;
  setMessage("예약을 저장하는 중입니다.");

  const payload = {
    booking_date: dateInput.value,
    booking_time: selectedTime,
    customer_name: form.customerName.value.trim(),
    phone: form.phone.value.trim(),
    note: form.note.value.trim() || null,
    status: "confirmed"
  };

  const { error } = await client.from("bookings").insert(payload);

  submitButton.disabled = false;

  if (error) {
    if (error.code === "23505") {
      setMessage("이미 예약된 시간입니다. 다른 시간을 선택하세요.", "error");
      await loadBookedTimes();
      return;
    }

    setMessage("예약 저장에 실패했습니다. 잠시 후 다시 시도하세요.", "error");
    return;
  }

  form.reset();
  dateInput.value = getToday();
  selectedTime = "";
  setMessage("예약이 접수되었습니다.", "success");
  await loadBookedTimes();
}

document.addEventListener("DOMContentLoaded", async () => {
  dateInput.min = getToday();
  dateInput.value = getToday();
  client = initSupabase();
  renderTimeButtons(new Set());

  dateInput.addEventListener("change", loadBookedTimes);
  form.addEventListener("submit", handleSubmit);

  await loadBookedTimes();
});
