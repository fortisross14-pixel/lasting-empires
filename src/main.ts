import { boot, snapshot } from './ui/app';

declare global {
  interface Window {
    claude?: { hot?: { ready?: (fn: (d: { save?: string }) => void) => void; data?: { save?: string }; snapshot?: (fn: () => unknown) => void } };
  }
}

const startApp = (data: { save?: string }) => boot(data ?? {});
window.claude?.hot?.snapshot?.(() => snapshot());
if (window.claude?.hot?.ready) window.claude.hot.ready(startApp);
else startApp(window.claude?.hot?.data ?? {});
