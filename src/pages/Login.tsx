import { Navigate } from 'react-router-dom';
import googleIcon from '../assets/google.svg';
import Logo from '../components/Logo';
import Spinner from '../components/Spinner';
import ThemeToggle from '../components/ThemeToggle';
import { PMC_EMAIL_DOMAIN } from '../config/access';
import { useAuth } from '../providers/AuthProvider';

export default function Login() {
    const { state, isConfigured, signInWithGoogle } = useAuth();

    if (state.status === 'signedIn') return <Navigate to="/" replace />;

    return (
        <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 text-center">
            <div className="absolute top-6 left-5">
                <ThemeToggle />
            </div>
            <Logo className="h-24 w-auto" />
            <h1 className="text-gradient mt-6 text-4xl font-bold">Check-in</h1>
            <p className="mt-2 text-muted">
                For PMC organizers. Sign in with your @{PMC_EMAIL_DOMAIN} email.
            </p>

            <div className="mt-10 flex min-h-14 w-full flex-col items-center">
                {state.status === 'loading' ? (
                    <Spinner label="Signing in" />
                ) : (
                    <button
                        type="button"
                        onClick={signInWithGoogle}
                        disabled={!isConfigured}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-white py-4 text-lg font-semibold text-pmc-black disabled:opacity-50"
                    >
                        <img src={googleIcon} alt="" className="h-6 w-6" />
                        Sign in with Google
                    </button>
                )}
            </div>

            {state.status === 'signedOut' && state.error && (
                <p role="alert" className="mt-4 text-pmc-red">
                    {state.error}
                </p>
            )}
            {!isConfigured && (
                <p className="mt-4 text-sm text-muted">
                    Sign-in isn't set up yet: add the Supabase values to .secret/.env.
                </p>
            )}
        </div>
    );
}
