import { createApp } from "vue";
import { createPinia } from "pinia";
import "./style.css";
import App from "./App.vue";
import router from "./router";
import i18nPlugin from "./i18n";
import { logger } from "./utils/logger";

const app = createApp(App);
const pinia = createPinia();

app.config.errorHandler = (err, instance, info) => {
  logger.error("vue_unhandled_error", {
    component: instance?.$options?.name || "AnonymousComponent",
    info,
    error: err
  });
};

window.addEventListener("unhandledrejection", (event) => {
  logger.error("window_unhandled_rejection", {
    reason: event.reason
  });
});

app.use(pinia);
app.use(router);
app.use(i18nPlugin);
router.isReady().then(() => {
  app.mount("#app");
});
