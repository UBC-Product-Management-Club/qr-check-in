import { MdLogout, MdQrCodeScanner } from 'react-icons/md';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';
import { useActiveEvent } from '../hooks/useCheckInData';
import { useAuth } from '../providers/AuthProvider';

export default function Home() {
    const { data: event, loading, error } = useActiveEvent();
    const { signOut } = useAuth();

    return (
        <div className="flex flex-1 flex-col">
            <div className="flex justify-between">
                <ThemeToggle />
                <button
                    type="button"
                    onClick={signOut}
                    aria-label="Sign out"
                    className="rounded-lg p-2 text-accent hover:bg-card"
                >
                    <MdLogout size={26} aria-hidden />
                </button>
            </div>

            <div className="flex flex-col items-center text-center">
                <Logo className="h-20 w-auto" />
                <p className="mt-6 text-sm font-semibold tracking-widest text-muted uppercase">
                    Checking in for
                </p>
                <div className="mt-1 flex min-h-10 items-center">
                    {loading && <Spinner label="Loading event" />}
                    {error && <p className="text-pmc-red">Couldn't load the event. {error}</p>}
                    {!loading && !error && (
                        <h1 className="text-gradient text-3xl font-bold">
                            {event ? event.name : 'No active event'}
                        </h1>
                    )}
                </div>
                {!loading && !error && !event && (
                    <p className="mt-2 text-muted">
                        Turn on an event in Supabase to start checking people in.
                    </p>
                )}
            </div>

            <div className="flex flex-1 items-center justify-center py-10">
                {event && (
                    <Link
                        to="/scan"
                        className="bg-pmc-gradient flex aspect-square w-56 flex-col items-center justify-center gap-3 rounded-3xl shadow-lg shadow-black/30 transition active:scale-95"
                    >
                        <MdQrCodeScanner size={84} aria-hidden />
                        <span className="text-2xl font-bold">Check-in</span>
                    </Link>
                )}
            </div>
        </div>
    );
}
