import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useAssistant } from './useAssistant';
import { useOrb } from './useOrb';
import { OrbFace } from './OrbFace';
import type { useAiSettings } from './useAiSettings';

export function Assistant({
  settings,
  open,
  onOpen,
  onClose,
  onConfigure,
}: {
  settings: ReturnType<typeof useAiSettings>;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onConfigure: () => void;
}) {
  const { value, profile } = settings;
  const chat = useAssistant(value.enabled, profile);
  const [input, setInput] = useState('');
  const composer = useRef<HTMLTextAreaElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const orbButton = useRef<HTMLButtonElement>(null);
  const orb = useOrb(value.position, 48 * value.scale, (position) =>
    settings.update((current) => ({ ...current, position })),
  );
  const configured = !!profile.apiKey.trim() && !!profile.model;
  useEffect(() => {
    if (!value.enabled) onClose();
  }, [value.enabled]);
  useEffect(() => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [chat.lines, chat.approval, open]);
  function close() {
    flushSync(onClose);
    orbButton.current?.focus({ preventScroll: true });
  }
  function send() {
    if (!input.trim() || chat.busy || !configured) return;
    const text = input;
    setInput('');
    composer.current?.blur();
    void chat.send(text);
  }
  if (!value.enabled) return null;
  return (
    <div className="ai-layer">
      <button
        ref={orbButton}
        type="button"
        hidden={open}
        className="ai-orb"
        aria-label="打开 AI 助手"
        title="点击交流，拖动调整位置"
        style={orb.style}
        onPointerDown={orb.onPointerDown}
        onPointerMove={orb.onPointerMove}
        onPointerUp={orb.onPointerUp}
        onPointerCancel={orb.onPointerCancel}
        onClick={() => {
          if (orb.consumeDrag()) return;
          flushSync(onOpen);
          composer.current?.focus({ preventScroll: true });
        }}
      >
        <OrbFace />
      </button>
      {open && (
        <section
          className="ai-chat"
          role="dialog"
          aria-label="AI 助手"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
        >
          <header className="ai-chat-header">
            <span className="ai-mini-orb">
              <OrbFace />
            </span>
            <strong>AI 助手</strong>
            <button type="button" className="text-button" onClick={close} aria-label="关闭 AI 助手">
              关闭
            </button>
          </header>
          <div className="ai-chat-context">
            <span>当前分析与本次对话 · {profile.model || '尚未配置模型'}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                chat.cancel();
                onConfigure();
              }}
            >
              配置
            </button>
          </div>
          <div
            className="ai-messages"
            ref={messages}
            aria-live="polite"
            aria-relevant="additions text"
          >
            {!chat.lines.length && (
              <div className="ai-empty">
                <p>
                  {configured ? '把材料交给我，一起梳理主张。' : '先配置服务和模型，再开始交流。'}
                </p>
                <p className="ai-note">填写后可继续修改，点击“完成”才会保存。</p>
              </div>
            )}
            {chat.lines.map((line) => (
              <p key={line.id} className={`ai-message ai-message-${line.role}`}>
                <span className="visually-hidden">
                  {line.role === 'user'
                    ? '你：'
                    : line.role === 'assistant'
                      ? '助手：'
                      : '操作结果：'}
                </span>
                {line.text}
              </p>
            ))}
            {chat.busy && !chat.approval && (
              <p className="ai-working" role="status">
                正在整理…
              </p>
            )}
            {chat.approval && (
              <div className="ai-approval">
                <strong>{chat.approval.title}</strong>
                {chat.approval.changes.map((change, index) => (
                  <div className="ai-change" key={index}>
                    <b>{change.label}</b>
                    <div>
                      <span>原文</span>
                      <p>{change.before}</p>
                    </div>
                    <div>
                      <span>修改后</span>
                      <p>{change.after || '（清空）'}</p>
                    </div>
                  </div>
                ))}
                <div className="ai-approval-actions">
                  <button
                    className="primary"
                    type="button"
                    onClick={() => chat.answerApproval(true)}
                  >
                    {chat.approval.changes.length ? '应用修改' : '继续跳转'}
                  </button>
                  <button type="button" onClick={() => chat.answerApproval(false)}>
                    保留当前内容
                  </button>
                </div>
              </div>
            )}
          </div>
          <form
            className="ai-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <textarea
              ref={composer}
              aria-label="发给 AI 的消息"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={20000}
              rows={2}
              placeholder={configured ? '例如：帮我整理这段主张…' : '请先完成 AI 配置'}
              disabled={!configured}
            />
            <div className="ai-composer-actions">
              <button
                type="button"
                className="text-button"
                disabled={chat.busy || !chat.lines.length}
                onClick={chat.clear}
              >
                清空对话
              </button>
              {chat.busy ? (
                <button type="button" onClick={chat.cancel}>
                  停止
                </button>
              ) : (
                <button className="primary" type="submit" disabled={!configured || !input.trim()}>
                  发送
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
