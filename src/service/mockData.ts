import type { ActiveEvent, Attendee, AttendeeStatus } from '../types';

export const MOCK_EVENT: ActiveEvent = {
    eventId: 'mock-event-project-jackpot',
    name: 'Project Jackpot',
    date: '2026-11-21',
    location: 'UBC',
};

/** A user id that exists in no Attendee row, for testing the "not registered" scan result. */
export const MOCK_UNREGISTERED_USER_ID = 'google-oauth2|mock-unregistered';

const person = (
    n: number,
    firstName: string,
    lastName: string,
    extra: Partial<Attendee> = {},
    status: AttendeeStatus = 'REGISTERED'
): Attendee => ({
    attendeeId: `mock-attendee-${n}`,
    userId: `google-oauth2|mock-${n}`,
    eventId: MOCK_EVENT.eventId,
    firstName,
    lastName,
    email: `${firstName}.${lastName}@example.com`.toLowerCase().replace(/\s+/g, ''),
    pronouns: null,
    university: 'University of British Columbia',
    faculty: 'Science',
    major: 'Computer Science',
    year: '3',
    status,
    checkedIn: false,
    checkedInAt: null,
    ...extra,
});

export const MOCK_ATTENDEES: Attendee[] = [
    person(1, 'Theo', 'Lindqvist', {
        pronouns: 'he/him',
        checkedIn: true,
        checkedInAt: '2026-11-21T17:02:00Z',
    }),
    person(2, 'Imani', 'Baptiste', { pronouns: 'she/her', faculty: 'Commerce', major: 'BUCS' }),
    person(3, 'Kenji', 'Morales', {
        pronouns: 'he/him',
        checkedIn: true,
        checkedInAt: '2026-11-21T17:05:00Z',
    }),
    person(4, 'Anika', 'Petrov', { pronouns: 'she/her', faculty: 'Applied Science', year: '2' }),
    person(5, 'Callum', 'Adeyemi', { pronouns: 'he/him', faculty: 'Arts', major: 'Economics' }),
    person(6, 'Leila', 'Fontaine', { pronouns: 'she/her', year: '4' }),
    person(7, 'Rowan', 'Castillo', {
        pronouns: 'they/them',
        checkedIn: true,
        checkedInAt: '2026-11-21T17:11:00Z',
    }),
    person(8, 'Mei', 'Kowalski', { pronouns: 'she/her', faculty: 'Commerce', major: 'Marketing' }),
    person(9, 'Tariq', 'Sorensen', { faculty: 'Applied Science', major: 'Computer Engineering' }),
    person(10, 'Freya', 'Nakamura', { pronouns: 'she/her', year: '1' }),
    person(11, 'Jonas', 'Mbeki', { pronouns: 'he/him', university: 'Simon Fraser University' }),
    person(12, 'Nadia', 'Hartley', {
        pronouns: 'she/her',
        faculty: 'Arts',
        major: 'Cognitive Systems',
    }),
    // No seat yet (applied; accepted but not paid): hidden from the list, and scanning them fails.
    person(13, 'Elliot', 'Varga', {}, 'APPLIED'),
    person(14, 'Priya', 'Okafor', {}, 'ACCEPTED'),
];
