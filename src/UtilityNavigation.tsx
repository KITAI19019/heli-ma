import { utilityLabels, utilityPages, type Page, type UtilityPage } from './navigation';

function MenuIcon({ page }: { page: UtilityPage }) {
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
      {page === 'language' && (
        <>
          <path d="M2 5h12M7 2v3M11 5c-1 5-4 8-8 10M5 8c1 3 4 5 7 6M13 21l4-10 4 10M14.5 17h5" />
        </>
      )}
      {page === 'theme' && (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
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
      {utilityPages.map((item) => (
        <button
          key={item}
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
