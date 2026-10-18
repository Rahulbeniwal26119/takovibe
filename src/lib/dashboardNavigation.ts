export const DASHBOARD_TABS = ['my-posts', 'series', 'profile', 'inbox', 'users', 'campaign'] as const;
export type DashboardTab = typeof DASHBOARD_TABS[number];

interface DashboardUser {
    is_author?: boolean;
    is_superuser?: boolean;
    client_type?: string;
    can_manage_authors?: boolean;
    manage_contact_us?: boolean;
}

export function dashboardTabFromHash(hash: string): DashboardTab | null {
    try {
        const value = decodeURIComponent(hash.replace(/^#/, '')).toLowerCase();
        return DASHBOARD_TABS.includes(value as DashboardTab) ? value as DashboardTab : null;
    } catch { return null; }
}

export function canAccessDashboardTab(tab: DashboardTab, user: DashboardUser) {
    const admin = user.is_superuser || user.client_type === 'Admin';
    if (tab === 'users') return Boolean(admin || user.can_manage_authors);
    if (tab === 'campaign') return Boolean(admin);
    if (tab === 'inbox') return Boolean(admin || user.manage_contact_us);
    if (tab === 'my-posts' || tab === 'series') return Boolean(admin || user.is_author || ['Author', 'Editor'].includes(user.client_type || ''));
    return true;
}

export function resolveDashboardTab(hash: string, user: DashboardUser): DashboardTab {
    const requested = dashboardTabFromHash(hash);
    if (requested && canAccessDashboardTab(requested, user)) return requested;
    return canAccessDashboardTab('my-posts', user) ? 'my-posts' : 'profile';
}
