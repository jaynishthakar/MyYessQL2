import React, { useState } from 'react'
import { useLabDashboard } from '../hooks/useLabDashboard'
import type { ApplicationWithStudent } from '../types/workflow'
import ApplicationReviewDrawer from './ApplicationReviewDrawer'
import { FileText, Clock, ShieldCheck, Box, UserCheck, AlertCircle, Inbox } from 'lucide-react'
import { supabase } from '../lib/supabase'

const LabDashboardPanel: React.FC = () => {
  const { 
    stats, applications, clearedStudents, labDues, inventory, 
    isLoading, refresh, error, updateDueStatus 
  } = useLabDashboard()
  
  const [selectedApp, setSelectedApp] = useState<ApplicationWithStudent | null>(null)
  const [approvals, setApprovals] = useState<any[]>([])

  const openReview = async (app: ApplicationWithStudent) => {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('application_id', app.id)
      .order('updated_at', { ascending: true })
    
    setApprovals(data || [])
    setSelectedApp(app)
  }

  if (isLoading && applications.length === 0 && !error) {
    return (
      <div className="nexus-loading-area">
        <div className="spinner-dots">
          <div></div><div></div><div></div>
        </div>
        <p>Syncing Lab Records...</p>
      </div>
    )
  }

  return (
    <div className="lab-panel-root">
      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <div className="error-text">
            <strong>System Sync Error:</strong>
            <span>{error}</span>
          </div>
          <button onClick={() => refresh()} className="retry-btn">RETRY SYNC</button>
        </div>
      )}

      {/* Lab Authority Stats Overview */}
      <div className="stats-grid-row">
        <div className="stat-card-premium">
          <div className="stat-icon-bg awaiting"><Clock size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{stats.awaiting}</span>
            <span className="stat-label">Awaiting Review</span>
          </div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon-bg approved"><UserCheck size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{stats.approved}</span>
            <span className="stat-label">Students Cleared</span>
          </div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon-bg rejected"><ShieldCheck size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{labDues.filter(d => d.status === 'pending').length}</span>
            <span className="stat-label">Active Lab Dues</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: PENDING APPLICATIONS */}
      <section id="lab-pending" className="nexus-main-section">
        <div className="section-header-flex">
          <div className="title-group">
            <h3 className="serif">Pending Lab Clearances</h3>
            <p className="subtitle label">ACTION REQUIRED</p>
          </div>
          <button className="refresh-btn-mini" onClick={() => refresh()}><Clock size={14} /> Refresh Data</button>
        </div>

        <div className="nexus-table-wrapper">
          <table className="nexus-styled-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>UID</th>
                <th>PURPOSE</th>
                <th>DOCS</th>
                <th>SUBMITTED</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {applications.length > 0 ? applications.map(app => (
                <tr key={app.id}>
                  <td>
                    <div className="student-profile-cell">
                      <span className="full-name">{app.student?.full_name}</span>
                      <span className="username label">@{app.student?.username}</span>
                    </div>
                  </td>
                  <td><span className="uid-text mono">{app.student?.student_uid}</span></td>
                  <td><span className="purpose-tag">{app.purpose ? (app.purpose.includes('{') ? JSON.parse(app.purpose).type : app.purpose) : 'General Clearance'}</span></td>
                  <td>
                    <div className="docs-indicator">
                      <FileText size={14} />
                      <span>{app.document_ids?.length || 0}</span>
                    </div>
                  </td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td className="text-right">
                    <button className="nexus-btn-primary" onClick={() => openReview(app)}>REVIEW</button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="empty-state">
                    <Inbox size={48} />
                    <p>No applications currently at Lab Stage.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: CLEARED STUDENTS */}
      <section id="lab-cleared" className="nexus-main-section">
        <div className="section-header-flex">
          <div className="title-group">
            <h3 className="serif">Recently Cleared Students</h3>
            <p className="subtitle label">HISTORICAL ARCHIVE</p>
          </div>
        </div>
        <div className="nexus-table-wrapper">
          <table className="nexus-styled-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>UID</th>
                <th>CLEARANCE DATE</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {clearedStudents.length > 0 ? clearedStudents.map(app => (
                <tr key={app.id}>
                  <td>
                    <div className="student-profile-cell">
                      <span className="full-name">{app.student?.full_name}</span>
                      <span className="username label">@{app.student?.username}</span>
                    </div>
                  </td>
                  <td className="mono">{app.student?.student_uid}</td>
                  <td>{new Date(app.created_at).toLocaleDateString()}</td>
                  <td><span className="badge-success">LAB CLEARED</span></td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="empty-mini">No students cleared recently in this department.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: LAB DUES MANAGEMENT */}
      <section id="lab-dues" className="nexus-main-section">
        <div className="section-header-flex">
          <div className="title-group">
            <h3 className="serif">Lab Dues Management</h3>
            <p className="subtitle label">EQUIPMENT FINES & REPAIR DUES</p>
          </div>
        </div>
        <div className="nexus-table-wrapper">
          <table className="nexus-styled-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>UID</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {labDues.length > 0 ? labDues.map(due => (
                <tr key={due.id}>
                  <td>{due.student?.full_name}</td>
                  <td className="mono">{due.student?.student_uid}</td>
                  <td className="amount-text">₹{due.amount.toLocaleString()}</td>
                  <td><span className={`status-pill ${due.status}`}>{due.status.toUpperCase()}</span></td>
                  <td>
                    {due.status === 'pending' && (
                      <button className="action-link" onClick={() => updateDueStatus(due.id, 'paid')}>MARK AS PAID</button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="empty-mini">No lab dues records found for this department.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 4: INVENTORY CHECKLIST */}
      <section id="lab-inventory" className="nexus-main-section">
        <div className="section-header-flex">
          <div className="title-group">
            <h3 className="serif">Lab Inventory Checklist</h3>
            <p className="subtitle label">ASSET MONITORING</p>
          </div>
        </div>
        <div className="inventory-grid">
          {inventory.map(item => (
            <div key={item.id} className="inventory-card">
              <div className="inv-icon"><Box size={24} /></div>
              <div className="inv-info">
                <span className="inv-name">{item.name}</span>
                <span className="inv-condition">{item.condition}</span>
              </div>
              <span className={`inv-status ${item.status.toLowerCase().replace(' ', '-')}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </section>

      {selectedApp && (
        <ApplicationReviewDrawer
          application={selectedApp}
          approvals={approvals}
          actorRole="lab"
          onClose={() => setSelectedApp(null)}
          onAction={() => {
            setSelectedApp(null)
            refresh()
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .lab-panel-root { display: flex; flex-direction: column; gap: 40px; animation: fadeIn 0.5s ease; padding-bottom: 60px; }
        .stats-grid-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .stat-card-premium { background: #111; border: 1px solid #222; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        
        .stat-icon-bg { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .stat-icon-bg.awaiting { background: rgba(0, 209, 255, 0.1); color: #00D1FF; }
        .stat-icon-bg.approved { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .stat-icon-bg.rejected { background: rgba(168, 85, 247, 0.1); color: #A855F7; }
        
        .stat-main { display: flex; flex-direction: column; }
        .stat-num { font-size: 2rem; font-weight: 800; color: #fff; line-height: 1; }
        .stat-label { font-size: 0.7rem; color: #666; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-top: 5px; }

        .nexus-main-section { background: #111; border: 1px solid #222; border-radius: 24px; padding: 35px; scroll-margin-top: 100px; }
        .section-header-flex { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
        .title-group h3 { font-size: 1.6rem; margin-bottom: 5px; color: #fff; }
        .refresh-btn-mini { background: #1a1a1a; border: 1px solid #333; color: #888; padding: 8px 16px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .refresh-btn-mini:hover { background: #222; color: #fff; border-color: #444; }

        .nexus-styled-table { width: 100%; border-collapse: collapse; }
        .nexus-styled-table th { text-align: left; padding: 18px; font-size: 0.7rem; color: #555; border-bottom: 2px solid #1a1a1a; text-transform: uppercase; letter-spacing: 1px; }
        .nexus-styled-table td { padding: 20px 18px; border-bottom: 1px solid #1a1a1a; font-size: 0.95rem; color: #aaa; vertical-align: middle; }
        
        .student-profile-cell { display: flex; flex-direction: column; gap: 2px; }
        .student-profile-cell .full-name { color: #fff; font-weight: 600; }
        .uid-text { font-size: 0.85rem; color: #777; }
        .purpose-tag { background: rgba(255,255,255,0.04); padding: 5px 12px; border-radius: 8px; font-size: 0.75rem; color: #888; border: 1px solid rgba(255,255,255,0.05); }
        .nexus-btn-primary { background: #fff; color: #000; border: none; padding: 10px 24px; border-radius: 12px; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: transform 0.2s; }
        .nexus-btn-primary:hover { transform: translateY(-2px); }

        .inventory-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .inventory-card { background: #161616; border: 1px solid #222; padding: 25px; border-radius: 20px; display: flex; align-items: center; gap: 20px; transition: border-color 0.3s; }
        .inventory-card:hover { border-color: #333; }
        .inv-icon { width: 45px; height: 45px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #555; }
        .inv-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .inv-name { color: #fff; font-weight: 700; font-size: 1.05rem; }
        .inv-condition { font-size: 0.75rem; color: #666; font-weight: 500; }
        .inv-status { font-size: 0.65rem; font-weight: 800; padding: 5px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .inv-status.in-stock { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .inv-status.checked-out { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }

        .status-pill { font-size: 0.65rem; font-weight: 800; padding: 5px 10px; border-radius: 6px; }
        .status-pill.pending { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .status-pill.paid { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .amount-text { color: #fff; font-weight: 800; font-size: 1.1rem; }
        .action-link { background: none; border: none; color: #00D1FF; font-size: 0.8rem; cursor: pointer; text-decoration: underline; font-weight: 700; }

        .badge-success { color: #10B981; font-weight: 900; font-size: 0.7rem; letter-spacing: 1px; border: 1px solid rgba(16, 185, 129, 0.2); padding: 4px 10px; border-radius: 6px; }
        .empty-state { text-align: center; padding: 80px 0; color: #444; }
        .empty-mini { text-align: center; padding: 50px; color: #444; font-style: italic; font-size: 0.95rem; }
        
        .nexus-loading-area { height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #555; }
        .spinner-dots { display: flex; gap: 8px; }
        .spinner-dots div { width: 12px; height: 12px; background: #A855F7; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .spinner-dots div:nth-child(1) { animation-delay: -0.32s; }
        .spinner-dots div:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

        .error-banner { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px; color: #EF4444; margin-bottom: 30px; }
        .error-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .retry-btn { background: #EF4444; color: #fff; border: none; padding: 8px 20px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  )
}

export default LabDashboardPanel
