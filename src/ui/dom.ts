type Kid = Node | string | number | null | undefined | false;

export function h(tag: string, attrs: Record<string, unknown> = {}, ...kids: (Kid | Kid[])[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'html') el.innerHTML = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const clear = (el: HTMLElement) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const fmt = (n: number) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n)));
export const signed = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(Math.round(n * 10) / 10);
