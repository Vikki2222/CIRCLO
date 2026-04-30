import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMeApi } from '../api/auth.api';

const AuthCallback = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => {
    // Token is in the URL hash: /auth/callback#token=xxx
    const hash  = window.location.hash;
    const token = new URLSearchParams(hash.replace('#', '?')).get('token');

    if (!token) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    // Store token then fetch user
    localStorage.setItem('token', token);
    getMeApi()
      .then((res) => {
        login(token, res.data.data.user);
        navigate('/', { replace: true });
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, [login, navigate]);

  return (
    <div style={{
      height: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#4f8ef7',
      fontSize: '1.2rem', fontFamily: 'Arial'
    }}>
      Signing you in...
    </div>
  );
};

export default AuthCallback;