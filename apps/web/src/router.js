import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "./pages/DashboardPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", redirect: "/dashboard" },
        { path: "/dashboard", component: DashboardPage },
        { path: "/reviews", component: ReviewsPage }
    ]
});
