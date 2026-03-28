// Admin API helper — calls the Go backend admin endpoints instead of using
// the Supabase service-role key directly in the browser.

const API_BASE =
  process.env.REACT_APP_API_URL || "http://localhost:8080";

/**
 * Get the stored admin token (set on login).
 */
export function getAdminToken() {
  try {
    const session = localStorage.getItem("adminSession");
    if (!session) return null;
    return JSON.parse(session).token || null;
  } catch {
    return null;
  }
}

/**
 * Generic admin-authenticated fetch wrapper.
 */
async function adminFetch(path, options = {}) {
  const token = getAdminToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If the backend returns 401, the admin session is expired or invalid
  // (e.g. backend was restarted and in-memory sessions were lost).
  // Clear the stale session and redirect to login.
  if (res.status === 401) {
    localStorage.removeItem("adminSession");
    window.location.href = "/login";
    throw new Error("Admin session expired. Please log in again.");
  }

  return res;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function adminLogin(username, password) {
  const res = await fetch(`${API_BASE}/v1/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  return data; // { token, adminId, username }
}

export async function adminLogout() {
  await adminFetch("/v1/admin/logout", { method: "POST" }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Users CRUD
// ---------------------------------------------------------------------------

export async function listUsers() {
  const res = await adminFetch("/v1/admin/users");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to list users");
  }
  return res.json();
}

export async function createUser({ email, password, userMetadata }) {
  const res = await adminFetch("/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      user_metadata: userMetadata,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.msg || data.error_description || `Failed to create user (${res.status})`);
  return data;
}

export async function updateUser(userId, userMetadata) {
  const res = await adminFetch(`/v1/admin/users?id=${userId}`, {
    method: "PUT",
    body: JSON.stringify({ user_metadata: userMetadata }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update user");
  return data;
}

export async function deleteUser(userId) {
  const res = await adminFetch(`/v1/admin/users?id=${userId}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete user");
  return data;
}
