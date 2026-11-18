"use strict";
/* GhosŧŦasker (ghosttasker) - vanilla JS, no dependencies.
   All data is stored locally in the browser (localStorage).
   Sending is a one-tap handoff to a linked app. No background auto-sending. */

var STORAGE_KEY = "ghosttasker_state_v1";
var MAX_PER_GROUP = 100;

var BUILTIN_APPS = [
  { id: "sms", name: "Regular SMS / Messages", packageName: "", scheme: "sms:" },
  { id: "google-messages", name: "Google Messages", packageName: "com.google.android.apps.messaging", scheme: "sms:" },
  { id: "samsung-messages", name: "Samsung Messages", packageName: "com.samsung.android.messaging", scheme: "sms:" },
  { id: "whatsapp", name: "WhatsApp", packageName: "com.whatsapp", scheme: "sms:" },
  { id: "messenger", name: "Messenger", packageName: "com.facebook.orca", scheme: "sms:" },
  { id: "telegram", name: "Telegram", packageName: "org.telegram.messenger", scheme: "sms:" },
  { id: "signal", name: "Signal", packageName: "org.thoughtcrime.securesms", scheme: "sms:" }
];

function defaultState() {
  return {
    groups: [],
    templates: [],
    sentHistory: [],
    automations: [],
    customApps: [],
    settings: { launched: true, linkedAppId: null, approved: false },
    plan: "basic"
  };
}

var state = loadState();

function loadState() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    var parsed = JSON.parse(raw);
    var base = defaultState();
    for (var k in base) if (Object.prototype.hasOwnProperty.call(parsed, k)) base[k] = parsed[k];
    return base;
  } catch (e) { return defaultState(); }
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function el(id) { return document.getElementById(id); }
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function normalizeNumber(n) { return String(n || "").replace(/[\s\-().]/g, "").trim(); }
function personalize(text, name) {
  var n = (name || "").trim();
  return String(text || "").replace(/\{name\}/gi, n ? n : "there");
}

/* Tabs */
function initTabs() {
  var tabs = document.querySelectorAll("#tabs .tab");
  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      tabs.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
      el("tab-" + btn.getAttribute("data-tab")).classList.add("active");
      renderAll();
    });
  });
}

/* Sending gate */
function allApps() { return BUILTIN_APPS.concat(state.customApps); }
function linkedApp() {
  if (!state.settings.linkedAppId) return null;
  var f = allApps().filter(function (a) { return a.id === state.settings.linkedAppId; });
  return f.length ? f[0] : null;
}
function sendingEnabled() { return !!(linkedApp() && state.settings.approved); }
function renderStatus() {
  var app = linkedApp();
  el("sendStatus").textContent = sendingEnabled()
    ? "Sending: ON - linked to " + app.name + " (handoff only, you tap send there)"
    : (app ? "Sending: OFF - " + app.name + " selected but not approved"
           : "Sending: OFF - no app linked");
  el("sendBtn").disabled = !sendingEnabled();
  el("sendHint").textContent = sendingEnabled()
    ? "Tapping send opens " + app.name + " with the message ready. You tap send in that app."
    : "Link an app in the Apps tab and approve it to enable sending.";
}

/* Select helpers */
function fillGroupSelect(select) {
  var current = select.value;
  select.innerHTML = "";
  state.groups.forEach(function (g) {
    var o = document.createElement("option");
    o.value = g.id;
    o.textContent = g.name + " (" + g.numbers.length + "/" + MAX_PER_GROUP + ")";
    select.appendChild(o);
  });
  if (current) select.value = current;
}
function fillTemplateSelect(select) {
  var current = select.value;
  select.innerHTML = '<option value="">- none -</option>';
  state.templates.forEach(function (t) {
    var o = document.createElement("option");
    o.value = t.id; o.textContent = t.name;
    select.appendChild(o);
  });
  if (current) select.value = current;
}
function getGroup(id) {
  var f = state.groups.filter(function (g) { return g.id === id; });
  return f.length ? f[0] : null;
}
function getTemplate(id) {
  var f = state.templates.filter(function (t) { return t.id === id; });
  return f.length ? f[0] : null;
}

/* Groups */
function addNumbersTo(groupId, rawList) {
  var group = getGroup(groupId);
  var r = { added: 0, skipped: 0, capped: 0 };
  if (!group) return r;
  rawList.forEach(function (raw) {
    var n = normalizeNumber(raw);
    if (!n) return;
    if (group.numbers.indexOf(n) !== -1) { r.skipped++; return; }
    if (group.numbers.length >= MAX_PER_GROUP) { r.capped++; return; }
    group.numbers.push(n); r.added++;
  });
  return r;
}
function groupMsg(r) {
  return "Added " + r.added + ", skipped " + r.skipped + " duplicate(s)" +
    (r.capped ? ", " + r.capped + " over the 100 cap" : "") + ".";
}
function renderGroups() {
  var wrap = el("groupList");
  wrap.innerHTML = "";
  if (!state.groups.length) wrap.innerHTML = '<p class="hint">No groups yet. Create your first group above.</p>';
  state.groups.forEach(function (g) {
    var card = document.createElement("div");
    card.className = "group-card";
    var nums = g.numbers.map(function (n) { return "<li>" + escapeHtml(n) + "</li>"; }).join("");
    card.innerHTML = "<strong>" + escapeHtml(g.name) + "</strong> - " + g.numbers.length + "/" + MAX_PER_GROUP +
      ' <button type="button" data-del-group="' + g.id + '">Delete group</button>' +
      (nums ? "<ul>" + nums + "</ul>" : '<p class="hint">No numbers yet.</p>');
    wrap.appendChild(card);
  });
  wrap.querySelectorAll("[data-del-group]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.groups = state.groups.filter(function (g) { return g.id !== b.getAttribute("data-del-group"); });
      saveState(); renderAll();
    });
  });
  fillGroupSelect(el("numbersGroup"));
  fillGroupSelect(el("queueGroup"));
  fillGroupSelect(el("autoGroup"));
}

/* Templates */
function renderTemplates() {
  fillTemplateSelect(el("queueTemplate"));
  fillTemplateSelect(el("autoTemplate"));
  var list = el("templateList");
  list.innerHTML = "";
  if (!state.templates.length) list.innerHTML = '<li class="hint">No templates yet.</li>';
  state.templates.forEach(function (t) {
    var li = document.createElement("li");
    li.innerHTML = "<strong>" + escapeHtml(t.name) + "</strong>: " + escapeHtml(t.body) + ' <button type="button">Delete</button>';
    li.querySelector("button").addEventListener("click", function () {
      state.templates = state.templates.filter(function (x) { return x.id !== t.id; });
      saveState(); renderAll();
    });
    list.appendChild(li);
  });
}

/* Send Queue */
function buildPreview() {
  var group = getGroup(el("queueGroup").value);
  var msg = el("queueMessage").value;
  var box = el("queuePreview");
  if (!group) { box.textContent = "Create a group first."; return; }
  if (!group.numbers.length) { box.textContent = "That group has no numbers yet."; return; }
  box.textContent = group.numbers.map(function (n) {
    return n + " -> " + personalize(msg, (group.names && group.names[n]) || "");
  }).join("\n");
}
function doSendHandoff() {
  if (!sendingEnabled()) return;
  var group = getGroup(el("queueGroup").value);
  var msg = el("queueMessage").value.trim();
  if (!group || !group.numbers.length || !msg) {
    el("sendHint").textContent = "Pick a group with numbers and write a message first.";
    return;
  }
  var app = linkedApp();
  var first = group.numbers[0];
  var body = encodeURIComponent(personalize(msg, (group.names && group.names[first]) || ""));
  var href = "sms:" + group.numbers.join(",") + "?&body=" + body;
  state.sentHistory.unshift({
    id: uid(), at: new Date().toISOString(), groupName: group.name,
    message: msg, count: group.numbers.length, via: app.name
  });
  saveState(); renderAll();
  window.location.href = href;
}
function renderSentHistory() {
  var list = el("sentHistory");
  list.innerHTML = "";
  if (!state.sentHistory.length) { list.innerHTML = '<li class="hint">Nothing sent yet.</li>'; return; }
  state.sentHistory.slice(0, 20).forEach(function (s) {
    var li = document.createElement("li");
    li.textContent = new Date(s.at).toLocaleString() + " - " + s.groupName +
      " (" + s.count + ") via " + (s.via || "linked app") + ": " + s.message;
    list.appendChild(li);
  });
}

/* Automations */
var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function renderAutomations() {
  var list = el("autoList");
  list.innerHTML = "";
  if (!state.automations.length) list.innerHTML = '<li class="hint">No automations yet.</li>';
  state.automations.forEach(function (a) {
    var g = getGroup(a.groupId), t = getTemplate(a.templateId);
    var li = document.createElement("li");
    li.innerHTML = "<strong>" + escapeHtml(a.name) + "</strong> - " +
      a.days.map(function (d) { return DAY_NAMES[d]; }).join(", ") + " at " + escapeHtml(a.time) +
      " - Group: " + escapeHtml(g ? g.name : "(deleted)") +
      " - Template: " + escapeHtml(t ? t.name : "(none)") + ' <button type="button">Delete</button>';
    li.querySelector("button").addEventListener("click", function () {
      state.automations = state.automations.filter(function (x) { return x.id !== a.id; });
      saveState(); renderAll();
    });
    list.appendChild(li);
  });
  var up = el("upcomingList");
  up.innerHTML = "";
  var items = [];
  var now = new Date();
  for (var offset = 0; offset < 7; offset++) {
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    state.automations.forEach(function (a) {
      if (a.days.indexOf(d.getDay()) !== -1) items.push({ date: d, auto: a });
    });
  }
  if (!items.length) up.innerHTML = '<li class="hint">Nothing queued in the next 7 days.</li>';
  items.forEach(function (it) {
    var g = getGroup(it.auto.groupId);
    var li = document.createElement("li");
    li.textContent = it.date.toLocaleDateString() + " " + it.auto.time + " - " + it.auto.name +
      " -> " + (g ? g.name : "(deleted group)") + " (queued for review, not auto-sent)";
    up.appendChild(li);
  });
}

/* AI Bot - local only, no external API */
function suggestDraft() {
  var topic = el("aiTopic").value.trim().toLowerCase();
  var basis = [];
  var draft = "";
  var match = null;
  if (topic) {
    state.templates.forEach(function (t) {
      if (!match && (t.name.toLowerCase().indexOf(topic) !== -1 || t.body.toLowerCase().indexOf(topic) !== -1)) match = t;
    });
  }
  if (!match && state.templates.length) match = state.templates[state.templates.length - 1];
  if (match) {
    draft = match.body;
    basis.push('based on your template "' + match.name + '"');
  } else if (state.sentHistory.length) {
    draft = state.sentHistory[0].message;
    basis.push("based on your most recently sent message");
  } else {
    draft = "Hi {name}, quick update from us - thanks for being with us. Reply STOP to opt out.";
    basis.push("no templates or sent history yet, so this is a generic starter draft");
  }
  if (topic && match) basis.push('matched to your topic: "' + topic + '" - edit the wording before sending');
  el("aiDraft").value = draft;
  el("aiBasis").textContent = "What this is based on: " + basis.join("; ") +
    ". Learned locally from your templates (" + state.templates.length + ") and sent history (" +
    state.sentHistory.length + "). Nothing was sent anywhere.";
}

/* Apps */
function renderApps() {
  var wrap = el("appList");
  wrap.innerHTML = "";
  allApps().forEach(function (a) {
    var row = document.createElement("div");
    row.className = "app-row";
    var radio = document.createElement("input");
    radio.type = "radio"; radio.name = "linkedApp"; radio.value = a.id;
    radio.checked = state.settings.linkedAppId === a.id;
    radio.addEventListener("change", function () {
      state.settings.linkedAppId = a.id;
      saveState(); renderAll();
      el("appMsg").textContent = a.name + " selected. Tick the approval box to enable sending.";
    });
    var label = document.createElement("span");
    label.textContent = a.name + (a.packageName ? " (" + a.packageName + ")" : "") + (a.custom ? " - custom" : "");
    row.appendChild(radio); row.appendChild(label);
    wrap.appendChild(row);
  });
  el("approveBox").checked = !!state.settings.approved;
}

/* Render / init */
function renderAll() {
  renderGroups(); renderTemplates(); renderAutomations();
  renderApps(); renderSentHistory(); renderStatus();
}

function init() {
  initTabs();
  el("addGroupBtn").addEventListener("click", function () {
    var name = el("groupName").value.trim();
    if (!name) { el("groupMsg").textContent = "Give the group a name first."; return; }
    state.groups.push({ id: uid(), name: name, numbers: [], names: {} });
    el("groupName").value = "";
    saveState(); renderAll();
    el("groupMsg").textContent = "Group created: " + name;
  });
  el("addNumberBtn").addEventListener("click", function () {
    var r = addNumbersTo(el("numbersGroup").value, [el("singleNumber").value]);
    el("singleNumber").value = "";
    saveState(); renderAll();
    el("groupMsg").textContent = groupMsg(r);
  });
  el("bulkAddBtn").addEventListener("click", function () {
    var r = addNumbersTo(el("numbersGroup").value, el("bulkNumbers").value.split(/[\n,;]+/));
    el("bulkNumbers").value = "";
    saveState(); renderAll();
    el("groupMsg").textContent = groupMsg(r);
  });
  el("addTemplateBtn").addEventListener("click", function () {
    var name = el("templateName").value.trim(), body = el("templateBody").value.trim();
    if (!name || !body) return;
    state.templates.push({ id: uid(), name: name, body: body });
    el("templateName").value = ""; el("templateBody").value = "";
    saveState(); renderAll();
  });
  el("queueTemplate").addEventListener("change", function () {
    var t = getTemplate(el("queueTemplate").value);
    if (t) el("queueMessage").value = t.body;
  });
  el("previewBtn").addEventListener("click", buildPreview);
  el("sendBtn").addEventListener("click", doSendHandoff);
  el("addAutoBtn").addEventListener("click", function () {
    var days = [];
    document.querySelectorAll(".autoDay:checked").forEach(function (c) { days.push(parseInt(c.value, 10)); });
    var name = el("autoName").value.trim();
    if (!name || !days.length || !el("autoGroup").value) {
      el("autoMsg").textContent = "Name, at least one day, and a group are required.";
      return;
    }
    state.automations.push({
      id: uid(), name: name, days: days.sort(), time: el("autoTime").value || "09:00",
      groupId: el("autoGroup").value, templateId: el("autoTemplate").value || null
    });
    el("autoName").value = "";
    saveState(); renderAll();
    el("autoMsg").textContent = "Automation saved. It will queue the blast on those days for your review.";
  });
  el("aiDraftBtn").addEventListener("click", suggestDraft);
  el("aiUseBtn").addEventListener("click", function () {
    el("queueMessage").value = el("aiDraft").value;
    document.querySelector('[data-tab="queue"]').click();
  });
  el("addCustomAppBtn").addEventListener("click", function () {
    var name = el("customAppName").value.trim();
    if (!name) return;
    state.customApps.push({ id: "custom-" + uid(), name: name, packageName: el("customAppPackage").value.trim(), scheme: "sms:", custom: true });
    el("customAppName").value = ""; el("customAppPackage").value = "";
    saveState(); renderAll();
  });
  el("approveBox").addEventListener("change", function () {
    state.settings.approved = el("approveBox").checked;
    if (state.settings.approved && !state.settings.linkedAppId) {
      el("appMsg").textContent = "Approval ticked, but no app is selected yet - sending stays OFF until you select one specific app.";
    }
    saveState(); renderAll();
  });
  el("unlinkBtn").addEventListener("click", function () {
    state.settings.linkedAppId = null;
    state.settings.approved = false;
    saveState(); renderAll();
    el("appMsg").textContent = "Unlinked. Sending is OFF.";
  });
  el("clearDataBtn").addEventListener("click", function () {
    if (window.confirm("Delete all GhosŧŦasker data stored in this browser? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      state = defaultState();
      saveState(); renderAll();
    }
  });
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
