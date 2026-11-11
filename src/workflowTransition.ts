import { flushSync } from 'react-dom';

function activeScreen() {
  return (
    document.querySelector<HTMLElement>('.utility-screen') ??
    document.querySelector<HTMLElement>('#root > .app-shell')
  );
}

export async function transitionWorkflow(update: () => void) {
  const apply = () => flushSync(update);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    apply();
    return;
  }

  if (document.startViewTransition) {
    const transition = document.startViewTransition(apply);
    void transition.ready.catch(() => {});
    void transition.finished.catch(() => {});
    await transition.updateCallbackDone;
    return;
  }

  const shell = activeScreen();
  if (!shell) {
    apply();
    return;
  }
  const fade = shell.animate(
    [
      { opacity: 1, filter: 'blur(0)' },
      { opacity: 0, filter: 'blur(6px)' },
    ],
    { duration: 50, fill: 'forwards' },
  );
  await fade.finished;
  apply();
  fade.cancel();
  activeScreen()?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 50 });
}
