import api from './axios';

export const getMessagesApi = (meetupId) =>
  api.get(`/meetups/${meetupId}/messages`);