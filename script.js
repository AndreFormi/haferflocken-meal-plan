const STORAGE_KEY = "haferflocken_meal_plan_v1";

const DAY_ORDER = {
  "Montag": 1,
  "Dienstag": 2,
  "Mittwoch": 3,
  "Donnerstag": 4,
  "Freitag": 5,
  "Samstag": 6,
  "Sonntag": 7
};

const DEFAULT_TIMES = {
  "Frühstück": "08:00",
  "Mittagessen": "13:00",
  "Abendessen": "19:00",
  "Snack": "16:30"
};

const dayEl = document.getElementById("day");
const mealEl = document.getElementById("meal");
const timeEl = document.getElementById("time");
const recipeEl = document.getElementById("recipe");
const msgEl = document.getElementById("msg");

const shoppingView = document.getElementById("shoppingView");
const planView = document.getElementById("planView");
const tabShoppingBtn = document.getElementById("tabShoppingBtn");
const tabPlanBtn = document.getElementById("tabPlanBtn");

document.getElementById("addMealBtn").addEventListener("click", addMeal);
document.getElementById("refreshShoppingBtn").addEventListener("click", renderShopping);
document.getElementById("refreshPlanBtn").addEventListener("click", renderPlan);
document.getElementById("clearAllBtn").addEventListener("click", clearAll);
document.getElementById("copyShoppingBtn").addEventListener("click", copyShopping);
tabShoppingBtn.addEventListener("click", () => showTab("shopping"));
tabPlanBtn.addEventListener("click", () => showTab("plan"));
mealEl.addEventListener("change", handleMealTimeDefault);

init();

function init() {
  loadRecipes();
  renderShopping();
  renderPlan();
}

function loadRecipes() {
  recipeEl.innerHTML = `<option value="">Rezept wählen…</option>`;
  RECIPES_DATA.forEach(recipe => {
    const option = document.createElement("option");
    option.value = recipe.title;
    option.textContent = recipe.title;
    recipeEl.appendChild(option);
  });
}

function handleMealTimeDefault() {
  if (!timeEl.value && DEFAULT_TIMES[mealEl.value]) {
    timeEl.value = DEFAULT_TIMES[mealEl.value];
  }
}

function showTab(which) {
  if (which === "shopping") {
    shoppingView.classList.remove("hidden");
    planView.classList.add("hidden");
    tabShoppingBtn.classList.add("active");
    tabPlanBtn.classList.remove("active");
  } else {
    shoppingView.classList.add("hidden");
    planView.classList.remove("hidden");
    tabShoppingBtn.classList.remove("active");
    tabPlanBtn.classList.add("active");
  }
}

function setMsg(text, type = "") {
  msgEl.className = type;
  msgEl.textContent = text;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function getStoredPlan() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredPlan(plan) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

function addMeal() {
  const day = dayEl.value.trim();
  const meal = mealEl.value.trim();
  const recipe = recipeEl.value.trim();
  const time = timeEl.value.trim() || DEFAULT_TIMES[meal] || "12:00";

  if (!day || !meal || !recipe) {
    setMsg("❌ Bitte Tag, Mahlzeit und Rezept auswählen.", "err");
    return;
  }

  const plan = getStoredPlan();

  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
    day,
    meal,
    time,
    recipe,
    createdAt: new Date().toISOString()
  };

  plan.push(entry);
  saveStoredPlan(plan);

  renderShopping();
  renderPlan();
  showTab("shopping");
  setMsg("✅ Mahlzeit hinzugefügt.", "ok");
}

function renderShopping() {
  const tbody = document.querySelector("#shoppingTable tbody");
  tbody.innerHTML = "";

  const plan = getStoredPlan();
  const shoppingList = buildShoppingList(plan);

  if (shoppingList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="muted">Noch keine Zutaten vorhanden. Füge zuerst eine Mahlzeit hinzu.</td></tr>`;
    return;
  }

  shoppingList.forEach(item => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(item.name)}</td>
      <td class="num">${escapeHtml(formatQty(item.total))}</td>
      <td>${escapeHtml(item.unit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function buildShoppingList(plan) {
  const map = new Map();

  plan.forEach(entry => {
    const recipe = RECIPES_DATA.find(r => r.title === entry.recipe);
    if (!recipe) return;

    recipe.ingredients.forEach(ingredient => {
      const key = `${ingredient.name.toLowerCase()}||${ingredient.unit.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, {
          name: ingredient.name,
          unit: ingredient.unit,
          total: 0
        });
      }

      const obj = map.get(key);
      const qty = Number(ingredient.qty);
      if (!Number.isNaN(qty)) {
        obj.total += qty;
      }
    });
  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "de")
  );
}

function formatQty(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

function renderPlan() {
  const tbody = document.querySelector("#planTable tbody");
  tbody.innerHTML = "";

  const plan = getStoredPlan();
  const sorted = [...plan].sort(sortPlanEntries);

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Dein Plan ist noch leer.</td></tr>`;
    return;
  }

  sorted.forEach(entry => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(entry.day)}</td>
      <td>${escapeHtml(entry.time)}</td>
      <td>${escapeHtml(entry.meal)}</td>
      <td>${escapeHtml(entry.recipe)}</td>
      <td>
        <div class="action-group">
          <button class="small-btn" type="button" onclick="exportMealToICS('${escapeHtml(entry.id)}')">📅</button>
          <button class="small-btn" type="button" onclick="deleteMeal('${escapeHtml(entry.id)}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function sortPlanEntries(a, b) {
  const dayDiff = (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
  if (dayDiff !== 0) return dayDiff;
  return String(a.time).localeCompare(String(b.time));
}

function deleteMeal(id) {
  const confirmed = window.confirm("Möchtest du diese Mahlzeit wirklich löschen?");
  if (!confirmed) return;

  const plan = getStoredPlan().filter(item => item.id !== id);
  saveStoredPlan(plan);
  renderShopping();
  renderPlan();
  setMsg("✅ Mahlzeit gelöscht.", "ok");
}

function clearAll() {
  const confirmed = window.confirm("Möchtest du den gesamten Plan und die Einkaufsliste löschen?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  renderShopping();
  renderPlan();
  setMsg("✅ Alles wurde gelöscht.", "ok");
}

function copyShopping() {
  const shoppingList = buildShoppingList(getStoredPlan());
  if (shoppingList.length === 0) {
    setMsg("⚠️ Die Einkaufsliste ist leer.", "err");
    return;
  }

  const text = shoppingList
    .map(item => `${item.name} — ${formatQty(item.total)} ${item.unit}`.trim())
    .join("\n");

  navigator.clipboard.writeText(text)
    .then(() => setMsg("✅ Einkaufsliste in die Zwischenablage kopiert.", "ok"))
    .catch(() => setMsg("⚠️ Kopieren nicht möglich. Bitte manuell kopieren.", "err"));
}

function exportMealToICS(id) {
  const plan = getStoredPlan();
  const entry = plan.find(item => item.id === id);

  if (!entry) {
    setMsg("❌ Mahlzeit nicht gefunden.", "err");
    return;
  }

  const startDate = getNextDateForGermanWeekday(entry.day, entry.time);
  const endDate = new Date(startDate.getTime() + 30 * 60000);

  const title = `${entry.meal}: ${entry.recipe}`;
  const description = `Erstellt mit dem interaktiven Haferflocken-Mahlzeitenplan.`;

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Haferflocken Meal Plan//DE",
    "BEGIN:VEVENT",
    `UID:${entry.id}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(title)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(entry.recipe)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  setMsg("✅ Kalendereintrag exportiert.", "ok");
}

function getNextDateForGermanWeekday(dayName, timeValue) {
  const weekdayMap = {
    "Sonntag": 0,
    "Montag": 1,
    "Dienstag": 2,
    "Mittwoch": 3,
    "Donnerstag": 4,
    "Freitag": 5,
    "Samstag": 6
  };

  const targetDay = weekdayMap[dayName];
  const now = new Date();
  const currentDay = now.getDay();

  let delta = targetDay - currentDay;
  if (delta < 0) delta += 7;

  const result = new Date(now);
  result.setDate(now.getDate() + delta);

  const [hours, minutes] = (timeValue || "12:00").split(":").map(Number);
  result.setHours(hours || 12, minutes || 0, 0, 0);

  if (delta === 0 && result.getTime() < now.getTime()) {
    result.setDate(result.getDate() + 7);
  }

  return result;
}

function formatICSDate(date) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}Z`;
}

function escapeICSText(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
