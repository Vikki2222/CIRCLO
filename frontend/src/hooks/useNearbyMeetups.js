import { useState, useEffect, useCallback } from 'react';
import { getNearbyApi } from '../api/meetup.api';

const useNearbyMeetups = (coords) => {
  const [meetups, setMeetups]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const fetch = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getNearbyApi({
        lat: coords.lat,
        lng: coords.lng,
        radius: 10,
      });
      setMeetups(res.data.meetups || []);
    } catch (err) {
      setError('Failed to load meetups.');
    } finally {
      setLoading(false);
    }
  }, [coords]);

  useEffect(() => { fetch(); }, [fetch]);

  // Allow individual meetup updates (from socket events)
  const updateMeetup = useCallback((meetupId, changes) => {
    setMeetups((prev) =>
      prev.map((m) => m._id === meetupId ? { ...m, ...changes } : m)
    );
  }, []);

  const removeMeetup = useCallback((meetupId) => {
    setMeetups((prev) => prev.filter((m) => m._id !== meetupId));
  }, []);

  return { meetups, loading, error, refetch: fetch, updateMeetup, removeMeetup };
};

export default useNearbyMeetups;