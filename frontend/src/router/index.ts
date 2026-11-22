import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { t } from "../i18n";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "Login",
    component: () => import("../views/Login.vue"),
    meta: { public: true, titleKey: "nav.login" }
  },
  {
    path: "/",
    name: "Dashboard",
    component: () => import("../views/Dashboard.vue"),
    meta: { titleKey: "nav.dashboard" }
  },
  {
    path: "/documents",
    name: "Documents",
    component: () => import("../views/Documents.vue"),
    meta: { titleKey: "nav.documents" }
  },
  {
    path: "/encrypt",
    name: "Encrypt",
    component: () => import("../views/Encrypt.vue"),
    meta: { titleKey: "nav.encrypt" }
  },
  {
    path: "/decrypt",
    name: "Decrypt",
    component: () => import("../views/Decrypt.vue"),
    meta: { titleKey: "nav.decrypt" }
  },
  {
    path: "/keys",
    name: "KeyManagement",
    component: () => import("../views/KeyManagement.vue"),
    meta: { titleKey: "nav.keys" }
  },
  {
    path: "/users",
    name: "UserManagement",
    component: () => import("../views/UserManagement.vue"),
    meta: { titleKey: "nav.usersAdmin" }
  },
  {
    path: "/audit-logs",
    name: "AuditLogs",
    component: () => import("../views/AuditLogs.vue"),
    meta: { titleKey: "nav.auditLogs" }
  },
  {
    path: "/audit",
    redirect: "/audit-logs"
  },
  {
    path: "/settings",
    name: "Settings",
    component: () => import("../views/Settings.vue"),
    meta: { titleKey: "nav.settings" }
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("../views/Profile.vue"),
    meta: { titleKey: "nav.profile" }
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/"
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

function hasValidStoredSession(): boolean {
  const token = localStorage.getItem("jwt_token");
  const rawUser = localStorage.getItem("current_user");
  if (!token || !rawUser) {
    if (token || rawUser) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("current_user");
    }
    return false;
  }
  try {
    return Boolean(JSON.parse(rawUser));
  } catch {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("current_user");
    return false;
  }
}

router.beforeEach((to, _from, next) => {
  const isAuthenticated = hasValidStoredSession();
  const titleKey = typeof to.meta?.titleKey === "string" ? to.meta.titleKey : undefined;
  const fallbackTitle = typeof to.meta?.title === "string" ? to.meta.title : undefined;
  const pageTitle = titleKey ? t(titleKey) : fallbackTitle;
  document.title = pageTitle
    ? `${pageTitle} — ${t("app.brand")}`
    : t("app.brand");

  if (!to.meta.public && !isAuthenticated) {
    return next("/login");
  }
  if (to.path === "/login" && isAuthenticated) {
    return next("/");
  }
  next();
});

export default router;
