import React, { useEffect, useState } from 'react';
import type { EvidenceCapture } from '../../lib/noteEvidenceApi';
import SendToNoteDialog from './SendToNoteDialog';

export const OPEN_SEND_TO_NOTE_EVENT = 'open-send-to-note';

export default function SendToNoteHydrator() {
    const [capture, setCapture] = useState<EvidenceCapture | null>(null);

    useEffect(() => {
        const open = (event: Event) => {
            const detail = (event as CustomEvent<EvidenceCapture>).detail;
            if (detail?.quote && detail?.source_id) setCapture(detail);
        };
        window.addEventListener(OPEN_SEND_TO_NOTE_EVENT, open);
        return () => window.removeEventListener(OPEN_SEND_TO_NOTE_EVENT, open);
    }, []);

    return <SendToNoteDialog open={Boolean(capture)} capture={capture} onClose={() => setCapture(null)} />;
}
