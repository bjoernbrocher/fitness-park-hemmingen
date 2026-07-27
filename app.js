const people = [
  ["Anna Meyer","AM","18:42","47 Min."],["Tom Becker","TB","18:31","58 Min."],
  ["Lisa Schulz","LS","18:18","1 Std. 11 Min."],["David Klein","DK","17:54","1 Std. 35 Min."],
  ["Sofia Wagner","SW","17:41","1 Std. 48 Min."],["Jonas Fischer","JF","17:12","2 Std. 17 Min."]
];
let checkedIn = false;
let checkInAt = null;
let scanStream = null;
let scanTimer = null;
let adminQrPayload = "";
let inviteQrPayload = "";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const qrPrefix = "fitness-park-hemmingen|checkin|";
const supabaseConfig = {
  url: "https://kyjcbmwzcxbymbcuwtfw.supabase.co",
  key: "sb_publishable__hA3dloiAmPSDNqknW4GlA_NFXxTF11"
};
let remoteReady = false;
let remoteVisits = [];
let remoteSystemLog = [];
let member = { name: "Anna Meyer", initials: "AM", number: "4711", email: "anna@example.de", demo: true };
const storageKeys = {
  activeVisit: "fitnessParkActiveVisit",
  visits: "fitnessParkVisits",
  log: "fitnessParkSystemLog",
  member: "fitnessParkMemberProfile"
};
const demoVisits = [
  { start: "2026-07-26T18:42:00", end: "2026-07-26T20:06:00", status: "Regulär" },
  { start: "2026-07-24T17:30:00", end: "2026-07-24T19:40:00", status: "Nachgetragen" },
  { start: "2026-07-22T18:10:00", end: "2026-07-22T23:00:00", status: "Automatisch" },
  { start: "2026-07-20T08:12:00", end: "2026-07-20T09:28:00", status: "Regulär" }
];

function initialsList(target, filter = "") {
  const normalized = filter.trim().toLowerCase();
  const active = activeVisitForDisplay();
  const realRows = active ? [[active.memberName || member.name, initialsFromName(active.memberName || member.name), formatTime(active.start), durationText(new Date(active.start), new Date())]] : [];
  const rows = [...realRows, ...people].filter(([name]) => name.toLowerCase().includes(normalized));
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

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function initialsFromName(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "FP";
}

function loadMemberProfile() {
  return readJson(storageKeys.member, member);
}

function saveMemberProfile(profile) {
  member = {
    ...profile,
    name: profile.name.trim(),
    number: profile.number.trim(),
    email: profile.email?.trim() || "",
    initials: initialsFromName(profile.name),
    demo: false,
    registeredAt: profile.registeredAt || new Date().toISOString()
  };
  writeJson(storageKeys.member, member);
  renderMemberProfile();
}

function renderMemberProfile() {
  const firstName = member.name.split(" ")[0] || member.name;
  $("#roleToggle").textContent = member.initials;
  $("#memberGreeting").textContent = `Hallo, ${firstName}.`;
  $("#profileAvatar").textContent = member.initials;
  $("#profileName").textContent = member.name;
  $("#profileNumber").textContent = member.number;
  $("#profileEmail").textContent = member.email || "nicht hinterlegt";
  $("#profileSince").textContent = member.demo
    ? "Demo-Mitglied seit Januar 2022"
    : `Verknüpft seit ${new Date(member.registeredAt).toLocaleDateString("de-DE", { month: "long", year: "numeric" })}`;
  $("#todayLabel").textContent = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });
}

function loadVisits() {
  return readJson(storageKeys.visits, []);
}

function saveVisits(visits) {
  writeJson(storageKeys.visits, visits);
}

function loadActiveVisit() {
  return readJson(storageKeys.activeVisit, null);
}

function saveActiveVisit(visit) {
  if (visit) writeJson(storageKeys.activeVisit, visit);
  else localStorage.removeItem(storageKeys.activeVisit);
}

function addSystemLog(type, message) {
  const entry = { id: crypto.randomUUID(), type, message, at: new Date().toISOString() };
  const log = readJson(storageKeys.log, []);
  log.unshift(entry);
  writeJson(storageKeys.log, log.slice(0, 50));
  return entry;
}

function mapRemoteVisit(row) {
  return {
    id: row.id,
    memberName: row.member_name,
    memberNumber: row.member_number,
    start: row.started_at,
    end: row.ended_at,
    source: row.source || "qr",
    remote: true
  };
}

function mapRemoteLog(row) {
  return {
    id: row.id,
    type: row.event_type,
    message: row.message,
    at: row.created_at
  };
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${supabaseConfig.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseConfig.key,
      Authorization: `Bearer ${supabaseConfig.key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

async function loadRemoteState() {
  try {
    const [visits, log] = await Promise.all([
      supabaseRequest("fitness_visits?select=*&order=started_at.desc&limit=80"),
      supabaseRequest("fitness_system_log?select=*&order=created_at.desc&limit=80")
    ]);
    remoteVisits = visits.map(mapRemoteVisit);
    remoteSystemLog = log.map(mapRemoteLog);
    remoteReady = true;
    const active = remoteVisits.find((visit) => visit.memberNumber === member.number && !visit.end);
    saveActiveVisit(active || null);
  } catch (error) {
    remoteReady = false;
    console.warn("Supabase sync inactive", error);
  }
}

async function createRemoteVisit(visit) {
  const [row] = await supabaseRequest("fitness_visits", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      id: visit.id,
      member_name: visit.memberName,
      member_number: visit.memberNumber,
      started_at: visit.start,
      source: visit.source
    })
  });
  return mapRemoteVisit(row);
}

async function completeRemoteVisit(visit) {
  const [row] = await supabaseRequest(`fitness_visits?id=eq.${visit.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ended_at: visit.end })
  });
  return mapRemoteVisit(row);
}

async function addRemoteSystemLog(entry) {
  await supabaseRequest("fitness_system_log", {
    method: "POST",
    body: JSON.stringify({ id: entry.id, event_type: entry.type, message: entry.message, created_at: entry.at })
  });
}

async function createRemoteMember(profile) {
  await supabaseRequest("fitness_members?on_conflict=member_number", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      name: profile.name,
      initials: profile.initials,
      member_number: profile.number,
      email: profile.email || null,
      device_label: navigator.userAgent.slice(0, 140)
    })
  });
}

function completedVisitsForDisplay() {
  return remoteReady ? remoteVisits.filter((visit) => visit.end) : loadVisits();
}

function activeVisitForDisplay() {
  return remoteReady ? remoteVisits.find((visit) => visit.memberNumber === member.number && !visit.end) || null : loadActiveVisit();
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTile(value) {
  const date = new Date(value);
  return {
    day: date.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: date.toLocaleDateString("de-DE", { month: "short" }).replace(".", "").toUpperCase()
  };
}

function durationText(start, end = new Date()) {
  const minutes = Math.max(1, Math.round((end - start) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${String(rest).padStart(2, "0")}` : `${rest} Min.`;
}

function visitRow(visit, tag = "Regulär") {
  const tile = formatDateTile(visit.start);
  const start = formatTime(visit.start);
  const end = visit.end ? formatTime(visit.end) : "läuft";
  const duration = visit.end ? durationText(new Date(visit.start), new Date(visit.end)) : durationText(new Date(visit.start));
  const tagClass = visit.end ? "green" : "orange";
  return `<article><div class="date-tile"><strong>${tile.day}</strong><span>${tile.month}</span></div><div><strong>${start} – ${end} Uhr</strong><span>${duration}</span></div><span class="tag ${tagClass}">${tag}</span></article>`;
}

function operatorVisitRow(visit) {
  const end = visit.end ? `${formatTime(visit.end)} Uhr` : "läuft gerade";
  const duration = visit.end ? durationText(new Date(visit.start), new Date(visit.end)) : durationText(new Date(visit.start));
  return `<article class="visit-log-row"><div><strong>${visit.memberName || member.name}</strong><span>${formatTime(visit.start)} Uhr – ${end}</span></div><b>${duration}</b></article>`;
}

function renderLogs() {
  const realVisits = completedVisitsForDisplay();
  const active = activeVisitForDisplay();
  const allVisits = [...(active ? [active] : []), ...realVisits];
  const historyList = $("#historyList");
  historyList.innerHTML = [
    ...allVisits.map((visit) => visitRow(visit, visit.end ? "Echt" : "Aktiv")),
    ...demoVisits.map((visit) => visitRow(visit, visit.status))
  ].join("");

  const latest = allVisits[0] || demoVisits[0];
  $("#lastVisitRow").outerHTML = `<article class="visit-row" id="lastVisitRow">${visitRow(latest, latest.end ? "Echt" : "Aktiv").replace(/^<article>|<\/article>$/g, "")}<span class="visit-duration">${latest.end ? durationText(new Date(latest.start), new Date(latest.end)) : "läuft"}</span></article>`;

  const operatorRows = allVisits.map(operatorVisitRow);
  $("#operatorVisitList").innerHTML = operatorRows.length ? operatorRows.join("") : `<article class="visit-log-row"><div><strong>Noch keine echten Besuche</strong><span>Demo-Besuche bleiben oben sichtbar.</span></div></article>`;
  $("#liveCount").textContent = String(37 + (active ? 1 : 0));
  $("#todayCount").textContent = String(128 + realVisits.filter((visit) => new Date(visit.start).toDateString() === new Date().toDateString()).length);

  const log = remoteReady ? remoteSystemLog : readJson(storageKeys.log, []);
  $("#systemLogList").innerHTML = log.length ? log.map((entry) => `<article><span>${formatTime(entry.at)}</span><strong>${entry.type}</strong><p>${entry.message}</p></article>`).join("") : `<article><span>System</span><strong>Keine echten Ereignisse</strong><p>Check-ins und Check-outs erscheinen hier automatisch.</p></article>`;
  initialsList($("#peopleList"), $("#staffSearch").value);
  initialsList($("#attendanceList"), $("#attendanceSearch").value);
}

function generateQrPayload() {
  const token = crypto.getRandomValues(new Uint32Array(2));
  adminQrPayload = `${qrPrefix}${Date.now()}-${token[0].toString(36)}${token[1].toString(36)}`;
  return adminQrPayload;
}

function generateInvitePayload() {
  const token = crypto.getRandomValues(new Uint32Array(2));
  const inviteToken = `${Date.now()}-${token[0].toString(36)}${token[1].toString(36)}`;
  inviteQrPayload = `${location.origin}${location.pathname}?invite=${encodeURIComponent(inviteToken)}`;
  return inviteQrPayload;
}

function qrImageUrl(payload, size = 260) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=14&data=${encodeURIComponent(payload)}`;
}

function renderAdminQr() {
  const payload = generateQrPayload();
  const url = qrImageUrl(payload);
  $("#adminQrCode").src = url;
  $("#staffQrCode").src = url;
  $("#adminQrPayload").textContent = payload;
}

function renderInviteQr() {
  const payload = generateInvitePayload();
  const url = qrImageUrl(payload);
  $("#adminInviteQrCode").src = url;
  $("#staffInviteQrCode").src = url;
  $("#adminInvitePayload").textContent = payload;
}

function validStudioQr(value) {
  return typeof value === "string" && value.startsWith(qrPrefix);
}

function stopQrScanner() {
  clearTimeout(scanTimer);
  scanTimer = null;
  if (scanStream) {
    scanStream.getTracks().forEach((track) => track.stop());
    scanStream = null;
  }
  $("#qrVideo").srcObject = null;
}

async function finishQrCheckIn(value) {
  if (!validStudioQr(value)) {
    $("#scanStatus").textContent = "Das ist kein FITNESS PARK Check-in-Code.";
    return;
  }
  stopQrScanner();
  $("#scannerDialog").close();
  const activeVisit = {
    id: crypto.randomUUID(),
    memberName: member.name,
    memberNumber: member.number,
    start: new Date().toISOString(),
    source: "qr"
  };
  saveActiveVisit(activeVisit);
  const logEntry = addSystemLog("Check-in", `${member.name} hat per QR-Code eingecheckt.`);
  setCheckedIn(true);
  renderLogs();
  try {
    if (remoteReady) {
      const remoteVisit = await createRemoteVisit(activeVisit);
      saveActiveVisit(remoteVisit);
      await addRemoteSystemLog(logEntry);
      await loadRemoteState();
      renderLogs();
    }
  } catch (error) {
    remoteReady = false;
    console.warn("Remote check-in failed", error);
  }
  toast("Check-in per QR-Code erfolgreich");
}

async function startQrScanner() {
  $("#scanStatus").textContent = "Kamera wird gestartet...";
  $("#cameraPlaceholder").classList.remove("hidden");
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const video = $("#qrVideo");
    video.srcObject = scanStream;
    await video.play();
    $("#cameraPlaceholder").classList.add("hidden");
    $("#scanStatus").textContent = "Suche QR-Code...";
    const detector = "BarcodeDetector" in window ? new BarcodeDetector({ formats: ["qr_code"] }) : null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const scan = async () => {
      if (!scanStream) return;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          if (codes.length) {
            finishQrCheckIn(codes[0].rawValue);
            return;
          }
        } else if (window.jsQR && video.videoWidth && video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height);
          if (code?.data) {
            finishQrCheckIn(code.data);
            return;
          }
        } else if (!window.jsQR) {
          $("#scanStatus").textContent = "Kamera aktiv. QR-Erkennung wird in diesem Browser nicht geladen.";
        }
      } catch (error) {
        $("#scanStatus").textContent = "QR-Code konnte noch nicht gelesen werden.";
      }
      scanTimer = setTimeout(scan, 350);
    };
    scan();
  } catch (error) {
    $("#scanStatus").textContent = "Kamera konnte nicht gestartet werden. Bitte Berechtigung pruefen.";
  }
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
$$("[data-close]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.close === "scannerDialog") stopQrScanner();
  $(`#${button.dataset.close}`).close();
}));
$("#scannerDialog").addEventListener("close", stopQrScanner);
$("#checkAction").addEventListener("click", () => {
  if (checkedIn) {
    $("#checkoutDialog").showModal();
  } else {
    $("#scannerDialog").showModal();
    startQrScanner();
  }
});
$("#simulateScan").addEventListener("click", () => {
  finishQrCheckIn(adminQrPayload || generateQrPayload());
});
$("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#checkoutDialog").close();
  const activeVisit = loadActiveVisit();
  if (activeVisit) {
    const completedVisit = { ...activeVisit, end: new Date().toISOString() };
    saveVisits([completedVisit, ...loadVisits()].slice(0, 30));
    saveActiveVisit(null);
    const logEntry = addSystemLog("Check-out", `${member.name} hat ausgecheckt. Dauer: ${durationText(new Date(completedVisit.start), new Date(completedVisit.end))}`);
    try {
      if (remoteReady) {
        await completeRemoteVisit(completedVisit);
        await addRemoteSystemLog(logEntry);
        await loadRemoteState();
      }
    } catch (error) {
      remoteReady = false;
      console.warn("Remote check-out failed", error);
    }
  }
  setCheckedIn(false);
  renderLogs();
  toast("Check-out erfolgreich · Besuchsdauer gespeichert");
});
$("#problemButton").addEventListener("click", () => toast("Das Studio-Team wurde über dein Problem informiert."));
$("#roleToggle").addEventListener("click", () => go("profile"));
$("#refreshQr").addEventListener("click", () => {
  renderAdminQr();
  toast("Neuer Check-in-QR-Code erzeugt");
});
$("#refreshInviteQr").addEventListener("click", () => {
  renderInviteQr();
  toast("Neuer Einladungs-QR-Code erzeugt");
});
$("#registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const profile = {
    name: $("#registerName").value,
    number: $("#registerNumber").value,
    email: $("#registerEmail").value
  };
  saveMemberProfile(profile);
  const logEntry = addSystemLog("Registrierung", `${member.name} hat dieses Gerät verknüpft.`);
  try {
    if (remoteReady) {
      await createRemoteMember(member);
      await addRemoteSystemLog(logEntry);
      await loadRemoteState();
    }
  } catch (error) {
    remoteReady = false;
    console.warn("Remote member registration failed", error);
  }
  history.replaceState(null, "", location.pathname);
  renderLogs();
  go("home");
  toast("App erfolgreich verknüpft");
});
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

renderAdminQr();
renderInviteQr();
async function bootApp() {
  member = loadMemberProfile();
  renderMemberProfile();
  await loadRemoteState();
  const restoredVisit = activeVisitForDisplay() || loadActiveVisit();
  if (restoredVisit) {
    setCheckedIn(true);
    checkInAt = new Date(restoredVisit.start);
  }
  renderLogs();
  if (new URLSearchParams(location.search).has("invite") && member.demo) {
    go("register");
  }
  setInterval(updateDuration, 1000);
}
bootApp();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
