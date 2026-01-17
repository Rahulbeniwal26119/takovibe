const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return token ? { 'Authorization': `Token ${token}` } : {};
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('access_token');

  // Use Headers API to safely merge
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Dispatch login prompt event
    const event = new CustomEvent('show-login-prompt', {
      detail: {
        feature: 'Execution Engine',
        message: 'Please log in to execute backend code.'
      }
    });
    window.dispatchEvent(event);
    throw new Error('Unauthorized');
  }

  return response;
}; 