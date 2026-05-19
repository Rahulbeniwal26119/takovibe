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

    const getUserInitial = (user) => (user.name || user.username || user.email || "U").charAt(0).toUpperCase();

    const getTypeBadgeClass = (user) => {
        if (user.is_superuser) return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20";
        if (user.client_type === "Admin") return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20";
        if (user.client_type === "Editor") return "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-300 dark:border-neutral-800";
        if (user.client_type === "Author") return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20";
        return "bg-white text-neutral-700 border-neutral-200 dark:bg-neutral-950 dark:text-neutral-300 dark:border-neutral-800";
    };

    const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white";

    const UserAvatar = ({ user }) => (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
            {user.profile_image ? (
                <img className="h-full w-full object-cover" src={user.profile_image} alt="" />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold">
                    {getUserInitial(user)}
                </div>
            )}
        </div>
    );

    const UserRowsSkeleton = () => (
        <div className="divide-y divide-gray-200 dark:divide-neutral-800">
            {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex animate-pulse flex-col gap-4 px-5 py-4 lg:grid lg:grid-cols-[minmax(260px,1.6fr)_minmax(220px,1fr)_140px_140px_100px] lg:items-center">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-neutral-900"></div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 rounded-md bg-gray-200 dark:bg-neutral-800"></div>
                            <div className="h-3 w-44 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                        </div>
                    </div>
                    <div className="h-4 w-44 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                    <div className="h-6 w-16 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                    <div className="h-6 w-16 rounded-md bg-gray-100 dark:bg-neutral-900"></div>
                    <div className="h-4 w-10 rounded-md bg-gray-100 dark:bg-neutral-900 justify-self-end"></div>
                </div>
            ))}
        </div>
    );

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
        <div className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-neutral-800 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Directory</p>
                        <h2 className="mt-1 text-lg font-bold text-gray-950 dark:text-white">Registered users</h2>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                            type="text"
                            placeholder="Search users"
                            className={inputClass}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />

                        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-neutral-300">
                            <input
                                type="checkbox"
                                checked={isAuthorFilter}
                                onChange={(e) => { setIsAuthorFilter(e.target.checked); setPage(1); }}
                                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                            />
                            Authors only
                        </label>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-neutral-800">
                    <span className="text-sm font-medium text-gray-500 dark:text-neutral-400">Total users</span>
                    <span className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm font-bold text-gray-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white">{totalUsers}</span>
                </div>

                <div className="hidden overflow-x-auto lg:block">
                    <div className="min-w-[980px]">
                        <div className="grid grid-cols-[minmax(260px,1.6fr)_minmax(220px,1fr)_140px_140px_100px] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                            <div>User</div>
                            <div>Username</div>
                            <div>Status</div>
                            <div>Type</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {loading ? (
                            <UserRowsSkeleton />
                        ) : users.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-gray-500 dark:text-neutral-400">No users found</div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-neutral-800">
                                {users.map((user) => (
                                    <div key={user.id} className="grid grid-cols-[minmax(260px,1.6fr)_minmax(220px,1fr)_140px_140px_100px] items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-900/70">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <UserAvatar user={user} />
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-gray-950 dark:text-white">{user.name || "Unnamed user"}</div>
                                                <div className="truncate text-sm text-gray-500 dark:text-neutral-500">{user.email}</div>
                                            </div>
                                        </div>
                                        <div className="truncate text-sm font-medium text-gray-900 dark:text-neutral-200">{user.username || "-"}</div>
                                        <div>
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={`rounded-md border px-2 py-1 text-xs font-bold ${user.is_active ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'}`}
                                            >
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                        <div>
                                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${getTypeBadgeClass(user)}`}>
                                                {user.is_superuser ? 'SuperUser' : (user.client_type || 'Reader')}
                                            </span>
                                        </div>
                                        <div className="text-right text-sm font-medium">
                                            {(currentRank === 5 || currentRank > getRank(user)) && (
                                                <button onClick={() => handleEditClick(user)} className="font-semibold text-orange-600 transition-colors hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                                                    Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                    {loading ? (
                        <div className="p-4">
                            <UserRowsSkeleton />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500 dark:text-neutral-400">No users found</div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-neutral-800">
                            {users.map((user) => (
                                <div key={user.id} className="space-y-4 p-4">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={user} />
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-gray-950 dark:text-white">{user.name || "Unnamed user"}</div>
                                            <div className="truncate text-xs text-gray-500 dark:text-neutral-500">{user.email}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1 uppercase">Username</label>
                                            <span className="text-gray-900 dark:text-white">{user.username || "-"}</span>
                                        </div>
                                        <div className="flex justify-end items-end">
                                            {(currentRank === 5 || currentRank > getRank(user)) && (
                                                <button onClick={() => handleEditClick(user)} className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                    Edit Profile
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-neutral-800">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`rounded-md border px-2 py-1 text-xs font-bold ${user.is_active ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'}`}
                                        >
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </button>

                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${getTypeBadgeClass(user)}`}>
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
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 sm:px-5">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="ml-3 relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 dark:text-neutral-400">
                                Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md -space-x-px" aria-label="Pagination">
                                {/* Simplified pagination: just Prev and Next for now */}
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900"
                                >
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </section>

            {/* Edit User Modal */}
            {editingUser && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-950 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-neutral-800">
                        <div className="p-5 border-b border-gray-100 dark:border-neutral-800 flex justify-between items-center">
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
                                        className={inputClass}
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={editForm.username}
                                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                                <textarea
                                    className={inputClass}
                                    rows="3"
                                    value={editForm.bio}
                                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profile Image URL</label>
                                <input
                                    type="url"
                                    className={inputClass}
                                    value={editForm.profile_image}
                                    onChange={(e) => setEditForm({ ...editForm, profile_image: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL</label>
                                    <input
                                        type="url"
                                        className={inputClass}
                                        value={editForm.website_url}
                                        onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                                    <select
                                        className={inputClass}
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
                                        className={inputClass}
                                        value={editForm.github_url}
                                        onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
                                    <input
                                        type="url"
                                        className={inputClass}
                                        value={editForm.linkedin_url}
                                        onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-neutral-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-900 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-sm font-bold transition-colors"
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
                        ? 'bg-white/90 dark:bg-neutral-950/90 border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-white/90 dark:bg-neutral-950/90 border-red-100 dark:border-red-900/30'
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
                            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 text-gray-400 hover:text-gray-900 focus:ring-2 focus:ring-gray-300 dark:text-gray-500 dark:hover:text-white dark:hover:bg-neutral-900"
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
