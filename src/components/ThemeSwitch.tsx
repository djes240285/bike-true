import { useEffect, useState } from 'react';
import { dict, type Locale } from '../i18n';
import { readTheme, writeTheme, type ThemeId } from '../lib/look';

function Sun() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3.2v2.1M12 18.7v2.1M3.2 12h2.1M18.7 12h2.1M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15.4 3.6a7.6 7.6 0 1 0 5 12.2A8.2 8.2 0 0 1 15.4 3.6z" />
    </svg>
  );
}

export default function ThemeSwitch({ locale }: { locale: Locale }) {
  const t = dict[locale].account;
  const [theme, setTheme] = useState<ThemeId>(() => readTheme());

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function pick(next: ThemeId) {
    setTheme(next);
    writeTheme(next);
  }

  return (
    <div className="theme-switch" role="group" aria-label={t.theme}>
      <button type="button" aria-pressed={theme === 'light'} aria-label={t.themeLight} onClick={() => pick('light')}>
        <Sun />
      </button>
      <button type="button" aria-pressed={theme === 'dark'} aria-label={t.themeDark} onClick={() => pick('dark')}>
        <Moon />
      </button>
    </div>
  );
}
