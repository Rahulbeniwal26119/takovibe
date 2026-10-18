import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DASHBOARD_TABS, dashboardTabFromHash, resolveDashboardTab } from './dashboardNavigation.ts';

test('every dashboard tab has a stable direct fragment', () => {
    for (const tab of DASHBOARD_TABS) assert.equal(dashboardTabFromHash('#' + tab), tab);
    assert.equal(dashboardTabFromHash('#Users'), 'users');
    assert.equal(dashboardTabFromHash('#%75sers'), 'users');
});

test('missing, unknown and malformed fragments safely resolve to a permitted default', () => {
    for (const hash of ['', '#unknown', '#%E0%A4%A']) {
        assert.equal(resolveDashboardTab(hash, { client_type: 'Admin' }), 'my-posts');
        assert.equal(resolveDashboardTab(hash, { client_type: 'Reader' }), 'profile');
    }
});

test('fragments cannot grant access to admin tabs', () => {
    for (const role of ['Author', 'Editor', 'Reader']) {
        for (const tab of ['users', 'campaign', 'emails']) assert.notEqual(resolveDashboardTab('#' + tab, { client_type: role }), tab);
    }
    assert.equal(resolveDashboardTab('#users', { client_type: 'Admin' }), 'users');
    assert.equal(resolveDashboardTab('#campaign', { is_superuser: true }), 'campaign');
    assert.equal(resolveDashboardTab('#emails', { client_type: 'Admin' }), 'emails');
    assert.equal(resolveDashboardTab('#emails', { can_manage_authors: true }), 'profile');
});

test('granted capabilities preserve the existing inbox and user-directory access rules', () => {
    assert.equal(resolveDashboardTab('#inbox', { manage_contact_us: true }), 'inbox');
    assert.equal(resolveDashboardTab('#users', { can_manage_authors: true }), 'users');
    assert.equal(resolveDashboardTab('#profile', { client_type: 'Reader' }), 'profile');
});
