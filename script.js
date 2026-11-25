const navLinks = document.querySelectorAll("[data-view]");
const sections = document.querySelectorAll("[data-section]");
const breadcrumbCurrent = document.getElementById("breadcrumb-current");
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("mobile-backdrop");
const menuButton = document.getElementById("menu-button");
const profileDialog = document.getElementById("profile-dialog");
const profileForm = document.getElementById("profile-form");
const toast = document.getElementById("toast");
const announcementCards = [...document.querySelectorAll(".announcement-card")];
const storageKeys = {
  profile: "campusly-profile",
  readAnnouncements: "campusly-read-announcements",
  selectedTerm: "campusly-selected-term",
};
let toastTimeout;
let displayedWeekOffset = 0;
let sampleWeekStart = new Date(2025, 3, 14);

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2600);
}

function getStoredValue(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.error(`Unable to read ${key} from local storage.`, error);
    return fallback;
  }
}

function setStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Unable to save ${key} to local storage.`, error);
    showToast("Changes could not be saved in this browser.");
    return false;
  }
  return true;
}

function closeMenu() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("visible");
  menuButton.setAttribute("aria-expanded", "false");
}

function showView(viewName) {
  const section = document.querySelector(`[data-section="${viewName}"]`);
  if (!section) return;

  sections.forEach((item) => item.classList.toggle("active", item === section));
  document.querySelectorAll(".main-nav .nav-link").forEach((link) => {
    const active = link.dataset.view === viewName;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  breadcrumbCurrent.textContent = viewName === "profile"
    ? "Student profile"
    : viewName === "schedule"
      ? "Class schedule"
      : viewName.charAt(0).toUpperCase() + viewName.slice(1);
  closeMenu();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function applyProfile(profile) {
  document.querySelectorAll("[data-profile-name]").forEach((element) => {
    element.textContent = profile.name;
  });
  document.querySelectorAll("[data-avatar]").forEach((element) => {
    element.textContent = initials(profile.name);
  });
  document.querySelectorAll("[data-first-name]").forEach((element) => {
    element.textContent = profile.name.trim().split(/\s+/)[0];
  });
  document.querySelectorAll("[data-profile-email]").forEach((element) => {
    element.textContent = profile.email;
  });
}

function syncAnnouncementCount() {
  const unreadCount = announcementCards.filter((card) => !card.classList.contains("read")).length;
  document.getElementById("announcement-count").textContent = unreadCount;
  document.querySelector(".notification-dot").hidden = unreadCount === 0;
  document.querySelector('.filter-chip[data-filter="all"] span').textContent = announcementCards.length;
}

function markAnnouncementRead(card) {
  card.classList.add("read");
  card.classList.remove("unread");
  card.querySelector(".read-toggle").textContent = "Read";
  syncAnnouncementCount();
}

function restoreAnnouncements() {
  const readIds = getStoredValue(storageKeys.readAnnouncements, []);
  announcementCards.forEach((card, index) => {
    if (readIds.includes(index)) markAnnouncementRead(card);
  });
}

function saveReadAnnouncements() {
  const readIds = announcementCards.flatMap((card, index) => (
    card.classList.contains("read") ? [index] : []
  ));
  return setStoredValue(storageKeys.readAnnouncements, readIds);
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const viewName = link.dataset.view;
    if (!document.querySelector(`[data-section="${viewName}"]`)) return;
    event.preventDefault();
    showView(viewName);
    if (window.location.hash !== `#${viewName}`) {
      window.history.replaceState(null, "", `#${viewName}`);
    }
  });
});

menuButton.addEventListener("click", () => {
  const isOpen = sidebar.classList.toggle("open");
  backdrop.classList.toggle("visible", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
backdrop.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

document.querySelectorAll(".read-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    markAnnouncementRead(button.closest(".announcement-card"));
    saveReadAnnouncements();
    showToast("Announcement marked as read.");
  });
});

document.getElementById("mark-all-read").addEventListener("click", () => {
  announcementCards.forEach(markAnnouncementRead);
  saveReadAnnouncements();
  showToast("You’re all caught up!");
});

document.querySelectorAll(".filter-chip").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("selected", chip === button);
    });
    announcementCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

document.getElementById("edit-profile-button").addEventListener("click", () => {
  const profile = getStoredValue(storageKeys.profile, {
    name: "Jordan Davis",
    email: "jordan.davis@campus.edu",
  });
  profileForm.elements.name.value = profile.name;
  profileForm.elements.email.value = profile.email;
  profileDialog.showModal();
});

document.getElementById("cancel-profile").addEventListener("click", () => {
  profileDialog.close();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const profile = {
    name: String(formData.get("name")).trim(),
    email: String(formData.get("email")).trim(),
  };
  if (!profile.name || !profile.email || !profileForm.reportValidity()) return;

  if (setStoredValue(storageKeys.profile, profile)) {
    applyProfile(profile);
    profileDialog.close();
    showToast("Your profile has been updated.");
  }
});

const initialProfile = getStoredValue(storageKeys.profile, {
  name: "Jordan Davis",
  email: "jordan.davis@campus.edu",
});
applyProfile(initialProfile);
restoreAnnouncements();

const initialView = window.location.hash.slice(1);
if (initialView && document.querySelector(`[data-section="${initialView}"]`)) {
  showView(initialView);
}

const termData = {
  "Spring 2025": {
    eyebrow: "SPRING 2025", dashboardDate: "TUESDAY, APRIL 15, 2025", weekStart: new Date(2025, 3, 14),
    stats: { courses: 5, gpa: "3.82", classes: 3, assignments: 2 },
    cumulativeGpa: "3.78", creditsCompleted: 42, creditsTerm: 14, updated: "Last updated Apr 14",
    subtitle: "You’re making steady progress. Keep going!",
    courses: [
      ["color-purple", "Introduction to Psychology", "PSY 101", "Prof. Amelia Carter", 3],
      ["color-blue", "Creative Writing Workshop", "ENG 220", "Prof. Noah Reed", 3],
      ["color-orange", "Statistics for Social Science", "STA 205", "Prof. Maya Patel", 4],
      ["color-green", "World History: 1900 to Present", "HIS 140", "Prof. Lucas Morgan", 3],
      ["color-yellow", "Art &amp; Culture", "ART 115", "Prof. Sophie Chen", 1]
    ],
    today: [
      ["class-current", "10:30", "AM", "color-purple", "Introduction to Psychology", "PSY 101 · Room B204", "tag-now", "UP NEXT"],
      ["", "12:00", "PM", "color-blue", "Creative Writing Workshop", "ENG 220 · Arts Building 18", "duration", "1h 15m"],
      ["", "2:00", "PM", "color-orange", "Statistics for Social Science", "STA 205 · Science Hall 302", "duration", "1h 30m"]
    ],
    assignments: [
      ["icon-lilac", "Reflection paper: Memory &amp; learning", "PSY 101 · 800–1,000 words", "Apr 16", "TOMORROW", true],
      ["icon-blue", "Problem set 6: Probability", "STA 205 · Submit online", "Apr 18", "FRIDAY", false]
    ],
    grades: [
      ["purple", "Introduction to Psychology", "PSY 101", "Amelia Carter", "A", "grade-a", 96.4],
      ["blue", "Creative Writing Workshop", "ENG 220", "Noah Reed", "A−", "grade-a-minus", 91.2],
      ["orange", "Statistics for Social Science", "STA 205", "Maya Patel", "B+", "grade-b", 88.7],
      ["green", "World History: 1900 to Present", "HIS 140", "Lucas Morgan", "A", "grade-a", 94.8],
      ["yellow", "Art &amp; Culture", "ART 115", "Sophie Chen", "A−", "grade-a-minus", 92.5]
    ],
    gradeLegend: [["dot-purple", "Psychology", "A"], ["dot-blue", "Creative Writing", "A−"], ["dot-orange", "Statistics", "B+"], ["dot-green", "World History", "A"]],
    week: [
      ["MON", [["week-purple", "Psychology", "9:00 – 10:15", "B204"], ["week-green", "World History", "1:00 – 2:15", "H105"]]],
      ["TUE", [["week-purple", "Psychology", "10:30 – 11:45", "B204"], ["week-blue", "Creative Writing", "12:00 – 1:15", "Arts 18"], ["week-orange", "Statistics", "2:00 – 3:30", "Science 302"]]],
      ["WED", [["week-yellow", "Art &amp; Culture", "11:00 – 12:15", "Arts 106"], ["week-green", "World History", "1:00 – 2:15", "H105"]]],
      ["THU", [["week-purple", "Psychology", "10:30 – 11:45", "B204"], ["week-blue", "Creative Writing", "12:00 – 1:15", "Arts 18"], ["week-orange", "Statistics", "2:00 – 3:30", "Science 302"]]],
      ["FRI", [["week-yellow", "Art &amp; Culture", "11:00 – 12:15", "Arts 106"]]]
    ]
  },
  "Fall 2024": {
    eyebrow: "FALL 2024", dashboardDate: "MONDAY, NOVEMBER 18, 2024", weekStart: new Date(2024, 10, 18),
    stats: { courses: 4, gpa: "3.65", classes: 3, assignments: 3 },
    cumulativeGpa: "3.72", creditsCompleted: 28, creditsTerm: 12, updated: "Last updated Nov 16",
    subtitle: "A strong finish to the fall term!",
    courses: [["color-purple", "General Biology", "BIO 110", "Dr. Elena Brooks", 4], ["color-blue", "English Composition", "ENG 101", "Prof. Owen Price", 3], ["color-orange", "Calculus I", "MAT 121", "Dr. Liam Hayes", 4], ["color-green", "U.S. Government", "POL 201", "Prof. Nina Flores", 3]],
    today: [["class-current", "9:00", "AM", "color-purple", "General Biology", "BIO 110 · Science Lab 210", "tag-now", "UP NEXT"], ["", "11:30", "AM", "color-blue", "English Composition", "ENG 101 · Hall C112", "duration", "1h 15m"], ["", "1:30", "PM", "color-orange", "Calculus I", "MAT 121 · Science Hall 105", "duration", "1h 30m"]],
    assignments: [["icon-lilac", "Lab report: Cell respiration", "BIO 110 · 6 pages", "Nov 19", "TOMORROW", true], ["icon-blue", "Rhetorical analysis", "ENG 101 · Submit online", "Nov 21", "THURSDAY", false], ["icon-peach", "Calculus practice set", "MAT 121 · 12 problems", "Nov 22", "FRIDAY", false]],
    grades: [["purple", "General Biology", "BIO 110", "Elena Brooks", "A−", "grade-a-minus", 92.1], ["blue", "English Composition", "ENG 101", "Owen Price", "B+", "grade-b", 88.4], ["orange", "Calculus I", "MAT 121", "Liam Hayes", "A", "grade-a", 95.2], ["green", "U.S. Government", "POL 201", "Nina Flores", "B+", "grade-b", 89.0]],
    gradeLegend: [["dot-purple", "General Biology", "A−"], ["dot-blue", "English Composition", "B+"], ["dot-orange", "Calculus I", "A"], ["dot-green", "Government", "B+"]],
    week: [["MON", [["week-purple", "General Biology", "9:00 – 10:15", "Lab 210"]]], ["TUE", [["week-purple", "General Biology", "9:00 – 10:15", "Lab 210"], ["week-blue", "English", "11:30 – 12:45", "C112"], ["week-orange", "Calculus", "1:30 – 3:00", "Science 105"]]], ["WED", [["week-green", "Government", "10:00 – 11:15", "H201"]]], ["THU", [["week-purple", "General Biology", "9:00 – 10:15", "Lab 210"], ["week-blue", "English", "11:30 – 12:45", "C112"], ["week-orange", "Calculus", "1:30 – 3:00", "Science 105"]]], ["FRI", [["week-green", "Government", "10:00 – 11:15", "H201"]]]]
  },
  "Spring 2024": {
    eyebrow: "SPRING 2024", dashboardDate: "WEDNESDAY, APRIL 17, 2024", weekStart: new Date(2024, 3, 15),
    stats: { courses: 5, gpa: "3.58", classes: 4, assignments: 2 },
    cumulativeGpa: "3.61", creditsCompleted: 16, creditsTerm: 15, updated: "Last updated Apr 12",
    subtitle: "Every assignment is another step forward.",
    courses: [["color-purple", "Introduction to Sociology", "SOC 101", "Dr. Marcus Reed", 3], ["color-blue", "Academic Writing", "ENG 110", "Prof. Sarah Kim", 3], ["color-orange", "College Algebra", "MAT 115", "Dr. David Chen", 3], ["color-green", "World Religions", "REL 120", "Prof. Maria Lopez", 3], ["color-yellow", "Digital Photography", "ART 130", "Prof. Zoe Miller", 3]],
    today: [["class-current", "8:30", "AM", "color-purple", "Introduction to Sociology", "SOC 101 · Room A118", "tag-now", "UP NEXT"], ["", "10:00", "AM", "color-blue", "Academic Writing", "ENG 110 · Library 204", "duration", "1h 15m"], ["", "1:00", "PM", "color-orange", "College Algebra", "MAT 115 · Science Hall 108", "duration", "1h 30m"]],
    assignments: [["icon-lilac", "Social structures essay", "SOC 101 · 1,500 words", "Apr 18", "THURSDAY", false], ["icon-yellow", "Photo journal entry", "ART 130 · 8 images", "Apr 20", "SATURDAY", false]],
    grades: [["purple", "Introduction to Sociology", "SOC 101", "Marcus Reed", "B+", "grade-b", 87.9], ["blue", "Academic Writing", "ENG 110", "Sarah Kim", "A−", "grade-a-minus", 90.8], ["orange", "College Algebra", "MAT 115", "David Chen", "B", "grade-b", 85.5], ["green", "World Religions", "REL 120", "Maria Lopez", "A", "grade-a", 93.7], ["yellow", "Digital Photography", "ART 130", "Zoe Miller", "A−", "grade-a-minus", 91.4]],
    gradeLegend: [["dot-purple", "Sociology", "B+"], ["dot-blue", "Academic Writing", "A−"], ["dot-orange", "College Algebra", "B"], ["dot-green", "World Religions", "A"]],
    week: [["MON", [["week-purple", "Sociology", "8:30 – 9:45", "A118"], ["week-yellow", "Photography", "3:00 – 4:15", "Arts 130"]]], ["TUE", [["week-purple", "Sociology", "8:30 – 9:45", "A118"], ["week-blue", "Writing", "10:00 – 11:15", "Library 204"], ["week-orange", "Algebra", "1:00 – 2:30", "Science 108"]]], ["WED", [["week-green", "World Religions", "11:00 – 12:15", "H201"]]], ["THU", [["week-purple", "Sociology", "8:30 – 9:45", "A118"], ["week-blue", "Writing", "10:00 – 11:15", "Library 204"], ["week-orange", "Algebra", "1:00 – 2:30", "Science 108"]]], ["FRI", [["week-yellow", "Photography", "11:00 – 12:15", "Arts 130"]]]]
  }
};

function applyTerm(termName, notify = true) {
  const data = termData[termName];
  if (!data) return;

  document.querySelectorAll("[data-term-eyebrow]").forEach((element) => { element.textContent = data.eyebrow; });
  document.getElementById("dashboard-date").innerHTML = `<span class="eyebrow-line"></span> ${data.dashboardDate}`;

  const courses = document.querySelector('[data-dashboard-stat="courses"]');
  courses.textContent = data.stats.courses;
  document.querySelector('[data-dashboard-stat="gpa"]').innerHTML = `${data.stats.gpa}<span class="stat-unit">/ 4.0</span>`;
  document.querySelector('[data-dashboard-stat="classes"]').textContent = data.stats.classes;
  document.querySelector('[data-dashboard-stat="assignments"]').textContent = data.stats.assignments;

  document.getElementById("schedule-summary").innerHTML = `${data.stats.courses} courses <span>·</span> ${data.creditsTerm} credits`;
  document.getElementById("term-gpa").textContent = data.stats.gpa;
  document.getElementById("grades-subtitle").textContent = data.subtitle;
  document.getElementById("cumulative-gpa").innerHTML = `${data.cumulativeGpa} <small>/ 4.0</small>`;
  document.getElementById("credits-completed").innerHTML = `${data.creditsCompleted} <small>credits</small>`;
  document.getElementById("credits-term").innerHTML = `${data.creditsTerm} <small>credits</small>`;
  document.getElementById("grades-table-title").textContent = `${termName} grades`;
  document.getElementById("grade-updated").textContent = data.updated;

  const donut = document.getElementById("dashboard-grade-donut");
  donut.setAttribute("aria-label", `Current GPA ${data.stats.gpa} out of 4.0`);
  donut.innerHTML = `<div><strong>${data.stats.gpa}</strong><span>GPA</span></div>`;

  document.getElementById("dashboard-grade-legend").innerHTML = data.gradeLegend.map(([dot, name, grade]) =>
    `<div><span class="legend-dot ${dot}"></span><span>${name}</span><strong>${grade}</strong></div>`
  ).join("");

  document.getElementById("today-list").innerHTML = data.today.map(([rowClass, time, meridiem, color, name, detail, badgeClass, badge]) =>
    `<article class="class-row ${rowClass}"><div class="class-time"><strong>${time}</strong><span>${meridiem}</span><i></i></div><div class="class-color ${color}"></div><div class="class-info"><strong>${name}</strong><span>${detail}</span></div>${badgeClass === "tag-now" ? `<span class="class-tag ${badgeClass}">${badge}</span>` : `<span class="class-duration">${badge}</span>`}</article>`
  ).join("");

  document.getElementById("assignment-list").innerHTML = data.assignments.map(([icon, name, detail, date, dateLabel, soon]) =>
    `<article class="assignment-row"><span class="assignment-icon ${icon}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg></span><div class="assignment-info"><strong>${name}</strong><span>${detail}</span></div><span class="due-date ${soon ? "due-soon" : ""}"><strong>${date}</strong><span>${dateLabel}</span></span></article>`
  ).join("");

  document.getElementById("course-list").innerHTML = data.courses.map(([color, name, code, instructor, credits]) =>
    `<div class="course-list-row"><span class="course-swatch ${color}"></span><div><strong>${name}</strong><span>${code} · ${instructor}</span></div><b>${credits} credit${credits === 1 ? "" : "s"}</b></div>`
  ).join("");

  document.getElementById("week-grid").innerHTML = data.week.map(([dayName, classes], index) => {
    const todayIndex = termName === "Spring 2025" ? 1 : termName === "Fall 2024" ? 1 : 2;
    const date = new Date(data.weekStart);
    date.setDate(date.getDate() + index);
    const classesHtml = classes.map(([classColor, name, time, room]) =>
      `<div class="week-class ${classColor}"><strong>${name}</strong><span>${time}</span><small>${room}</small></div>`
    ).join("");
    return `<div class="week-day ${index === todayIndex ? "today-column" : ""}"><div class="day-heading"><span>${dayName}</span><strong>${date.getDate()}</strong></div>${classesHtml}</div>`;
  }).join("");

  document.getElementById("grades-table-body").innerHTML = data.grades.map(([color, name, code, instructor, grade, gradeClass, points]) =>
    `<tr><td><span class="table-course"><i class="color-${color}"></i><span><strong>${name}</strong><small>${code} · 3 credits</small></span></span></td><td>${instructor}</td><td><span class="letter-grade ${gradeClass}">${grade}</span></td><td>${points}%</td><td><div class="progress-track"><span class="progress-${color}" style="width:${points}%"></span></div></td></tr>`
  ).join("");

  sampleWeekStart = new Date(data.weekStart);
  displayedWeekOffset = 0;
  renderWeek();
  if (notify) showToast(`Showing ${termName} data.`);
}

const termSelect = document.getElementById("term-select");
termSelect.addEventListener("change", () => {
  setStoredValue(storageKeys.selectedTerm, termSelect.value);
  applyTerm(termSelect.value);
});

const savedTerm = getStoredValue(storageKeys.selectedTerm, "Spring 2025");
if (termData[savedTerm]) {
  termSelect.value = savedTerm;
  applyTerm(savedTerm, false);
}

function renderWeek() {
  const weekStart = new Date(sampleWeekStart);
  weekStart.setDate(weekStart.getDate() + displayedWeekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startLabel = new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(weekStart);
  const endLabel = new Intl.DateTimeFormat("en", {
    month: weekStart.getMonth() === weekEnd.getMonth() ? undefined : "long",
    day: "numeric",
    year: "numeric",
  }).format(weekEnd);
  document.getElementById("week-range").textContent = `${startLabel} – ${endLabel}`;
  document.querySelectorAll("[data-week-date]").forEach((dateElement, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    dateElement.textContent = date.getDate();
  });
  document.querySelectorAll(".week-day").forEach((day, index) => {
    const selectedTerm = document.getElementById("term-select")?.value;
    const todayIndex = selectedTerm === "Spring 2024" ? 2 : 1;
    day.classList.toggle("today-column", displayedWeekOffset === 0 && index === todayIndex);
  });
}

document.getElementById("prev-week").addEventListener("click", () => {
  displayedWeekOffset -= 1;
  renderWeek();
});
document.getElementById("next-week").addEventListener("click", () => {
  displayedWeekOffset += 1;
  renderWeek();
});

renderWeek();
