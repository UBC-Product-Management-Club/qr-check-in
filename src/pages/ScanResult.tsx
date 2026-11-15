import { MdCancel, MdCheckCircle } from 'react-icons/md';
import { Link, Navigate, useLocation } from 'react-router-dom';
import type { CheckInFailureReason, CheckInResult } from '../types';
import { fullName } from '../types';

const FAILURE_COPY: Record<CheckInFailureReason, { title: string; detail: string }> = {
    ALREADY_CHECKED_IN: {
        title: 'Already checked in',
        detail: 'This code has already been used for this event.',
    },
    NOT_REGISTERED: {
        title: 'Not registered',
        detail: "This person isn't registered for this event.",
    },
    NOT_ACCEPTED: {
        title: 'No seat',
        detail: "This person applied but isn't registered: not accepted, or accepted and not paid yet.",
    },
    INVALID_CODE: {
        title: 'Code not recognized',
        detail: "This isn't a PMC member QR code.",
    },
    NO_ACTIVE_EVENT: {
        title: 'No active event',
        detail: 'Turn on an event in Supabase, then scan again.',
    },
    ERROR: {
        title: 'Something went wrong',
        detail: "The check-in didn't go through. Check your connection and scan again.",
    },
};

export default function ScanResult() {
    const result = (useLocation().state as { result?: CheckInResult } | null)?.result;

    // Reached by reload or a direct link: there is no result to show.
    if (!result) return <Navigate to="/scan" replace />;

    const copy = result.ok ? null : FAILURE_COPY[result.reason];

    return (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
            {result.ok ? (
                <MdCheckCircle size={180} className="text-success" aria-hidden />
            ) : (
                <MdCancel size={180} className="text-pmc-red" aria-hidden />
            )}

            <h1 className="mt-4 text-3xl font-bold" role="status">
                {result.ok ? 'Checked in' : copy!.title}
            </h1>

            {result.attendee && (
                <p className="mt-3 text-2xl font-semibold">{fullName(result.attendee)}</p>
            )}
            {result.attendee && <p className="text-muted">{result.attendee.email}</p>}
            {copy && <p className="mt-3 max-w-xs text-muted">{copy.detail}</p>}

            <div className="mt-10 flex w-full flex-col gap-3">
                <Link
                    to="/scan"
                    replace
                    className="bg-pmc-gradient rounded-xl py-4 text-lg font-semibold"
                >
                    Scan next
                </Link>
                <Link
                    to="/"
                    replace
                    className="rounded-xl border border-pmc-dark-purple py-4 text-lg font-semibold"
                >
                    Back to home
                </Link>
            </div>
        </div>
    );
}
