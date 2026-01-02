
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const ExcalidrawDrawer = React.lazy(() => import('./ExcalidrawDrawer'));

export default function ExcalidrawHydrator({ articleSlug }: { articleSlug: string }) {
    if (typeof window === 'undefined') return null;

    return (
        <Suspense fallback={
            <div className="fixed bottom-4 left-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg animate-pulse hidden">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        }>
            <ExcalidrawDrawer articleSlug={articleSlug} />
        </Suspense>
    );
}
