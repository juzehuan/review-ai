import axios from "axios";
const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api"
});
export async function fetchTasks() {
    const { data } = await api.get("/tasks");
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
