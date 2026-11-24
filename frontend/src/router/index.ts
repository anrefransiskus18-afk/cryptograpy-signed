import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { t } from "../i18n";
import { clearAllSessionStorage, getStoredRawUser } from "../utils/sessionStorage";

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean;
    titleKey?: string;
    title?: string;
    roles?: string[];
  }
}

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
    name: "NotFound",
    component: () => import("../views/NotFound.vue"),
    meta: { title: "404" }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

function hasValidStoredSession(): boolean {
  const rawUser = getStoredRawUser();
  if (!rawUser) {
    return false;
  }
  try {
    return Boolean(JSON.parse(rawUser));
  } catch {
    clearAllSessionStorage();
    return false;
  }
}

function getStoredUserRole(): string | null {
  try {
    const rawUser = getStoredRawUser();
    if (!rawUser) return null;
    const parsed = JSON.parse(rawUser) as { role?: unknown } | null;
    return typeof parsed?.role === "string" ? parsed.role : null;
  } catch {
    return null;
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
  if (Array.isArray(to.meta.roles) && to.meta.roles.length > 0) {
    const role = getStoredUserRole();
    if (!role || !to.meta.roles.includes(role)) {
      return next("/");
    }
  }
  next();
});

export default router;
