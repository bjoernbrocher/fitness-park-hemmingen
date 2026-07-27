const people = [
  ["Anna Meyer","AM","18:42","47 Min."],["Tom Becker","TB","18:31","58 Min."],
  ["Lisa Schulz","LS","18:18","1 Std. 11 Min."],["David Klein","DK","17:54","1 Std. 35 Min."],
  ["Sofia Wagner","SW","17:41","1 Std. 48 Min."],["Jonas Fischer","JF","17:12","2 Std. 17 Min."]
];
let checkedIn = false;
let checkInAt = null;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function initialsList(target, filter = "") {
  const normalized = filter.trim().toLowerCase();
  const rows = people.filter(([name]) => name.toLowerCase().includes(normalized));
  target.innerHTML = rows.map(([name, initials, time, duration]) => `
    <article class="person">
      <div class="person-avatar">${initials}</div>
      <div class="person-info"><strong>${name}</strong><span>Check-in ${time} Uhr</span></div>
      <div class="person-time"><strong>${duration}</strong><span>aktiv</span></div>
    </article>`).join("") || `<p class="privacy-note">Kein Mitglied gefunden.</p>`;
}

function go(view) {
  $$(".view").forEach((item) => item.classList.toggle("active", item.id === view));
  const activeGroup = ["staff","attendance","incidents"].includes(view) ? "staff" : view;
  $$(".bottom-nav button[data-go]").forEach((button) => {
    const target = button.dataset.navGroup || button.dataset.go;
    button.classList.toggle("active", target === activeGroup);
  });
  window.scrollTo({top:0,behavior:"smooth"});
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}

function setCheckedIn(value) {
  checkedIn = value;
  const card = $("#statusCard");
  card.classList.toggle("checked", value);
  $("#statusTitle").textContent = value ? "Du bist eingecheckt" : "Nicht eingecheckt";
  $("#statusText").innerHTML = value ? "FITNESS PARK in Hemmingen<br>Seit gerade eben" : "Scanne den QR-Code am Eingang,<br>um deinen Besuch zu starten.";
  $("#statusIcon").textContent = value ? "✓" : "⌗";
  $("#actionIcon").textContent = value ? "↗" : "⌗";
  $("#actionLabel").textContent = value ? "Jetzt auschecken" : "QR-Code scannen";
  $("#duration").classList.toggle("hidden", !value);
  $("#problemButton").classList.toggle("hidden", !value);
  if (value) checkInAt = new Date();
}

function updateDuration() {
  if (!checkedIn || !checkInAt) return;
  const seconds = Math.floor((Date.now() - checkInAt.getTime()) / 1000);
  const hh = String(Math.floor(seconds / 3600)).padStart(2,"0");
  const mm = String(Math.floor(seconds % 3600 / 60)).padStart(2,"0");
  const ss = String(seconds % 60).padStart(2,"0");
  $("#durationValue").textContent = `${hh}:${mm}:${ss}`;
}

$$("[data-go]").forEach((button) => button.addEventListener("click", () => go(button.dataset.go)));
$$("[data-close]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));
$("#checkAction").addEventListener("click", () => $(checkedIn ? "#checkoutDialog" : "#scannerDialog").showModal());
$("#simulateScan").addEventListener("click", () => {
  $("#scannerDialog").close();
  setCheckedIn(true);
  toast("Check-in erfolgreich · Serverzeit 19:29 Uhr");
});
$("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#checkoutDialog").close();
  setCheckedIn(false);
  toast("Check-out erfolgreich · Besuchsdauer gespeichert");
});
$("#problemButton").addEventListener("click", () => toast("Das Studio-Team wurde über dein Problem informiert."));
$("#roleToggle").addEventListener("click", () => go("profile"));
["#newIncident","#newIncident2"].forEach((id) => $(id).addEventListener("click", () => $("#incidentDialog").showModal()));
$("#viewIncident").addEventListener("click", () => $("#resultDialog").showModal());
$("#incidentForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#incidentDialog").close();
  $("#resultDialog").showModal();
  toast("Vorfall angelegt · 25 relevante Anwesenheiten");
});
$("#staffSearch").addEventListener("input", (event) => initialsList($("#peopleList"), event.target.value));
$("#attendanceSearch").addEventListener("input", (event) => initialsList($("#attendanceList"), event.target.value));
$$(".filter-row button").forEach((button) => button.addEventListener("click", () => {
  $$(".filter-row button").forEach((b) => b.classList.remove("active"));
  button.classList.add("active");
  toast(`Filter „${button.textContent}“ aktiv`);
}));

initialsList($("#peopleList"));
initialsList($("#attendanceList"));
setInterval(updateDuration, 1000);
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
