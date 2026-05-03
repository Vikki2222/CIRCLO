import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuth } = useAuth();
  const socketRef  = useRef(null);
  const [connected, setConnected] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    if (!isAuth) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setForceUpdate((v) => v + 1);
      }
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(
      process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
      {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      }
    );

    newSocket.on('connect', () => {
      setConnected(true);
      console.debug('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    socketRef.current = newSocket;
    setForceUpdate((v) => v + 1);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setForceUpdate((v) => v + 1);
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
};