const STORAGE_KEY_PLAN = "piano_pasti_avena_v2";
const STORAGE_KEY_CART = "piano_pasti_avena_carrello_v2";

const DAY_ORDER = {
  "Lunedì": 1,
  "Martedì": 2,
  "Mercoledì": 3,
  "Giovedì": 4,
  "Venerdì": 5,
  "Sabato": 6,
  "Domenica": 7
};

const DEFAULT_TIMES = {
  "Colazione": "08:00",
  "Pranzo": "13:00",
  "Cena": "19:00",
  "Snack": "16:30"
};

const dayEl = document.getElementById("day");
const mealEl = document.getElementById("meal");
const timeEl = document.getElementById("time");
const recipeEl = document.getElementById("recipe");
const msgEl = document.getElementById("msg");
const nextMealBoxEl = document.getElementById("nextMealBox");

const shoppingView = document.getElementById("shoppingView");
const planView = document.getElementById("planView");
const tabShoppingBtn = document.getElementById("tabShoppingBtn");
const tabPlanBtn = document.getElementById("tabPlanBtn");

document.getElementById("addMealBtn").addEventListener("click", addMeal);
document.getElementById("clearAllBtn").addEventListener("click", clearAll);
document.getElementById("copyShoppingBtn").addEventListener("click", copyShopping);
tabShoppingBtn.addEventListener("click", () => showTab("shopping"));
tabPlanBtn.addEventListener("click", () => showTab("plan"));
mealEl.addEventListener("change", handleMealTimeDefault);

init();

function init() {
  loadRecipes();
  renderAll();
}

function renderAll() {
  renderShopping();
  renderPlan();
  renderNextMeal();
}

function loadRecipes() {
  recipeEl.innerHTML = `<option value="">Seleziona ricetta…</option>`;
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
  const raw = localStorage.getItem(STORAGE_KEY_PLAN);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredPlan(plan) {
  localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
}

function getStoredCartKeys() {
  const raw = localStorage.getItem(STORAGE_KEY_CART);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredCartKeys(keys) {
  localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(keys));
}

function addMeal() {
  const day = dayEl.value.trim();
  const meal = mealEl.value.trim();
  const recipe = recipeEl.value.trim();
  const time = timeEl.value.trim() || DEFAULT_TIMES[meal] || "12:00";

  if (!day || !meal || !recipe) {
    setMsg("❌ Seleziona giorno, pasto e ricetta.", "err");
    return;
  }

  const plan = getStoredPlan();
  const existingIndex = plan.findIndex(item => item.day === day && item.meal === meal);

  if (existingIndex !== -1) {
    const confirmed = window.confirm(
      `Per ${day} esiste già un ${meal}. Vuoi sostituirlo con la nuova ricetta?`
    );
    if (!confirmed) {
      setMsg("ℹ️ Nessuna modifica effettuata.", "");
      return;
    }

    plan[existingIndex] = {
      ...plan[existingIndex],
      time,
      recipe,
      updatedAt: new Date().toISOString()
    };

    saveStoredPlan(plan);
    cleanCartFromUnavailableIngredients();
    renderAll();
    showTab("shopping");
    setMsg("✅ Pasto sostituito.", "ok");
    return;
  }

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
  cleanCartFromUnavailableIngredients();
  renderAll();
  showTab("shopping");
  setMsg("✅ Pasto aggiunto.", "ok");
}

function buildIngredientKey(name, unit) {
  return `${String(name).toLowerCase()}||${String(unit).toLowerCase()}`;
}

function buildShoppingList(plan) {
  const map = new Map();

  plan.forEach(entry => {
    const recipe = RECIPES_DATA.find(r => r.title === entry.recipe);
    if (!recipe) return;

    recipe.ingredients.forEach(ingredient => {
      const key = buildIngredientKey(ingredient.name, ingredient.unit);
      if (!map.has(key)) {
        map.set(key, {
          key,
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
    a.name.localeCompare(b.name, "it")
  );
}

function renderShopping() {
  const shoppingTbody = document.querySelector("#shoppingTable tbody");
  const cartTbody = document.querySelector("#cartTable tbody");
  shoppingTbody.innerHTML = "";
  cartTbody.innerHTML = "";

  const plan = getStoredPlan();
  const fullShoppingList = buildShoppingList(plan);
  const cartKeys = getStoredCartKeys();

  const cartItems = fullShoppingList.filter(item => cartKeys.includes(item.key));
  const shoppingItems = fullShoppingList.filter(item => !cartKeys.includes(item.key));

  if (shoppingItems.length === 0) {
    shoppingTbody.innerHTML = `<tr><td colspan="4" class="muted">Nessun ingrediente da comprare in questo momento.</td></tr>`;
  } else {
    shoppingItems.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td class="num">${escapeHtml(formatQty(item.total))}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td><button class="small-btn" type="button" title="Metti nel carrello" onclick="moveToCart('${escapeHtml(item.key)}')">🛒+</button></td>
      `;
      shoppingTbody.appendChild(tr);
    });
  }

  if (cartItems.length === 0) {
    cartTbody.innerHTML = `<tr><td colspan="4" class="muted">Il carrello è vuoto.</td></tr>`;
  } else {
    cartItems.forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td class="num">${escapeHtml(formatQty(item.total))}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td><button class="small-btn" type="button" title="Rimuovi dal carrello" onclick="removeFromCart('${escapeHtml(item.key)}')">−</button></td>
      `;
      cartTbody.appendChild(tr);
    });
  }
}

function moveToCart(key) {
  const cartKeys = getStoredCartKeys();
  if (!cartKeys.includes(key)) {
    cartKeys.push(key);
    saveStoredCartKeys(cartKeys);
  }
  renderShopping();
  setMsg("✅ Ingrediente spostato nel carrello.", "ok");
}

function removeFromCart(key) {
  const updated = getStoredCartKeys().filter(item => item !== key);
  saveStoredCartKeys(updated);
  renderShopping();
  setMsg("✅ Ingrediente rimosso dal carrello.", "ok");
}

function cleanCartFromUnavailableIngredients() {
  const activeKeys = buildShoppingList(getStoredPlan()).map(item => item.key);
  const cleaned = getStoredCartKeys().filter(key => activeKeys.includes(key));
  saveStoredCartKeys(cleaned);
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
    tbody.innerHTML = `<tr><td colspan="5" class="muted">Il piano è ancora vuoto.</td></tr>`;
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
          <button class="small-btn" type="button" title="Modifica" onclick="prefillMeal('${escapeHtml(entry.id)}')">✏️</button>
          <button class="small-btn" type="button" title="Elimina" onclick="deleteMeal('${escapeHtml(entry.id)}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function prefillMeal(id) {
  const entry = getStoredPlan().find(item => item.id === id);
  if (!entry) return;

  dayEl.value = entry.day;
  mealEl.value = entry.meal;
  timeEl.value = entry.time;
  recipeEl.value = entry.recipe;

  window.scrollTo({ top: 0, behavior: "smooth" });
  setMsg("ℹ️ Modifica i campi e premi “Salva pasto” per sostituire questo slot.", "");
}

function sortPlanEntries(a, b) {
  const dayDiff = (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99);
  if (dayDiff !== 0) return dayDiff;
  return String(a.time).localeCompare(String(b.time));
}

function deleteMeal(id) {
  const confirmed = window.confirm("Vuoi eliminare questo pasto?");
  if (!confirmed) return;

  const plan = getStoredPlan().filter(item => item.id !== id);
  saveStoredPlan(plan);
  cleanCartFromUnavailableIngredients();
  renderAll();
  setMsg("✅ Pasto eliminato.", "ok");
}

function clearAll() {
  const confirmed = window.confirm("Vuoi svuotare tutto il piano, la lista e il carrello?");
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY_PLAN);
  localStorage.removeItem(STORAGE_KEY_CART);
  renderAll();
  setMsg("✅ Tutto cancellato.", "ok");
}

function copyShopping() {
  const plan = getStoredPlan();
  const fullShoppingList = buildShoppingList(plan);
  const cartKeys = getStoredCartKeys();
  const shoppingItems = fullShoppingList.filter(item => !cartKeys.includes(item.key));

  if (shoppingItems.length === 0) {
    setMsg("⚠️ Non ci sono ingredienti da copiare.", "err");
    return;
  }

  const text = shoppingItems
    .map(item => `${item.name} — ${formatQty(item.total)} ${item.unit}`.trim())
    .join("\n");

  navigator.clipboard.writeText(text)
    .then(() => setMsg("✅ Lista copiata negli appunti.", "ok"))
    .catch(() => setMsg("⚠️ Copia non disponibile. Copia manualmente.", "err"));
}

function renderNextMeal() {
  const next = getNextMealEntry();
  if (!next) {
    nextMealBoxEl.classList.add("hidden");
    nextMealBoxEl.textContent = "";
    return;
  }

  nextMealBoxEl.classList.remove("hidden");
  nextMealBoxEl.textContent = `⏰ Prossimo pasto: ${next.day} alle ${next.time} — ${next.meal}: ${next.recipe}`;
}

function getNextMealEntry() {
  const plan = getStoredPlan();
  if (!plan.length) return null;

  const entriesWithDate = plan.map(entry => ({
    ...entry,
    nextDate: getNextDateForItalianWeekday(entry.day, entry.time)
  }));

  entriesWithDate.sort((a, b) => a.nextDate - b.nextDate);
  return entriesWithDate[0] || null;
}

function getNextDateForItalianWeekday(dayName, timeValue) {
  const weekdayMap = {
    "Domenica": 0,
    "Lunedì": 1,
    "Martedì": 2,
    "Mercoledì": 3,
    "Giovedì": 4,
    "Venerdì": 5,
    "Sabato": 6
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
