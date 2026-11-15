import type { IconType } from 'react-icons';
import { MdPersonSearch, MdQrCodeScanner } from 'react-icons/md';
import { NavLink, useLocation } from 'react-router-dom';

type Tab = { to: string; label: string; icon: IconType; isActive: (path: string) => boolean };

const TABS: Tab[] = [
    {
        to: '/',
        label: 'Check-in',
        icon: MdQrCodeScanner,
        isActive: (path) => path === '/' || path.startsWith('/scan'),
    },
    {
        to: '/attendees',
        label: 'Attendees',
        icon: MdPersonSearch,
        isActive: (path) => path.startsWith('/attendees'),
    },
];

export default function BottomNav() {
    const { pathname } = useLocation();

    return (
        <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
        >
            <div className="mx-auto flex max-w-md justify-around px-5 py-3">
                {TABS.map(({ to, label, icon: Icon, isActive }) => {
                    const active = isActive(pathname);
                    return (
                        <NavLink
                            key={to}
                            to={to}
                            aria-label={label}
                            aria-current={active ? 'page' : undefined}
                            className={`flex h-12 w-16 items-center justify-center rounded-xl transition ${
                                active ? 'bg-pmc-gradient text-white' : 'text-muted hover:bg-card'
                            }`}
                        >
                            <Icon size={28} aria-hidden />
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
