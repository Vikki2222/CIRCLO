import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { getMessagesApi } from '../api/chat.api';
import styles from './ChatDrawer.module.css';

const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });

const ChatDrawer = ({ meetup, onClose }) => {
  const { socket } = useSocket();
  const { user }   = useAuth();

  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const bottomRef               = useRef(null);

  // ── Load history ───────────────────────────────────────────
  useEffect(() => {
    if (!meetup?._id) return;

    setLoading(true);
    setError('');
    setMessages([]);

    getMessagesApi(meetup._id)
      .then((res) => setMessages(res.data.data.messages || []))
      .catch((err) => {
        if (err.response?.status !== 404) {
          setError('Failed to load messages.');
        }
      })
      .finally(() => setLoading(false));
  }, [meetup?._id]);

  // ── Socket: receive messages ───────────────────────────────
  useEffect(() => {
    if (!socket || !meetup?._id) return;

    const handleMessage = (msg) => {
      // Ignore messages from other meetup rooms
      if (msg.meetupId !== meetup._id) return;

      setMessages((prev) => {
        // Prevent duplicates by checking _id
        const alreadyExists = prev.some((m) => m._id === msg._id);
        if (alreadyExists) return prev;
        return [...prev, msg];
      });
    };

    const handleError = ({ message }) => setError(message);

    socket.on('chat:message', handleMessage);
    socket.on('chat:error',   handleError);

    return () => {
      socket.off('chat:message', handleMessage);
      socket.off('chat:error',   handleError);
    };
  }, [socket, meetup?._id]);

  // ── Auto-scroll to bottom ──────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send — just emit, socket broadcast adds it for everyone ─
  const handleSend = useCallback(() => {
    if (!text.trim() || !socket) return;

    socket.emit('chat:message', {
      meetupId: meetup._id,
      text:     text.trim(),
    });

    setText('');
  }, [text, socket, meetup._id]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOwn = (msg) =>
    (msg.sender?._id || msg.sender) === user?._id;

  return (
    <div className={styles.drawer}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.chatIcon}>💬</span>
          <div>
            <div className={styles.headerTitle}>Group Chat</div>
            <div className={styles.headerSub}>{meetup.title}</div>
          </div>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loading && (
          <div className={styles.centered}>
            <span className={styles.spinner} />
          </div>
        )}

        {!loading && error && (
          <div className={styles.error}>{error}</div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className={styles.empty}>
            No messages yet. Say hi! 👋
          </div>
        )}

        {!loading && !error && messages.map((msg, i) => {
          const own        = isOwn(msg);
          const prevMsg    = messages[i - 1];
          const showSender = !own && (
            !prevMsg ||
            (prevMsg.sender?._id || prevMsg.sender) !==
            (msg.sender?._id || msg.sender)
          );

          return (
            <div
              key={msg._id || i}
              className={`${styles.msgRow} ${own ? styles.ownRow : ''}`}
            >
              {!own && (
                <div className={styles.avatar}>
                  {showSender
                    ? msg.sender?.avatar
                      ? <img src={msg.sender.avatar} alt={msg.sender.name} />
                      : <span>{msg.sender?.name?.[0]?.toUpperCase()}</span>
                    : null
                  }
                </div>
              )}

              <div className={`${styles.msgGroup} ${own ? styles.ownGroup : ''}`}>
                {showSender && (
                  <div className={styles.senderName}>{msg.sender?.name}</div>
                )}
                <div className={`${styles.bubble} ${own ? styles.ownBubble : ''}`}>
                  {msg.text}
                  <span className={styles.time}>{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputRow}>
        <textarea
          className={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send)"
          rows={1}
          maxLength={500}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!text.trim()}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export default ChatDrawer;