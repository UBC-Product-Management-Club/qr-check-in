import { QRCodeSVG } from 'qrcode.react';
import { MOCK_ATTENDEES, MOCK_UNREGISTERED_USER_ID } from '../service/mockData';
import { fullName, SEAT_STATUS } from '../types';

/**
 * Dev-only page (/dev/qr): QR codes for the mock attendees, to test the scanner.
 * Open it on a laptop and scan the codes with the app on your phone.
 */
export default function DevQrCodes() {
    const codes = [
        ...MOCK_ATTENDEES.map((attendee) => ({
            value: attendee.userId,
            label: fullName(attendee),
            expect:
                attendee.status !== SEAT_STATUS
                    ? 'Fails: no seat'
                    : attendee.checkedIn
                      ? 'Fails: already checked in'
                      : 'Succeeds, then "already checked in"',
        })),
        {
            value: MOCK_UNREGISTERED_USER_ID,
            label: 'Unregistered member',
            expect: 'Fails: not registered',
        },
        { value: 'https://example.com', label: 'Random QR code', expect: 'Fails: not recognized' },
    ];

    return (
        <div className="mx-auto max-w-5xl p-6">
            <h1 className="text-gradient text-3xl font-bold">Test QR codes</h1>
            <p className="mt-1 text-muted">
                Mock data only. Each code holds the attendee's user id, like the real member QR
                will.
            </p>
            <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
                {codes.map((code) => (
                    <li
                        key={code.value}
                        className="rounded-2xl border border-line bg-white p-5 text-pmc-black"
                    >
                        <QRCodeSVG value={code.value} size={180} className="mx-auto" />
                        <p className="mt-3 font-semibold">{code.label}</p>
                        <p className="text-sm text-pmc-dark-purple">{code.expect}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
