let client = null;

const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const adminEmail = document.querySelector("#adminEmail");
const adminPassword = document.querySelector("#adminPassword");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const loginMessage = document.querySelector("#loginMessage");
const filterDate = document.querySelector("#filterDate");
const refreshButton = document.querySelector("#refreshButton");
const bookingRows = document.querySelector("#bookingRows");
const adminMessage = document.querySelector("#adminMessage");

function setLoginMessage(text, type = "") {
  loginMessage.textContent = text;
  loginMessage.className = `message ${type}`.trim();
}

function setAdminMessage(text, type = "") {
  adminMessage.textContent = text;
  adminMessage.className = `message ${type}`.trim();
}

function getToday() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 10);
}

function initSupabase() {
  const config = window.MADE_J_SUPABASE;
  if (!config || config.url.includes("YOUR_PROJECT") || config.anonKey.includes("YOUR_SUPABASE")) {
    setLoginMessage("Supabase 설정이 필요합니다. supabase-config.js를 먼저 수정하세요.", "error");
    return null;
  }

  return window.supabase.createClient(config.url, config.anonKey);
}

function showAdmin(isAuthed) {
  loginPanel.classList.toggle("hidden", isAuthed);
  adminPanel.classList.toggle("hidden", !isAuthed);
}

function formatTime(value) {
  return String(value).slice(0, 5);
}

function renderRows(bookings) {
  bookingRows.innerHTML = "";

  if (!bookings.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="7">예약 내역이 없습니다.</td>`;
    bookingRows.appendChild(row);
    return;
  }

  bookings.forEach((booking) => {
    const row = document.createElement("tr");
    const isCancelled = booking.status === "cancelled";

    row.innerHTML = `
      <td>${booking.booking_date}</td>
      <td>${formatTime(booking.booking_time)}</td>
      <td>${escapeHtml(booking.customer_name)}</td>
      <td>${escapeHtml(booking.phone)}</td>
      <td>${escapeHtml(booking.note || "")}</td>
      <td><span class="status ${isCancelled ? "cancelled" : ""}">${isCancelled ? "취소" : "확정"}</span></td>
      <td>${isCancelled ? "" : `<button class="link-button" type="button" data-id="${booking.id}">취소</button>`}</td>
    `;

    bookingRows.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadBookings() {
  if (!client) return;

  setAdminMessage("예약 목록을 불러오는 중입니다.");

  const { data, error } = await client
    .from("bookings")
    .select("*")
    .eq("booking_date", filterDate.value)
    .order("booking_time", { ascending: true });

  if (error) {
    setAdminMessage("예약 목록을 불러오지 못했습니다.", "error");
    return;
  }

  renderRows(data || []);
  setAdminMessage(`${data.length}건의 예약을 표시했습니다.`, "success");
}

async function login() {
  if (!client) return;

  loginButton.disabled = true;
  setLoginMessage("로그인 중입니다.");

  const { error } = await client.auth.signInWithPassword({
    email: adminEmail.value.trim(),
    password: adminPassword.value
  });

  loginButton.disabled = false;

  if (error) {
    setLoginMessage("로그인에 실패했습니다.", "error");
    return;
  }

  setLoginMessage("");
  showAdmin(true);
  await loadBookings();
}

async function logout() {
  if (!client) return;
  await client.auth.signOut();
  showAdmin(false);
  bookingRows.innerHTML = "";
  setAdminMessage("");
}

async function cancelBooking(id) {
  if (!client) return;

  const { error } = await client
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    setAdminMessage("예약 취소에 실패했습니다.", "error");
    return;
  }

  await loadBookings();
}

document.addEventListener("DOMContentLoaded", async () => {
  filterDate.value = getToday();
  client = initSupabase();

  loginButton.addEventListener("click", login);
  logoutButton.addEventListener("click", logout);
  adminPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  refreshButton.addEventListener("click", loadBookings);
  filterDate.addEventListener("change", loadBookings);
  bookingRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) cancelBooking(button.dataset.id);
  });

  if (!client) return;

  const { data } = await client.auth.getSession();
  showAdmin(Boolean(data.session));
  if (data.session) await loadBookings();
});
