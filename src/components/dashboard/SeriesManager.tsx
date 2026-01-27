import React, { useState } from 'react';
import { SeriesList } from './SeriesList';
import { SeriesEditor } from './SeriesEditor';

export const SeriesManager: React.FC = () => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editSeriesSlug, setEditSeriesSlug] = useState<string | undefined>(undefined);

    const handleCreate = () => {
        setEditSeriesSlug(undefined);
        setView('editor');
    };

    const handleEdit = (series: any) => {
        setEditSeriesSlug(series.slug);
        setView('editor');
    };

    const handleBack = () => {
        setView('list');
    };

    const handleSaveSuccess = () => {
        setView('list');
    };

    return (
        <div className="w-full">
            {view === 'list' ? (
                <SeriesList onCreate={handleCreate} onEdit={handleEdit} />
            ) : (
                <SeriesEditor
                    seriesSlug={editSeriesSlug}
                    onBack={handleBack}
                    onSaveSuccess={handleSaveSuccess}
                />
            )}
        </div>
    );
};
