import { boot, snapshot } from './ui/app';
import { initStorage } from './ui/storage';

declare global {
  interface Window {
    claude?: { hot?: { ready?: (fn: (d: { save?: string; slot?: number }) => void) => void; data?: { save?: string; slot?: number }; snapshot?: (fn: () => unknown) => void } };
  }
}

// saves live in IndexedDB: open it (and move old localStorage saves over) before anything is loaded
const startApp = (data: { save?: string; slot?: number }) => { void initStorage().then(() => boot(data ?? {})); };
window.claude?.hot?.snapshot?.(() => snapshot());
if (window.claude?.hot?.ready) window.claude.hot.ready(startApp);
else startApp(window.claude?.hot?.data ?? {});
