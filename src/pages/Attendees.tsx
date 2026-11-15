import { useMemo, useState } from 'react';
import { MdCheckCircle, MdSearch } from 'react-icons/md';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import { useActiveEvent, useAttendees } from '../hooks/useCheckInData';
import { fullName } from '../types';

export default function Attendees() {
    const event = useActiveEvent();
    const attendees = useAttendees(event.data?.eventId);
    const [query, setQuery] = useState('');

    const list = attendees.data;
    const checkedInCount = list?.filter((attendee) => attendee.checkedIn).length ?? 0;

    const visible = useMemo(() => {
        if (!list) return [];
        const needle = query.trim().toLowerCase();
        const sorted = [...list].sort((a, b) => fullName(a).localeCompare(fullName(b)));
        if (!needle) return sorted;
        return sorted.filter(
            (attendee) =>
                fullName(attendee).toLowerCase().includes(needle) ||
                attendee.email.toLowerCase().includes(needle)
        );
    }, [list, query]);

    const noEvent = !event.loading && !event.error && !event.data;
    const loading = event.loading || (Boolean(event.data) && attendees.loading);
    const error = event.error ?? attendees.error;

    return (
        <div className="flex flex-1 flex-col">
            <h1 className="text-gradient text-3xl font-bold">Attendees</h1>
            {event.data && <p className="text-muted">{event.data.name}</p>}

            <label className="relative mt-5 block">
                <span className="sr-only">Search attendees</span>
                <MdSearch
                    size={22}
                    className="absolute top-1/2 left-4 -translate-y-1/2 text-pmc-dark-purple"
                    aria-hidden
                />
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full rounded-xl border border-line bg-white py-3 pr-4 pl-12 text-pmc-black placeholder:text-pmc-dark-purple/70 focus:outline-2 focus:outline-accent"
                />
            </label>

            {list && (
                <p className="mt-4 self-start rounded-lg border border-success px-3 py-1.5 font-semibold text-success">
                    Checked in: {checkedInCount} / {list.length}
                </p>
            )}

            <div className="mt-4 flex-1">
                {loading && (
                    <div className="flex justify-center py-10">
                        <Spinner label="Loading attendees" />
                    </div>
                )}
                {error && <p className="text-pmc-red">Couldn't load attendees. {error}</p>}
                {noEvent && (
                    <p className="text-muted">
                        No active event. Turn one on in Supabase to see its attendees.
                    </p>
                )}
                {list && visible.length === 0 && (
                    <p className="py-6 text-center text-muted">
                        {query ? `No one matches "${query}".` : 'No accepted attendees yet.'}
                    </p>
                )}
                {visible.length > 0 && (
                    <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                        {visible.map((attendee) => (
                            <li key={attendee.attendeeId}>
                                <Link
                                    to={`/attendees/${attendee.attendeeId}`}
                                    className="flex items-center gap-3 px-4 py-3 active:bg-line/50"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">
                                            {fullName(attendee)}
                                        </p>
                                        <p className="truncate text-sm text-muted/70">
                                            {attendee.email}
                                        </p>
                                    </div>
                                    {attendee.checkedIn && (
                                        <MdCheckCircle
                                            size={28}
                                            className="shrink-0 text-success"
                                            role="img"
                                            aria-label="Checked in"
                                        />
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
