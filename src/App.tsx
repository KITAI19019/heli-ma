// @refresh reset
import { useEffect, useRef, useState } from 'react';
import { deleteAnalyses, getAnalysis, listAnalyses, saveAnalysis } from './database';
import { readDraft, writeDraft } from './draft';
import { AnalysisEditor, Judgment } from './Editors';
import {
  inputError,
  newAnalysis,
  titleOf,
  type Analysis,
  type Draft,
  type HistoryItem,
  type Kind,
} from './model';
import { prepareOffline, type InstallPrompt } from './pwa';
import { Sidebar } from './Sidebar';
import { HomePage } from './HomePage';
import { InputPage } from './InputPage';
import { ResultPage } from './ResultPage';
import { ThemePage } from './ThemePage';
import { useAppearance } from './useAppearance';
import { UtilityScreen } from './UtilityScreen';
import { transitionWorkflow } from './workflowTransition';
import { DiscardDialog, type DiscardRequest } from './DiscardDialog';
import { HistoryList } from './HistoryList';
import { useViewport, useFittedDescriptions } from './useViewport';
import { useBrowserBack } from './useBrowserBack';
import { AppHeader } from './AppHeader';
import { UtilityNavigation } from './UtilityNavigation';
import {
  isUtilityPage,
  utilityLabels,
  workflowHeading,
  workflowReturnLabels,
  type Page,
  type UtilityPage,
  type WorkflowPage,
} from './navigation';
import { TutorialPage } from './tutorials/TutorialPage';
import { tutorials } from './tutorials/content';

const initial = readDraft();
export default function App() {
  useViewport();
  const appearance = useAppearance();
  const [draft, setDraft] = useState<Draft | null>(initial.draft);
  const [page, setPage] = useState<Page>(initial.draft?.screen ?? 'home');
  const [result, setResult] = useState<Analysis | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState(initial.error);
  const [cacheError, setCacheError] = useState('');
  const [busy, setBusy] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState('正在准备离线缓存');
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [utilityClosing, setUtilityClosing] = useState(false);
  const [tutorialKind, setTutorialKind] = useState<Kind | null>(null);
  const [tutorialFromCatalog, setTutorialFromCatalog] = useState(false);
  const [discardRequest, setDiscardRequest] = useState<DiscardRequest | null>(null);
  const [editingHistory, setEditingHistory] = useState(false);
  const utilityReturn = useRef<WorkflowPage>('home');
  const backTrail = useRef<WorkflowPage[]>(
    initial.draft?.screen === 'analysis' ? ['home', 'input'] : initial.draft ? ['home'] : [],
  );
  const resultReturn = useRef<'home' | 'history'>('home');
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const utilityHeading = useRef<HTMLHeadingElement>(null);
  const tutorialTransitionPending = useRef(false);

  useEffect(() => {
    void prepareOffline(setOfflineStatus);
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);
  useEffect(() => {
    if (!isUtilityPage(page)) heading.current?.focus();
  }, [page]);
  useEffect(() => {
    if (!isUtilityPage(page)) window.scrollTo({ top: 0 });
  }, [page]);
  useEffect(() => {
    if (page === 'tutorial') utilityHeading.current?.focus({ preventScroll: true });
  }, [page, tutorialKind]);

  function updateDraft(next: Draft | null) {
    setDraft(next);
    setCacheError(writeDraft(next));
  }
  function updateAnalysis(analysis: Analysis) {
    if (draft) updateDraft({ ...draft, analysis });
  }
  function navigate(next: WorkflowPage, update: () => void = () => {}, trail?: WorkflowPage[]) {
    return transitionWorkflow(() => {
      if (trail) backTrail.current = trail;
      else if (next !== page && !isUtilityPage(page)) backTrail.current.push(page);
      update();
      setPage(next);
    });
  }
  function home() {
    confirmDiscard({
      message: '返回首页后，本次尚未完成的输入不会保存。',
      confirmText: '放弃并返回',
      onConfirm: () => {
        void navigate(
          'home',
          () => {
            setSidebarOpen(false);
            updateDraft(null);
            setResult(null);
            setError('');
          },
          [],
        );
      },
    });
  }
  function confirmDiscard(request: DiscardRequest) {
    if (draft) setDiscardRequest(request);
    else request.onConfirm();
  }
  function start(kind: Kind) {
    confirmDiscard({
      message: '新建分析后，本次尚未完成的输入不会保存。',
      confirmText: '放弃并新建',
      onConfirm: () => {
        void navigate(
          'input',
          () => {
            setSidebarOpen(false);
            setResult(null);
            resultReturn.current = 'home';
            updateDraft({ analysis: newAnalysis(kind), screen: 'input' });
            setError('');
          },
          ['home'],
        );
      },
    });
  }
  function changeTutorialPage(update: () => void) {
    if (tutorialTransitionPending.current) return;
    tutorialTransitionPending.current = true;
    void transitionWorkflow(update).finally(() => {
      tutorialTransitionPending.current = false;
    });
  }
  function openUtility(next: UtilityPage, kind: Kind | null = null) {
    const update = () => {
      if (!isUtilityPage(page)) utilityReturn.current = page;
      setTutorialKind(kind);
      setTutorialFromCatalog(false);
      setUtilityClosing(false);
      setSidebarOpen(false);
      setPage(next);
    };
    if (next === 'tutorial') changeTutorialPage(update);
    else update();
  }
  function openTutorialFromCatalog(kind: Kind) {
    changeTutorialPage(() => {
      setTutorialKind(kind);
      setTutorialFromCatalog(true);
    });
  }
  function openTutorialCatalog() {
    changeTutorialPage(() => setTutorialKind(null));
  }
  function returnFromUtility() {
    if (page === 'tutorial') {
      if (tutorialKind && tutorialFromCatalog) openTutorialCatalog();
      else changeTutorialPage(() => setPage(utilityReturn.current));
      return;
    }
    setUtilityClosing(true);
  }
  function editResult() {
    if (!result) return;
    confirmDiscard({
      message: '编辑这条记录后，本次尚未完成的输入不会保存。',
      confirmText: '放弃并编辑',
      onConfirm: () => {
        void navigate('analysis', () => {
          updateDraft({ analysis: structuredClone(result), screen: 'analysis' });
          setError('');
        });
      },
    });
  }
  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }
  function analyze() {
    if (!draft) return;
    const invalid = inputError(draft.analysis);
    if (invalid) {
      setError(invalid);
      return;
    }
    const analysis = { ...draft.analysis };
    if (analysis.kind === 'fact')
      analysis.cells = analysis.cells.map((cell, i) =>
        i === 4 ? { ...cell, text: analysis.statement } : cell,
      );
    void navigate('analysis', () => {
      updateDraft({ analysis, screen: 'analysis' });
      setError('');
    });
  }
  async function finish() {
    if (!draft || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await saveAnalysis(draft.analysis);
      await navigate(
        'result',
        () => {
          updateDraft(null);
          setResult(saved);
        },
        resultReturn.current === 'history' ? ['home', 'history'] : ['home'],
      );
      void navigator.storage?.persist?.().catch(() => false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '本地保存失败，请重试。');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function openHistory(trail: WorkflowPage[] = ['home']) {
    await navigate(
      'history',
      () => {
        setSidebarOpen(false);
        setEditingHistory(false);
        setHistory([]);
        setBusy(true);
        setError('');
      },
      trail,
    );
    try {
      setHistory(await listAnalyses());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '历史记录加载失败。');
    } finally {
      setBusy(false);
    }
  }
  async function openResult(id: string) {
    setBusy(true);
    setError('');
    try {
      const saved = await getAnalysis(id);
      await navigate('result', () => {
        resultReturn.current = 'history';
        setResult(saved);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '记录加载失败。');
    } finally {
      setBusy(false);
    }
  }
  function requestDelete(items: HistoryItem[]) {
    if (!items.length || busy) return;
    const title = items[0].title.length > 80 ? `${items[0].title.slice(0, 80)}…` : items[0].title;
    setDiscardRequest({
      title: items.length === 1 ? '删除这条记录？' : `删除所选 ${items.length} 条记录？`,
      cancelText: '取消',
      confirmText: '确认删除',
      message:
        items.length === 1
          ? `“${title}”及其分析内容将从本机删除，删除后无法恢复。`
          : `所选 ${items.length} 条记录及其分析内容将从本机删除，删除后无法恢复。`,
      onConfirm: () => {
        void removeHistory(items.map((item) => item.id));
      },
    });
  }
  async function removeHistory(ids: string[]) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await deleteAnalyses(ids);
      const removed = new Set(ids);
      setHistory((current) => current.filter((item) => !removed.has(item.id)));
      setResult((current) => (current && removed.has(current.id) ? null : current));
    } catch (cause) {
      setError(`删除未完成：${cause instanceof Error ? cause.message : '请重试。'}`);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function back() {
    // Native dialogs may consume system Back themselves. This fallback also
    // handles browsers that dispatch popstate first, without leaving the page.
    const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const dialog = dialogs[dialogs.length - 1];
    if (dialog) {
      dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      return;
    }
    if (busy || utilityClosing || tutorialTransitionPending.current) return;
    if (sidebarOpen) {
      setSidebarOpen(false);
      return;
    }
    if (isUtilityPage(page)) {
      returnFromUtility();
      return;
    }
    if (page === 'history' && editingHistory) {
      setEditingHistory(false);
      return;
    }
    const trail = backTrail.current.slice(0, -1);
    const previous = backTrail.current.at(-1) ?? 'home';
    const leave = async () => {
      if (previous === 'history') {
        await openHistory(trail);
        return;
      }
      await navigate(
        previous,
        () => {
          setError('');
          if (previous === 'input' || previous === 'analysis') {
            if (draft) {
              const analysis =
                previous === 'analysis' && draft.analysis.kind === 'fact'
                  ? {
                      ...draft.analysis,
                      cells: draft.analysis.cells.map((cell, index) =>
                        index === 4 ? { ...cell, text: draft.analysis.statement } : cell,
                      ),
                    }
                  : draft.analysis;
              updateDraft({ ...draft, analysis, screen: previous });
            }
          } else if (draft) updateDraft(null);
          if (previous === 'home') setResult(null);
        },
        trail,
      );
    };
    if (draft && previous !== 'input' && previous !== 'analysis') {
      confirmDiscard({
        message: '返回后，本次尚未完成的输入不会保存。已保存的记录不受影响。',
        confirmText: '放弃并返回',
        onConfirm: () => {
          void leave();
        },
      });
    } else await leave();
  }
  useBrowserBack(page !== 'home' || sidebarOpen || discardRequest !== null, back);
  const active = draft?.analysis;
  const utilityPage = isUtilityPage(page);
  const workflowPage = utilityPage ? utilityReturn.current : page;
  useFittedDescriptions(workflowPage);
  const Main = utilityPage ? 'div' : 'main';
  const headingText = workflowHeading(workflowPage, active?.kind);

  function renderHeader(screen: Page) {
    const utility = isUtilityPage(screen);
    const branch = screen === 'input' || screen === 'analysis' || screen === 'result';
    const kind = screen === 'result' ? result?.kind : active?.kind;
    let action: { label: string; onClick: () => void } | undefined;

    if (utility) {
      const hasCatalogParent = screen === 'tutorial' && tutorialKind && tutorialFromCatalog;
      action = {
        label: hasCatalogParent || utilityReturn.current !== 'home' ? '返回' : '首页',
        onClick: returnFromUtility,
      };
    } else if (branch) {
      action = { label: '教程', onClick: () => openUtility('tutorial', kind ?? null) };
    } else if (screen !== 'home') {
      action = { label: '首页', onClick: home };
    }

    return (
      <AppHeader
        showMenu={screen !== 'analysis' && screen !== 'result'}
        sidebarOpen={sidebarOpen}
        disabled={busy || utilityClosing}
        offlineStatus={offlineStatus}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenHistory={
          screen === 'home'
            ? () => {
                void openHistory();
              }
            : undefined
        }
        onInstall={
          installPrompt
            ? () => {
                void install();
              }
            : undefined
        }
        action={action}
      />
    );
  }

  const tutorialReturnLabel = tutorialFromCatalog
    ? '返回教程目录'
    : workflowReturnLabels[utilityReturn.current];

  return (
    <>
      <div
        className="app-shell"
        inert={utilityPage || undefined}
        aria-hidden={utilityPage || undefined}
      >
        {renderHeader(workflowPage)}
        <Main
          className={workflowPage === 'home' ? 'workflow-main home-main' : 'workflow-main'}
          data-page={workflowPage}
          data-kind={workflowPage === 'result' ? result?.kind : active?.kind}
        >
          <h1 tabIndex={-1} ref={heading} className="page-title">
            {headingText}
          </h1>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {cacheError && (
            <p className="error" role="alert">
              {cacheError}
            </p>
          )}
          {workflowPage === 'home' && <HomePage appearance={appearance} onStart={start} />}
          {workflowPage === 'input' && active && (
            <InputPage value={active} onChange={updateAnalysis} onAnalyze={analyze} onHome={home} />
          )}
          {workflowPage === 'analysis' && active && (
            <>
              <div
                className={
                  active.kind === 'fact' ? 'analysis-heading' : 'analysis-heading compact-heading'
                }
              >
                <p className="statement">{titleOf(active)}</p>
                <button
                  disabled={busy}
                  onClick={() => {
                    void navigate('input', () => {
                      if (draft) updateDraft({ ...draft, screen: 'input' });
                    });
                  }}
                >
                  修改输入
                </button>
              </div>
              <fieldset disabled={busy} className="editor-fieldset">
                <AnalysisEditor key={active.id} value={active} onChange={updateAnalysis} />
                <Judgment value={active} onChange={updateAnalysis} />
              </fieldset>
              <div className="finish-bar">
                <button className="primary" disabled={busy} onClick={finish}>
                  {busy ? '保存中…' : '完成'}
                </button>
              </div>
            </>
          )}
          {workflowPage === 'history' && (
            <>
              {busy && (
                <p role="status" className="hint">
                  正在读取本地记录…
                </p>
              )}
              {!busy && !error && history.length === 0 && (
                <p className="empty">还没有记录。完成一次分析后，它会出现在这里。</p>
              )}
              {error && (
                <button
                  onClick={() => {
                    void openHistory();
                  }}
                  disabled={busy}
                >
                  重试读取
                </button>
              )}
              <HistoryList
                items={history}
                busy={busy}
                onOpen={openResult}
                onDelete={requestDelete}
                editing={editingHistory}
                onEditingChange={setEditingHistory}
              />
            </>
          )}
          {workflowPage === 'result' && result && (
            <ResultPage value={result} busy={busy} onEdit={editResult} onHome={home} />
          )}
        </Main>
      </div>
      {utilityPage && (
        <UtilityScreen
          key={page}
          instant={page === 'tutorial'}
          visible={!utilityClosing}
          onExited={() => {
            setUtilityClosing(false);
            setPage(utilityReturn.current);
          }}
        >
          {renderHeader(page)}
          <main>
            <h1 ref={utilityHeading} tabIndex={-1} className="page-title">
              {page === 'tutorial' && tutorialKind
                ? tutorials[tutorialKind].title
                : utilityLabels[page]}
            </h1>
            {page === 'theme' && <ThemePage appearance={appearance} />}
            {page === 'tutorial' && (
              <TutorialPage
                kind={tutorialKind}
                onSelect={openTutorialFromCatalog}
                onReturn={returnFromUtility}
                returnLabel={tutorialReturnLabel}
              />
            )}
          </main>
        </UtilityScreen>
      )}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
        {(close) => (
          <UtilityNavigation
            page={page}
            disabled={busy}
            onSelect={(item) => close(() => openUtility(item), item === 'tutorial')}
          />
        )}
      </Sidebar>
      {discardRequest && (
        <DiscardDialog
          request={discardRequest}
          onCancel={() => setDiscardRequest(null)}
          onConfirm={() => {
            setDiscardRequest(null);
            discardRequest.onConfirm();
          }}
        />
      )}
    </>
  );
}
