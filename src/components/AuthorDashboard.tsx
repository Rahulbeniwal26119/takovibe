import React, { Suspense, lazy } from 'react';
import { Loader } from './ui/Loader';

// Lazy load the implementation
const AuthorDashboardImpl = lazy(() => import('./AuthorDashboardImpl'));

const AuthorDashboard: React.FC = () => {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[80vh]">
                <Loader text="Loading Dashboard..." size="lg" />
            </div>
        }>
            <AuthorDashboardImpl />
        </Suspense>
    );
};

export default AuthorDashboard;
