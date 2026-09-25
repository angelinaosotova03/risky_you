import "./styles.css";
import { route, start } from "./router";
import { renderHome } from "./pages/home";
import { renderProfile } from "./pages/profile";
import { renderTest } from "./pages/test";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="site-header">
    <a class="logo" href="/" data-link>Risky You</a>
    <nav>
      <a href="/" data-link data-nav="/">Тесты</a>
      <a href="/profile" data-link data-nav="/profile">Мой профиль</a>
    </nav>
  </header>
  <div class="social-bar">
    <a href="https://t.me/angelina_osotova" target="_blank" rel="noopener">tg: angelina_osotova</a>
    <a href="https://instagram.com/angelinaosotova" target="_blank" rel="noopener">ig: angelinaosotova</a>
    <a href="https://www.tiktok.com/@Osotova" target="_blank" rel="noopener">tt: Osotova</a>
  </div>
  <main id="view"></main>`;

// Подсвечиваем текущий пункт меню
document.addEventListener("routechange", () => {
  document.querySelectorAll<HTMLAnchorElement>("[data-nav]").forEach((a) => {
    const current = a.dataset.nav === location.pathname;
    a.toggleAttribute("aria-current", current);
    if (current) a.setAttribute("aria-current", "page");
  });
});

route("/", (root) => renderHome(root));
route("/profile", (root) => void renderProfile(root));
route("/test/:id", (root, { id }) => renderTest(root, id));

start(document.querySelector<HTMLElement>("#view")!);
