import api from './axios';

export const getNearbyApi    = ({ lat, lng, radius = 10, category, page = 1 }) =>
  api.get('/meetups/nearby', { params: { lat, lng, radius, category, page } });

export const getMeetupApi    = (id)   => api.get(`/meetups/${id}`);
export const createMeetupApi = (data) => api.post('/meetups', data);
export const joinMeetupApi   = (id)   => api.post(`/meetups/${id}/join`);
export const leaveMeetupApi  = (id)   => api.post(`/meetups/${id}/leave`);
export const getMyMeetupsApi = ()     => api.get('/meetups/my');
export const getJoinedMeetupsApi = () => api.get('/meetups/joined');