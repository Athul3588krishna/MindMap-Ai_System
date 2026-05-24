const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("mindmap_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => request("/auth/me"),
  updatePreferences: (payload) =>
    request("/auth/preferences", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getSubjects: () => request("/subjects"),
  createSubject: (payload) =>
    request("/subjects", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteSubject: (subjectId) =>
    request(`/subjects/${subjectId}`, {
      method: "DELETE",
    }),
  createTopic: (subjectId, payload) =>
    request(`/subjects/${subjectId}/topics`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateTopic: (subjectId, topicId, payload) =>
    request(`/subjects/${subjectId}/topics/${topicId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getAnalytics: () => request("/analytics/summary"),
  getLatestPlan: () => request("/planner/latest"),
  generatePlan: (payload) =>
    request("/planner/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  previewSyllabus: (payload) =>
    request("/syllabus/preview", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importSyllabus: (payload) =>
    request("/syllabus/import", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateNotes: (payload) =>
    request("/ai/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  solveDoubt: (payload) =>
    request("/ai/doubt", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
