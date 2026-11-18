import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { isPmcEmail, PMC_EMAIL_DOMAIN } from '../config/access';
import { supabase } from '../config/supabase';

type Organizer = { email: string; name: string | null };

type AuthState =
    | { status: 'loading' }
    | { status: 'signedOut'; error: string | null }
    | { status: 'signedIn'; organizer: Organizer };

type AuthContextValue = {
    state: AuthState;
    /** False when Supabase env values are missing. */
    isConfigured: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// With no Supabase env values, local dev skips sign-in so the UI can be worked on.
// A production build without them stays signed out.
const DEV_BYPASS = !supabase && import.meta.env.DEV;
const DEV_ORGANIZER: Organizer = { email: `dev@${PMC_EMAIL_DOMAIN}`, name: 'Dev Organizer' };

const NOT_ALLOWED_MESSAGE = `That account can't use this app. Sign in with your @${PMC_EMAIL_DOMAIN} email.`;

/** If Google or Supabase rejected the sign-in, the reason comes back in the URL. */
function readRedirectError(): string | null {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return query.get('error_description') ?? hash.get('error_description');
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(() => {
        if (DEV_BYPASS) return { status: 'signedIn', organizer: DEV_ORGANIZER };
        if (!supabase) return { status: 'signedOut', error: null };
        const redirectError = readRedirectError();
        if (redirectError)
            return { status: 'signedOut', error: `Sign-in failed: ${redirectError}` };
        return { status: 'loading' };
    });

    useEffect(() => {
        if (!supabase) return;
        const client = supabase;
        let cancelled = false;

        // Fires once with the stored session on load, then on every sign-in and sign-out.
        const { data } = client.auth.onAuthStateChange((_event, session) => {
            const user = session?.user;
            if (!user?.email) {
                // Keep a "not allowed" message on screen through the sign-out that follows it.
                setState((prev) =>
                    prev.status === 'signedOut' ? prev : { status: 'signedOut', error: null }
                );
                return;
            }
            const email = user.email;
            const name = (user.user_metadata?.full_name as string | undefined) ?? null;

            if (isPmcEmail(email)) {
                setState({ status: 'signedIn', organizer: { email, name } });
                return;
            }
            setState({ status: 'signedOut', error: NOT_ALLOWED_MESSAGE });
            // Supabase calls must not run inside this callback, so defer the sign-out.
            setTimeout(() => {
                if (!cancelled) void client.auth.signOut();
            }, 0);
        });

        return () => {
            cancelled = true;
            data.subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = useCallback(async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // BASE_URL keeps the /qr-check-in/ path on GitHub Pages
                redirectTo: window.location.origin + import.meta.env.BASE_URL,
                // Always show the account picker so a wrong account is easy to switch.
                queryParams: { prompt: 'select_account' },
            },
        });
        if (error) setState({ status: 'signedOut', error: error.message });
    }, []);

    const signOut = useCallback(async () => {
        if (supabase) await supabase.auth.signOut();
        setState({ status: 'signedOut', error: null });
    }, []);

    const value = useMemo(
        () => ({ state, isConfigured: Boolean(supabase), signInWithGoogle, signOut }),
        [state, signInWithGoogle, signOut]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used inside AuthProvider');
    return context;
}
