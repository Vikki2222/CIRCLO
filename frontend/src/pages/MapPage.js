import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import useNearbyMeetups from '../hooks/useNearbyMeetups';
import MeetupPin from '../components/MeetupPin';
import MeetupPanel from '../components/MeetupPanel';
import '../utils/leafletIcons';
import { createUserIcon } from '../utils/leafletIcons';
import styles from './MapPage.module.css';

const MapClickHandler = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
};

const DEFAULT_CENTER = [12.9716, 77.5946];
const DEFAULT_ZOOM   = 14;



const MapPage = () => {
  const { user, logout }    = useAuth();
  const { socket }          = useSocket();
  const navigate            = useNavigate();

  const [userCoords, setUserCoords] = useState(null);
  const [mapCenter, setMapCenter]   = useState(DEFAULT_CENTER);
  const [selectedMeetup, setSelectedMeetup] = useState(null);
  const [locating, setLocating]     = useState(true);
  const [radius, setRadius]         = useState(10);
  

  const { meetups, loading, updateMeetup, removeMeetup, refetch } =
    useNearbyMeetups(userCoords, radius);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocating(false);
      setUserCoords({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setUserCoords(pos);
        setMapCenter([pos.lat, pos.lng]);
        setLocating(false);
      },
      () => {
        setUserCoords({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }, []);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('meetup:attendee_update', ({ meetupId, status, attendeeCount, spotsLeft }) => {
      updateMeetup(meetupId, { status, attendeeCount, spotsLeft });
      setSelectedMeetup((prev) =>
        prev?._id === meetupId ? { ...prev, status, attendeeCount, spotsLeft } : prev
      );
    });

    socket.on('meetup:full', ({ meetupId, attendeeCount }) => {
      updateMeetup(meetupId, { status: 'full', spotsLeft: 0, attendeeCount });
      setSelectedMeetup((prev) =>
        prev?._id === meetupId ? { ...prev, status: 'full', spotsLeft: 0, attendeeCount } : prev
      );
    });

    socket.on('meetup:reopened', ({ meetupId, attendeeCount, spotsLeft }) => {
      updateMeetup(meetupId, { status: 'active', attendeeCount, spotsLeft });
      setSelectedMeetup((prev) =>
        prev?._id === meetupId ? { ...prev, status: 'active', attendeeCount, spotsLeft } : prev
      );
    });

    socket.on('meetup:cancelled', ({ meetupId }) => {
      removeMeetup(meetupId);
      setSelectedMeetup((prev) => prev?._id === meetupId ? null : prev);
    });

    return () => {
      socket.off('meetup:attendee_update');
      socket.off('meetup:full');
      socket.off('meetup:reopened');
      socket.off('meetup:cancelled');
    };
  }, [socket, updateMeetup, removeMeetup]);

  const handlePinClick = useCallback((meetup) => {
    const normalized = {
      ...meetup,
      attendeeCount: meetup.attendeeCount ?? meetup.attendees?.length ?? 0,
      spotsLeft:     meetup.spotsLeft ?? (meetup.capacity - (meetup.attendeeCount ?? meetup.attendees?.length ?? 0)),
    };
    setSelectedMeetup(normalized);
    if (socket) socket.emit('meetup:join_room', meetup._id);
  }, [socket]);

  const handlePanelClose = useCallback(() => {
    if (socket && selectedMeetup) {
      socket.emit('meetup:leave_room', selectedMeetup._id);
    }
    setSelectedMeetup(null);
  }, [socket, selectedMeetup]);

  const handleJoinLeave = useCallback((meetupId, action) => {
    refetch();
    setSelectedMeetup((prev) => {
      if (!prev || prev._id !== meetupId) return prev;
      const current  = typeof prev.attendeeCount === 'number'
        ? prev.attendeeCount
        : (prev.attendees?.length ?? 0);
      const newCount = action === 'join' ? current + 1 : current - 1;
      const newSpots = prev.capacity - newCount;
      return {
        ...prev,
        attendeeCount: newCount,
        spotsLeft:     newSpots,
        status:        newSpots <= 0 ? 'full' : 'active',
      };
    });
  }, [refetch]);

  if (locating) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingDot} />
        <p>Finding your location...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>

      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoIcon}>◎</span>
          <span>circlo</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.createBtn} onClick={() => navigate('/create')}>
            + Create
          </button>
          <div className={styles.userMenu}>
            <div className={styles.userAvatar}>
              {user?.avatar
                ? <img src={user.avatar} alt={user.name} />
                : <span>{user?.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <button className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Loading bar */}
      {loading && (
        <div className={styles.loadingBar}>Loading meetups...</div>
      )}

      {/* Count badge */}
      {!loading && (
        <div className={styles.countBadge}>
          {meetups.length} meetup{meetups.length !== 1 ? 's' : ''} within {radius}km
        </div>
      )}

     {/* ── Radius slider ─────────────────────────────────── */}
<div className={styles.radiusWrapper}>
  <div className={styles.radiusSliderBox}>
    <span className={styles.radiusIcon}>📍</span>
    <input
      type="range"
      min={1}
      max={50}
      step={1}
      value={radius}
      onChange={(e) => setRadius(Number(e.target.value))}
      onMouseUp={() => refetch(true)}
      onTouchEnd={() => refetch(true)}
      className={styles.radiusSlider}
    />
    <span className={styles.radiusValue}>{radius}km</span>
  </div>
</div>

      {/* Refresh button */}
      <button
        className={styles.refreshBtn}
        onClick={() => refetch(false)}
        title="Refresh meetups"
      >
        ↻
      </button>

      {/* Map */}
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        className={styles.map}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onClick={() => {}} />

        {userCoords && (
          <Marker
            position={[userCoords.lat, userCoords.lng]}
            icon={createUserIcon()}
          />
        )}

        {meetups.map((meetup) => (
          <MeetupPin
            key={meetup._id}
            meetup={meetup}
            onClick={handlePinClick}
          />
        ))}
      </MapContainer>

      {/* Meetup panel */}
      {selectedMeetup && (
        <MeetupPanel
          meetup={selectedMeetup}
          onClose={handlePanelClose}
          onJoinLeave={handleJoinLeave}
        />
      )}
    </div>
  );
};

export default MapPage;