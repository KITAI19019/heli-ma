import type { TutorialIllustration } from './content';

function AssistantMark() {
  return (
    <span className="tutorial-assistant-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export function AiTutorialIllustration({ illustration }: { illustration: TutorialIllustration }) {
  switch (illustration) {
    case 'ai-connect':
      return (
        <div className="tutorial-input-example">
          <span className="tutorial-ai-location">侧栏 → AI 配置 → 连接服务</span>
          <div className="tutorial-example-field">
            <span className="tutorial-field-label">服务商</span>
            <span className="tutorial-ai-select">
              DeepSeek <span aria-hidden="true">⌄</span>
            </span>
          </div>
          <div className="tutorial-example-field" data-highlighted>
            <span className="tutorial-field-label">API Key</span>
            <span className="tutorial-ai-secret">••••••••••••••••</span>
          </div>
          <span className="tutorial-ai-remember">
            <span aria-hidden="true">□</span> 在此设备记住密钥
          </span>
        </div>
      );
    case 'ai-enable':
      return (
        <div className="tutorial-input-example">
          <div className="tutorial-example-field">
            <span className="tutorial-field-label">模型</span>
            <span className="tutorial-ai-select">
              从列表选择模型 <span aria-hidden="true">⌄</span>
            </span>
          </div>
          <div className="tutorial-ai-toggle">
            <span>启用 AI 助手</span>
            <span className="tutorial-switch-example" aria-label="已开启" />
          </div>
          <div className="tutorial-ai-ready">
            <AssistantMark />
            <span>开启后，小球出现在页面上</span>
          </div>
        </div>
      );
    case 'ai-chat':
      return (
        <div className="tutorial-input-example">
          <div className="tutorial-ai-chat-heading">
            <AssistantMark />
            <strong>AI 助手</strong>
          </div>
          <div className="tutorial-example-field tutorial-ai-prompt">
            <span className="tutorial-field-label">你 · 假设练习</span>
            学校食堂应该提供小份菜。观察：午饭后，不少同学的餐盘里有剩菜。请填写事实和理由，依据不足处标「待查」，再补一个可能的例外。
          </div>
          <span className="tutorial-action-example">发送</span>
        </div>
      );
    case 'ai-review':
      return (
        <div className="tutorial-input-example">
          <div className="tutorial-example-field">
            <span className="tutorial-field-label">理由 1 · 原文</span>
            小份菜能减少剩菜。
          </div>
          <div className="tutorial-example-field" data-highlighted>
            <span className="tutorial-field-label">建议修改</span>
            小份菜让饭量小的同学按需点餐，可能减少因分量过多造成的剩菜。
          </div>
          <div className="tutorial-ai-review-actions">
            <span className="tutorial-action-outline">保留当前内容</span>
            <span className="tutorial-action-example">应用修改</span>
          </div>
        </div>
      );
    case 'ai-save':
      return (
        <div className="tutorial-input-example">
          <div className="tutorial-example-field">
            <span className="tutorial-field-label">检查填写内容</span>
            <ul className="tutorial-ai-checklist">
              <li>事实与出处，核对清楚</li>
              <li>理由与依据，互相对应</li>
              <li>例外和待查内容，保留下来</li>
            </ul>
          </div>
          <div className="tutorial-ai-toggle">
            <span>合理度</span>
            <strong>不清楚</strong>
          </div>
          <span className="tutorial-action-example">完成</span>
          <span className="tutorial-save-note">点击后才保存到历史记录</span>
        </div>
      );
    default:
      return null;
  }
}
