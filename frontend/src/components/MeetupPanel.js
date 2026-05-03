import { useState } from 'react';
import { joinMeetupApi, leaveMeetupApi } from '../api/meetup.api';
import { useAuth } from '../context/AuthContext';
import ChatDrawer from './ChatDrawer';
import styles from './MeetupPanel.module.css';

const MeetupPanel = ({ meetup, onClose, onJoinLeave }) => {
  const { user }        = useAuth();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showChat, setShowChat] = useState(false);

  if (!meetup) return null;

  const [lng, lat] = meetup.location.coordinates;
  const attendees  = meetup.attendees || [];
  const capacity   = meetup.capacity;

  // Always prefer socket-updated numeric fields over array length
  const count     = typeof meetup.attendeeCount === 'number'
    ? meetup.attendeeCount
    : attendees.length;

  const spotsLeft = typeof meetup.spotsLeft === 'number'
    ? meetup.spotsLeft
    : capacity - count;

  const isFull    = meetup.status === 'full' || spotsLeft <= 0;

  const isHost     = meetup.host?._id === user?._id || meetup.host === user?._id;
  const isAttendee = attendees.some((a) => (a._id || a) === user?._id);

  const handleJoin = async () => {
    setError('');
    setLoading(true);
    try {
      await joinMeetupApi(meetup._id);
      onJoinLeave(meetup._id, 'join');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setError('');
    setLoading(true);
    try {
      await leaveMeetupApi(meetup._id);
      onJoinLeave(meetup._id, 'leave');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirections = () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank'
    );
  };

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  // Capacity bar percentage — always derived from count
  const fillPercent = Math.min((count / capacity) * 100, 100);

  return (
    <>
      <div className={styles.panel}>

        {/* Header */}
        <div className={styles.header}>
          <span className={`${styles.badge} ${styles[meetup.category] || styles.other}`}>
            {meetup.category}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <h2 className={styles.title}>{meetup.title}</h2>

          {meetup.description && (
            <p className={styles.description}>{meetup.description}</p>
          )}

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statIcon}>👥</span>
              <span>
                <strong>{count}</strong>/{capacity}
                {' '}<span className={styles.statLabel}>joined</span>
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statIcon}>🕐</span>
              <span className={styles.statLabel}>{formatDate(meetup.startsAt)}</span>
            </div>
            {meetup.location?.address && (
              <div className={styles.stat}>
                <span className={styles.statIcon}>📍</span>
                <span className={styles.statLabel}>{meetup.location.address}</span>
              </div>
            )}
          </div>

          {/* Capacity bar */}
          <div className={styles.capacityBar}>
            <div
              className={styles.capacityFill}
              style={{
                width:      `${fillPercent}%`,
                background:  isFull ? '#ef4444' : '#22c55e',
                transition: 'width 0.4s ease, background 0.4s ease',
              }}
            />
          </div>
          <div className={styles.spotsLabel}>
            {isFull
              ? 'Meetup is full'
              : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
          </div>

          {/* Tags */}
          {meetup.tags?.length > 0 && (
            <div className={styles.tags}>
              {meetup.tags.map((t) => (
                <span key={t} className={styles.tag}>#{t}</span>
              ))}
            </div>
          )}

          {/* Host */}
          <div className={styles.host}>
            <div className={styles.avatar}>
              {meetup.host?.avatar
                ? <img src={meetup.host.avatar} alt={meetup.host.name} />
                : <span>{meetup.host?.name?.[0]?.toUpperCase() || '?'}</span>
              }
            </div>
            <div>
              <div className={styles.hostLabel}>Hosted by</div>
              <div className={styles.hostName}>{meetup.host?.name || 'Unknown'}</div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {/* Actions row 1 */}
          <div className={styles.actions}>
            <button
              className={styles.chatBtn}
              onClick={() => setShowChat((v) => !v)}
            >
              💬 {showChat ? 'Close Chat' : 'Chat'}
            </button>

            <button className={styles.directionsBtn} onClick={handleDirections}>
              🗺 Directions
            </button>
          </div>

          {/* Actions row 2 — join/leave */}
          <div className={styles.actions} style={{ marginTop: 8 }}>
            {!isHost && (
              isAttendee ? (
                <button
                  className={styles.leaveBtn}
                  onClick={handleLeave}
                  disabled={loading}
                >
                  {loading ? '...' : 'Leave Meetup'}
                </button>
              ) : (
                <button
                  className={`${styles.joinBtn} ${isFull ? styles.disabled : ''}`}
                  onClick={handleJoin}
                  disabled={loading || isFull}
                >
                  {loading ? '...' : isFull ? 'Meetup Full' : 'Join Meetup'}
                </button>
              )
            )}

            {isHost && (
              <span className={styles.hostBadge}>⭐ You're hosting this meetup</span>
            )}
          </div>
        </div>
      </div>

      {/* Chat drawer */}
      {showChat && (
        <ChatDrawer
          meetup={meetup}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};

export default MeetupPanel;