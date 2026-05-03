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

// Listens to map click — used for future "create meetup here" flow
const MapClickHandler = ({ onClick }) => {
  useMapEvents({ click: (e) => onClick(e.latlng) });
  return null;
};

const DEFAULT_CENTER = [12.9716, 77.5946]; // Bangalore fallback
const DEFAULT_ZOOM   = 14;

const MapPage = () => {
  const { user, logout }    = useAuth();
  const { socket }          = useSocket();
  const navigate            = useNavigate();

  const [userCoords, setUserCoords] = useState(null);
  const [mapCenter, setMapCenter]   = useState(DEFAULT_CENTER);
  const [selectedMeetup, setSelectedMeetup] = useState(null);
  const [locating, setLocating]     = useState(true);

  const { meetups, loading, updateMeetup, removeMeetup, refetch } =
    useNearbyMeetups(userCoords);

  // ── Get user location on mount ──────────────────────────────
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
        // Permission denied — use default
        setUserCoords({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
        setLocating(false);
      },
      { timeout: 8000 }
    );
  }, []);

  // ── Socket.io — real-time pin updates ───────────────────────
  useEffect(() => {
    if (!socket) return;

    // 🟢 Someone joined — update count
    socket.on('meetup:attendee_update', ({ meetupId, status, attendeeCount, spotsLeft }) => {
      updateMeetup(meetupId, { status, attendeeCount: attendeeCount, spotsLeft });
      if (selectedMeetup?._id === meetupId) {
        setSelectedMeetup((prev) => prev ? { ...prev, status, spotsLeft } : prev);
      }
    });

    // 🔴 Meetup went full — pin turns red
    socket.on('meetup:full', ({ meetupId, attendeeCount }) => {
      updateMeetup(meetupId, { status: 'full', spotsLeft: 0, attendeeCount });
      if (selectedMeetup?._id === meetupId) {
        setSelectedMeetup((prev) => prev ? { ...prev, status: 'full', spotsLeft: 0 } : prev);
      }
    });

    // 🟢 Spot opened up — pin turns green
    socket.on('meetup:reopened', ({ meetupId, attendeeCount, spotsLeft }) => {
      updateMeetup(meetupId, { status: 'active', attendeeCount, spotsLeft });
      if (selectedMeetup?._id === meetupId) {
        setSelectedMeetup((prev) => prev ? { ...prev, status: 'active', spotsLeft } : prev);
      }
    });

    // ✕ Meetup cancelled — remove pin
    socket.on('meetup:cancelled', ({ meetupId }) => {
      removeMeetup(meetupId);
      if (selectedMeetup?._id === meetupId) setSelectedMeetup(null);
    });

    return () => {
      socket.off('meetup:attendee_update');
      socket.off('meetup:full');
      socket.off('meetup:reopened');
      socket.off('meetup:cancelled');
    };
  }, [socket, selectedMeetup, updateMeetup, removeMeetup]);

  // ── Handlers ─────────────────────────────────────────────────
  const handlePinClick = useCallback((meetup) => {
    setSelectedMeetup(meetup);
    if (socket) socket.emit('meetup:join_room', meetup._id);
  }, [socket]);

  const handlePanelClose = useCallback(() => {
    if (socket && selectedMeetup) {
      socket.emit('meetup:leave_room', selectedMeetup._id);
    }
    setSelectedMeetup(null);
  }, [socket, selectedMeetup]);

  const handleJoinLeave = useCallback((meetupId, action) => {
    // Optimistic update + refetch for accurate data
    refetch();
    if (selectedMeetup?._id === meetupId) {
      setSelectedMeetup((prev) => {
        if (!prev) return prev;
        const delta       = action === 'join' ? 1 : -1;
        const newCount    = (prev.attendeeCount ?? 0) + delta;
        const newSpots    = prev.capacity - newCount;
        return {
          ...prev,
          attendeeCount: newCount,
          spotsLeft: newSpots,
          status: newSpots <= 0 ? 'full' : 'active',
        };
      });
    }
  }, [selectedMeetup, refetch]);

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

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className={styles.navbar}>
        <div className={styles.navLogo}>
          <span className={styles.navLogoIcon}>◎</span>
          <span>circlo</span>
        </div>

        <div className={styles.navActions}>
          <button
            className={styles.createBtn}
            onClick={() => navigate('/create')}
          >
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

      {/* ── Loading indicator ──────────────────────────────── */}
      {loading && (
        <div className={styles.loadingBar}>
          Loading meetups...
        </div>
      )}

      {/* ── Meetup count badge ─────────────────────────────── */}
      {!loading && (
        <div className={styles.countBadge}>
          {meetups.length} meetup{meetups.length !== 1 ? 's' : ''} nearby
        </div>
      )}

      {/* ── Map ────────────────────────────────────────────── */}
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

        {/* User location pin */}
        {userCoords && (
          <Marker
            position={[userCoords.lat, userCoords.lng]}
            icon={createUserIcon()}
          />
        )}

        {/* Meetup pins */}
        {meetups.map((meetup) => (
          <MeetupPin
            key={meetup._id}
            meetup={meetup}
            onClick={handlePinClick}
          />
        ))}
      </MapContainer>

      {/* ── Meetup detail panel ────────────────────────────── */}
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