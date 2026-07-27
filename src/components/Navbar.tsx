import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import NotificationPanel from './NotificationPanel';

interface NavbarProps {
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLoginClick, 
  onRegisterClick 
}) => {
  const { user, role, signOut } = useAuth();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    // The App component will naturally redirect us once the user state is null
  };

  const handleStudentAction = (action: 'login' | 'register') => {
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      action === 'login' ? onLoginClick?.() : onRegisterClick?.();
    }
  };

  return (
    <nav className="navbar">
      <div className="container nav-container" style={{ position: 'relative' }}>
        <Link to="/" className="logo-group" style={{ textDecoration: 'none' }}>
          <div className="logo serif italic">NEXUS</div>
        </Link>
        
        <div className="nav-links">
          {!user ? (
            <>
              <button onClick={() => handleStudentAction('login')} className="label" style={{ fontSize: '0.8rem', color: '#fff', marginRight: '15px' }}>Student Login</button>
              <button onClick={() => handleStudentAction('register')} className="label" style={{ fontSize: '0.8rem', color: '#fff' }}>Student Register</button>
              <Link to="/authority/login" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.7rem', marginLeft: '20px', textDecoration: 'none', background: 'var(--accent-color)', color: '#000', fontWeight: 'bold' }}>Staff Access</Link>
            </>
          ) : (
            <div className="nav-identity" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div className="student-info" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span className="student-name" style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>{user.email?.split('@')[0]}</span>
                <span className="student-batch" style={{ fontSize: '0.75rem', color: 'var(--accent-color)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>
                  {role === 'admin' || role === 'librarian' ? 'Librarian · Authority' : 
                   role === 'hod' ? 'HOD · Department' :
                   role === 'lab' ? 'Lab Assistant' :
                   role === 'principal' ? 'Principal · Nexus' :
                   'SE · 2025'}
                </span>
              </div>

              <button 
                className="bell-btn"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <div className="unread-badge" style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: '#ff4444', borderRadius: '50%' }}></div>
              </button>

              <button 
                onClick={handleSignOut} 
                className="label" 
                style={{ color: 'var(--accent-color)', cursor: 'pointer', marginLeft: '10px' }}
              >
                Sign Out
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999 }}
                      onClick={() => setIsNotifOpen(false)}
                    />
                    <NotificationPanel />
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
