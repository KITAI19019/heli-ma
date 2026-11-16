import { useEffect, useRef, useState } from 'react';
import { runAssistant, agentLimits } from './agent';
import type { ChatMessage } from './client';
import type { Approval } from './tools';
import type { ServiceProfile } from './settings';

export interface ConversationLine {
  id: string;
  role: 'user' | 'assistant' | 'status';
  text: string;
}

export function useAssistant(enabled: boolean, profile: ServiceProfile) {
  const [lines, setLines] = useState<ConversationLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [approval, setApproval] = useState<Approval | null>(null);
  const controller = useRef<AbortController | null>(null);
  const decide = useRef<((value: boolean) => void) | null>(null);
  const history = useRef<ChatMessage[]>([]);
  const active = useRef(true);
  const append = (role: ConversationLine['role'], text: string) => {
    if (active.current)
      setLines((current) => [...current, { id: crypto.randomUUID(), role, text }].slice(-80));
  };
  function answerApproval(value: boolean) {
    decide.current?.(value);
  }
  function cancel() {
    controller.current?.abort();
    answerApproval(false);
  }

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      cancel();
    };
  }, []);
  useEffect(() => {
    cancel();
    history.current = [];
    setLines([]);
  }, [enabled, profile.baseUrl, profile.apiKey, profile.model]);

  async function send(input: string) {
    if (controller.current || !enabled || !input.trim()) return;
    const text = input.trim();
    if (text.length > agentLimits.inputLength) {
      append('status', '材料过长，请分段发送，每次不超过 20,000 字符。');
      return;
    }
    if (!profile.apiKey || !profile.model) {
      append('status', '请先在 AI 配置中填写密钥并选择模型。');
      return;
    }
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    append('user', text);
    let writes = 0;
    try {
      const reply = await runAssistant(
        { ...profile },
        history.current,
        text,
        current.signal,
        (request) =>
          new Promise<boolean>((resolve) => {
            if (current.signal.aborted) {
              resolve(false);
              return;
            }
            setApproval(request);
            const finish = (accepted: boolean) => {
              current.signal.removeEventListener('abort', abort);
              decide.current = null;
              if (active.current) setApproval(null);
              resolve(accepted);
            };
            const abort = () => finish(false);
            decide.current = finish;
            current.signal.addEventListener('abort', abort, { once: true });
          }),
        (action) => {
          writes += 1;
          append('status', action);
        },
      );
      current.signal.throwIfAborted();
      append('assistant', reply);
      history.current = [
        ...history.current,
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ].slice(-12) as ChatMessage[];
    } catch (error) {
      append(
        'status',
        `${current.signal.aborted ? '本轮已停止。' : error instanceof Error ? error.message : '请求失败，请重试。'}${writes ? ' 已执行的操作仍保留，请检查当前草稿。' : ''}`,
      );
    } finally {
      if (controller.current === current) controller.current = null;
      if (active.current) {
        setBusy(false);
        setApproval(null);
      }
    }
  }
  return {
    lines,
    busy,
    approval,
    send,
    cancel,
    answerApproval,
    clear: () => {
      if (!controller.current) {
        history.current = [];
        setLines([]);
      }
    },
  };
}
