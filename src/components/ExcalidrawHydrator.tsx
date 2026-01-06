
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Facade for Excalidraw
const ExcalidrawDrawer = React.lazy(() => import('./ExcalidrawDrawer'));

export default function ExcalidrawHydrator({ articleSlug, initialOpen = false }: { articleSlug: string, initialOpen?: boolean }) {
    const [shouldLoad, setShouldLoad] = React.useState(initialOpen);

    React.useEffect(() => {
        // Check for global flag or event
        if ((typeof window !== 'undefined' && (window as any).__OPEN_NOTES_REQUESTED)) {
            setShouldLoad(true);
        }

        const handleToggle = () => {
            setShouldLoad(true);
        };

        window.addEventListener('toggle-excalidraw', handleToggle);
        window.addEventListener('open-excalidraw', handleToggle);
        return () => {
            window.removeEventListener('toggle-excalidraw', handleToggle);
            window.removeEventListener('open-excalidraw', handleToggle);
        };
    }, []);

    if (!shouldLoad) return null;

    return (
        <Suspense fallback={
            <div className="fixed bottom-4 left-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg animate-pulse flex items-center gap-2 border border-gray-200 dark:border-gray-700">
                <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                <span className="text-sm font-medium">Loading Sketch...</span>
            </div>
        }>
            <ExcalidrawDrawer articleSlug={articleSlug} />
        </Suspense>
    );
}
