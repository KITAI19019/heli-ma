import { useEffect, useId, useRef, useState } from 'react';

export function KeyStorageHint() {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const hovered = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function showBriefly() {
    clearTimeout(timer.current);
    setVisible(true);
    timer.current = setTimeout(() => {
      if (!hovered.current) setVisible(false);
    }, 2000);
  }

  function hide() {
    clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <>
      <button
        type="button"
        className="ai-help-button"
        aria-label="密钥保存说明"
        aria-describedby={visible ? id : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== 'mouse') return;
          hovered.current = true;
          clearTimeout(timer.current);
          setVisible(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== 'mouse') return;
          hovered.current = false;
          hide();
        }}
        onPointerCancel={() => {
          hovered.current = false;
          hide();
        }}
        onFocus={showBriefly}
        onBlur={() => {
          if (!hovered.current) hide();
        }}
        onClick={showBriefly}
        onKeyDown={(event) => {
          if (event.key === 'Escape') hide();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.8-2.5 1.8-2.5 3.8" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {visible && (
        <span id={id} role="tooltip" className="ai-help-tooltip">
          默认仅保留本次会话。记住后将存于当前浏览器，使用此设备的人及页面脚本可能读取。
        </span>
      )}
    </>
  );
}
