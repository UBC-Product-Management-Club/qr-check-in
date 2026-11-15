import { useCallback, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QrScanner from '../components/QrScanner';
import Spinner from '../components/Spinner';
import { checkInService } from '../service';
import type { CheckInResult } from '../types';

export default function Scan() {
    const navigate = useNavigate();
    // The camera reports the same code many times a second; only act on the first.
    const handled = useRef(false);
    const [busy, setBusy] = useState(false);

    const handleScan = useCallback(
        async (value: string) => {
            if (handled.current) return;
            handled.current = true;
            setBusy(true);

            let result: CheckInResult;
            try {
                result = await checkInService.checkInByQr(value);
            } catch {
                result = { ok: false, reason: 'ERROR' };
            }
            navigate('/scan/result', { state: { result }, replace: true });
        },
        [navigate]
    );

    return (
        <div className="flex flex-1 flex-col items-center">
            <h1 className="text-gradient mt-2 text-3xl font-bold">Scan to check in</h1>

            <div className="relative mt-8 w-full">
                <QrScanner onScan={handleScan} />
                {busy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-surface/80">
                        <Spinner label="Checking in" />
                    </div>
                )}
            </div>

            <p className="mt-6 text-center text-muted">
                Line up the attendee's QR code inside the frame.
            </p>
            <Link to="/attendees" className="mt-4 font-semibold text-accent underline">
                Can't scan? Check in from the list
            </Link>
        </div>
    );
}
