const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Token ${token}` } : {};
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Handle token refresh or logout
    localStorage.clear();
    window.location.reload();
  }

  return response;
}; 