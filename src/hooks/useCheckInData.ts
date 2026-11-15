import { useEffect, useState } from 'react';
import { checkInService } from '../service';
import type { ActiveEvent, Attendee } from '../types';

type Loadable<T> = { data: T | null; loading: boolean; error: string | null };

const LOADING = { data: null, loading: true, error: null };

function useLoad<T>(load: (() => Promise<T | null>) | null, key: string): Loadable<T> {
    const [state, setState] = useState<Loadable<T>>(LOADING);

    useEffect(() => {
        if (!load) return;
        let cancelled = false;
        setState(LOADING);
        load()
            .then((data) => !cancelled && setState({ data, loading: false, error: null }))
            .catch((error: unknown) => {
                if (cancelled) return;
                const message = error instanceof Error ? error.message : 'Something went wrong';
                setState({ data: null, loading: false, error: message });
            });
        return () => {
            cancelled = true;
        };
        // `key` identifies the request; `load` is a fresh closure every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return state;
}

export function useActiveEvent(): Loadable<ActiveEvent> {
    return useLoad(() => checkInService.getActiveEvent(), 'active-event');
}

/** Pass undefined while the event is still loading; the hook waits. */
export function useAttendees(eventId: string | undefined): Loadable<Attendee[]> {
    return useLoad(
        eventId ? () => checkInService.getAttendees(eventId) : null,
        `attendees:${eventId ?? ''}`
    );
}
