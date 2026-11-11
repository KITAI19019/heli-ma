import { useLayoutEffect, useRef } from 'react';

const KEY = 'heli-ma-back-v1';
type BackState = 'base' | 'buffer' | 'guard';
const state = (): BackState | undefined => window.history.state?.[KEY];
const entry = (kind: BackState) => ({ ...window.history.state, [KEY]: kind });
const position = () => ({ base: 0, buffer: 1, guard: 2 })[state() ?? 'base'];

// Keep a bounded pair of entries while an in-app Back action is available. The
// buffer also catches a second Back traversal queued before popstate is handled.
// The app owns its workflow trail, so completed/discarded drafts are never stored in History
// or revived by Forward. At the home screen the guard is removed: Back can leave
// the app normally. Reuse the entry after reload and React StrictMode remounts.
export function useBrowserBack(enabled: boolean, onBack: () => void | Promise<void>) {
  const latest = useRef({ enabled, onBack });
  latest.current = { enabled, onBack };
  const synchronize = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    if (!state()) window.history.replaceState(entry('base'), '');
    let current = position();
    let retiring = false;
    let handling = false;
    let disposed = false;
    const arm = () => {
      if (current === 0) {
        window.history.pushState(entry('buffer'), '');
        current = 1;
      }
      if (current === 1) {
        window.history.pushState(entry('guard'), '');
        current = 2;
      }
    };
    const sync = () => {
      if (disposed || retiring) return;
      if (latest.current.enabled) arm();
      else if (current > 0) {
        retiring = true;
        window.history.go(-current);
      }
    };
    const pop = () => {
      if (!state()) return;
      const previous = current;
      current = position();
      if (retiring) {
        retiring = false;
        sync();
        return;
      }
      if (current >= previous || !latest.current.enabled) {
        sync();
        return;
      }
      // Protect a second rapid gesture while navigation/save/confirmation runs.
      arm();
      if (handling) return;
      handling = true;
      void Promise.resolve()
        .then(() => latest.current.onBack())
        .finally(() => {
          handling = false;
          sync();
        });
    };
    synchronize.current = sync;
    window.addEventListener('popstate', pop);
    sync();
    return () => {
      disposed = true;
      window.removeEventListener('popstate', pop);
      synchronize.current = () => {};
    };
  }, []);
  useLayoutEffect(() => synchronize.current());
}
