import { useEffect, useRef } from 'react';

/** How long after opening the confirm button ignores presses. */
const ARM_DELAY_MS = 500;

type Props = {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    busy = false,
    onConfirm,
    onCancel,
}: Props) {
    // The dialog opens under the pointer, so the second half of a double-click (or a
    // second tap) on the button that opened it would land on Confirm. Ignore presses
    // until the dialog has been on screen long enough to be read as a new decision.
    const openedAt = useRef(0);
    useEffect(() => {
        if (open) openedAt.current = Date.now();
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6"
            onClick={onCancel}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                className="w-full max-w-sm rounded-2xl border border-line bg-card p-6"
                onClick={(event) => event.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="text-xl font-bold">
                    {title}
                </h2>
                <p className="mt-2 text-muted">{message}</p>
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        autoFocus
                        className="flex-1 rounded-xl border border-pmc-dark-purple py-3 font-semibold disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => Date.now() - openedAt.current >= ARM_DELAY_MS && onConfirm()}
                        disabled={busy}
                        className="bg-pmc-gradient flex-1 rounded-xl py-3 font-semibold disabled:opacity-50"
                    >
                        {busy ? 'Checking in…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
