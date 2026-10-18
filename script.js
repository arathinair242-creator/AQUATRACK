
"use strict";

const $ = (id) => document.getElementById(id);

const DEMO_EMAIL = "arathi@gmail.com";
const DEMO_PASSWORD = "1234";
const STORAGE = {
  user: "aquatrack_user",
  entries: "aquatrack_entries",
  limit: "aquatrack_limit"
};
const DEFAULT_LIMIT = 150;

const activityInfo = {
  Bathing: { label: "Bathing / Shower", icon: "🚿", color: "#12a995" },
  Washing: { label: "Laundry / Washing", icon: "👕", color: "#5799d8" },
  Cooking: { label: "Cooking / Drinking", icon: "🥤", color: "#35a779" },
  Dishwashing: { label: "Dishwashing", icon: "🍽️", color: "#9875dc" },
  Cleaning: { label: "House cleaning", icon: "🧹", color: "#e0a13b" },
  Gardening: { label: "Gardening", icon: "🌱", color: "#d87867" },
  Other: { label: "Other", icon: "💧", color: "#7b9aa8" }
};

const tips = [
  ["Make showers shorter.", "Reducing shower time by a few minutes can save several litres of water."],
  ["Turn off the tap when brushing.", "Close the tap while brushing your teeth or soaping your hands."],
  ["Run full laundry loads.", "Wait until you have a full load before running your washing machine."],
  ["Reuse water where possible.", "Reuse suitable leftover water for watering plants."],
  ["Fix leaks promptly.", "Check taps and pipes regularly to avoid unnecessary water waste."],
  ["Water plants wisely.", "Water plants early in the morning or evening to reduce evaporation."]
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showToast("Unable to save data in this browser.");
    return false;
  }
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatLitres(value) {
  return Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });
}

function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });
}

let entries = readStorage(STORAGE.entries, []);
if (!Array.isArray(entries)) entries = [];
entries = entries.filter(entry =>
  entry && typeof entry.id === "string" &&
  typeof entry.date === "string" &&
  typeof entry.activity === "string" &&
  Number.isFinite(Number(entry.litres)) && Number(entry.litres) > 0
);

let dailyLimit = Number(readStorage(STORAGE.limit, DEFAULT_LIMIT));
if (!Number.isFinite(dailyLimit) || dailyLimit < 1) dailyLimit = DEFAULT_LIMIT;

let chart = null;
let toastTimer;
let tipIndex = 0;

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function getSelectedDate() {
  return $("chartDate").value || todayString();
}

function getEntriesForDate(date) {
  return entries.filter(entry => entry.date === date);
}

function getDayTotal(date) {
  return getEntriesForDate(date).reduce((sum, entry) => sum + Number(entry.litres), 0);
}

function showDashboard(email) {
  $("loginPage").classList.add("hidden");
  $("appShell").classList.remove("hidden");

  const name = email.split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, character => character.toUpperCase());

  $("userName").textContent = name || "AquaTrack User";
  $("userAvatar").textContent = (name || "A").charAt(0);
  initializeDashboard();
}

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  $("loginError").textContent = "";

  if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
    $("loginError").textContent = "Incorrect email or password. Please try again.";
    return;
  }

  if (!writeStorage(STORAGE.user, { email })) return;

  showDashboard(email);
  showToast("Login successful. Welcome to AquaTrack!");
});

$("logoutButton").addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE.user);
  } catch {}

  $("appShell").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
  $("loginPassword").value = "";
  $("loginError").textContent = "";
});

function initializeDashboard() {
  const today = todayString();

  $("todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });

  $("usageDate").value = today;
  $("chartDate").value = today;
  $("dailyLimit").value = dailyLimit;

  renderAll();
  renderTip();
}

function renderAll() {
  renderDashboard();
  renderChart();
  renderHistory();
}

function renderDashboard() {
  const date = getSelectedDate();
  const dayEntries = getEntriesForDate(date);
  const total = getDayTotal(date);
  const remaining = Math.max(0, dailyLimit - total);
  const percentage = total / dailyLimit * 100;

  $("totalLitres").textContent = formatLitres(total);
  $("limitLabel").textContent = formatLitres(dailyLimit);
  $("remainingLitres").textContent = formatLitres(remaining);
  $("activityCount").textContent = dayEntries.length;

  $("consumptionCaption").textContent =
    date === todayString() ? "Recorded for today" : formatDate(date);
  $("remainingCaption").textContent =
    total > dailyLimit ? "Daily limit exceeded" : "Available within your limit";

  $("limitPercent").textContent = `${Math.round(percentage)}%`;
  $("limitMeterEnd").textContent = `${formatLitres(dailyLimit)} L goal`;
  $("usageProgress").style.width = `${Math.min(percentage, 100)}%`;
  $("usageProgress").style.background =
    total > dailyLimit ? "#d95050" : percentage >= 80 ? "#d9a13b" : "#12a995";

  const message = $("limitMessage");
  message.classList.remove("warning", "danger");

  if (total > dailyLimit) {
    message.classList.add("danger");
    $("statusTitle").textContent = "Daily limit exceeded!";
    $("statusText").textContent =
      `You used ${formatLitres(total - dailyLimit)} L above your ${formatLitres(dailyLimit)} L goal.`;
  } else if (percentage >= 80) {
    message.classList.add("warning");
    $("statusTitle").textContent = "You're close to your limit";
    $("statusText").textContent =
      `${formatLitres(remaining)} L remaining before you reach your daily goal.`;
  } else {
    $("statusTitle").textContent = total === 0 ? "Ready to get started" : "You're on track";
    $("statusText").textContent = total === 0
      ? "Record your water usage to monitor your goal."
      : `${formatLitres(remaining)} L remaining within your daily goal.`;
  }
}

$("usageForm").addEventListener("submit", event => {
  event.preventDefault();

  const activity = $("activity").value;
  const litres = Number($("litres").value);
  const date = $("usageDate").value;

  if (!date) return showToast("Please select a date.");
  if (!Number.isFinite(litres) || litres <= 0 || litres > 100000) {
    showToast("Enter a valid amount between 0 and 100000 litres.");
    $("litres").focus();
    return;
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    activity,
    litres,
    date,
    createdAt: new Date().toISOString()
  };

  entries.push(entry);

  if (!writeStorage(STORAGE.entries, entries)) {
    entries.pop();
    return;
  }

  $("chartDate").value = date;
  $("usageDate").value = date;
  $("litres").value = "";

  renderAll();

  const total = getDayTotal(date);

  if (total > dailyLimit) {
    showToast("Warning: daily water consumption limit exceeded!");
  } else if (total / dailyLimit >= 0.8) {
    showToast("You're approaching your daily water limit.");
  } else {
    showToast("Water usage recorded successfully.");
  }
});

$("limitForm").addEventListener("submit", event => {
  event.preventDefault();

  const newLimit = Number($("dailyLimit").value);

  if (!Number.isFinite(newLimit) || newLimit < 1 || newLimit > 100000) {
    showToast("Enter a daily limit between 1 and 100000 litres.");
    return;
  }

  const oldLimit = dailyLimit;
  dailyLimit = newLimit;

  if (!writeStorage(STORAGE.limit, dailyLimit)) {
    dailyLimit = oldLimit;
    $("dailyLimit").value = oldLimit;
    return;
  }

  renderAll();

  showToast(
    getDayTotal(getSelectedDate()) > dailyLimit
      ? "Warning: consumption is above the updated daily limit."
      : "Daily water goal updated."
  );
});

function renderChart() {
  const date = getSelectedDate();
  const totals = {};

  getEntriesForDate(date).forEach(entry => {
    totals[entry.activity] = (totals[entry.activity] || 0) + Number(entry.litres);
  });

  const labels = Object.keys(totals);
  const values = labels.map(label => Number(totals[label].toFixed(1)));

  $("chartTotal").textContent = formatLitres(values.reduce((sum, value) => sum + value, 0));

  if (chart) {
    chart.destroy();
    chart = null;
  }

  if (typeof Chart === "undefined") {
    $("chartSummary").textContent = "Chart unavailable. Check your internet connection.";
    return;
  }

  chart = new Chart($("activityChart"), {
    type: "bar",
    data: {
      labels: labels.length ? labels.map(label => activityInfo[label]?.label || label) : ["No records"],
      datasets: [{
        label: "Water used (L)",
        data: labels.length ? values : [0],
        backgroundColor: labels.length
          ? labels.map(label => activityInfo[label]?.color || "#12a995")
          : ["#e5edef"],
        borderRadius: 7,
        borderSkipped: false,
        maxBarThickness: 55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => ` ${formatLitres(context.raw)} L`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#71858f", maxRotation: 25, minRotation: 0 }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#71858f", callback: value => `${value} L` },
          grid: { color: "#e8eff1" }
        }
      }
    }
  });

  if (!labels.length) {
    $("chartSummary").textContent = `No consumption records for ${formatDate(date)}.`;
    return;
  }

  const highest = labels.reduce((a, b) => totals[a] > totals[b] ? a : b);
  $("chartSummary").textContent =
    `Highest-use activity: ${activityInfo[highest]?.label || highest} (${formatLitres(totals[highest])} L).`;
}

function renderHistory() {
  const date = getSelectedDate();
  const body = $("historyBody");
  body.replaceChildren();

  const records = getEntriesForDate(date).sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );

  $("emptyState").classList.toggle("hidden", records.length > 0);
  $("historyTable").classList.toggle("hidden", records.length === 0);

  records.forEach(entry => {
    const row = document.createElement("tr");

    const activityCell = document.createElement("td");
    activityCell.textContent =
      `${activityInfo[entry.activity]?.icon || "💧"} ${activityInfo[entry.activity]?.label || entry.activity}`;

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(entry.date);

    const amountCell = document.createElement("td");
    amountCell.textContent = `${formatLitres(entry.litres)} L`;

    const actionCell = document.createElement("td");
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteEntry(entry.id));

    actionCell.append(deleteButton);
    row.append(activityCell, dateCell, amountCell, actionCell);
    body.append(row);
  });
}

function deleteEntry(id) {
  const previous = entries;
  entries = entries.filter(entry => entry.id !== id);

  if (!writeStorage(STORAGE.entries, entries)) {
    entries = previous;
    return;
  }

  renderAll();
  showToast("Usage record deleted.");
}

$("clearDayButton").addEventListener("click", () => {
  const date = getSelectedDate();
  const dayEntries = getEntriesForDate(date);

  if (!dayEntries.length) return showToast("No records to clear for this date.");
  if (!confirm(`Delete all ${dayEntries.length} record(s) for ${formatDate(date)}?`)) return;

  const previous = entries;
  entries = entries.filter(entry => entry.date !== date);

  if (!writeStorage(STORAGE.entries, entries)) {
    entries = previous;
    return;
  }

  renderAll();
  showToast("Selected day's records cleared.");
});

$("chartDate").addEventListener("change", () => {
  if (!$("chartDate").value) $("chartDate").value = todayString();
  $("usageDate").value = $("chartDate").value;
  renderAll();
});

$("usageDate").addEventListener("change", () => {
  if (!$("usageDate").value) return;
  $("chartDate").value = $("usageDate").value;
  renderAll();
});

function renderTip() {
  const tip = tips[tipIndex % tips.length];
  $("tipTitle").textContent = tip[0];
  $("tipText").textContent = tip[1];
}

$("newTipButton").addEventListener("click", () => {
  tipIndex = (tipIndex + 1) % tips.length;
  renderTip();
});

document.addEventListener("DOMContentLoaded", () => {
  const user = readStorage(STORAGE.user, null);

  if (user && user.email === DEMO_EMAIL) {
    showDashboard(DEMO_EMAIL);
  } else {
    $("loginPage").classList.remove("hidden");
    $("appShell").classList.add("hidden");
  }
});
