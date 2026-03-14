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
