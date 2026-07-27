import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Archive, 
  CreditCard, 
  LogOut, 
  User,
  Bell
} from 'lucide-react';

interface StudentPortalLayoutProps {
  children: React.ReactNode;
}

const StudentPortalLayout: React.FC<StudentPortalLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <FileText size={20} />, label: 'Clearance Application', path: '/student/application' },
    { icon: <Archive size={20} />, label: 'Document Vault', path: '/student/vault' },
    { icon: <CreditCard size={20} />, label: 'Finances & Dues', path: '/student/finances' },
  ];

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div className="sidebar-brand serif italic">NEXUS</div>
        
        <nav className="sidebar-nav">
          <div className="nav-section-label label">PRIMARY MENU</div>
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {location.pathname === item.path && <div className="active-indicator" />}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-mini-profile">
            <div className="avatar-circle">
              <User size={16} />
            </div>
            <div className="user-details">
              <span className="user-name">{user?.email?.split('@')[0]}</span>
              <span className="user-role label">STUDENT</span>
            </div>
          </div>
          <button onClick={handleSignOut} className="sidebar-logout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="portal-main">
        <header className="portal-top-bar">
          <div className="breadcrumb label">
            STUDENT PORTAL / {menuItems.find(m => m.path === location.pathname)?.label.toUpperCase() || 'SECTION'}
          </div>
          <div className="top-bar-actions">
            <button className="icon-btn-ghost"><Bell size={20} /></button>
            <div className="separator" />
            <div className="institution-badge label">INSTITUTE OF TECHNOLOGY</div>
          </div>
        </header>
        
        <main className="portal-content">
          {children}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .portal-layout {
          display: flex;
          min-height: 100vh;
          background: #080808;
          color: #fff;
          width: 100%;
        }

        /* Sidebar */
        .portal-sidebar {
          width: 280px;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          padding: 40px 0;
          background: #0d0d0d;
          z-index: 100;
          flex-shrink: 0;
        }
        .sidebar-brand {
          font-size: 2rem;
          padding: 0 40px;
          margin-bottom: 60px;
          color: var(--accent-color);
        }
        .sidebar-nav {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 0 20px;
        }
        .nav-section-label {
          padding: 0 20px 15px;
          font-size: 0.65rem;
          opacity: 0.3;
          letter-spacing: 0.2em;
        }
        .nav-link {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 14px 20px;
          color: #888;
          text-decoration: none;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.03);
          color: #fff;
        }
        .nav-link.active {
          background: rgba(201, 168, 76, 0.08);
          color: var(--accent-color);
        }
        .active-indicator {
          position: absolute;
          left: 0;
          top: 15%;
          height: 70%;
          width: 3px;
          background: var(--accent-color);
          border-radius: 0 4px 4px 0;
          box-shadow: 0 0 15px var(--accent-color);
        }
        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.7;
        }
        .active .nav-icon {
          opacity: 1;
        }
        .nav-label {
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* Sidebar Footer */
        .sidebar-footer {
          padding: 40px 20px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .user-mini-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 20px;
        }
        .avatar-circle {
          width: 36px;
          height: 36px;
          background: #111;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--accent-color);
        }
        .user-details {
          display: flex;
          flex-direction: column;
        }
        .user-name {
          font-size: 0.85rem;
          font-weight: 700;
        }
        .user-role {
          font-size: 0.6rem;
          opacity: 0.4;
        }
        .sidebar-logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          color: #ff4d4d;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: opacity 0.3s;
          opacity: 0.7;
        }
        .sidebar-logout-btn:hover {
          opacity: 1;
        }

        /* Main Content */
        .portal-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #080808;
        }
        .portal-top-bar {
          height: 80px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 60px;
          background: rgba(8, 8, 8, 0.8);
          backdrop-filter: blur(20px);
        }
        .breadcrumb {
          font-size: 0.65rem;
          opacity: 0.4;
          letter-spacing: 0.15em;
        }
        .top-bar-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .separator {
          width: 1px;
          height: 20px;
          background: rgba(255, 255, 255, 0.1);
        }
        .institution-badge {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.03);
          padding: 6px 16px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #888;
        }
        .icon-btn-ghost {
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          transition: color 0.3s;
        }
        .icon-btn-ghost:hover {
          color: #fff;
        }

        .portal-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }
      `}} />
    </div>
  );
};

export default StudentPortalLayout;
