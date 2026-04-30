import { createRouter, createWebHistory } from "vue-router";
import TaskListPage from "./pages/TaskListPage.vue";
import TaskNewPage from "./pages/TaskNewPage.vue";
import DashboardPage from "./pages/DashboardPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
import SettingsPage from "./pages/SettingsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: TaskListPage },
    { path: "/tasks/new", component: TaskNewPage },
    { path: "/tasks/:taskId/dashboard", component: DashboardPage },
    { path: "/tasks/:taskId/reviews", component: ReviewsPage },
    { path: "/settings", component: SettingsPage },
    { path: "/:pathMatch(.*)*", redirect: "/" }
  ]
});
