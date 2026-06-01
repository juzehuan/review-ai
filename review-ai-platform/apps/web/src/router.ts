import { createRouter, createWebHistory } from "vue-router";
import DashboardPage from "./pages/DashboardPage.vue";
import WorkspaceOverviewPage from "./pages/WorkspaceOverviewPage.vue";
import ReviewsPage from "./pages/ReviewsPage.vue";
import AnalysisRunsPage from "./pages/AnalysisRunsPage.vue";
import CrawlJobsPage from "./pages/CrawlJobsPage.vue";
import GrowthOpsPage from "./pages/GrowthOpsPage.vue";
import ActionItemsPage from "./pages/ActionItemsPage.vue";
import AdminPage from "./pages/AdminPage.vue";
import LoginPage from "./pages/LoginPage.vue";
import RegisterPage from "./pages/RegisterPage.vue";
import SharedReportPage from "./pages/SharedReportPage.vue";
import WorkspaceSettingsPage from "./pages/WorkspaceSettingsPage.vue";
import { getAuthToken } from "./api";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: LoginPage, meta: { public: true } },
    { path: "/register", component: RegisterPage, meta: { public: true } },
    { path: "/share/:token", component: SharedReportPage, meta: { public: true } },
    { path: "/", redirect: "/dashboard" },
    { path: "/dashboard", component: WorkspaceOverviewPage },
    { path: "/growth", component: GrowthOpsPage },
    { path: "/tasks/:taskId/report", component: DashboardPage },
    { path: "/tasks/:taskId/reviews", component: ReviewsPage },
    { path: "/tasks/:taskId/runs", component: AnalysisRunsPage },
    { path: "/tasks/:taskId/actions", component: ActionItemsPage },
    { path: "/report", component: DashboardPage },
    { path: "/reviews", component: ReviewsPage },
    { path: "/analysis-runs", component: AnalysisRunsPage },
    { path: "/crawl-jobs", component: CrawlJobsPage },
    { path: "/users", redirect: "/admin" },
    { path: "/settings", redirect: "/settings/ai" },
    { path: "/settings/workspace", redirect: "/settings/ai" },
    { path: "/settings/ai", component: WorkspaceSettingsPage },
    { path: "/settings/crawler", component: WorkspaceSettingsPage },
    { path: "/admin", component: AdminPage }
  ]
});

router.beforeEach((to) => {
  if (!to.meta.public && !getAuthToken()) {
    return "/login";
  }

  if ((to.path === "/login" || to.path === "/register") && getAuthToken()) {
    return "/dashboard";
  }

  return true;
});
