import { useState, useEffect, useCallback, useRef } from 'react';
import { getNearbyApi } from '../api/meetup.api';

const POLL_INTERVAL = 30000;

const normalize = (m) => ({
  ...m,
  attendeeCount: m.attendees?.length ?? 0,
  spotsLeft:     m.capacity - (m.attendees?.length ?? 0),
  isFull:        (m.attendees?.length ?? 0) >= m.capacity,
});

const useNearbyMeetups = (coords, radius = 10) => {
  const [meetups, setMeetups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const coordsRef             = useRef(coords);
  const radiusRef             = useRef(radius);

  useEffect(() => { coordsRef.current = coords; }, [coords]);
  useEffect(() => { radiusRef.current = radius; }, [radius]);

  const fetch = useCallback(async (silent = false) => {
    if (!coordsRef.current) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await getNearbyApi({
        lat:    coordsRef.current.lat,
        lng:    coordsRef.current.lng,
        radius: radiusRef.current,
      });
      setMeetups((res.data.meetups || []).map(normalize));
    } catch (err) {
      setError('Failed to load meetups.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Refetch when coords arrive
  useEffect(() => {
    if (coords) fetch();
  }, [coords, fetch]);

  // Refetch when radius changes
  useEffect(() => {
    if (coords) fetch(true);
  }, [radius]);

  // Auto-poll
  useEffect(() => {
    const interval = setInterval(() => fetch(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetch]);

  // Refetch on tab focus
  useEffect(() => {
    const handleFocus = () => fetch(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetch]);

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