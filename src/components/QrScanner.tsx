import { useEffect, useRef, useState } from 'react';
import QrScannerLib from 'qr-scanner';

type Props = {
    /** Called with the decoded text every time a QR code is in view. */
    onScan: (value: string) => void;
};

/** Live camera view that decodes QR codes. Uses the back camera on phones. */
export default function QrScanner({ onScan }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onScanRef = useRef(onScan);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        let cancelled = false;

        const scanner = new QrScannerLib(video, (result) => onScanRef.current(result.data), {
            preferredCamera: 'environment',
            maxScansPerSecond: 8,
            returnDetailedScanResult: true,
        });

        scanner.start().catch(() => {
            if (cancelled) return;
            setError(
                window.isSecureContext
                    ? 'Camera access was blocked. Allow camera access for this site in your browser settings, then reload.'
                    : 'The camera only works over HTTPS. Open the https:// address of this app.'
            );
        });

        return () => {
            cancelled = true;
            scanner.destroy();
        };
    }, []);

    return (
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            {error ? (
                <p className="absolute inset-0 flex items-center justify-center bg-card p-6 text-center text-muted">
                    {error}
                </p>
            ) : (
                <Frame />
            )}
        </div>
    );
}

/** Four corner brackets marking where to hold the QR code. */
function Frame() {
    const corner = 'absolute h-14 w-14 border-pmc-light-blue';
    return (
        <div className="pointer-events-none absolute inset-[14%]" aria-hidden>
            <span
                className={`${corner} top-0 left-0 rounded-tl-2xl border-t-[6px] border-l-[6px]`}
            />
            <span
                className={`${corner} top-0 right-0 rounded-tr-2xl border-t-[6px] border-r-[6px]`}
            />
            <span
                className={`${corner} bottom-0 left-0 rounded-bl-2xl border-b-[6px] border-l-[6px]`}
            />
            <span
                className={`${corner} right-0 bottom-0 rounded-br-2xl border-r-[6px] border-b-[6px]`}
            />
        </div>
    );
}
