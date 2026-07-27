import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthority } from '../hooks/useAuthority';

interface AuthorityRouteProps {
  children: React.ReactNode;
}

const AuthorityRoute: React.FC<AuthorityRouteProps> = ({ children }) => {
  const { user, profile, isLoading } = useAuthority();

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        <div className="skeleton-container" style={{ width: '100%', maxWidth: '1200px', padding: '40px' }}>
          <div className="skeleton-nav" style={{ height: '60px', background: 'rgba(255,255,255,0.03)', marginBottom: '40px', borderRadius: '4px' }}></div>
          <div className="skeleton-grid" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '40px' }}>
            <div className="skeleton-sidebar" style={{ height: '500px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
            <div className="skeleton-content" style={{ height: '500px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/authority/login" replace />;
  }

  if ((profile?.role as string) === 'student') {
    return <Navigate to="/" replace />;
  }

  // If role is fetched and valid
  const validRoles = ['lab', 'hod', 'principal', 'admin', 'librarian'];
  if (profile && validRoles.includes(profile.role)) {
    return <>{children}</>;
  }

  // Fallback if profile is not loaded correctly but user exists
  return <Navigate to="/authority/login" replace />;
};

export default AuthorityRoute;
