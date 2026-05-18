import React, { useEffect, useState } from 'react';

const StandalonePlaygroundHydrator: React.FC = () => {
    const [config, setConfig] = useState<{
        code: string;
        lang: string;
        html: string;
    } | null>(null);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const encodedCode = params.get('code');
            const lang = params.get('lang') || 'python';

            let code = '';
            if (encodedCode) {
                try {
                    code = decodeURIComponent(escape(atob(decodeURIComponent(encodedCode))));
                } catch {
                    code = '';
                }
            }

            setConfig({
                code,
                lang,
                html: lang === 'html' ? code : '',
            });
        } catch (e) {
            console.error('Failed to parse playground params:', e);
            setConfig({ code: '', lang: 'python', html: '' });
        }
    }, []);

    if (!config) {
        return (
            <div className="w-full h-full min-h-[560px] bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-neutral-400 text-sm">Loading playground...</span>
                </div>
            </div>
        );
    }

    // Dynamically require CodePlayground to avoid SSR issues
    const LazyPlayground = React.lazy(() =>
        import('./editor/CodePlayground').then(m => ({ default: m.CodePlayground }))
    );

    return (
        <React.Suspense fallback={
            <div className="w-full h-full min-h-[560px] bg-neutral-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LazyPlayground
                initialCode={config.code}
                initialLanguage={config.lang}
                initialHtml={config.html}
                isEditable={true}
            />
        </React.Suspense>
    );
};

export default StandalonePlaygroundHydrator;
