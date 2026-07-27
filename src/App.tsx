import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import InteractiveBackground from './components/InteractiveBackground';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import StudentDashboard from './components/StudentDashboard';
import AuthoritySignup from './components/AuthoritySignup';
import AuthorityLogin from './components/AuthorityLogin';
import AuthorityDashboard from './components/AuthorityDashboard';
import AuthorityRoute from './components/AuthorityRoute';
import StudentApplicationPage from './components/StudentApplicationPage';
import DocumentVault from './components/DocumentVault';
import StudentPortalLayout from './components/StudentPortalLayout';
import StudentFinancesPage from './components/StudentFinancesPage';
import CertificateVerificationPage from './components/CertificateVerificationPage';

function App() {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Hide global navbar on authenticated dashboards/portals
  const isPortalView = 
    location.pathname.startsWith('/authority/dashboard') || 
    location.pathname === '/dashboard' || 
    location.pathname.startsWith('/student/') ||
    location.pathname.startsWith('/admin');

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <InteractiveBackground />
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="app">
      <InteractiveBackground />
      <div className="grain-overlay"></div>
      
      {!isPortalView && (
        <Navbar 
          onLoginClick={openAuthModal}
          onRegisterClick={openAuthModal}
        />
      )}

      <main>
        <Routes>
          <Route path="/" element={
            !user ? (
              <LandingPage onGetStarted={openAuthModal} />
            ) : role === 'admin' || role === 'hod' || role === 'lab' || role === 'principal' || role === 'librarian' ? (
              <Navigate to="/authority/dashboard" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPortalLayout>
                <StudentDashboard />
              </StudentPortalLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/application" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPortalLayout>
                <StudentApplicationPage />
              </StudentPortalLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/vault" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPortalLayout>
                <div style={{ padding: '60px' }}>
                  <DocumentVault />
                </div>
              </StudentPortalLayout>
            </ProtectedRoute>
          } />

          <Route path="/student/finances" element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentPortalLayout>
                <StudentFinancesPage />
              </StudentPortalLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin', 'librarian']}>
              <div className="admin-dashboard">
                <h1>Admin Dashboard</h1>
                <p>Welcome, administrator. Here you can manage the application.</p>
                {/* Admin specific components will go here */}
              </div>
            </ProtectedRoute>
          } />

          {/* Authority Routes */}
          <Route path="/authority/signup" element={<AuthoritySignup />} />
          <Route path="/authority/login" element={<AuthorityLogin />} />
          <Route path="/authority/dashboard" element={
            <AuthorityRoute>
              <AuthorityDashboard />
            </AuthorityRoute>
          } />

          <Route path="/verify/:applicationId" element={<CertificateVerificationPage />} />

          <Route path="/unauthorized" element={
            <div className="error-page">
              <h1>Unauthorized Access</h1>
              <p>You do not have permission to view this page.</p>
            </div>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!user && <Footer />}

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={closeAuthModal} 
      />
    </div>
  );
}

export default App;
