import React, { useEffect, useState } from 'react';
import { EmbedPlayground } from './editor/EmbedPlayground';

const EmbedPlaygroundHydrator: React.FC = () => {
    const [config, setConfig] = useState<{
        code: string;
        lang: string;
        mode: 'backend' | 'web';
        theme: 'light' | 'dark' | 'system';
        rounded: boolean;
        showVim: boolean;
        showIdeTips: boolean;
        siteUrl: string;
    } | null>(null);

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const encodedCode = params.get('code');
            const lang = params.get('lang') || 'python';
            const requestedMode = params.get('mode');
            const siteUrl = document.getElementById('embed-root')?.dataset.siteUrl || 'https://takovibe.com';

            const theme = (params.get('theme') as 'light' | 'dark' | 'system') || 'system';
            const rounded = params.get('rounded') !== 'false';
            const showVim = params.get('vim') === 'true';
            const showIdeTips = params.get('ide') !== 'false';

            if (encodedCode !== null) {
                // Decode base64, preserving empty string if encodedCode is empty
                const code = encodedCode ? decodeURIComponent(escape(atob(decodeURIComponent(encodedCode)))) : '';
                const mode = (requestedMode === 'web' || lang === 'html') ? 'web' : 'backend';
                
                setConfig({ code, lang, mode, theme, rounded, showVim, showIdeTips, siteUrl });
            } else {
                setConfig({ code: 'print("No code provided")', lang: 'python', mode: 'backend', theme, rounded, showVim, showIdeTips, siteUrl });
            }
        } catch (e) {
            console.error("Failed to parse embed code:", e);
            setConfig({ 
                code: 'Error loading snippet', 
                lang: 'python', 
                mode: 'backend',
                theme: 'system',
                rounded: true,
                showVim: false,
                showIdeTips: true,
                siteUrl: 'https://takovibe.com'
            });
        }
    }, []);

    if (!config) return <div className="w-full h-screen bg-gray-900 animate-pulse" />;

    return (
        <div className="w-screen h-screen">
            <EmbedPlayground 
                initialLanguage={config.lang}
                initialCode={config.code}
                initialHtml={config.lang === 'html' ? config.code : undefined}
                isEditable={true}
                title="TakoVibe Embed"
                theme={config.theme}
                rounded={config.rounded}
                showVim={config.showVim}
                showIdeTips={config.showIdeTips}
                siteUrl={config.siteUrl}
            />
        </div>
    );
};

export default EmbedPlaygroundHydrator;
