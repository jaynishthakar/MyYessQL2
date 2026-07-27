import React from 'react';
import { useAuthority } from '../hooks/useAuthority';
import { useNavigate } from 'react-router-dom';
import LabDashboardPanel from './LabDashboardPanel';
import HodDashboardPanel from './HodDashboardPanel';
import PrincipalDashboardPanel from './PrincipalDashboardPanel';
import LibrarianDashboardPanel from './LibrarianDashboardPanel';

const AuthorityDashboard: React.FC = () => {
  const { profile, signOut } = useAuthority();
  const navigate = useNavigate();
  const [activeLinkId, setActiveLinkId] = React.useState<string>('dues-upload');

  const handleSignOut = async () => {
    await signOut();
    navigate('/authority/login');
  };

  const getRoleDisplay = () => {
    switch (profile?.role) {
      case 'lab': return 'Lab Assistant';
      case 'hod': return 'Head of Department';
      case 'principal': return 'Principal';
      case 'admin':
      case 'librarian': return 'Librarian';
      default: return 'Portal';
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderSidebarLinks = () => {
    const role = profile?.role;
    if (!role) return null;

    const links: Record<string, { label: string; active: boolean; id?: string }[]> = {
      lab: [
        { label: 'Pending Applications', active: true, id: 'lab-pending' },
        { label: 'Cleared Students', active: false, id: 'lab-cleared' },
        { label: 'Lab Dues Management', active: false, id: 'lab-dues' },
        { label: 'Inventory Checklist', active: false, id: 'lab-inventory' }
      ],
      hod: [
        { label: 'Applications Awaiting HOD', active: true, id: 'hod-pending' },
        { label: 'Department Overview', active: false, id: 'dept-overview' },
        { label: 'Faculty Escalations', active: false, id: 'faculty-escalations' },
        { label: 'Approval History', active: false, id: 'approval-history' }
      ],
      principal: [
        { label: 'Final Approvals', active: true, id: 'pending-final' },
        { label: 'Certificate Queue', active: false, id: 'cert-queue' },
        { label: 'Full Student Registry', active: false, id: 'student-registry' }
      ],
      admin: [
        { label: 'CSV Dues Upload', active: true, id: 'dues-upload' },
        { label: 'Student Dues Registry', active: false, id: 'dues-registry' },
        { label: 'Cleared Students', active: false, id: 'cleared-students' },
        { label: 'System Logs', active: false, id: 'system-logs' }
      ],
      librarian: [
        { label: 'CSV Dues Upload', active: true, id: 'dues-upload' },
        { label: 'Student Dues Registry', active: false, id: 'dues-registry' },
        { label: 'Cleared Students', active: false, id: 'cleared-students' },
        { label: 'System Logs', active: false, id: 'system-logs' }
      ],
    };

    const roleLinks = links[role as string] || [];

    return roleLinks.map((link: { label: string; active: boolean; id?: string }, i: number) => {
      const isActive = link.id ? activeLinkId === link.id : link.active;
      
      return (
        <div 
          key={i} 
          className={`nav-item ${isActive ? 'active' : ''}`}
          onClick={() => {
            if (link.id) {
              setActiveLinkId(link.id);
              scrollToSection(link.id);
            }
          }}
          style={{ cursor: link.id ? 'pointer' : 'default' }}
        >
          {link.label}
        </div>
      );
    });
  };

  const renderContentPanel = () => {
    const role = profile?.role;
    if (!role) return null;

    const config: Record<string, { 
      title: string; 
      subtext: string; 
      theme: string; 
      stats?: { label: string; val: string }[]; 
      component?: React.ReactNode; 
      placeholder?: string;
    }> = {
      lab: {
        title: 'Lab Assistant Dashboard',
        subtext: 'Engineering Labs & Research Facilities Access Control',
        theme: '#00D1FF',
        stats: [],
        component: <LabDashboardPanel />
      },
      hod: {
        title: 'HOD Dashboard',
        subtext: 'Departmental Oversight & Senior Approvals',
        theme: '#A855F7',
        stats: [],
        component: <HodDashboardPanel />
      },
      principal: {
        title: "Principal's Dashboard",
        subtext: 'Apex Authority & Certification Control',
        theme: '#F59E0B',
        stats: [],
        component: <PrincipalDashboardPanel />
      },
      admin: {
        title: 'Librarian Dashboard',
        subtext: 'Library Resource & Central Dues Registry',
        theme: '#10B981',
        stats: [],
        component: <LibrarianDashboardPanel />
      },
      librarian: {
        title: 'Librarian Dashboard',
        subtext: 'Library Resource & Central Dues Registry',
        theme: '#10B981',
        stats: [],
        component: <LibrarianDashboardPanel />
      }
    };

    const roleConfig = config[role as string];

    if (!roleConfig) return null;

    return (
      <div className="panel-container" style={{ '--role-accent': roleConfig.theme } as any}>
        <div className="panel-header">
          <div className="role-indicator" style={{ background: roleConfig.theme }}></div>
          <h2 className="panel-title serif">{roleConfig.title}</h2>
          <p className="panel-subtext">{roleConfig.subtext}</p>
        </div>

        {roleConfig.component ? roleConfig.component : (
          <>
            <div className="stats-grid">
              {roleConfig.stats?.map((stat: { label: string; val: string }, i: number) => (
                <div key={i} className="stat-card">
                  <div className="stat-label label">{stat.label}</div>
                  <div className="stat-value" style={{ color: roleConfig.theme }}>{stat.val}</div>
                  <div className="stat-decoration"></div>
                </div>
              ))}
            </div>

            <div className="focus-area">
              <div className="focus-header">
                <h3 className="serif">Operational Focus</h3>
                <div className="action-pill" style={{ borderColor: roleConfig.theme, color: roleConfig.theme }}>Active Session</div>
              </div>
              <div className="focus-card">
                <p className="focus-text">{roleConfig.placeholder || ''}</p>
                <div className="skeleton-list">
                  {[1, 2, 3].map((n: number) => (
                    <div key={n} className="skeleton-row"></div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navbar */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <div className="logo" style={{ fontSize: '1.5rem', marginBottom: '0' }}>Nexus</div>
        </div>
        
        <div className="dash-nav-center">
          <div className="role-badge">
            <span className="dot" style={{ background: profile?.role === 'admin' ? '#10B981' : profile?.role === 'hod' ? '#A855F7' : profile?.role === 'lab' ? '#00D1FF' : '#F59E0B' }}></span>
            {getRoleDisplay().toUpperCase()} PORTAL
          </div>
        </div>

        <div className="dash-nav-right">
          <div className="user-profile">
            <div className="user-avatar">{profile?.full_name?.charAt(0)}</div>
            <span className="user-name">{profile?.full_name}</span>
          </div>
          <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
        </div>
      </nav>

      <div className="dash-body">
        {/* Left Sidebar */}
        <aside className="dash-sidebar">
          <div className="sidebar-group">
            <label className="label" style={{ opacity: 0.4, marginBottom: '20px', display: 'block' }}>Primary Links</label>
            {renderSidebarLinks()}
          </div>
          
          <div className="sidebar-footer">
            <div className="version-info">Build v2.4.0-auth</div>
            <div className="system-status">
              <div className="status-dot"></div>
              <span>System Live</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dash-content">
          {renderContentPanel()}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-layout {
          min-height: 100vh;
          background: #080808;
          display: flex;
          flex-direction: column;
          color: var(--text-primary);
        }
        .dash-nav {
          height: 70px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 40px;
          background: rgba(8, 8, 8, 0.8);
          backdrop-filter: blur(20px);
          z-index: 10;
        }
        .role-badge {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 0.7rem;
          letter-spacing: 0.1em;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent-color);
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.8rem;
        }
        .dash-nav-right {
          display: flex;
          align-items: center;
          gap: 30px;
        }
        .user-name {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .sign-out-btn {
          color: #ff4d4d;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          opacity: 0.8;
          transition: opacity 0.3s;
          font-weight: 600;
        }
        .sign-out-btn:hover {
          opacity: 1;
        }
        .dash-body {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .dash-sidebar {
          width: 280px;
          border-right: 1px solid var(--border-color);
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: rgba(255,255,255,0.01);
        }
        .nav-item {
          padding: 14px 20px;
          margin: 0 -20px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.3s;
          border-radius: 4px;
        }
        .nav-item:hover {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }
        .nav-item.active {
          color: var(--accent-color);
          background: rgba(201, 168, 76, 0.05);
          font-weight: 600;
        }
        .dash-content {
          flex: 1;
          padding: 60px 80px;
          overflow-y: auto;
        }
        .panel-header {
          margin-bottom: 60px;
          position: relative;
        }
        .role-indicator {
          width: 40px;
          height: 4px;
          border-radius: 2px;
          margin-bottom: 20px;
        }
        .panel-title {
          font-size: 4rem;
          line-height: 1;
          margin-bottom: 16px;
        }
        .panel-subtext {
          color: var(--text-secondary);
          font-size: 1.1rem;
          max-width: 600px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          margin-bottom: 80px;
        }
        .stat-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          padding: 40px 30px;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.03);
        }
        .stat-value {
          font-size: 3.5rem;
          font-family: 'Newsreader', serif;
          font-style: italic;
          margin-top: 15px;
        }
        .focus-area {
           margin-top: 40px;
        }
        .focus-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .focus-header h3 {
          font-size: 1.5rem;
        }
        .action-pill {
          padding: 6px 14px;
          border: 1px solid;
          border-radius: 100px;
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }
        .focus-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          padding: 40px;
          border-radius: 8px;
        }
        .focus-text {
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 30px;
          max-width: 800px;
        }
        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .skeleton-row {
          height: 50px;
          background: rgba(255, 255, 255, 0.02);
          width: 100%;
          border-radius: 4px;
        }
        .version-info {
           font-size: 0.6rem;
           color: #333;
           margin-bottom: 10px;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot { width: 6px; height: 6px; background: #4caf50; border-radius: 50%; }
        .system-status { display: flex; align-items: center; gap: 8px; font-size: 0.6rem; text-transform: uppercase; color: #4caf50; }
      ` }} />
    </div>
  );
};

export default AuthorityDashboard;
