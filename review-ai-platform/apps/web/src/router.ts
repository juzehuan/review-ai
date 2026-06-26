import { createRouter, createWebHistory } from "vue-router";
import { getAuthToken } from "./api";

const DashboardPage = () => import("./pages/DashboardPage.vue");
const WorkspaceOverviewPage = () => import("./pages/WorkspaceOverviewPage.vue");
const ReviewsPage = () => import("./pages/ReviewsPage.vue");
const AnalysisRunsPage = () => import("./pages/AnalysisRunsPage.vue");
const CrawlJobsPage = () => import("./pages/CrawlJobsPage.vue");
const GrowthOpsPage = () => import("./pages/GrowthOpsPage.vue");
const ActionItemsPage = () => import("./pages/ActionItemsPage.vue");
const AdminPage = () => import("./pages/AdminPage.vue");
const LoginPage = () => import("./pages/LoginPage.vue");
const RegisterPage = () => import("./pages/RegisterPage.vue");
const SharedReportPage = () => import("./pages/SharedReportPage.vue");
const WorkspaceSettingsPage = () => import("./pages/WorkspaceSettingsPage.vue");
const HelpCenterPage = () => import("./pages/HelpCenterPage.vue");

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
    { path: "/help", component: HelpCenterPage },
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
