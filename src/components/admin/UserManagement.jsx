import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:8000';

const UserManagement = ({ currentUser }) => {
    const getRank = (user) => {
        if (!user) return 0;
        if (user.rank) return user.rank;
        if (user.is_superuser) return 5;
        if (user.client_type === 'Admin') return 4;
        if (user.client_type === 'Editor') return 3;
        if (user.client_type === 'Author') return 2;
        return 1;
    };

    const currentRank = getRank(currentUser);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isAuthorFilter, setIsAuthorFilter] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const [editingUser, setEditingUser] = useState(null); // User being edited
    const [editForm, setEditForm] = useState({
        name: "",
        username: "",
        bio: "",
        website_url: "",
        github_url: "",
        linkedin_url: "",
        profile_image: "",
        client_type: "Reader"
    });

    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token"); // classic auth token pattern
            const params = new URLSearchParams({
                page,
                query: search,
            });
            if (isAuthorFilter) {
                params.append("is_author", "true");
            }

            const res = await fetch(`${API_URL}/api/users/?${params.toString()}`, {
                headers: {
                    Authorization: `Token ${token}`,
                },
            });

            if (!res.ok) throw new Error("Failed to fetch");

            const data = await res.json();

            if (data.results) {
                setUsers(data.results);
                setTotalUsers(data.count || 0);
                setTotalPages(Math.ceil((data.count || 0) / 10) || 1);
            } else {
                setUsers([]);
                setTotalUsers(0);
                setTotalPages(1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search, isAuthorFilter]);

    const handleToggleActive = async (user) => {
        // Optimistic update? Better wait for server.
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_URL}/api/users/${user.id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify({ is_active: !user.is_active }),
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
                showToast(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
            } else {
                showToast("Failed to update status", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("An error occurred", "error");
        }
    };

    // handleToggleAuthor removed as per requirement

    const handleEditClick = (user) => {
        setEditingUser(user);
        setEditForm({
            name: user.name || "",
            username: user.username || "",
            bio: user.bio || "",
            website_url: user.website_url || "",
            github_url: user.github_url || "",
            linkedin_url: user.linkedin_url || "",
            profile_image: user.profile_image || "",
            client_type: user.client_type || "Reader"
        });
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_URL}/api/users/${editingUser.id}/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Token ${token}`,
                },
                body: JSON.stringify(editForm),
            });
            if (res.ok) {
                setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...editForm } : u));
                setEditingUser(null);
                showToast("Profile updated successfully");
            } else {
                showToast("Failed to update profile", "error");
            }
        } catch (e) {
            console.error(e);
            showToast("An error occurred", "error");
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="Search users"
                    className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full md:w-64"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />

                <label className="flex items-center gap-2 cursor-pointer text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={isAuthorFilter}
                        onChange={(e) => { setIsAuthorFilter(e.target.checked); setPage(1); }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show Authors Only
                </label>
            </div>

            <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">{totalUsers}</span>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-4 text-center">No users found</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    {user.profile_image ? (
                                                        <img className="h-10 w-10 rounded-full" src={user.profile_image} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                            {user.name ? user.name.charAt(0) : "U"}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 dark:text-white">{user.username}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                            >
                                                {/* Assuming serializer field for active is 'is_active' or just check existence. Actually serializer doesn't show is_active. I need to add it! */}
                                                {/* I will add 'is_active', 'is_author' to serializer. */}
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_superuser ? 'bg-amber-100 text-amber-800' : user.client_type === 'Admin' ? 'bg-indigo-100 text-indigo-800' : user.client_type === 'Editor' ? 'bg-blue-100 text-blue-800' : user.client_type === 'Author' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {user.is_superuser ? 'SuperUser' : (user.client_type || 'Reader')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {(currentRank === 5 || currentRank > getRank(user)) && (
                                                <button onClick={() => handleEditClick(user)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                                                    Edit
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No users found</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                            {users.map((user) => (
                                <div key={user.id} className="p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            {user.profile_image ? (
                                                <img className="h-10 w-10 rounded-full" src={user.profile_image} alt="" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {user.name ? user.name.charAt(0) : "U"}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.email}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1 uppercase">Username</label>
                                            <span className="text-gray-900 dark:text-white">{user.username}</span>
                                        </div>
                                        <div className="flex justify-end items-end">
                                            {(currentRank === 5 || currentRank > getRank(user)) && (
                                                <button onClick={() => handleEditClick(user)} className="text-blue-600 text-xs font-semibold">
                                                    Edit Profile
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_superuser ? 'bg-amber-100 text-amber-800' : user.client_type === 'Admin' ? 'bg-indigo-100 text-indigo-800' : user.client_type === 'Editor' ? 'bg-blue-100 text-blue-800' : user.client_type === 'Author' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {user.is_superuser ? 'SuperUser' : (user.client_type || 'Reader')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 sm:px-6">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-gray-400">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                {/* Simplified pagination: just Prev and Next for now */}
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User Profile</h2>
                            <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    rows="3"
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Image URL</label>
                                <input
                                    type="url"
                                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={editForm.profile_image}
                                    onChange={(e) => setEditForm({ ...editForm, profile_image: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.website_url}
                                        onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.client_type}
                                        onChange={(e) => setEditForm({ ...editForm, client_type: e.target.value })}
                                    >
                                        {currentRank > 1 && <option value="Reader">Reader</option>}
                                        {currentRank > 2 && <option value="Author">Author</option>}
                                        {currentRank > 3 && <option value="Editor">Editor</option>}
                                        {currentRank > 4 && <option value="Admin">Admin</option>}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub URL</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.github_url}
                                        onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        value={editForm.linkedin_url}
                                        onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-6 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-0.5"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {toast && createPortal(
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] animate-in zoom-in-95 fade-in duration-300">
                    <div className={`flex items-center w-full max-w-sm p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-md ${toast.type === 'success'
                        ? 'bg-white/90 dark:bg-gray-800/90 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-white/90 dark:bg-gray-800/90 border-red-100 dark:border-red-900/30'
                        }`}>
                        <div className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${toast.type === 'success'
                            ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100/50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                            {toast.type === 'success' ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                        </div>
                        <div className="ml-3 mr-4">
                            <p className={`text-sm font-semibold ${toast.type === 'success' ? 'text-gray-900 dark:text-white' : 'text-gray-900 dark:text-white'
                                }`}>
                                {toast.type === 'success' ? 'Success' : 'Error'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-500 dark:hover:text-white dark:hover:bg-gray-700"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UserManagement;
