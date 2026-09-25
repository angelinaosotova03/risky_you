type Cleanup = () => void;
type Handler = (root: HTMLElement, params: Record<string, string>) => Cleanup | void;

const routes: { pattern: RegExp; keys: string[]; handler: Handler }[] = [];
let cleanup: Cleanup | void;
let root: HTMLElement;

export function route(path: string, handler: Handler) {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" + path.replace(/:(\w+)/g, (_, k: string) => (keys.push(k), "([^/]+)")) + "/?$",
  );
  routes.push({ pattern, keys, handler });
}

export function navigate(path: string) {
  history.pushState(null, "", path);
  render();
}

function render() {
  cleanup?.();
  cleanup = undefined;
  window.scrollTo(0, 0);
  const path = location.pathname;
  for (const r of routes) {
    const m = path.match(r.pattern);
    if (m) {
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      cleanup = r.handler(root, params);
      document.dispatchEvent(new CustomEvent("routechange"));
      return;
    }
  }
  root.innerHTML = `<section class="page narrow"><h1>Такой страницы нет</h1><p><a href="/" data-link>Вернуться к тестам</a></p></section>`;
}

export function start(el: HTMLElement) {
  root = el;
  // Ссылки с data-link переключают страницы без перезагрузки
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[data-link]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute("href")!);
  });
  window.addEventListener("popstate", render);
  render();
}
