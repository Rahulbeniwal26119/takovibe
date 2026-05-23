import React, { Suspense, lazy } from 'react';
import { Loader } from '../ui/Loader';

// Lazy load the implementation
const BlogEditorImpl = lazy(() => import('./BlogEditorImpl'));

interface BlogEditorProps {
    initialContent?: any;
    onChange?: (json: any) => void;
    onSave?: (data: { content: any; frontmatter: any }) => Promise<void>;
    apiEndpoint?: string;
    method?: 'POST' | 'PUT' | 'PATCH';
}

export const BlogEditor: React.FC<BlogEditorProps> = (props) => {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-screen bg-stone-50 dark:bg-neutral-950">
                <Loader text="Initializing Editor..." size="lg" />
            </div>
        }>
            <BlogEditorImpl {...props} />
        </Suspense>
    );
};
