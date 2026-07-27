import React, { useState } from 'react'
import { useHodDashboard } from '../hooks/useHodDashboard'
import type { Application } from '../types/workflow'
import ApplicationReviewDrawer from './ApplicationReviewDrawer'
import { supabase } from '../lib/supabase'
import { Clock, Users, CheckCircle, AlertTriangle, History, BarChart2 } from 'lucide-react'

const HodDashboardPanel: React.FC = () => {
  const { 
    stats, metrics, applications, allDepartmentApplications, 
    escalations, approvalHistory, isLoading, refresh 
  } = useHodDashboard()
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [approvals, setApprovals] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [isReadOnly, setIsReadOnly] = useState(false)

  const openReview = async (app: Application, readOnly = false) => {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('application_id', app.id)
      .order('updated_at', { ascending: true })
    
    setApprovals(data || [])
    setSelectedApp(app)
    setIsReadOnly(readOnly)
  }

  if (isLoading && applications.length === 0) {
    return (
      <div className="nexus-loader-container">
        <div className="nexus-loader"></div>
        <p>Synchronizing HOD Authority Data...</p>
      </div>
    )
  }

  return (
    <div className="hod-dashboard-wrapper">
      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Awaiting My Approval</span>
            <Clock size={16} className="metric-icon" style={{ color: '#A855F7' }} />
          </div>
          <span className="metric-value">{stats.awaiting}</span>
          <div className="metric-progress" style={{ background: 'rgba(168, 85, 247, 0.2)' }}>
            <div className="progress-fill" style={{ width: `${(stats.awaiting / (metrics.totalStudents || 1)) * 100}%`, background: '#A855F7' }}></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Dept Students</span>
            <Users size={16} className="metric-icon" style={{ color: '#00D1FF' }} />
          </div>
          <span className="metric-value">{metrics.totalStudents}</span>
          <div className="metric-progress" style={{ background: 'rgba(0, 209, 255, 0.2)' }}>
            <div className="progress-fill" style={{ width: '100%', background: '#00D1FF' }}></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Fully Cleared</span>
            <CheckCircle size={16} className="metric-icon" style={{ color: '#10B981' }} />
          </div>
          <span className="metric-value">{metrics.totalCleared}</span>
          <div className="metric-progress" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="progress-fill" style={{ width: `${(metrics.totalCleared / (metrics.totalStudents || 1)) * 100}%`, background: '#10B981' }}></div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Approval Accuracy</span>
            <BarChart2 size={16} className="metric-icon" style={{ color: '#F59E0B' }} />
          </div>
          <span className="metric-value">98.4%</span>
          <div className="metric-progress" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
            <div className="progress-fill" style={{ width: '98.4%', background: '#F59E0B' }}></div>
          </div>
        </div>
      </div>

      {/* Main Review Section */}
      <section id="hod-pending" className="nexus-section">
        <div className="section-header">
          <h3 className="serif">Applications Awaiting HOD</h3>
          <div className="header-actions">
            <button className={`toggle-btn ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>My Action</button>
            <button className={`toggle-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Dept</button>
            <button className="refresh-btn" onClick={() => refresh()} title="Manual Refresh"><Clock size={16} /></button>
          </div>
        </div>

        <div className="nexus-table-wrapper">
          <table className="nexus-styled-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>UID</th>
                <th>SUBMITTED</th>
                <th>CURRENT STAGE</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'pending' ? applications : allDepartmentApplications).length > 0 ? (
                (activeTab === 'pending' ? applications : allDepartmentApplications).map(app => (
                  <tr key={app.id}>
                    <td>
                      <div className="user-info">
                        <span className="name">{app.student?.full_name}</span>
                        <span className="sub">@{app.student?.username || 'student'}</span>
                      </div>
                    </td>
                    <td className="mono">{app.student?.student_uid || 'N/A'}</td>
                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    <td><span className={`stage-pill ${app.current_stage}`}>{app.current_stage.toUpperCase()}</span></td>
                    <td>
                      <button 
                        className="nexus-action-btn" 
                        onClick={() => openReview(app, activeTab === 'all' && app.current_stage !== 'hod')}
                      >
                        {activeTab === 'pending' ? 'REVIEW' : 'VIEW'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-state">No applications matching current filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Department Overview & Escalations Grid */}
      <div className="dashboard-grid-two-col">
        {/* Department Overview */}
        <section id="dept-overview" className="nexus-section">
          <h3 className="serif flex-align"><BarChart2 size={20} /> Department Overview</h3>
          <div className="dept-stats-panel">
            <div className="dept-stat-item">
              <span className="label">Total Students in Dept</span>
              <span className="val">{metrics.totalStudents}</span>
            </div>
            <div className="dept-stat-item">
              <span className="label">Clearance Success Rate</span>
              <span className="val">{((metrics.totalCleared / (metrics.totalStudents || 1)) * 100).toFixed(1)}%</span>
            </div>
            <div className="dept-stat-item">
              <span className="label">Active Blockers</span>
              <span className="val highlight">{metrics.pendingDues}</span>
            </div>
          </div>
        </section>

        {/* Faculty Escalations */}
        <section id="faculty-escalations" className="nexus-section">
          <h3 className="serif flex-align"><AlertTriangle size={20} /> Faculty Escalations</h3>
          <div className="escalation-list">
            {escalations.length > 0 ? escalations.map(app => (
              <div key={app.id} className="escalation-item">
                <div className="esc-info">
                  <span className="esc-name">{app.student?.full_name}</span>
                  <span className="esc-reason">Flagged for Priority Review</span>
                </div>
                <button className="esc-btn" onClick={() => openReview(app, true)}>DETAILS</button>
              </div>
            )) : (
              <div className="empty-mini">No faculty escalations reported this session.</div>
            )}
          </div>
        </section>
      </div>

      {/* Approval History */}
      <section id="approval-history" className="nexus-section">
        <h3 className="serif flex-align"><History size={20} /> Approval History</h3>
        <div className="history-list">
          {approvalHistory.length > 0 ? approvalHistory.map(log => (
            <div key={log.id} className="history-item">
              <div className="history-meta">
                <span className={`history-status ${log.status}`}>{log.status.toUpperCase()}</span>
                <span className="history-date">{new Date(log.updated_at).toLocaleString()}</span>
              </div>
              <div className="history-content">
                <strong>{log.application?.student?.full_name}</strong>: {log.comment || 'Approved without additional remarks.'}
              </div>
            </div>
          )) : (
            <div className="empty-mini">No recent approval history found in archive.</div>
          )}
        </div>
      </section>

      {selectedApp && (
        <ApplicationReviewDrawer
          application={selectedApp}
          approvals={approvals}
          actorRole="hod"
          onClose={() => setSelectedApp(null)}
          onAction={() => {
            setSelectedApp(null)
            refresh()
          }}
          readOnly={isReadOnly}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .hod-dashboard-wrapper { display: flex; flex-direction: column; gap: 30px; animation: fadeIn 0.5s ease; padding-bottom: 50px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .metric-card { background: #111; border: 1px solid #222; padding: 25px; border-radius: 16px; display: flex; flex-direction: column; gap: 15px; position: relative; overflow: hidden; }
        .metric-header { display: flex; justify-content: space-between; align-items: center; }
        .metric-label { font-size: 0.7rem; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .metric-value { font-size: 2.2rem; font-weight: 800; color: #fff; line-height: 1; }
        .metric-progress { height: 4px; border-radius: 2px; overflow: hidden; margin-top: 5px; }
        .progress-fill { height: 100%; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }

        .nexus-section { background: #111; border: 1px solid #222; border-radius: 24px; padding: 35px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .header-actions { display: flex; gap: 12px; align-items: center; }
        .toggle-btn { background: #1a1a1a; border: 1px solid #333; color: #666; padding: 10px 20px; border-radius: 10px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .toggle-btn.active { background: #A855F7; color: #fff; border-color: #A855F7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
        .refresh-btn { background: none; border: 1px solid #222; color: #444; padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.3s; }
        .refresh-btn:hover { border-color: #444; color: #888; }
        
        .nexus-table-wrapper { overflow-x: auto; margin: 0 -15px; padding: 0 15px; }
        .nexus-styled-table { width: 100%; border-collapse: collapse; text-align: left; }
        .nexus-styled-table th { padding: 18px; font-size: 0.7rem; color: #555; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #1a1a1a; }
        .nexus-styled-table td { padding: 18px; border-bottom: 1px solid #1a1a1a; font-size: 0.95rem; vertical-align: middle; }
        .user-info { display: flex; flex-direction: column; gap: 2px; }
        .user-info .name { color: #fff; font-weight: 600; }
        .user-info .sub { font-size: 0.75rem; color: #555; }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #777; }
        .stage-pill { font-size: 0.65rem; padding: 6px 12px; border-radius: 6px; background: #1a1a1a; color: #999; border: 1px solid #333; font-weight: 700; }
        .nexus-action-btn { background: #fff; color: #000; border: none; padding: 10px 24px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; cursor: pointer; transition: transform 0.2s; }
        .nexus-action-btn:hover { transform: translateY(-2px); }

        .dashboard-grid-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .flex-align { display: flex; align-items: center; gap: 12px; margin-bottom: 25px; }
        
        .dept-stats-panel { display: flex; flex-direction: column; gap: 15px; }
        .dept-stat-item { display: flex; justify-content: space-between; padding: 20px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; transition: background 0.3s; }
        .dept-stat-item:hover { background: rgba(255,255,255,0.05); }
        .dept-stat-item .label { color: #888; font-size: 0.9rem; }
        .dept-stat-item .val { font-weight: 700; color: #fff; font-size: 1.1rem; }
        .dept-stat-item .val.highlight { color: #F59E0B; }

        .escalation-list { display: flex; flex-direction: column; gap: 12px; }
        .escalation-item { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #161616; border: 1px solid #222; border-radius: 16px; border-left: 4px solid #EF4444; }
        .esc-info { display: flex; flex-direction: column; gap: 4px; }
        .esc-name { font-weight: 700; font-size: 1rem; color: #fff; }
        .esc-reason { font-size: 0.7rem; color: #EF4444; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
        .esc-btn { background: rgba(255,255,255,0.05); border: 1px solid #333; color: #999; padding: 8px 16px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; font-weight: 700; }

        .history-list { display: flex; flex-direction: column; gap: 15px; }
        .history-item { padding: 20px; border-radius: 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.03); }
        .history-meta { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.75rem; }
        .history-status { font-weight: 800; letter-spacing: 0.5px; }
        .history-status.approved { color: #10B981; }
        .history-status.rejected { color: #EF4444; }
        .history-date { color: #555; }
        .history-content { font-size: 0.9rem; color: #aaa; line-height: 1.5; }

        .empty-mini { color: #444; text-align: center; padding: 40px; font-style: italic; font-size: 0.9rem; background: rgba(255,255,255,0.01); border-radius: 16px; border: 1px dashed #222; }
        .nexus-loader-container { height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #555; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  )
}

export default HodDashboardPanel
