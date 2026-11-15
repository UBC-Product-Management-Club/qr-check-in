export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'pmc-checkin-theme';
const DEFAULT_THEME: Theme = 'dark';

/** The colours for each scheme live in src/index.css, keyed on `data-theme`. */
export function getStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
}

export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'light' ? '#ffffff' : '#1d233f');
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch {
        // Private browsing can block storage; the choice then lasts until reload.
    }
}
