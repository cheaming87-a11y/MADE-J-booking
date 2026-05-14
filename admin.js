let client = null;

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const adminEmail = document.querySelector("#adminEmail");
const adminPassword = document.querySelector("#adminPassword");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const loginMessage = document.querySelector("#loginMessage");
const bookingForm = document.querySelector("#ownerBookingForm");
const bookingDate = document.querySelector("#bookingDate");
const bookingTime = document.querySelector("#bookingTime");
const saveBookingButton = document.querySelector("#saveBookingButton");
const formMessage = document.querySelector("#formMessage");
const filterDate = document.querySelector("#filterDate");
const refreshButton = document.querySelector("#refreshButton");
const bookingRows = document.querySelector("#bookingRows");
const adminMessage = document.querySelector("#adminMessage");

function setMessage(element, text, type = "") {
  element.textContent = text;
  element.className = `message ${type}`.trim();
}

function getToday() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function initSupabase() {
  const config = window.MADE_J_SUPABASE;
  if (!config || config.url.includes("YOUR_PROJECT") || config.anonKey.includes("YOUR_SUPABASE")) {
    setMessage(loginMessage, "Supabase 설정이 필요합니다.", "error");
    return null;
  }

  return window.supabase.createClient(config.url, config.anonKey);
}

function showAdmin(isAuthed) {
  loginPanel.classList.toggle("hidden", isAuthed);
  adminPanel.classList.toggle("hidden", !isAuthed);
  logoutButton.classList.toggle("hidden", !isAuthed);
}

function formatTime(value) {
  return String(value).slice(0, 5);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRows(bookings) {
  bookingRows.innerHTML = "";

  if (!bookings.length) {
    bookingRows.innerHTML = `<div class="empty-state">이 날짜에는 예약이 없습니다.</div>`;
    return;
  }

  bookings.forEach((booking) => {
    const isCancelled = booking.status === "cancelled";
    const card = document.createElement("article");
    card.className = "booking-card";

    card.innerHTML = `
      <div class="booking-time">${formatTime(booking.booking_time)}</div>
      <div class="booking-main">
        <div class="booking-top">
          <div class="booking-name">${escapeHtml(booking.customer_name)}</div>
          <span class="status ${isCancelled ? "cancelled" : ""}">${isCancelled ? "취소" : "확정"}</span>
        </div>
        ${booking.phone ? `<div class="booking-phone">${escapeHtml(booking.phone)}</div>` : ""}
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        ${isCancelled ? "" : `<button class="link-button" type="button" data-id="${booking.id}">예약 취소</button>`}
      </div>
    `;

    bookingRows.appendChild(card);
  });
}

async function loadBookings() {
  if (!client) return;

  setMessage(adminMessage, "예약 목록을 불러오는 중입니다.");

  const { data, error } = await client
    .from("bookings")
    .select("*")
    .eq("booking_date", filterDate.value)
    .order("booking_time", { ascending: true });

  if (error) {
    setMessage(adminMessage, "예약 목록을 불러오지 못했습니다.", "error");
    return;
  }

  renderRows(data || []);
  setMessage(adminMessage, `${data.length}건의 예약`, "success");
}

async function saveBooking(event) {
  event.preventDefault();
  if (!client) return;

  saveBookingButton.disabled = true;
  setMessage(formMessage, "예약을 저장하는 중입니다.");

  const payload = {
    booking_date: bookingDate.value,
    booking_time: bookingTime.value,
    customer_name: bookingForm.customerName.value.trim(),
    phone: bookingForm.phone.value.trim() || "",
    note: bookingForm.note.value.trim() || null,
    status: "confirmed"
  };

  const { error } = await insertBooking(payload);
  saveBookingButton.disabled = false;

  if (error) {
    if (error.code === "23505") {
      setMessage(formMessage, "같은 시간에 이미 예약이 있습니다.", "error");
      return;
    }

    setMessage(formMessage, "예약 저장에 실패했습니다.", "error");
    return;
  }

  bookingForm.reset();
  bookingDate.value = filterDate.value;
  bookingTime.value = "10:00";
  setMessage(formMessage, "예약을 저장했습니다.", "success");
  await loadBookings();
}

async function insertBooking(payload) {
  const result = await client.from("bookings").insert(payload);
  if (!result.error || result.error.code !== "42501") {
    return result;
  }

  const config = window.MADE_J_SUPABASE;
  const publicClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return publicClient.from("bookings").insert(payload);
}

async function login() {
  if (!client) return;

  loginButton.disabled = true;
  setMessage(loginMessage, "로그인 중입니다.");

  const { error } = await client.auth.signInWithPassword({
    email: adminEmail.value.trim(),
    password: adminPassword.value
  });

  loginButton.disabled = false;

  if (error) {
    setMessage(loginMessage, "이메일 또는 비밀번호를 확인하세요.", "error");
    return;
  }

  setMessage(loginMessage, "");
  showAdmin(true);
  await loadBookings();
}

async function logout() {
  if (!client) return;
  await client.auth.signOut();
  showAdmin(false);
  bookingRows.innerHTML = "";
  setMessage(adminMessage, "예약 목록을 불러오세요.");
}

async function cancelBooking(id) {
  if (!client) return;

  const { error } = await client
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    setMessage(adminMessage, "예약 취소에 실패했습니다.", "error");
    return;
  }

  await loadBookings();
}

document.addEventListener("DOMContentLoaded", async () => {
  const today = getToday();
  filterDate.value = today;
  bookingDate.value = today;
  bookingTime.value = "10:00";
  client = initSupabase();

  loginButton.addEventListener("click", login);
  logoutButton.addEventListener("click", logout);
  bookingForm.addEventListener("submit", saveBooking);
  adminPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  refreshButton.addEventListener("click", loadBookings);
  filterDate.addEventListener("change", () => {
    bookingDate.value = filterDate.value;
    loadBookings();
  });
  bookingRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) cancelBooking(button.dataset.id);
  });

  if (!client) return;

  const { data } = await client.auth.getSession();
  showAdmin(Boolean(data.session));
  if (data.session) await loadBookings();
});
