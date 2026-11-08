import { useEffect, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { lockBodyScroll } from './scrollLock';

export function EditorDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const release = lockBodyScroll();
    dialog.showModal();
    return () => { dialog.close(); release(); };
  }, []);
  return createPortal(<dialog ref={ref} className="editor-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2>{title}</h2><button type="button" onClick={onClose}>完成输入</button></header>
    {children}
  </dialog>, document.body);
}

export function AdaptiveTextarea({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const restoringFocus = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const check = () => {
    if (!restoringFocus.current && document.activeElement === ref.current && innerWidth <= 860 && (window.visualViewport?.height ?? innerHeight) < 480) setExpanded(true);
  };
  useEffect(() => {
    window.addEventListener('resize', check);
    window.visualViewport?.addEventListener('resize', check);
    return () => {
      window.removeEventListener('resize', check);
      window.visualViewport?.removeEventListener('resize', check);
    };
  }, []);
  return <>
    <textarea {...props} aria-label={label} aria-hidden={expanded || undefined} ref={ref} onFocus={event => {
      props.onFocus?.(event);
      if (!restoringFocus.current && innerWidth <= 860 && (window.visualViewport?.height ?? innerHeight) < 480) setExpanded(true);
    }} />
    {expanded && <EditorDialog title={label} onClose={() => {
      restoringFocus.current = true;
      setExpanded(false);
      requestAnimationFrame(() => { ref.current?.blur(); restoringFocus.current = false; });
    }}>
      <textarea {...props} autoFocus aria-label={label} className="expanded-textarea" />
    </EditorDialog>}
  </>;
}
