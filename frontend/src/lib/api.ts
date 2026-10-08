export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem('sipanda_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers }).then(response => {
    if (response.status === 401 && token) {
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (currentPath !== '/login' && !sessionStorage.getItem('sipanda_return_to')) {
        sessionStorage.setItem('sipanda_return_to', currentPath);
      }
      localStorage.removeItem('sipanda_token');
      localStorage.removeItem('sipanda_user');
      window.location.replace('/login?expired=1');
    }
    return response;
  });
}