let client = null;
let customers = [];
let customerBookings = [];
let services = [];
let monthCursor = new Date();
let moveTarget = null;
let moveCursor = new Date();
let selectedMoveDate = "";
let editCustomerTarget = null;
let calendarTouchStart = null;
let calendarSwipeLock = false;
let bookingPanelIndex = 0;
let bookingTouchStart = null;
let bookingCustomerMode = "none";
let selectedBookingCustomer = null;

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
const totalCompletedCount = document.querySelector("#totalCompletedCount");
const monthCompletedCount = document.querySelector("#monthCompletedCount");
const activeBookingCount = document.querySelector("#activeBookingCount");
const backToCalendarButton = document.querySelector("#backToCalendarButton");
const bookingForm = document.querySelector("#ownerBookingForm");
const bookingPager = document.querySelector("#bookingPager");
const bookingPanels = document.querySelector("#bookingPanels");
const bookingFormDot = document.querySelector("#bookingFormDot");
const bookingListDot = document.querySelector("#bookingListDot");
const bookingDate = document.querySelector("#bookingDate");
const bookingTime = document.querySelector("#bookingTime");
const customerName = document.querySelector("#customerName");
const phone = document.querySelector("#phone");
const bookingCustomerLookup = document.querySelector("#bookingCustomerLookup");
const bookingCustomerMessage = document.querySelector("#bookingCustomerMessage");
const bookingCustomerResults = document.querySelector("#bookingCustomerResults");
const newBookingCustomerButton = document.querySelector("#newBookingCustomerButton");
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
const moveDialog = document.querySelector("#moveDialog");
const moveTitle = document.querySelector("#moveTitle");
const moveCalendarTitle = document.querySelector("#moveCalendarTitle");
const moveCalendarGrid = document.querySelector("#moveCalendarGrid");
const movePrevMonthButton = document.querySelector("#movePrevMonthButton");
const moveNextMonthButton = document.querySelector("#moveNextMonthButton");
const moveTime = document.querySelector("#moveTime");
const moveMessage = document.querySelector("#moveMessage");
const saveMoveButton = document.querySelector("#saveMoveButton");
const closeMoveButton = document.querySelector("#closeMoveButton");
const customerDialog = document.querySelector("#customerDialog");
const customerEditTitle = document.querySelector("#customerEditTitle");
const editCustomerName = document.querySelector("#editCustomerName");
const editCustomerPhone = document.querySelector("#editCustomerPhone");
const customerEditMessage = document.querySelector("#customerEditMessage");
const saveCustomerButton = document.querySelector("#saveCustomerButton");
const closeCustomerButton = document.querySelector("#closeCustomerButton");

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

function resetBookingCustomerChoice() {
  bookingCustomerMode = "none";
  selectedBookingCustomer = null;
}

function bookingCustomerMatches(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return activeCustomers()
    .filter((customer) => `${customer.name || ""} ${customer.phone || ""}`.toLowerCase().includes(normalized))
    .slice(0, 5);
}

function renderBookingCustomerLookup() {
  const query = customerName.value.trim();
  const matches = bookingCustomerMatches(query);
  if (!query) {
    bookingCustomerLookup.classList.add("hidden");
    bookingCustomerResults.innerHTML = "";
    resetBookingCustomerChoice();
    return;
  }
  bookingCustomerLookup.classList.remove("hidden");
  if (bookingCustomerMode === "existing" && selectedBookingCustomer) {
    bookingCustomerMessage.textContent = `${selectedBookingCustomer.name} 고객을 선택했습니다.`;
    bookingCustomerResults.innerHTML = "";
    newBookingCustomerButton.classList.add("hidden");
    return;
  }
  if (bookingCustomerMode === "new") {
    bookingCustomerMessage.textContent = "신규 고객으로 등록됩니다.";
    bookingCustomerResults.innerHTML = "";
    newBookingCustomerButton.classList.add("hidden");
    return;
  }
  bookingCustomerMessage.textContent = matches.length
    ? "동명이인일 수 있습니다. 전화번호를 확인하고 선택하거나 신규로 등록하세요."
    : "일치하는 고객이 없습니다. 신규 고객으로 등록하세요.";
  bookingCustomerResults.innerHTML = matches
    .map((customer) => `
      <button class="lookup-result" type="button" data-action="select-booking-customer" data-id="${customer.id}">
        <span><strong>${escapeHtml(customer.name)}</strong><br>${escapeHtml(customer.phone || "연락처 없음")}</span>
        <em>선택</em>
      </button>
    `)
    .join("");
  newBookingCustomerButton.classList.remove("hidden");
}

function selectBookingCustomer(id) {
  const customer = customers.find((item) => item.id === id);
  if (!customer) return;
  selectedBookingCustomer = customer;
  bookingCustomerMode = "existing";
  customerName.value = customer.name || "";
  phone.value = customer.phone || "";
  renderBookingCustomerLookup();
}

function markNewBookingCustomer() {
  if (!customerName.value.trim()) {
    setMessage(formMessage, "고객명을 먼저 입력하세요.", "error");
    return;
  }
  selectedBookingCustomer = null;
  bookingCustomerMode = "new";
  renderBookingCustomerLookup();
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
  return Boolean(samePhone);
}

function customerForBooking(booking) {
  return customers.find((customer) => customerMatchesBooking(customer, booking));
}

function customerStats(customer) {
  const today = getToday();
  const matchingBookings = customerBookings.filter((booking) => customerMatchesBooking(customer, booking));
  const dates = customerBookings
    .filter((booking) => customerMatchesBooking(customer, booking) && booking.status !== "no_show")
    .map((booking) => booking.booking_date)
    .filter((date) => date && date <= today)
    .sort();
  const uniqueDates = [...new Set(dates)];
  const visitCount = uniqueDates.length;
  const noShowCount = matchingBookings.filter((booking) => booking.status === "no_show").length;
  const cancelCount = Number(customer.cancel_count || 0);
  const recentVisit = visitCount ? uniqueDates[visitCount - 1] : "없음";
  if (uniqueDates.length < 2) {
    return { visitCount, noShowCount, cancelCount, recentVisit, cycleText: "계산 전" };
  }
  const intervals = [];
  for (let index = 1; index < uniqueDates.length; index += 1) {
    const gap = daysBetween(uniqueDates[index - 1], uniqueDates[index]);
    if (gap >= 0) intervals.push(gap);
  }
  const average = intervals.reduce((sum, gap) => sum + gap, 0) / intervals.length;
  return { visitCount, noShowCount, cancelCount, recentVisit, cycleText: `${Math.round(average)}일` };
}

function statsForBooking(booking) {
  const customer = customerForBooking(booking);
  if (!customer) return { visitCount: 0, noShowCount: 0, cancelCount: 0, recentVisit: "없음", cycleText: "계산 전" };
  const datesBefore = customerBookings
    .filter((item) => customerMatchesBooking(customer, item) && item.status !== "no_show")
    .map((item) => item.booking_date)
    .filter((date) => date && date < booking.booking_date)
    .sort();
  const uniqueDates = [...new Set(datesBefore)];
  const recentVisit = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : "없음";
  return { ...customerStats(customer), recentVisit };
}

function bookingsForDate(dateKey) {
  return customerBookings.filter((booking) => booking.booking_date === dateKey && ["confirmed", "completed"].includes(booking.status));
}

function sortBookingsForList(bookings) {
  return [...bookings].sort((left, right) => {
    const leftStatusRank = left.status === "completed" ? 1 : 0;
    const rightStatusRank = right.status === "completed" ? 1 : 0;
    if (leftStatusRank !== rightStatusRank) return leftStatusRank - rightStatusRank;
    return String(left.booking_time || "").localeCompare(String(right.booking_time || ""));
  });
}

function renderDashboard() {
  const year = monthCursor.getFullYear();
  const month = String(monthCursor.getMonth() + 1).padStart(2, "0");
  const monthPrefix = `${year}-${month}`;
  const monthlyBookings = customerBookings.filter((booking) => String(booking.booking_date || "").startsWith(monthPrefix));
  const monthlyCompleted = monthlyBookings.filter((booking) => booking.status === "completed");
  const monthlyActive = monthlyBookings.filter((booking) => booking.status === "confirmed");
  totalCompletedCount.textContent = `${monthlyBookings.length}건`;
  monthCompletedCount.textContent = `${monthlyCompleted.length}건`;
  activeBookingCount.textContent = `${monthlyActive.length}건`;
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
  renderDashboard();
}

function moveMainMonth(offset) {
  monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
  renderCalendar();
}

function setBookingPanel(index) {
  bookingPanelIndex = index;
  bookingPanels.classList.toggle("show-list", index === 1);
  bookingFormDot.classList.toggle("active", index === 0);
  bookingListDot.classList.toggle("active", index === 1);
}

function handleBookingTouchStart(event) {
  const touch = event.changedTouches[0];
  bookingTouchStart = { x: touch.clientX, y: touch.clientY };
}

function handleBookingTouchEnd(event) {
  if (!bookingTouchStart) return;
  const touch = event.changedTouches[0];
  const diffX = touch.clientX - bookingTouchStart.x;
  const diffY = touch.clientY - bookingTouchStart.y;
  bookingTouchStart = null;
  if (Math.abs(diffX) < 55 || Math.abs(diffX) < Math.abs(diffY) * 1.4) return;
  setBookingPanel(diffX < 0 ? 1 : 0);
}

function handleCalendarTouchStart(event) {
  const touch = event.changedTouches[0];
  calendarTouchStart = { x: touch.clientX, y: touch.clientY };
}

function handleCalendarTouchEnd(event) {
  if (!calendarTouchStart) return;
  const touch = event.changedTouches[0];
  const diffX = touch.clientX - calendarTouchStart.x;
  const diffY = touch.clientY - calendarTouchStart.y;
  calendarTouchStart = null;
  if (Math.abs(diffX) < 55 || Math.abs(diffX) < Math.abs(diffY) * 1.4) return;
  calendarSwipeLock = true;
  moveMainMonth(diffX > 0 ? -1 : 1);
  window.setTimeout(() => {
    calendarSwipeLock = false;
  }, 250);
}

function renderMoveCalendar() {
  const year = moveCursor.getFullYear();
  const month = moveCursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = getToday();
  moveCalendarTitle.textContent = `${year}년 ${month + 1}월`;
  moveCalendarGrid.innerHTML = "";
  for (let index = 0; index < first.getDay(); index += 1) {
    moveCalendarGrid.appendChild(document.createElement("div"));
  }
  for (let day = 1; day <= last.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const count = bookingsForDate(dateKey).filter((booking) => booking.id !== moveTarget?.id).length;
    const button = document.createElement("button");
    button.className = "calendar-day";
    if (dateKey === today) button.classList.add("today");
    if (dateKey === selectedMoveDate) button.classList.add("selected");
    button.type = "button";
    button.dataset.date = dateKey;
    button.innerHTML = `<strong>${day}</strong>${count ? `<span>${count}건</span>` : ""}`;
    moveCalendarGrid.appendChild(button);
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
            <span>노쇼 ${stats.noShowCount}회</span>
            <span>취소 ${stats.cancelCount}회</span>
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
  sortBookingsForList(bookings).forEach((booking) => {
    const stats = statsForBooking(booking);
    const serviceName = booking.service_name || "시술 미지정";
    const isCompleted = booking.status === "completed";
    const card = document.createElement("article");
    card.className = `booking-card${isCompleted ? " completed" : ""}`;
    card.innerHTML = `
      <div class="booking-time"><span>${formatTime(booking.booking_time)}</span></div>
      <div class="booking-main">
        <div class="booking-top">
          <div class="booking-name">${escapeHtml(booking.customer_name)}</div>
          <span class="status${isCompleted ? " completed" : ""}">${isCompleted ? "완료" : "예약"}</span>
        </div>
        <div class="booking-service">${escapeHtml(serviceName)}</div>
        ${booking.phone ? `<div class="booking-phone">${escapeHtml(booking.phone)}</div>` : ""}
        <div class="booking-service">마지막 방문 ${escapeHtml(stats.recentVisit)} · 재방문주기 ${escapeHtml(stats.cycleText)}</div>
        <div class="booking-service">방문 ${stats.visitCount}회 · 노쇼 ${stats.noShowCount}회 · 취소 ${stats.cancelCount}회</div>
        ${booking.note ? `<div class="booking-note">${escapeHtml(booking.note)}</div>` : ""}
        ${isCompleted ? "" : `
          <div class="booking-actions">
            <button class="mini-button success" type="button" data-action="complete-booking" data-id="${booking.id}">완료</button>
            <button class="mini-button" type="button" data-action="move-booking" data-id="${booking.id}" data-date="${booking.booking_date}" data-time="${formatTime(booking.booking_time)}" data-customer="${escapeHtml(booking.customer_name)}">예약변경</button>
            <button class="mini-button muted" type="button" data-action="noshow-booking" data-id="${booking.id}">노쇼</button>
            <button class="mini-button danger" type="button" data-action="cancel-booking" data-id="${booking.id}">예약취소</button>
          </div>
        `}
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
    client.from("bookings").select("id, customer_id, customer_name, phone, booking_date, status").neq("status", "cancelled").order("booking_date", { ascending: true })
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
    .in("status", ["confirmed", "completed"])
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
  if (bookingCustomerMode === "existing" && selectedBookingCustomer) {
    const { data } = await client
      .from("customers")
      .update({ name, phone: phoneValue || selectedBookingCustomer.phone || null, is_active: true, updated_at: new Date().toISOString() })
      .eq("id", selectedBookingCustomer.id)
      .select()
      .single();
    return data || selectedBookingCustomer;
  }
  if (bookingCustomerMode !== "new") return null;
  const existing = customers.find((customer) => {
    const samePhone = phoneValue && customer.phone === phoneValue;
    return samePhone;
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
  if (!customerName.value.trim()) {
    setMessage(formMessage, "고객명을 입력하세요.", "error");
    return;
  }
  if (bookingCustomerMode === "none") {
    renderBookingCustomerLookup();
    setMessage(formMessage, "기존 고객을 선택하거나 신규 고객으로 등록을 눌러주세요.", "error");
    return;
  }
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
  resetBookingCustomerChoice();
  renderBookingCustomerLookup();
  bookingDate.value = filterDate.value;
  bookingTime.value = "10:00";
  setBookingPanel(1);
  renderServiceOptions();
  setMessage(formMessage, "예약을 저장했습니다.", "success");
  await loadCustomers();
  await loadBookings();
}

function openCustomerDialog(id) {
  const customer = customers.find((item) => item.id === id);
  if (!customer) return;
  editCustomerTarget = customer;
  customerEditTitle.textContent = `${customer.name} 수정`;
  editCustomerName.value = customer.name || "";
  editCustomerPhone.value = customer.phone || "";
  setMessage(customerEditMessage, "고객명과 연락처를 수정하세요.");
  customerDialog.classList.remove("hidden");
  editCustomerName.focus();
}

function closeCustomerDialog() {
  customerDialog.classList.add("hidden");
  editCustomerTarget = null;
  editCustomerName.value = "";
  editCustomerPhone.value = "";
  setMessage(customerEditMessage, "");
}

async function submitCustomerEdit() {
  if (!client || !editCustomerTarget) return;
  const nextName = editCustomerName.value.trim();
  const nextPhone = editCustomerPhone.value.trim();
  if (!nextName) {
    setMessage(customerEditMessage, "고객명을 입력하세요.", "error");
    return;
  }
  saveCustomerButton.disabled = true;
  setMessage(customerEditMessage, "고객 정보를 저장하는 중입니다.");
  const { error } = await client
    .from("customers")
    .update({ name: nextName, phone: nextPhone || null, updated_at: new Date().toISOString() })
    .eq("id", editCustomerTarget.id);
  saveCustomerButton.disabled = false;
  if (error) {
    setMessage(customerEditMessage, "고객 수정에 실패했습니다.", "error");
    return;
  }
  closeCustomerDialog();
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

async function cancelBooking(id) {
  if (!client) return;
  if (!window.confirm("예약을 취소할까요? 취소한 예약은 목록에서 삭제됩니다.")) return;
  const { data: booking } = await client.from("bookings").select("*").eq("id", id).single();
  const customer = booking ? customerForBooking(booking) : null;
  if (customer && Object.prototype.hasOwnProperty.call(customer, "cancel_count")) {
    await client
      .from("customers")
      .update({ cancel_count: Number(customer.cancel_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", customer.id);
  }
  const { error } = await client.from("bookings").delete().eq("id", id);
  if (error) {
    setMessage(adminMessage, "예약취소에 실패했습니다. DB 권한 업데이트가 필요할 수 있습니다.", "error");
    return;
  }
  await loadCustomers();
  await loadBookings();
}

async function completeBooking(id) {
  if (!client) return;
  if (!window.confirm("이 예약을 완료 처리할까요? 완료된 예약은 회색으로 표시되고 예약목록 아래쪽에 남습니다.")) return;
  const { error } = await client.from("bookings").update({ status: "completed" }).eq("id", id);
  if (error) {
    setMessage(adminMessage, "완료 처리에 실패했습니다. DB 업데이트가 필요합니다.", "error");
    return;
  }
  await loadCustomers();
  await loadBookings();
}

async function noShowBooking(id) {
  if (!client) return;
  if (!window.confirm("이 예약을 노쇼 처리할까요? 노쇼는 예약목록에서 빠지고 방문횟수에는 포함되지 않습니다.")) return;
  const { error } = await client.from("bookings").update({ status: "no_show" }).eq("id", id);
  if (error) {
    setMessage(adminMessage, "노쇼 처리에 실패했습니다. DB 업데이트가 필요합니다.", "error");
    return;
  }
  await loadCustomers();
  await loadBookings();
}

function openMoveDialog(id, currentDate, currentTime, customer) {
  moveTarget = { id, customer };
  selectedMoveDate = currentDate || filterDate.value || getToday();
  moveCursor = new Date(`${selectedMoveDate}T00:00:00`);
  moveTime.value = currentTime || "10:00";
  moveTitle.textContent = customer ? `${customer} 예약변경` : "날짜와 시간 선택";
  setMessage(moveMessage, "캘린더에서 날짜를 누르고 시간을 선택하세요.");
  moveDialog.classList.remove("hidden");
  renderMoveCalendar();
}

function closeMoveDialog() {
  moveDialog.classList.add("hidden");
  moveTarget = null;
  selectedMoveDate = "";
  setMessage(moveMessage, "");
}

async function submitMoveBooking() {
  if (!client) return;
  if (!moveTarget) return;
  const dateValue = selectedMoveDate;
  const timeValue = moveTime.value;
  if (!dateValue) {
    setMessage(moveMessage, "변경할 날짜를 선택하세요.", "error");
    return;
  }
  if (!timeValue) {
    setMessage(moveMessage, "변경할 시간을 선택하세요.", "error");
    return;
  }
  saveMoveButton.disabled = true;
  setMessage(moveMessage, "예약을 옮기는 중입니다.");
  const { error } = await client
    .from("bookings")
    .update({ booking_date: dateValue, booking_time: timeValue })
    .eq("id", moveTarget.id);
  saveMoveButton.disabled = false;
  if (error) {
    setMessage(moveMessage, error.code === "23505" ? "옮길 시간에 이미 예약이 있습니다." : "예약변경에 실패했습니다.", "error");
    return;
  }
  filterDate.value = dateValue;
  bookingDate.value = dateValue;
  closeMoveDialog();
  await loadCustomers();
  await loadBookings();
}

function openDate(dateKey) {
  filterDate.value = dateKey;
  bookingDate.value = dateKey;
  setBookingPanel(1);
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
  calendarView.addEventListener("touchstart", handleCalendarTouchStart, { passive: true });
  calendarView.addEventListener("touchend", handleCalendarTouchEnd, { passive: true });
  movePrevMonthButton.addEventListener("click", () => {
    moveCursor = new Date(moveCursor.getFullYear(), moveCursor.getMonth() - 1, 1);
    renderMoveCalendar();
  });
  moveNextMonthButton.addEventListener("click", () => {
    moveCursor = new Date(moveCursor.getFullYear(), moveCursor.getMonth() + 1, 1);
    renderMoveCalendar();
  });
  moveCalendarGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    selectedMoveDate = button.dataset.date;
    moveCursor = new Date(`${selectedMoveDate}T00:00:00`);
    renderMoveCalendar();
  });
  saveMoveButton.addEventListener("click", submitMoveBooking);
  closeMoveButton.addEventListener("click", closeMoveDialog);
  moveDialog.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-move") closeMoveDialog();
  });
  saveCustomerButton.addEventListener("click", submitCustomerEdit);
  closeCustomerButton.addEventListener("click", closeCustomerDialog);
  customerDialog.addEventListener("click", (event) => {
    if (event.target.dataset.action === "close-customer") closeCustomerDialog();
  });
  editCustomerPhone.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitCustomerEdit();
  });
  calendarGrid.addEventListener("click", (event) => {
    if (calendarSwipeLock) return;
    const button = event.target.closest("[data-date]");
    if (button) openDate(button.dataset.date);
  });
  bookingPager.addEventListener("touchstart", handleBookingTouchStart, { passive: true });
  bookingPager.addEventListener("touchend", handleBookingTouchEnd, { passive: true });
  bookingFormDot.addEventListener("click", () => setBookingPanel(0));
  bookingListDot.addEventListener("click", () => setBookingPanel(1));
  bookingPager.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") setBookingPanel(0);
    if (event.key === "ArrowRight") setBookingPanel(1);
  });
  bookingForm.addEventListener("submit", saveBooking);
  customerName.addEventListener("input", () => {
    resetBookingCustomerChoice();
    renderBookingCustomerLookup();
  });
  phone.addEventListener("input", () => {
    if (bookingCustomerMode === "existing") return;
    if (bookingCustomerMode === "new") renderBookingCustomerLookup();
  });
  bookingCustomerResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='select-booking-customer']");
    if (button) selectBookingCustomer(button.dataset.id);
  });
  newBookingCustomerButton.addEventListener("click", markNewBookingCustomer);
  adminPassword.addEventListener("keydown", (event) => {
    if (event.key === "Enter") login();
  });
  refreshButton.addEventListener("click", loadBookings);
  filterDate.addEventListener("change", () => {
    bookingDate.value = filterDate.value;
    loadBookings();
  });
  bookingRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "complete-booking") completeBooking(button.dataset.id);
    if (button.dataset.action === "move-booking") openMoveDialog(button.dataset.id, button.dataset.date, button.dataset.time, button.dataset.customer);
    if (button.dataset.action === "noshow-booking") noShowBooking(button.dataset.id);
    if (button.dataset.action === "cancel-booking") cancelBooking(button.dataset.id);
  });
  customerRows.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (button.dataset.action === "edit-customer") openCustomerDialog(button.dataset.id);
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
