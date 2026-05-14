let client = null;
let customers = [];
let services = [];

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
const customerPicker = document.querySelector("#customerPicker");
const customerName = document.querySelector("#customerName");
const phone = document.querySelector("#phone");
const servicePicker = document.querySelector("#servicePicker");
const durationPreview = document.querySelector("#durationPreview");
const saveBookingButton = document.querySelector("#saveBookingButton");
const formMessage = document.querySelector("#formMessage");
const filterDate = document.querySelector("#filterDate");
const refreshButton = document.querySelector("#refreshButton");
const bookingRows = document.querySelector("#bookingRows");
const adminMessage = document.querySelector("#adminMessage");
const customerRows = document.querySelector("#customerRows");
const customerMessage = document.querySelector("#customerMessage");

const fallbackServices = [
  { id: "fallback-nail", name: "네일", duration_minutes: 120 },
  { id: "fallback-pedi", name: "패디", duration_minutes: 60 },
  { id: "fallback-nail-pedi", name: "네일+패디", duration_minutes: 180 },
  { id: "fallback-repair", name: "보수", duration_minutes: 30 },
  { id: "fallback-removal", name: "제거", duration_minutes: 30 }
];

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
  return String(value || "").slice(0, 5);
}

function addMinutes(timeValue, minutes) {
  const [hours, mins] = timeValue.split(":").map(Number);
  const total = hours * 60 + mins + Number(minutes || 0);
  const nextHours = Math.floor(total / 60) % 24;
  const nextMins = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMins).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedService() {
  return services.find((service) => service.id === servicePicker.value) || services[0] || fallbackServices[0];
}

function updateDurationPreview() {
  const service = selectedService();
  if (!service || !bookingTime.value) {
    durationPreview.textContent = "시술을 선택하면 종료 시간이 표시됩니다.";
    return;
  }

  const endTime = addMinutes(bookingTime.value, service.duration_minutes);
  durationPreview.textContent = `${service.name} · ${service.duration_minutes}분 · ${bookingTime.value} - ${endTime}`;
}

function renderServiceOptions() {
  const source = services.length ? services : fallbackServices;
  servicePicker.innerHTML = source
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)} · ${service.duration_minutes}분</option>`)
    .join("");
  updateDurationPreview();
}

function renderCustomerOptions() {
  const options = customers
    .map((customer) => {
      const label = customer.phone ? `${customer.name} · ${customer.phone}` : customer.name;
      return `<option value="${customer.id}">${escapeHtml(label)}</option>`;
    })
    .join("");

  customerPicker.innerHTML = `<option value="">신규 고객으로 등록</option>${options}`;
}

function renderCustomers() {
  if (!customers.length) {
    customerRows.innerHTML = `<div class="empty-state">저장된 고객이 없습니다.</div>`;
    setMessage(customerMessage, "예약 등록 시 고객 정보가 자동 저장됩니다.");
    return;
  }

  customerRows.innerHTML = customers
    .slice(0, 20)
    .map((customer) => `
      <div class="compact-item">
        <div>
          <strong>${escapeHtml(customer.name)}</strong>
          <span>${escapeHtml(customer.phone || "연락처 없음")}</span>
        </div>
      </div>
    `)
    .join("");
  setMessage(customerMessage, `${customers.length}명의 고객이 저장되어 있습니다.`, "success");
}

function renderRows(bookings) {
  bookingRows.innerHTML = "";

  if (!bookings.length) {
    bookingRows.innerHTML = `<div class="empty-state">이 날짜에는 예약이 없습니다.</div>`;
    return;
  }

  bookings.forEach((booking) => {
    const isCancelled = booking.status === "cancelled";
    const serviceText = booking.service_name || "시술 미지정";
    const endTime = booking.end_time ? formatTime(booking.end_time) : addMinutes(formatTime(booking.booking_time), booking.duration_minutes || 60);
    const card = document.createElement("article");
    card.className = "booking-card";

    card.innerHTML = `
      <div class="booking-time">
        <span>${formatTime(booking.booking_time)}</span>
        <small>${endTime}</small>
      </div>
      <div class="booking-main">
        <div class="booking-top">
          <div class="booking-name">${escapeHtml(booking.customer_name)}</div>
          <span class="status ${isCancelled ? "cancelled" : ""}">${isCancelled ? "취소" : "확정"}</span>
        </div>
        <div class="booking-service">${escapeHtml(serviceText)} · ${booking.duration_minutes || 60}분</div>
        ${booking.phone ? `<div class="booking-phone">${escapeHtml(booking.phone)}</div>` : ""}
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        ${isCancelled ? "" : `<button class="link-button" type="button" data-id="${booking.id}">예약 취소</button>`}
      </div>
    `;

    bookingRows.appendChild(card);
  });
}

async function loadServices() {
  const { data, error } = await client
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  services = error ? fallbackServices : data || fallbackServices;
  renderServiceOptions();
}

async function loadCustomers() {
  const { data, error } = await client
    .from("customers")
    .select("*")
    .order("updated_at", { ascending: false });

  customers = error ? [] : data || [];
  renderCustomerOptions();
  renderCustomers();
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

async function upsertCustomer() {
  const pickedId = customerPicker.value;
  if (pickedId) {
    return customers.find((customer) => customer.id === pickedId) || null;
  }

  const name = customerName.value.trim();
  const phoneValue = phone.value.trim();
  if (!name) return null;

  const existing = phoneValue
    ? customers.find((customer) => customer.phone === phoneValue)
    : customers.find((customer) => customer.name === name && !customer.phone);

  if (existing) {
    const { data } = await client
      .from("customers")
      .update({ name, phone: phoneValue || null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    return data || existing;
  }

  const { data, error } = await client
    .from("customers")
    .insert({ name, phone: phoneValue || null })
    .select()
    .single();

  if (error) return null;
  return data;
}

async function saveBooking(event) {
  event.preventDefault();
  if (!client) return;

  saveBookingButton.disabled = true;
  setMessage(formMessage, "예약을 저장하는 중입니다.");

  const customer = await upsertCustomer();
  const service = selectedService();
  const duration = service.duration_minutes || 60;
  const endTime = addMinutes(bookingTime.value, duration);

  const payload = {
    booking_date: bookingDate.value,
    booking_time: bookingTime.value,
    end_time: endTime,
    customer_id: customer?.id || null,
    service_id: service.id?.startsWith("fallback-") ? null : service.id,
    service_name: service.name,
    duration_minutes: duration,
    customer_name: customerName.value.trim(),
    phone: phone.value.trim() || "",
    note: bookingForm.note.value.trim() || null,
    status: "confirmed"
  };

  const { error } = await insertBooking(payload);
  saveBookingButton.disabled = false;

  if (error) {
    if (error.code === "23505") {
      setMessage(formMessage, "같은 시작 시간에 이미 예약이 있습니다.", "error");
      return;
    }

    setMessage(formMessage, "예약 저장에 실패했습니다.", "error");
    return;
  }

  bookingForm.reset();
  customerPicker.value = "";
  bookingDate.value = filterDate.value;
  bookingTime.value = "10:00";
  renderServiceOptions();
  setMessage(formMessage, "예약을 저장했습니다.", "success");
  await loadCustomers();
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
  await Promise.all([loadServices(), loadCustomers()]);
  await loadBookings();
}

async function logout() {
  if (!client) return;
  await client.auth.signOut();
  showAdmin(false);
  bookingRows.innerHTML = "";
  customerRows.innerHTML = "";
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
  renderServiceOptions();

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
  bookingTime.addEventListener("change", updateDurationPreview);
  servicePicker.addEventListener("change", updateDurationPreview);
  customerPicker.addEventListener("change", () => {
    const customer = customers.find((item) => item.id === customerPicker.value);
    if (!customer) return;
    customerName.value = customer.name;
    phone.value = customer.phone || "";
  });
  bookingRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) cancelBooking(button.dataset.id);
  });

  if (!client) return;

  const { data } = await client.auth.getSession();
  showAdmin(Boolean(data.session));
  if (data.session) {
    await Promise.all([loadServices(), loadCustomers()]);
    await loadBookings();
  }
});
