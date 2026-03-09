const STORAGE_KEY_PLAN = "piano_pasti_avena_v3";
const STORAGE_KEY_CART = "piano_pasti_avena_carrello_v3";
const STORAGE_KEY_APP_INSTALLED_HINT = "piano_pasti_avena_app_installed_hint";

const DAYS = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];
const MEALS = ["Colazione", "Pranzo", "Cena", "Snack"];

const DEFAULT_TIMES = {
  "Colazione": "08:00",
  "Pranzo": "13:00",
  "Cena": "19:00",
  "Snack": "16:30"
};

let deferredPrompt = null;

const dayEl = document.getElementById("day");
const mealEl = document.getElementById("meal");
const timeEl = document.getElementById("time");
const recipeEl = document.getElementById("recipe");
const recipeSearchEl = document.getElementById("recipeSearch");
const categoryFilterEl = document.getElementById("categoryFilter");
const msgEl = document.getElementById("msg");
const nextMealBoxEl = document.getElementById("nextMealBox");
const plannerGridEl = document.getElementById("plannerGrid");
const installAppBtn = document.getElementById("installAppBtn");
const installBoxEl = document.querySelector(".install-box");

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
categoryFilterEl.addEventListener("change", renderRecipeOptions);
recipeSearchEl.addEventListener("input", renderRecipeOptions);

if (installAppBtn) {
  installAppBtn.addEventListener("click", installApp);
}

init();

function init() {
  loadCategories();
  renderRecipeOptions();
  renderAll();
  registerServiceWorker();

  updateInstallBannerVisibility();

  window.addEventListener("load", updateInstallBannerVisibility);
  window.addEventListener("pageshow", updateInstallBannerVisibility);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateInstallBannerVisibility();
    }
  });

  window.addEventListener("focus", updateInstallBannerVisibility);

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  if (standaloneQuery && standaloneQuery.addEventListener) {
    standaloneQuery.addEventListener("change", updateInstallBannerVisibility);
  }

  // ricontrollo ritardato per mobile/browser lenti
  setTimeout(updateInstallBannerVisibility, 600);
  setTimeout(updateInstallBannerVisibility, 1500);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        console.log("Service worker non registrato.");
      });
    });
  }
}

function isRunningAsApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

function hasInstallHint() {
  return localStorage.getItem(STORAGE_KEY_APP_INSTALLED_HINT) === "1";
}

function setInstallHint() {
  localStorage.setItem(STORAGE_KEY_APP_INSTALLED_HINT, "1");
}

function clearInstallHint() {
  localStorage.removeItem(STORAGE_KEY_APP_INSTALLED_HINT);
}

function updateInstallBannerVisibility() {
  if (!installBoxEl) return;

  // regola robusta:
  // 1) se siamo in standalone => nascondi
  // 2) se l'utente ha già cliccato installa/appinstalled => nascondi
  if (isRunningAsApp() || hasInstallHint()) {
    installBoxEl.classList.add("hidden");
  } else {
    installBoxEl.classList.remove("hidden");
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (installAppBtn && !isRunningAsApp() && !hasInstallHint()) {
    installAppBtn.classList.remove("hidden");
  }
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  setInstallHint();

  if (installAppBtn) {
    installAppBtn.classList.add("hidden");
  }

  if (installBoxEl) {
    installBoxEl.classList.add("hidden");
  }
});

async function installApp() {
  if (!deferredPrompt) {
    // anche qui salviamo il hint, perché alcuni browser installano senza
    // lanciare eventi in modo perfetto, ma l'utente ha già scelto di usarla come app
    setInstallHint();
    updateInstallBannerVisibility();

    setMsg(
      "ℹ️ Installazione non disponibile qui. Apri l’app in un browser compatibile e usa l’opzione del browser per installarla.",
      ""
    );
    return;
  }

  // appena clicca installa, salviamo il hint
  setInstallHint();

  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;

  if (choice && choice.outcome === "accepted") {
    setMsg("✅ Installazione avviata.", "ok");
  } else {
    // se annulla, togliamo il flag
    clearInstallHint();
    setMsg("ℹ️ Installazione annullata.", "");
  }

  deferredPrompt = null;

  if (installAppBtn) {
    installAppBtn.classList.add("hidden");
  }

  setTimeout(() => {
    updateInstallBannerVisibility();
  }, 500);

  setTimeout(() => {
    updateInstallBannerVisibility();
  }, 1500);
}

function renderAll() {
  renderShopping();
  renderPlannerGrid();
  renderNextMeal();
}

function loadCategories() {
  const categories = Array.from(new Set(RECIPES_DATA.map(r => r.category))).sort((a, b) =>
    a.localeCompare(b, "it")
  );

  categoryFilterEl.innerHTML = `<option value="Tutte">Tutte</option>`;
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilterEl.appendChild(option);
  });
}

function renderRecipeOptions() {
  const selectedCategory = categoryFilterEl.value || "Tutte";
  const search = (recipeSearchEl.value || "").trim().toLowerCase();

  const filtered = RECIPES_DATA.filter(recipe => {
    const categoryMatch = selectedCategory === "Tutte" || recipe.category === selectedCategory;
    const textMatch =
      !search ||
      recipe.title.toLowerCase().includes(search) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(search));
    return categoryMatch && textMatch;
  });

  const currentValue = recipeEl.value;
  recipeEl.innerHTML = `<option value="">Seleziona ricetta…</option>`;

  filtered.forEach(recipe => {
    const option = document.createElement("option");
    option.value = recipe.title;
    option.textContent = `${recipe.title} · ${recipe.category}`;
    recipeEl.appendChild(option);
  });

  const stillExists = filtered.some(r => r.title === currentValue);
  if (stillExists) {
    recipeEl.value = currentValue;
  }
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
    showTab("plan");
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
  showTab("plan");
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

  const fullShoppingList = buildShoppingList(getStoredPlan());
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
        <td class="unit-cell">${escapeHtml(item.unit)}</td>
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
        <td class="unit-cell">${escapeHtml(item.unit)}</td>
        <td><button class="small-btn" type="button" title="Rimuovi dal carrello" onclick="removeFromCart('${escapeHtml(item.key)}')">🛒−</button></td>
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

function renderPlannerGrid() {
  plannerGridEl.innerHTML = "";

  const plan = getStoredPlan();

  plannerGridEl.appendChild(createDiv("grid-head", ""));
  DAYS.forEach(day => plannerGridEl.appendChild(createDiv("grid-head", day)));

  MEALS.forEach(meal => {
    plannerGridEl.appendChild(createDiv("grid-side", meal));

    DAYS.forEach(day => {
      const entry = plan.find(item => item.day === day && item.meal === meal);
      const cell = document.createElement("div");
      cell.className = "grid-cell";

      if (!entry) {
        cell.innerHTML = `<div class="grid-empty">Vuoto</div>`;
        cell.addEventListener("click", () => {
          dayEl.value = day;
          mealEl.value = meal;
          if (!timeEl.value && DEFAULT_TIMES[meal]) {
            timeEl.value = DEFAULT_TIMES[meal];
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
          setMsg(`ℹ️ Hai selezionato ${meal} di ${day}. Ora scegli la ricetta e salva.`, "");
        });
      } else {
        cell.innerHTML = `
          <div class="grid-time">${escapeHtml(entry.time)}</div>
          <div class="grid-recipe">${escapeHtml(entry.recipe)}</div>
          <div class="grid-actions">
            <button class="grid-mini-btn" type="button" title="Modifica" onclick="prefillMeal('${escapeHtml(entry.id)}')">✏️</button>
            <button class="grid-mini-btn" type="button" title="Elimina" onclick="deleteMeal('${escapeHtml(entry.id)}')">🗑️</button>
          </div>
        `;
      }

      plannerGridEl.appendChild(cell);
    });
  });
}

function createDiv(className, text) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return div;
}

function prefillMeal(id) {
  const entry = getStoredPlan().find(item => item.id === id);
  if (!entry) return;

  const recipeObj = RECIPES_DATA.find(r => r.title === entry.recipe);
  if (recipeObj) {
    categoryFilterEl.value = recipeObj.category || "Tutte";
  } else {
    categoryFilterEl.value = "Tutte";
  }

  recipeSearchEl.value = "";
  renderRecipeOptions();

  dayEl.value = entry.day;
  mealEl.value = entry.meal;
  timeEl.value = entry.time;
  recipeEl.value = entry.recipe;

  window.scrollTo({ top: 0, behavior: "smooth" });
  setMsg("ℹ️ Modifica i campi e premi “Salva pasto” per sostituire questo slot.", "");
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
  const fullShoppingList = buildShoppingList(getStoredPlan());
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
