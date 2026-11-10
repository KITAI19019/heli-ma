// @refresh reset
import { useEffect, useRef, useState } from 'react';
import { deleteAnalyses, getAnalysis, listAnalyses, saveAnalysis } from './database';
import { readDraft, writeDraft } from './draft';
import { AnalysisEditor, Judgment } from './Editors';
import { conclusionOf, inputError, isPending, kindNames, newAnalysis, titleOf, type Analysis, type Draft, type HistoryItem, type Kind } from './model';
import { prepareOffline, type InstallPrompt } from './pwa';
import { Sidebar } from './Sidebar';
import { Artwork } from './Artwork';
import { ThemePage } from './ThemePage';
import { useAppearance } from './useAppearance';
import { UtilityScreen } from './UtilityScreen';
import { transitionWorkflow } from './workflowTransition';
import { DiscardDialog, type DiscardRequest } from './DiscardDialog';
import { HistoryList } from './HistoryList';
import { GrowingTextarea } from './GrowingTextarea';
import { useViewport, useFittedDescriptions } from './useViewport';
import { useBrowserBack } from './useBrowserBack';

type WorkflowPage = 'home' | 'input' | 'analysis' | 'history' | 'result';
type UtilityPage = 'tutorial' | 'language' | 'theme';
type Page = WorkflowPage | UtilityPage;
const utilityLabels: Record<UtilityPage, string> = { tutorial: '教程', language: '语言', theme: '主题' };
function isUtilityPage(page: Page): page is UtilityPage { return page === 'tutorial' || page === 'language' || page === 'theme'; }
const initial = readDraft();
const introductions: Record<Kind, string> = {
  fact: '从时间和层级展开，查一查这句话。',
  relation: '对照四种情况，想一想 A 是否导致 B。',
  claim: '梳理事实、理由与例外，检查主张。',
};
const descriptions: Record<Kind, string> = {
  fact: '假如这句话是真的，前后会发生什么？周围和细节是否说得通？',
  relation: '把发生和没发生的情况都看一遍，判断 A 是不是 B 的原因。',
  claim: '看看理由有没有依据、哪些情况下不成立，再判断这句话有多可信。',
};

function MenuIcon({ page }: { page: UtilityPage }) {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {page === 'tutorial' && <><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" /><path d="M6 8h3M6 12h3M15 8h3M15 12h3" /></>}
    {page === 'language' && <><path d="M2 5h12M7 2v3M11 5c-1 5-4 8-8 10M5 8c1 3 4 5 7 6M13 21l4-10 4 10M14.5 17h5" /></>}
    {page === 'theme' && <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" /></>}
  </svg>;
}

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
  const [discardRequest, setDiscardRequest] = useState<DiscardRequest | null>(null);
  const [editingHistory, setEditingHistory] = useState(false);
  const utilityReturn = useRef<WorkflowPage>('home');
  const backTrail = useRef<WorkflowPage[]>(initial.draft?.screen === 'analysis' ? ['home', 'input'] : initial.draft ? ['home'] : []);
  const resultReturn = useRef<'home' | 'history'>('home');
  const saving = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    void prepareOffline(setOfflineStatus);
    const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', capture);
    return () => window.removeEventListener('beforeinstallprompt', capture);
  }, []);
  useEffect(() => { if (!isUtilityPage(page)) heading.current?.focus(); }, [page]);
  useEffect(() => { if (!isUtilityPage(page)) window.scrollTo({ top: 0 }); }, [page]);

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
      update(); setPage(next);
    });
  }
  function home() {
    confirmDiscard({ message: '返回首页后，本次尚未完成的输入不会保存。', confirmText: '放弃并返回', onConfirm: () => {
      void navigate('home', () => { setSidebarOpen(false); updateDraft(null); setResult(null); setError(''); }, []);
    } });
  }
  function confirmDiscard(request: DiscardRequest) {
    if (draft) setDiscardRequest(request);
    else request.onConfirm();
  }
  function start(kind: Kind) {
    confirmDiscard({ message: '新建分析后，本次尚未完成的输入不会保存。', confirmText: '放弃并新建', onConfirm: () => {
      void navigate('input', () => {
        setSidebarOpen(false); setResult(null); resultReturn.current = 'home';
        updateDraft({ analysis: newAnalysis(kind), screen: 'input' }); setError('');
      }, ['home']);
    } });
  }
  function openUtility(next: UtilityPage) {
    if (!isUtilityPage(page)) utilityReturn.current = page;
    setUtilityClosing(false);
    setSidebarOpen(false); setPage(next);
  }
  function editResult() {
    if (!result) return;
    confirmDiscard({ message: '编辑这条记录后，本次尚未完成的输入不会保存。', confirmText: '放弃并编辑', onConfirm: () => {
      void navigate('analysis', () => { updateDraft({ analysis: structuredClone(result), screen: 'analysis' }); setError(''); });
    } });
  }
  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null);
  }
  function analyze() {
    if (!draft) return;
    const invalid = inputError(draft.analysis);
    if (invalid) { setError(invalid); return; }
    const analysis = { ...draft.analysis };
    if (analysis.kind === 'fact') analysis.cells = analysis.cells.map((cell, i) => i === 4 ? { ...cell, text: analysis.statement } : cell);
    void navigate('analysis', () => { updateDraft({ analysis, screen: 'analysis' }); setError(''); });
  }
  async function finish() {
    if (!draft || saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      const saved = await saveAnalysis(draft.analysis);
      await navigate('result', () => { updateDraft(null); setResult(saved); }, resultReturn.current === 'history' ? ['home', 'history'] : ['home']);
      void navigator.storage?.persist?.().catch(() => false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '本地保存失败，请重试。'); }
    finally { saving.current = false; setBusy(false); }
  }
  async function openHistory(trail: WorkflowPage[] = ['home']) {
    await navigate('history', () => { setSidebarOpen(false); setEditingHistory(false); setHistory([]); setBusy(true); setError(''); }, trail);
    try { setHistory(await listAnalyses()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '历史记录加载失败。'); }
    finally { setBusy(false); }
  }
  async function openResult(id: string) {
    setBusy(true); setError('');
    try { const saved = await getAnalysis(id); await navigate('result', () => { resultReturn.current = 'history'; setResult(saved); }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '记录加载失败。'); }
    finally { setBusy(false); }
  }
  function requestDelete(items: HistoryItem[]) {
    if (!items.length || busy) return;
    const title = items[0].title.length > 80 ? `${items[0].title.slice(0, 80)}…` : items[0].title;
    setDiscardRequest({
      title: items.length === 1 ? '删除这条记录？' : `删除所选 ${items.length} 条记录？`,
      cancelText: '取消', confirmText: '确认删除',
      message: items.length === 1 ? `“${title}”及其分析内容将从本机删除，删除后无法恢复。` : `所选 ${items.length} 条记录及其分析内容将从本机删除，删除后无法恢复。`,
      onConfirm: () => { void removeHistory(items.map(item => item.id)); },
    });
  }
  async function removeHistory(ids: string[]) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError('');
    try {
      await deleteAnalyses(ids);
      const removed = new Set(ids);
      setHistory(current => current.filter(item => !removed.has(item.id)));
      setResult(current => current && removed.has(current.id) ? null : current);
    } catch (cause) { setError(`删除未完成：${cause instanceof Error ? cause.message : '请重试。'}`); }
    finally { saving.current = false; setBusy(false); }
  }
  async function back() {
    // Native dialogs may consume system Back themselves. This fallback also
    // handles browsers that dispatch popstate first, without leaving the page.
    const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
    const dialog = dialogs[dialogs.length - 1];
    if (dialog) { dialog.dispatchEvent(new Event('cancel', { cancelable: true })); return; }
    if (busy || utilityClosing) return;
    if (sidebarOpen) { setSidebarOpen(false); return; }
    if (isUtilityPage(page)) { setUtilityClosing(true); return; }
    if (page === 'history' && editingHistory) { setEditingHistory(false); return; }
    const trail = backTrail.current.slice(0, -1);
    const previous = backTrail.current.at(-1) ?? 'home';
    const leave = async () => {
      if (previous === 'history') { await openHistory(trail); return; }
      await navigate(previous, () => {
        setError('');
        if (previous === 'input' || previous === 'analysis') {
          if (draft) {
            const analysis = previous === 'analysis' && draft.analysis.kind === 'fact'
              ? { ...draft.analysis, cells: draft.analysis.cells.map((cell, index) => index === 4 ? { ...cell, text: draft.analysis.statement } : cell) }
              : draft.analysis;
            updateDraft({ ...draft, analysis, screen: previous });
          }
        } else if (draft) updateDraft(null);
        if (previous === 'home') setResult(null);
      }, trail);
    };
    if (draft && previous !== 'input' && previous !== 'analysis') {
      confirmDiscard({ message: '返回后，本次尚未完成的输入不会保存。已保存的记录不受影响。', confirmText: '放弃并返回', onConfirm: () => { void leave(); } });
    } else await leave();
  }
  useBrowserBack(page !== 'home' || sidebarOpen || discardRequest !== null, back);
  const active = draft?.analysis;
  const utilityPage = isUtilityPage(page);
  const workflowPage = utilityPage ? utilityReturn.current : page;
  useFittedDescriptions(workflowPage);
  const Main = utilityPage ? 'div' : 'main';
  const analysisTitle = active?.kind === 'relation' ? kindNames.relation : `${kindNames[active?.kind ?? 'fact']}分析`;
  const headingText = workflowPage === 'home' ? '这件事，合理吗？' : workflowPage === 'history' ? '历史记录' : workflowPage === 'result' ? '我的分析结果' : workflowPage === 'input' ? `输入${active?.kind === 'relation' ? ' A 和 B' : kindNames[active?.kind ?? 'fact']}` : analysisTitle;

  function topbar(screen: Page) {
    const utility = isUtilityPage(screen);
    const branch = screen === 'input' || screen === 'analysis' || screen === 'result';
    return <header className="topbar">
    {screen !== 'analysis' && screen !== 'result' && <button className="sidebar-toggle icon-button" disabled={busy || utilityClosing} onClick={() => setSidebarOpen(true)} aria-label="打开侧边栏" aria-expanded={sidebarOpen} aria-controls="navigation-sidebar" aria-haspopup="dialog" title="导航菜单">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 8h18M3 16h11" /></svg>
    </button>}
    <div className="brand">
      <img className="brand-logo" src={`${import.meta.env.BASE_URL}logo.png`} width="28" height="28" alt="" /><span className="brand-word">合理吗</span>
    </div>
    <div className="top-actions"><span className="visually-hidden" role="status">{offlineStatus}</span>
      {screen === 'home' && <button className="history-action icon-button" onClick={() => { void openHistory(); }} aria-label="查看历史记录 →" title="历史记录">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11a9 9 0 1 0 2.6-5.4L3 8M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
      </button>}
      {installPrompt && <button className="install-action" onClick={install}>安装应用</button>}
      {screen !== 'home' && <button className="home-action" onClick={utility ? () => setUtilityClosing(true) : branch ? () => openUtility('tutorial') : home} disabled={busy || utilityClosing}>{utility ? utilityReturn.current === 'home' ? '首页' : '返回' : branch ? '教程' : '首页'}</button>}
    </div></header>;
  }

  return <><div className="app-shell" inert={utilityPage || undefined} aria-hidden={utilityPage || undefined}>
    {topbar(workflowPage)}
    <Main className={workflowPage === 'home' ? 'workflow-main home-main' : 'workflow-main'} data-page={workflowPage} data-kind={workflowPage === 'result' ? result?.kind : active?.kind}><h1 tabIndex={-1} ref={heading} className="page-title">{headingText}</h1>
      {error && <p className="error" role="alert">{error}</p>}{cacheError && <p className="error" role="alert">{cacheError}</p>}
      {workflowPage === 'home' && <div className="home">
        <div className="home-artwork" data-artwork={appearance.value.selected} aria-hidden="true"><Artwork value={appearance.value} customUrl={appearance.customUrl} /></div>
        <div className="method-list">{(['fact', 'relation', 'claim'] as Kind[]).map((kind, index) => <button className="type-card" key={kind} onClick={() => start(kind)}>
          <span className="method-index" aria-hidden="true">0{index + 1}</span>
          <span className="method-body"><strong>{kindNames[kind]}</strong><span className="method-desc">{descriptions[kind]}</span></span>
          <span className="method-enter" aria-hidden="true">→</span>
        </button>)}</div>
      </div>}
      {workflowPage === 'input' && active && <form className={active.kind === 'relation' ? 'input-form relation-form' : 'input-form'} onSubmit={event => { event.preventDefault(); analyze(); }}>
        <p className="lead">{introductions[active.kind]}</p>
        {active.kind === 'relation' ? <><label className="field relation-field"><span className="field-name">A · 可能的原因</span><GrowingTextarea label="A · 可能的原因" autoFocus value={active.a} onChange={event => updateAnalysis({ ...active, a: event.target.value })} placeholder="例如，采用某种学习方法" /></label>
          <label className="field relation-field"><span className="field-name">B · 观察到的结果</span><GrowingTextarea label="B · 观察到的结果" value={active.b} onChange={event => updateAnalysis({ ...active, b: event.target.value })} placeholder="例如，考试成绩提高" /></label>
          <p className="hint relation-hint">接下来检查“A 是否导致 B”，并寻找 A、B 发生与未发生的四类情况。</p></>
          : <label className="field"><span className="field-name">{active.kind === 'fact' ? '待核查的说法' : '待分析的主张'}</span><GrowingTextarea label={active.kind === 'fact' ? '待核查的说法' : '待分析的主张'} autoFocus value={active.statement} onChange={event => updateAnalysis({ ...active, statement: event.target.value })} placeholder={active.kind === 'fact' ? '写下你想核查的那句话' : '写下你想分析的那句话'} /></label>}
        <div className="actions"><button className="primary" type="submit">进入分析 →</button><button type="button" onClick={home}>回到首页</button></div>
      </form>}
      {workflowPage === 'analysis' && active && <><div className={active.kind === 'fact' ? 'analysis-heading' : 'analysis-heading compact-heading'}><p className="statement">{titleOf(active)}</p><button disabled={busy} onClick={() => { void navigate('input', () => { if (draft) updateDraft({ ...draft, screen: 'input' }); }); }}>修改输入</button></div>
        <fieldset disabled={busy} className="editor-fieldset"><AnalysisEditor key={active.id} value={active} onChange={updateAnalysis} /><Judgment value={active} onChange={updateAnalysis} /></fieldset>
        <div className="finish-bar"><button className="primary" disabled={busy} onClick={finish}>{busy ? '保存中…' : '完成'}</button></div>
      </>}
      {workflowPage === 'history' && <>{busy && <p role="status" className="hint">正在读取本地记录…</p>}
        {!busy && !error && history.length === 0 && <p className="empty">还没有记录。完成一次分析后，它会出现在这里。</p>}
        {error && <button onClick={() => { void openHistory(); }} disabled={busy}>重试读取</button>}
        <HistoryList items={history} busy={busy} onOpen={openResult} onDelete={requestDelete} editing={editingHistory} onEditingChange={setEditingHistory} /></>}
      {workflowPage === 'result' && result && <><div className="result-summary"><span className="eyebrow">{kindNames[result.kind]}</span><h2>{titleOf(result)}</h2>
        <p className="result-value"><span className="result-label">合理度</span><strong>{conclusionOf(result)}</strong>{isPending(result) && <span className="pending">待分析</span>}</p>
        <div className="actions"><button className="primary" disabled={busy} onClick={editResult}>继续编辑</button><button disabled={busy} onClick={home}>回到首页</button></div>
      </div><AnalysisEditor key={result.id} value={result} onChange={() => {}} readOnly /></>}
    </Main>
  </div>
    {utilityPage && <UtilityScreen key={page} visible={!utilityClosing} onExited={() => { setUtilityClosing(false); setPage(utilityReturn.current); }}>
      {topbar(page)}
      <main><h1 tabIndex={-1} className="page-title">{utilityLabels[page]}</h1>{page === 'theme' && <ThemePage appearance={appearance} />}</main>
    </UtilityScreen>}
    <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}>
      {close => <nav className="sidebar-nav" aria-label="主导航">
        {(['tutorial', 'language', 'theme'] as UtilityPage[]).map(item => <button key={item} disabled={busy} onClick={() => close(() => openUtility(item))} aria-current={page === item ? 'page' : undefined}><MenuIcon page={item} /><span>{utilityLabels[item]}</span></button>)}
      </nav>}
    </Sidebar>
    {discardRequest && <DiscardDialog request={discardRequest} onCancel={() => setDiscardRequest(null)} onConfirm={() => {
      setDiscardRequest(null); discardRequest.onConfirm();
    }} />}
  </>;
}
