const API = "http://localhost:3005";

export async function sendPrompt(prompt) {
  const res = await fetch(`${API}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${API}/history`);
  return res.json();
}

export async function getProjectFiles(projectId) {
  const res = await fetch(`${API}/projects/${projectId}/files`);
  return res.json();
}

export async function getProjectSteps(projectId) {
  const res = await fetch(`${API}/projects/${projectId}/steps`);
  return res.json();
}

export async function getDebugSessions(projectId) {
  const res = await fetch(`${API}/debug/sessions/${projectId}`);
  return res.json();
}

export async function startDebugSession(projectId) {
  const res = await fetch(`${API}/debug/${projectId}`, { method: "POST" });
  return res.json();
}

export async function sendDebugMessage(sessionId, message, image = null) {
  const payload = { message };
  if (image) payload.image = image;
  
  const res = await fetch(`${API}/debug/chat/${sessionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getDebugHistory(sessionId) {
  const res = await fetch(`${API}/debug/chat/${sessionId}`);
  return res.json();
}

export async function deleteProject(projectId) {
  const res = await fetch(`${API}/projects/${projectId}`, {
    method: "DELETE"
  });
  return res.json();
}

export async function exportProject(projectId) {
  const res = await fetch(`${API}/export/${projectId}`, { method: "POST" });
  return res.json();
}

// ── Editor APIs ──

export async function saveFile(projectId, filePath, content) {
  const res = await fetch(`${API}/projects/${projectId}/files/save`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filePath, content }),
  });
  return res.json();
}

// ── Runtime APIs ──

export async function runProject(projectId) {
  const res = await fetch(`${API}/runtime/run/${projectId}`, { method: "POST" });
  return res.json();
}

export async function stopProject(projectId) {
  const res = await fetch(`${API}/runtime/stop/${projectId}`, { method: "POST" });
  return res.json();
}

export async function restartProject(projectId) {
  const res = await fetch(`${API}/runtime/restart/${projectId}`, { method: "POST" });
  return res.json();
}

export async function getRuntimeStatus(projectId) {
  const res = await fetch(`${API}/runtime/status/${projectId}`);
  return res.json();
}

// ── SSE Log Stream (returns EventSource) ──

export function connectLogStream(projectId) {
  return new EventSource(`${API}/runtime/logs/${projectId}`);
}
