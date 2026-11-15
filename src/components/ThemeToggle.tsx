import { useState } from 'react';
import { MdDarkMode, MdLightMode } from 'react-icons/md';
import { applyTheme, getStoredTheme, type Theme } from '../config/theme';

/** Switches between the dark and light colour schemes and remembers the choice. */
export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(getStoredTheme);
    const next: Theme = theme === 'dark' ? 'light' : 'dark';

    const toggle = () => {
        applyTheme(next);
        setTheme(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={`Switch to ${next} colour scheme`}
            className="rounded-lg p-2 text-accent hover:bg-card"
        >
            {theme === 'dark' ? (
                <MdLightMode size={26} aria-hidden />
            ) : (
                <MdDarkMode size={26} aria-hidden />
            )}
        </button>
    );
}
