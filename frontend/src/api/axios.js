import axios from 'axios';

// Single axios instance used by every component.
// baseURL is empty because vite.config.js proxies /api → localhost:3000
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // sends the session cookie with every request
});

export default api;
