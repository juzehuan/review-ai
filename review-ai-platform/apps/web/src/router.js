import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "./pages/DashboardPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
import AdminPage from "./pages/AdminPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import RegisterPage from "./pages/RegisterPage.vue";
import UserManagementPage from "./pages/UserManagementPage.vue";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage.vue";
import { getAuthToken } from "./api";
export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/login", component: LoginPage, meta: { public: true } },
        { path: "/register", component: RegisterPage, meta: { public: true } },
        { path: "/", redirect: "/dashboard" },
        { path: "/dashboard", component: DashboardPage },
        { path: "/reviews", component: ReviewsPage },
        { path: "/users", component: UserManagementPage },
        { path: "/settings", component: WorkspaceSettingsPage },
        { path: "/admin", component: AdminPage }
    ]
});
router.beforeEach((to) => {
    if (!to.meta.public && !getAuthToken()) {
        return "/login";
    }
    if (to.meta.public && getAuthToken()) {
        return "/dashboard";
    }
    return true;
});
