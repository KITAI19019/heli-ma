import { flushSync } from 'react-dom';

const screenSelector =
  '#root > .app-shell:not([inert]) > .workflow-main, .utility-screen > .app-shell > main';
let pendingCommit = Promise.resolve();
let activeTransition: ViewTransition | null = null;
let entrance: Animation | undefined;

export function revealWorkflow(waitForExit = false) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const screen = document.querySelector<HTMLElement>(screenSelector);
  if (!screen) return;
  const style = getComputedStyle(screen);
  entrance?.cancel();
  entrance = screen.animate?.([{ opacity: 0 }, { opacity: 1 }], {
    delay: waitForExit ? Number(style.getPropertyValue('--motion-fade-out-ms')) : 0,
    duration: 250,
    easing: style.getPropertyValue('--motion-enter').trim(),
    fill: 'backwards',
  });
}

export function transitionWorkflow(update: () => void) {
  // Wait for the previous DOM update, but let a new navigation interrupt its animation.
  const commit = pendingCommit.then(async () => {
    activeTransition?.skipTransition();
    entrance?.cancel();
    const apply = () => flushSync(update);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply();
      return;
    }

    if (!document.startViewTransition) {
      apply();
      revealWorkflow();
      return;
    }

    const root = document.documentElement;
    root.dataset.workflowTransition = '';
    root.dataset.captureOutgoing = '';
    const transition = document.startViewTransition(() => {
      // Only the outgoing screen is captured. The incoming controls stay interactive.
      delete root.dataset.captureOutgoing;
      apply();
    });
    activeTransition = transition;
    void transition.ready.then(
      () => {
        if (activeTransition === transition) revealWorkflow(true);
      },
      () => {},
    );
    void transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransition !== transition) return;
        activeTransition = null;
        delete root.dataset.captureOutgoing;
        delete root.dataset.workflowTransition;
      });
    await transition.updateCallbackDone;
  });
  pendingCommit = commit.catch(() => {});
  return commit;
}
