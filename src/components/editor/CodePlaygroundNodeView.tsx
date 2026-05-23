import React, { Suspense } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react';

// Lazy load the heavy CodePlayground component
const CodePlayground = React.lazy(() => import('./CodePlayground').then(module => ({ default: module.CodePlayground })));

class CodePlaygroundErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Failed to load Code Playground:', error);
    }

    render() {
        if (!this.state.hasError) return this.props.children;

        return (
            <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/20">
                <div className="flex max-w-sm flex-col items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
                            Code playground failed to load
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-red-700/80 dark:text-red-200/70">
                            The dev server dependency cache is stale. Refresh this page after restarting the dev server with a forced optimize pass.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reload
                    </button>
                </div>
            </div>
        );
    }
}

const CodePlaygroundNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, extension, editor, deleteNode }) => {
    const isEditable = editor.isEditable;

    const handleSave = (html: string, css: string, js: string) => {
        if (!isEditable) return;
        updateAttributes({
            html,
            css,
            js
        });
    };

    return (
        <NodeViewWrapper className="not-prose my-4 overflow-hidden rounded-lg sm:my-8">
            <CodePlaygroundErrorBoundary>
                <Suspense fallback={
                    <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-neutral-200 bg-stone-50 p-8 dark:border-neutral-800 dark:bg-neutral-950">
                        <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                            <span className="text-sm font-medium text-neutral-500">Loading Code Playground...</span>
                        </div>
                    </div>
                }>
                    <CodePlayground
                        initialHtml={node.attrs.html}
                        initialCss={node.attrs.css}
                        initialJs={node.attrs.js}
                        onSave={handleSave}
                        isEditable={isEditable}
                        title="Code Playground"
                        onDelete={deleteNode}
                    />
                </Suspense>
            </CodePlaygroundErrorBoundary>
        </NodeViewWrapper>
    );
};

export default CodePlaygroundNodeView;
