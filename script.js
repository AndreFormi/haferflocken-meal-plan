// TAB SWITCH

const shoppingBtn = document.getElementById("tabShoppingBtn");
const planBtn = document.getElementById("tabPlanBtn");

const shoppingView = document.getElementById("shoppingView");
const planView = document.getElementById("planView");

if(shoppingBtn){
shoppingBtn.addEventListener("click",()=>{
shoppingBtn.classList.add("active");
planBtn.classList.remove("active");

shoppingView.classList.remove("hidden");
planView.classList.add("hidden");
});
}

if(planBtn){
planBtn.addEventListener("click",()=>{
planBtn.classList.add("active");
shoppingBtn.classList.remove("active");

planView.classList.remove("hidden");
shoppingView.classList.add("hidden");
});
}


// INSTALL PWA

let deferredPrompt;

window.addEventListener("beforeinstallprompt",(e)=>{
e.preventDefault();

deferredPrompt = e;

const btn = document.getElementById("installAppBtn");

if(btn){
btn.classList.remove("hidden");

btn.addEventListener("click", async () => {

btn.classList.add("hidden");

deferredPrompt.prompt();

const { outcome } = await deferredPrompt.userChoice;

deferredPrompt = null;

});
}

});


// SERVICE WORKER

if ("serviceWorker" in navigator) {

window.addEventListener("load", () => {

navigator.serviceWorker.register("./sw.js")

.then((reg) => {
console.log("Service Worker registrato");
})

.catch((err) => {
console.log("Errore SW:", err);
});

});

}
/* ===== PWA INSTALL + SW REGISTER ===== */

(function () {
  let deferredPrompt = null;

  const installBtn = document.getElementById("installAppBtn");
  const installAndroidBlock = document.getElementById("installAndroidBlock");
  const installIosBlock = document.getElementById("installIosBlock");

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function showInstallHints() {
    if (isStandalone()) return;

    if (isIOS() && installIosBlock) {
      installIosBlock.classList.remove("hidden");
    }

    if (isAndroid() && installAndroidBlock) {
      installAndroidBlock.classList.remove("hidden");
    }
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (installBtn) {
      installBtn.classList.remove("hidden");
    }
    if (installAndroidBlock) {
      installAndroidBlock.classList.remove("hidden");
    }
  });

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;

      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.add("hidden");
    });
  }

  window.addEventListener("appinstalled", () => {
    const installBox = document.getElementById("installBox");
    if (installBox) installBox.style.display = "none";
  });

  showInstallHints();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.log("SW non registrato:", err);
      });
    });
  }
})();
