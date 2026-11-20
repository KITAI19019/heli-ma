import type { CSSProperties } from 'react';
import { utilityLabels, type Page, type UtilityPage } from './navigation';

const sidebarPages = ['tutorial', 'theme', 'ai'] as const satisfies readonly UtilityPage[];

function MenuIcon({ page }: { page: (typeof sidebarPages)[number] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {page === 'tutorial' && (
        <>
          <path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15" />
          <path d="M6 8h3M6 12h3M15 8h3M15 12h3" />
        </>
      )}
      {page === 'theme' && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
        </>
      )}
      {page === 'ai' && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 10v3m6-3v3" strokeWidth="2.5" />
        </>
      )}
    </svg>
  );
}

interface UtilityNavigationProps {
  page: Page;
  disabled: boolean;
  onSelect: (page: UtilityPage) => void;
}

export function UtilityNavigation({ page, disabled, onSelect }: UtilityNavigationProps) {
  return (
    <nav className="sidebar-nav" aria-label="主导航">
      {sidebarPages.map((item, index) => (
        <button
          key={item}
          style={{ '--item-delay': `${24 + index * 26}ms` } as CSSProperties}
          disabled={disabled}
          onClick={() => onSelect(item)}
          aria-current={page === item ? 'page' : undefined}
        >
          <MenuIcon page={item} />
          <span>{utilityLabels[item]}</span>
        </button>
      ))}
    </nav>
  );
}
