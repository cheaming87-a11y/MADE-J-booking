let client = null;
let customers = [];
let customerBookings = [];
let services = [];
let monthCursor = new Date();

const screenTitle = document.querySelector("#screenTitle");
const loginPanel = document.querySelector("#loginPanel");
const adminPanel = document.querySelector("#adminPanel");
const adminEmail = document.querySelector("#adminEmail");
const adminPassword = document.querySelector("#adminPassword");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const loginMessage = document.querySelector("#loginMessage");
const calendarTabButton = document.querySelector("#calendarTabButton");
const customerTabButton = document.querySelector("#customerTabButton");
const calendarView = document.querySelector("#calendarView");
const bookingView = document.querySelector("#bookingView");
const customerView = document.querySelector("#customerView");
const calendarTitle = document.querySelector("#calendarTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const prevMonthButton = document.querySelector("#prevMonthButton");
const nextMonthButton = document.querySelector("#nextMonthButton");
const backToCalendarButton = document.querySelector("#backToCalendarButton");
const bookingForm = document.querySelector("#ownerBookingForm");
const bookingDate = document.querySelector("#bookingDate");
const bookingTime = document.querySelector("#bookingTime");
const customerName = document.querySelector("#customerName");
const phone = document.querySelector("#phone");
const servicePicker = document.querySelector("#servicePicker");
const saveBookingButton = document.querySelector("#saveBookingButton");
const formMessage = document.querySelector("#formMessage");
const filterDate = document.querySelector("#filterDate");
const refreshButton = document.querySelector("#refreshButton");
const bookingRows = document.querySelector("#bookingRows");
const adminMessage = document.querySelector("#adminMessage");
const customerRows = document.querySelector("#customerRows");
const customerMessage = document.querySelector("#customerMessage");
const customerSearch = document.querySelector("#customerSearch");

const fallbackServices = [
  { id: "fallback-nail", name: "네일" },
  { id: "fallback-pedi", name: "패디" },
  { id: "fallback-nail-pedi", name: "네일+패디" },
  { id: "fallback-repair", name: "보수" },
  { id: "fallback-removal", name: "제거" }
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

function toDateKey(date) {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
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

function showView(viewName) {
  const isCalendar = viewName === "calendar";
  const isCustomer = viewName === "customers";
  calendarView.classList.toggle("hidden", !isCalendar);
  bookingView.classList.toggle("hidden", viewName !== "booking");
  customerView.classList.toggle("hidden", !isCustomer);
  calendarTabButton.classList.toggle("active", isCalendar || viewName === "booking");
  customerTabButton.classList.toggle("active", isCustomer);
  screenTitle.textContent = isCustomer ? "고객 DB" : "예약 관리";
}

function formatTime(value) {
  return String(value || "").slice(0, 5);
}

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((end - start) / 86400000);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function activeCustomers() {
  return customers.filter((customer) => customer.is_active !== false);
}

function selectedService() {
  return services.find((service) => service.id === servicePicker.value) || services[0] || fallbackServices[0];
}

function renderServiceOptions() {
  const source = services.length ? services : fallbackServices;
  servicePicker.innerHTML = source
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`)
    .join("");
}

function customerMatchesBooking(customer, booking) {
  if (booking.customer_id && booking.customer_id === customer.id) return true;
  const samePhone = customer.phone && booking.phone && customer.phone === booking.phone;
  const sameName = customer.name && booking.customer_name && customer.name === booking.customer_name;
  return Boolean(samePhone || sameName);
}

function customerStats(customer) {
  const dates = customerBookings
    .filter((booking) => customerMatchesBooking(customer, booking))
    .map((booking) => booking.booking_date)
    .filter(Boolean)
    .sort();
  const uniqueDates = [...new Set(dates)];
  const visitCount = uniqueDates.length;
  const recentVisit = visitCount ? uniqueDates[visitCount - 1] : "없음";
  if (uniqueDates.length < 2) {
    return { visitCount, recentVisit, cycleText: "계산 전" };
  }
  const intervals = [];
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const gap = daysBetween(uniqueDates[index - 1], uniqueDates[index]);
    if (gap >= 0) intervals.push(gap);
  }
  const average = intervals.reduce((sum, gap) => sum + gap, 0) / intervals.length;
  return { visitCount, recentVisit, cycleText: `${Math.round(average)}일` };
}

function statsForBooking(booking) {
  const customer = customers.find((item) => customerMatchesBooking(item, booking));
  if (!customer) return { recentVisit: "없음", cycleText: "계산 전" };
  const datesBefore = customerBookings
    .filter((item) => customerMatchesBooking(customer, item))
    .map((item) => item.booking_date)
    .filter((date) => date && date < booking.booking_date)
    .sort();
  const uniqueDates = [...new Set(datesBefore)];
  const recentVisit = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : "없음";
  return { ...customerStats(customer), recentVisit };
}

function bookingsForDate(dateKey) {
  return customerBookings.filter((booking) => booking.booking_date === dateKey);
}

function renderCalendar() {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = getToday();
  calendarTitle.textContent = `${year}년 ${month + 1}월`;
  calendarGrid.innerHTML = "";
  for (let index = 0; index < first.getDay(); index += 1) {
    calendarGrid.appendChild(document.createElement("div"));
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const count = bookingsForDate(dateKey).length;
    const button = document.createElement("button");
    button.className = "calendar-day";
    if (dateKey === today) button.classList.add("today");
    button.type = "button";
    button.dataset.date = dateKey;
    button.innerHTML = `<strong>${day}</strong>${count ? `<span>${count}건</span>` : ""}`;
    calendarGrid.appendChild(button);
  }
}

function renderCustomers() {
  const query = customerSearch.value.trim().toLowerCase();
  const visibleCustomers = activeCustomers().filter((customer) => {
    if (!query) return true;
    return `${customer.name || ""} ${customer.phone || ""}`.toLowerCase().includes(query);
  });
  const displayCustomers = visibleCustomers.slice(0, 50);
  if (!visibleCustomers.length) {
    customerRows.innerHTML = `<div class="empty-state">${query ? "검색 결과가 없습니다." : "저장된 고객이 없습니다."}</div>`;
    setMessage(customerMessage, query ? "다른 이름이나 연락처로 검색해보세요." : "예약 등록 시 고객 정보가 자동 저장됩니다.");
    return;
  }
  customerRows.innerHTML = displayCustomers
    .map((customer) => {
      const stats = customerStats(customer);
      return `
        <div class="customer-card">
          <div class="customer-main">
            <strong>${escapeHtml(customer.name)}</strong>
            <span>${escapeHtml(customer.phone || "연락처 없음")}</span>
          </div>
          <div class="customer-stats">
            <span>방문 ${stats.visitCount}회</span>
            <span>최근 ${escapeHtml(stats.recentVisit)}</span>
            <span>주기 ${escapeHtml(stats.cycleText)}</span>
          </div>
          <div class="customer-actions">
            <button class="mini-button" type="button" data-action="edit-customer" data-id="${customer.id}">수정</button>
            <button class="mini-button danger" type="button" data-action="delete-customer" data-id="${customer.id}">삭제</button>
          </div>
        </div>
      `;
    })
    .join("");
  const suffix = visibleCustomers.length > displayCustomers.length ? ` · 최근 ${displayCustomers.length}명 표시` : "";
  setMessage(customerMessage, `${visibleCustomers.length}명의 고객${suffix}`, "success");
}

function renderRows(bookings) {
  bookingRows.innerHTML = "";
  if (!bookings.length) {
    bookingRows.innerHTML = `<div class="empty-state">이 날짜에는 예약이 없습니다.</div>`;
    return;
  }
  bookings.forEach((booking) => {
    const stats = statsForBooking(booking);
    const serviceName = booking.service_name || "시술 미지정";
    const card = document.createElement("article");
    card.className = "booking-card";
    card.innerHTML = `
      <div class="booking-time"><span>${formatTime(booking.booking_time)}</span></div>
      <div class="booking-main">
        <div class="booking-top">
          <div class="booking-name">${escapeHtml(booking.customer_name)}</div>
          <span class="status">예약</span>
        </div>
        <div class="booking-service">${escapeHtml(serviceName)}</div>
        ${booking.phone ? `<div class="booking-phone">${escapeHtml(booking.phone)}</div>` : ""}
        <div class="booking-service">마지막 방문 ${escapeHtml(stats.recentVisit)} · 재방문주기 ${escapeHtml(stats.cycleText)}</div>
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        <button class="link-button" type="button" data-id="${booking.id}">예약 삭제</button>
      </div>
    `;
    bookingRows.appendChild(card);
  });
}

async function loadServices() {
  const { data, error } = await client
    .from("services")
    .select("id,name,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  services = error ? fallbackServices : data || fallbackServices;
  renderServiceOptions();
}

async function loadCustomers() {
  const [{ data: customerData, error: customerError }, { data: bookingData }] = await Promise.all([
    client.from("customers").select("*").order("updated_at", { ascending: false }),
    client.from("bookings").select("id, customer_id, customer_name, phone, booking_date").order("booking_date", { ascending: true })
  ]);
  customers = customerError ? [] : customerData || [];
  customerBookings = bookingData || [];
  renderCustomers();
  renderCalendar();
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
  const name = customerName.value.trim();
  const phoneValue = phone.value.trim();
  if (!name) return null;
  const existing = customers.find((customer) => {
    const samePhone = phoneValue && customer.phone === phoneValue;
    const sameName = customer.name === name;
    return samePhone || sameName;
  });
  if (existing) {
    const { data } = await client
      .from("customers")
      .update({ name, phone: phoneValue || existing.phone || null, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    return data || existing;
  }
  const { data, error } = await client
    .from("customers")
    .insert({ name, phone: phoneValue || null, is_active: true })
    .select()
    .single();
  return error ? null : data;
}

async function saveBooking(event) {
  event.preventDefault();
  if (!client) return;
  saveBookingButton.disabled = true;
  setMessage(formMessage, "예약을 저장하는 중입니다.");
  const customer = await upsertCustomer();
  const service = selectedService();
  const payload = {
    booking_date: bookingDate.value,
    booking_time: bookingTime.value,
    end_time: null,
    customer_id: customer?.id || null,
    service_id: service.id?.startsWith("fallback-") ? null : service.id,
    service_name: service.name,
    duration_minutes: 0,
    customer_name: customerName.value.trim(),
    phone: phone.value.trim() || "",
    note: bookingForm.note.value.trim() || null,
    status: "confirmed"
  };
  const { error } = await client.from("bookings").insert(payload);
  saveBookingButton.disabled = false;
  if (error) {
    setMessage(formMessage, error.code === "23505" ? "같은 시간에 이미 예약이 있습니다." : "예약 저장에 실패했습니다.", "error");
    return;
  }
  bookingForm.reset();
  bookingDate.value = filterDate.value;
  bookingTime.value = "10:00";
  renderServiceOptions();
  setMessage(formMessage, "예약을 저장했습니다.", "success");
  await loadCustomers();
  await loadBookings();
}

async function editCustomer(id) {
  const customer = customers.find((item) => item.id === id);
  if (!customer) return;
  const nextName = window.prompt("고객명", customer.name);
  if (nextName === null) return;
  const nextPhone = window.prompt("연락처", customer.phone || "");
  if (nextPhone === null) return;
  const { error } = await client
    .from("customers")
    .update({ name: nextName.trim(), phone: nextPhone.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    setMessage(customerMessage, "고객 수정에 실패했습니다.", "error");
    return;
  }
  await loadCustomers();
  await loadBookings();
}

async function deleteCustomer(id) {
  const customer = customers.find((item) => item.id === id);
  if (!customer) return;
  if (!window.confirm(`${customer.name} 고객을 고객 DB에서 삭제할까요? 예약 기록은 유지됩니다.`)) return;
  const { error } = await client
    .from("customers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    setMessage(customerMessage, "고객 삭제에 실패했습니다.", "error");
    return;
  }
  await loadCustomers();
}

async function deleteBooking(id) {
  if (!client) return;
  if (!window.confirm("이 예약을 삭제할까요?")) return;
  const { error } = await client.from("bookings").delete().eq("id", id);
  if (error) {
    setMessage(adminMessage, "예약 삭제에 실패했습니다. DB 권한 업데이트가 필요할 수 있습니다.", "error");
    return;
  }
  await loadCustomers();
  await loadBookings();
}

function openDate(dateKey) {
  filterDate.value = dateKey;
  bookingDate.value = dateKey;
  showView("booking");
  loadBookings();
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
  showView("calendar");
  await Promise.all([loadServices(), loadCustomers()]);
}

async function logout() {
  if (!client) return;
  await client.auth.signOut();
  showAdmin(false);
  bookingRows.innerHTML = "";
  customerRows.innerHTML = "";
  setMessage(adminMessage, "예약 목록을 불러오세요.");
}

document.addEventListener("DOMContentLoaded", async () => {
  const today = getToday();
  filterDate.value = today;
  bookingDate.value = today;
  bookingTime.value = "10:00";
  monthCursor = new Date(`${today}T00:00:00`);
  client = initSupabase();
  renderServiceOptions();

  loginButton.addEventListener("click", login);
  logoutButton.addEventListener("click", logout);
  calendarTabButton.addEventListener("click", () => showView("calendar"));
  customerTabButton.addEventListener("click", () => showView("customers"));
  backToCalendarButton.addEventListener("click", () => showView("calendar"));
  prevMonthButton.addEventListener("click", () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  nextMonthButton.addEventListener("click", () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  calendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (button) openDate(button.dataset.date);
  });
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
    if (button) deleteBooking(button.dataset.id);
  });
  customerRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-customer") editCustomer(button.dataset.id);
    if (button.dataset.action === "delete-customer") deleteCustomer(button.dataset.id);
  });
  customerSearch.addEventListener("input", renderCustomers);

  if (!client) return;
  const { data } = await client.auth.getSession();
  showAdmin(Boolean(data.session));
  if (data.session) {
    showView("calendar");
    await Promise.all([loadServices(), loadCustomers()]);
  }
});
