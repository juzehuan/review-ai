import axios from "axios";
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});
export const AUTH_TOKEN_KEY = "reviewiq:auth-token";
export const WORKSPACE_SLUG_KEY = "reviewiq:workspace-slug";
api.interceptors.request.use((config) => {
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const workspaceSlug = window.localStorage.getItem(WORKSPACE_SLUG_KEY);
    if (workspaceSlug) {
        config.headers["X-Workspace-Slug"] = workspaceSlug;
    }
    return config;
});
api.interceptors.response.use((response) => response, (error) => {
    if (error?.response?.status === 401) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
            window.location.href = "/login";
        }
    }
    return Promise.reject(error);
});
export function setAuthToken(token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}
export function clearAuthToken() {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    window.localStorage.removeItem(WORKSPACE_SLUG_KEY);
}
export function getAuthToken() {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
}
export function setWorkspaceSlug(slug) {
    window.localStorage.setItem(WORKSPACE_SLUG_KEY, slug);
}
export function getWorkspaceSlug() {
    return window.localStorage.getItem(WORKSPACE_SLUG_KEY);
}
export async function login(payload) {
    const { data } = await api.post("/auth/login", payload);
    setAuthToken(data.token);
    setWorkspaceSlug(data.workspace.slug);
    return data;
}
export async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    setAuthToken(data.token);
    setWorkspaceSlug(data.workspace.slug);
    return data;
}
export async function fetchMe() {
    const { data } = await api.get("/auth/me");
    setAuthToken(data.token);
    setWorkspaceSlug(data.workspace.slug);
    return data;
}
export async function logout() {
    await api.post("/auth/logout").catch(() => undefined);
    clearAuthToken();
}
export async function fetchTasks() {
    const { data } = await api.get("/tasks");
    return data;
}
export async function fetchWorkspace() {
    const { data } = await api.get("/workspace");
    return data;
}
export async function fetchMyWorkspaces() {
    const { data } = await api.get("/workspaces");
    return data;
}
export async function createWorkspace(payload) {
    const { data } = await api.post("/workspaces", payload);
    setWorkspaceSlug(data.slug);
    return data;
}
export async function fetchWorkspaceMembers() {
    const { data } = await api.get("/workspace/members");
    return data;
}
export async function createWorkspaceMember(payload) {
    const { data } = await api.post("/workspace/members", payload);
    return data;
}
export async function updateWorkspaceMember(memberId, payload) {
    const { data } = await api.patch(`/workspace/members/${memberId}`, payload);
    return data;
}
export async function deleteWorkspaceMember(memberId) {
    const { data } = await api.delete(`/workspace/members/${memberId}`);
    return data;
}
export async function fetchAdminOverview() {
    const { data } = await api.get("/admin/overview");
    return data;
}
export async function fetchAdminUsers() {
    const { data } = await api.get("/admin/users");
    return data;
}
export async function createAdminUser(payload) {
    const { data } = await api.post("/admin/users", payload);
    return data;
}
export async function fetchAdminWorkspaces() {
    const { data } = await api.get("/admin/workspaces");
    return data;
}
export async function createAdminWorkspace(payload) {
    const { data } = await api.post("/admin/workspaces", payload);
    return data;
}
export async function importTask(payload) {
    const formData = new FormData();
    formData.append("name", payload.name);
    formData.append("productName", payload.productName);
    formData.append("sourceChannel", payload.sourceChannel);
    formData.append("file", payload.file);
    const { data } = await api.post("/tasks/import", formData);
    return data;
}
export async function fetchTask(taskId) {
    const { data } = await api.get(`/tasks/${taskId}`);
    return data;
}
export async function fetchDashboard(taskId) {
    const { data } = await api.get(`/tasks/${taskId}/dashboard`);
    return data;
}
export async function fetchReviews(taskId, params) {
    const { data } = await api.get(`/tasks/${taskId}/reviews`, { params });
    return data;
}
export async function createRun(taskId) {
    const { data } = await api.post(`/tasks/${taskId}/analysis-runs`, {
        promptVersion: "v2-thai"
    });
    return data;
}
export async function fetchRuns(taskId) {
    const { data } = await api.get(`/tasks/${taskId}/analysis-runs`);
    return data;
}
