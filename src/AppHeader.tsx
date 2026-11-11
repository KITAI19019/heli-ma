interface HeaderAction {
  label: string;
  onClick: () => void;
}

interface AppHeaderProps {
  showMenu: boolean;
  sidebarOpen: boolean;
  disabled: boolean;
  offlineStatus: string;
  onOpenSidebar: () => void;
  onOpenHistory?: () => void;
  onInstall?: () => void;
  action?: HeaderAction;
}

export function AppHeader({
  showMenu,
  sidebarOpen,
  disabled,
  offlineStatus,
  onOpenSidebar,
  onOpenHistory,
  onInstall,
  action,
}: AppHeaderProps) {
  return (
    <header className="topbar">
      {showMenu && (
        <button
          className="sidebar-toggle icon-button"
          disabled={disabled}
          onClick={onOpenSidebar}
          aria-label="打开侧边栏"
          aria-expanded={sidebarOpen}
          aria-controls="navigation-sidebar"
          aria-haspopup="dialog"
          title="导航菜单"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3 8h18M3 16h11" />
          </svg>
        </button>
      )}
      <div className="brand">
        <img
          className="brand-logo"
          src={`${import.meta.env.BASE_URL}logo.png`}
          width="28"
          height="28"
          alt=""
        />
        <span className="brand-word">合理吗</span>
      </div>
      <div className="top-actions">
        <span className="visually-hidden" role="status">
          {offlineStatus}
        </span>
        {onOpenHistory && (
          <button
            className="history-action icon-button"
            disabled={disabled}
            onClick={onOpenHistory}
            aria-label="查看历史记录 →"
            title="历史记录"
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 11a9 9 0 1 0 2.6-5.4L3 8M3 3v5h5M12 7v5l3 2" />
            </svg>
          </button>
        )}
        {onInstall && (
          <button className="install-action" onClick={onInstall}>
            安装应用
          </button>
        )}
        {action && (
          <button className="home-action" disabled={disabled} onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </header>
  );
}
