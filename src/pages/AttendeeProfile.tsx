import { useEffect, useState } from 'react';
import { MdCheckCircle, MdChevronLeft } from 'react-icons/md';
import { Link, useParams } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import Spinner from '../components/Spinner';
import { checkInService } from '../service';
import type { Attendee, CheckInFailureReason } from '../types';
import { fullName } from '../types';

const FAILURE_MESSAGE: Record<CheckInFailureReason, string> = {
    ALREADY_CHECKED_IN: 'Someone already checked this person in.',
    NOT_REGISTERED: "This person isn't registered for this event.",
    NOT_ACCEPTED: 'This person has not been accepted for this event.',
    INVALID_CODE: "This person couldn't be found.",
    NO_ACTIVE_EVENT: 'No event is active right now.',
    ERROR: "The check-in didn't go through. Check your connection and try again.",
};

export default function AttendeeProfile() {
    const { attendeeId = '' } = useParams();
    const [attendee, setAttendee] = useState<Attendee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [checkingIn, setCheckingIn] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        checkInService
            .getAttendee(attendeeId)
            .then((data) => !cancelled && setAttendee(data))
            .catch(() => !cancelled && setError("Couldn't load this profile."))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [attendeeId]);

    const confirmCheckIn = async () => {
        setCheckingIn(true);
        setError(null);
        try {
            const result = await checkInService.checkInManually(attendeeId);
            if (result.attendee) setAttendee(result.attendee);
            if (!result.ok) setError(FAILURE_MESSAGE[result.reason]);
        } catch {
            setError(FAILURE_MESSAGE.ERROR);
        } finally {
            setCheckingIn(false);
            setConfirmOpen(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col">
            <Link
                to="/attendees"
                aria-label="Back to attendees"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-muted text-muted"
            >
                <MdChevronLeft size={30} aria-hidden />
            </Link>

            {loading && (
                <div className="flex justify-center py-10">
                    <Spinner label="Loading profile" />
                </div>
            )}

            {!loading && !attendee && (
                <p className="mt-6 text-muted">{error ?? "This attendee couldn't be found."}</p>
            )}

            {attendee && (
                <>
                    <h1 className="text-gradient mt-5 text-3xl font-bold break-words">
                        {fullName(attendee)}
                    </h1>
                    <p className="break-all text-muted">{attendee.email}</p>

                    {/* Add or remove rows here as the backend exposes more profile fields. */}
                    <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
                        <Field label="Pronouns" value={attendee.pronouns} />
                        <Field label="University" value={attendee.university} />
                        <Field label="Faculty" value={attendee.faculty} />
                        <Field label="Major" value={attendee.major} />
                        <Field label="Year" value={attendee.year} />
                        <Field label="Application status" value={attendee.status} />
                    </dl>

                    {error && (
                        <p role="alert" className="mt-4 text-pmc-red">
                            {error}
                        </p>
                    )}

                    <div className="mt-8">
                        {attendee.checkedIn ? (
                            <p className="flex items-center justify-center gap-2 rounded-xl border border-success py-4 text-lg font-semibold text-success">
                                <MdCheckCircle size={24} aria-hidden />
                                Checked in
                                {attendee.checkedInAt && ` at ${formatTime(attendee.checkedInAt)}`}
                            </p>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmOpen(true)}
                                className="bg-pmc-gradient w-full rounded-xl py-4 text-lg font-semibold"
                            >
                                Check-in
                            </button>
                        )}
                    </div>

                    <ConfirmDialog
                        open={confirmOpen}
                        title={`Check in ${attendee.firstName}?`}
                        message={`This marks ${fullName(attendee)} as checked in for this event.`}
                        confirmLabel="Check in"
                        busy={checkingIn}
                        onConfirm={confirmCheckIn}
                        onCancel={() => !checkingIn && setConfirmOpen(false)}
                    />
                </>
            )}
        </div>
    );
}

function Field({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted/70">{label}</dt>
            <dd className="text-right font-medium">{value ?? '—'}</dd>
        </div>
    );
}

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
