import api from './axios';

export const registerApi = (data) => api.post('/auth/register', data);
export const loginApi    = (data) => api.post('/auth/login', data);
export const getMeApi    = ()     => api.get('/auth/me');