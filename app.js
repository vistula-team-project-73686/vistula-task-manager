let config = null;
let editingId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descInput = document.getElementById("task-description");
const submitBtn = document.getElementById("task-submit");
const list = document.getElementById("task-list");
const statusEl = document.getElementById("status-message");

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? "error" : "";
}

async function api(path, options = {}) {
  const res = await fetch(`${config.supabaseUrl}/rest/v1/${config.tableName}${path}`, {
    ...options,
    headers: {
      apikey: config.supabasePublishableKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function loadTasks() {
  try {
    const tasks = await api("?select=*&order=id.asc");
    renderTasks(tasks);
    showStatus(tasks.length ? "" : "No tasks yet.");
  } catch (e) {
    showStatus("Could not load tasks: " + e.message, true);
  }
}

function makeEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function renderTasks(tasks) {
  list.innerHTML = "";
  tasks.forEach(t => {
    const item = makeEl("div", "task-item" + (t.completed ? " done" : ""));
    item.dataset.id = t.id;
    item.append(
      makeEl("div", "task-title", t.title),
      makeEl("div", "task-description", t.description || ""),
      makeEl("div", "task-status", t.completed ? "Completed" : "Not completed")
    );

    const toggle = makeEl("button", "toggle-task", t.completed ? "Mark incomplete" : "Mark complete");
    toggle.onclick = () => toggleTask(t);
    const edit = makeEl("button", "edit-task", "Edit");
    edit.onclick = () => startEdit(t);
    const del = makeEl("button", "delete-task", "Delete");
    del.onclick = () => deleteTask(t.id);

    item.append(toggle, " ", edit, " ", del);
    list.appendChild(item);
  });
}

async function toggleTask(t) {
  try {
    await api(`?id=eq.${t.id}`, { method: "PATCH", body: JSON.stringify({ completed: !t.completed }) });
    showStatus("Task updated.");
    loadTasks();
  } catch (e) {
    showStatus("Could not update task: " + e.message, true);
  }
}

function startEdit(t) {
  editingId = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || "";
  submitBtn.textContent = "Save changes";
  titleInput.focus();
}

async function deleteTask(id) {
  try {
    await api(`?id=eq.${id}`, { method: "DELETE" });
    if (editingId === id) resetForm();
    showStatus("Task deleted.");
    loadTasks();
  } catch (e) {
    showStatus("Could not delete task: " + e.message, true);
  }
}

function resetForm() {
  editingId = null;
  form.reset();
  submitBtn.textContent = "Add task";
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const body = { title: titleInput.value.trim(), description: descInput.value.trim() };
  if (!body.title) return;
  try {
    if (editingId !== null) {
      await api(`?id=eq.${editingId}`, { method: "PATCH", body: JSON.stringify(body) });
      showStatus("Task saved.");
    } else {
      await api("", { method: "POST", body: JSON.stringify(body) });
      showStatus("Task added.");
    }
    resetForm();
    loadTasks();
  } catch (e) {
    showStatus("Could not save task: " + e.message, true);
  }
});

(async function init() {
  try {
    const res = await fetch("config.json");
    config = await res.json();
    loadTasks();
  } catch (e) {
    showStatus("Could not load config.json: " + e.message, true);
  }
})();
