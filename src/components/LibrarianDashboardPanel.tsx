import React, { useState } from 'react'
import { useLibrarianDashboard } from '../hooks/useLibrarianDashboard'
import { Upload, FileText, Check, X, AlertCircle, Loader2, Download, Clock, CheckCircle, XCircle, Inbox } from 'lucide-react'
import type { ApplicationWithStudent } from '../types/workflow'
import ApplicationReviewDrawer from './ApplicationReviewDrawer'

const LibrarianDashboardPanel: React.FC = () => {
  const { dues, systemLogs, stats, applications, isLoading, error, uploadCSV, updateDueStatus, refresh } = useLibrarianDashboard()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedApp, setSelectedApp] = useState<ApplicationWithStudent | null>(null)

  const pendingDues = dues.filter(d => d.status === 'pending')
  const clearedDues = dues.filter(d => d.status === 'paid')

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0])
    }
  }

  const processFile = async (file: File) => {
    if (file.type !== "text/csv") {
      alert("Please upload a CSV file.")
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      await uploadCSV(text)
      setUploading(false)
    }
    reader.readAsText(file)
  }

  const downloadSample = () => {
    const csvContent = "student_uid,amount,department\n2022CS0001,500,Library\n2022CS0002,250,Electronics Lab"
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = "sample_dues.csv"
    a.click()
  }

  if (isLoading && applications.length === 0 && dues.length === 0) {
    return (
      <div className="panel-skeleton-container">
        <div className="skeleton-stats">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
        <div className="skeleton-table"></div>
      </div>
    )
  }

  return (
    <div className="librarian-panel">
      {error && (
        <div className="error-box">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px' }}>
        <button className="nexus-primary-btn mini" onClick={() => refresh()}>
          <Clock size={14} /> Refresh Data
        </button>
      </div>

      {/* Stats Grid for Applications */}
      <div className="stats-grid-row">
        <div className="stat-card-premium">
          <div className="stat-icon-bg awaiting"><Clock size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{stats.awaiting}</span>
            <span className="stat-label">Awaiting My Review</span>
          </div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon-bg approved"><CheckCircle size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{stats.approved}</span>
            <span className="stat-label">Approved by Me</span>
          </div>
        </div>
        <div className="stat-card-premium">
          <div className="stat-icon-bg rejected"><XCircle size={20} /></div>
          <div className="stat-main">
            <span className="stat-num">{stats.rejected}</span>
            <span className="stat-label">Rejected by Me</span>
          </div>
        </div>
      </div>

      {/* Applications Section */}
      <div className="main-content-card">
        <div className="card-header-flex">
          <div className="title-group">
            <h3 className="serif">Applications Pending Review</h3>
            <p className="subtitle label">STAGE: LIBRARIAN</p>
          </div>
        </div>

        <div className="nexus-table-wrapper">
          <table className="nexus-styled-table">
            <thead>
              <tr>
                <th>STUDENT NAME</th>
                <th>STUDENT UID</th>
                <th>PURPOSE</th>
                <th>DOCS</th>
                <th>SUBMITTED DATE</th>
                <th>STATUS</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {applications.length > 0 ? applications.map(app => {
                let purposeType = 'N/A'
                try {
                   purposeType = app.purpose ? JSON.parse(app.purpose).type : 'N/A'
                } catch {
                   purposeType = app.purpose || 'N/A'
                }

                return (
                  <tr key={app.id}>
                    <td>
                      <div className="student-profile-cell">
                        <span className="full-name">{app.student?.full_name}</span>
                        <span className="username label">@{app.student?.username}</span>
                      </div>
                    </td>
                    <td><span className="uid-text mono">{app.student?.student_uid}</span></td>
                    <td><span className="purpose-label">{purposeType}</span></td>
                    <td>
                      <div className="docs-count">
                        <FileText size={14} />
                        <span>{app.document_ids?.length || 0}</span>
                      </div>
                    </td>
                    <td>{new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td><span className="badge-status-pending">Awaiting Review</span></td>
                    <td className="text-right">
                      <button className="review-action-btn" onClick={() => setSelectedApp(app)}>Review</button>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state-table">
                      <Inbox size={48} />
                      <h4>No applications awaiting your review.</h4>
                      <p>All applications have been processed.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dues Upload Section */}
      <section id="dues-upload" className="dues-upload-section">
        <div className="section-header">
          <h3 className="serif">Flat-File Dues Upload</h3>
          <button onClick={downloadSample} className="text-btn">
            <Download size={14} /> Download Sample CSV
          </button>
        </div>
        
        <div 
          className={`upload-zone ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="upload-progress">
              <Loader2 className="spinner" size={32} />
              <p>Processing Records...</p>
            </div>
          ) : (
            <div className="upload-prompt">
              <Upload size={40} className="upload-icon" />
              <p className="main-prompt">Drag & Drop Institutional CSV</p>
              <p className="sub-prompt">Format: student_uid, amount, department</p>
              <input 
                type="file" 
                id="csv-upload" 
                className="hidden-input" 
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              <label htmlFor="csv-upload" className="nexus-primary-btn mini">Browse Files</label>
            </div>
          )}
        </div>
      </section>

      {/* Dues Registry Section */}
      <section id="dues-registry" className="dues-registry-section">
        <h3 className="serif">Student Dues Registry (Pending)</h3>
        <div className="dues-table-container">
          {isLoading && pendingDues.length === 0 ? (
            <div className="loading-state">
              <Loader2 className="spinner" />
              <span>Loading records...</span>
            </div>
          ) : pendingDues.length > 0 ? (
            <table className="dues-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>UID</th>
                  <th>DEPARTMENT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pendingDues.map(due => (
                  <tr key={due.id}>
                    <td>{due.student?.full_name || 'Unknown'}</td>
                    <td className="mono">{due.student?.student_uid}</td>
                    <td>{due.department}</td>
                    <td className="amount">₹{due.amount}</td>
                    <td>
                      <span className={`status-pill ${due.status}`}>
                        {due.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="action-btn approve" 
                        onClick={() => updateDueStatus(due.id, 'paid')}
                        title="Mark as Paid"
                      >
                        <Check size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <FileText size={48} />
              <p>No pending dues records found.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cleared Students Section */}
      <section id="cleared-students" className="dues-registry-section">
        <h3 className="serif">Cleared Students</h3>
        <div className="dues-table-container">
          {clearedDues.length > 0 ? (
            <table className="dues-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>UID</th>
                  <th>DEPARTMENT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {clearedDues.map(due => (
                  <tr key={due.id}>
                    <td>{due.student?.full_name || 'Unknown'}</td>
                    <td className="mono">{due.student?.student_uid}</td>
                    <td>{due.department}</td>
                    <td className="amount">₹{due.amount}</td>
                    <td>
                      <span className={`status-pill ${due.status}`}>
                        {due.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="actions">
                      <button 
                        className="action-btn revert" 
                        onClick={() => updateDueStatus(due.id, 'pending')}
                        title="Revert to Pending"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <CheckCircle size={32} style={{ opacity: 0.5 }} />
              <p>No cleared students yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* System Logs Section */}
      <section id="system-logs" className="dues-registry-section">
        <h3 className="serif">System Logs</h3>
        <div className="dues-table-container" style={{ padding: '20px' }}>
          {systemLogs.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {systemLogs.map(log => (
                <li key={log.id} style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', borderBottom: '1px solid #1a1a1a', paddingBottom: '15px' }}>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: log.status === 'approved' ? '#10B981' : '#EF4444' }}>
                    {log.status === 'approved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
                      <strong>Application {log.status.toUpperCase()}</strong> for {log.application?.student?.full_name} ({log.application?.student?.student_uid})
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>
                      Comment: "{log.comment}"
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '6px' }}>
                      {new Date(log.updated_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state" style={{ padding: '40px' }}>
              <Inbox size={32} style={{ opacity: 0.5 }} />
              <p>No recent activity logs.</p>
            </div>
          )}
        </div>
      </section>

      {selectedApp && (
        <ApplicationReviewDrawer
          application={selectedApp}
          actorRole="librarian"
          onClose={() => setSelectedApp(null)}
          onAction={() => {
            setSelectedApp(null)
            refresh()
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .librarian-panel { display: flex; flex-direction: column; gap: 40px; animation: fadeIn 0.5s ease; }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .text-btn { background: none; border: none; color: var(--accent-color); font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; opacity: 0.8; }
        .text-btn:hover { opacity: 1; text-decoration: underline; }
        
        .upload-zone { border: 2px dashed #222; background: rgba(255,255,255,0.01); border-radius: 16px; padding: 60px; text-align: center; transition: 0.3s; position: relative; }
        .upload-zone.active { border-color: var(--accent-color); background: rgba(201,168,76,0.05); }
        .upload-icon { color: #333; margin-bottom: 20px; transition: 0.3s; }
        .upload-zone.active .upload-icon { color: var(--accent-color); transform: translateY(-10px); }
        
        .main-prompt { font-size: 1.2rem; font-weight: 600; margin-bottom: 8px; }
        .sub-prompt { font-size: 0.8rem; color: #555; margin-bottom: 24px; }
        .hidden-input { display: none; }
        .nexus-primary-btn.mini { padding: 10px 20px; font-size: 0.75rem; display: inline-flex; }

        .dues-table-container { background: rgba(255,255,255,0.01); border: 1px solid #1a1a1a; border-radius: 12px; overflow: hidden; }
        .dues-table { width: 100%; border-collapse: collapse; }
        .dues-table th { text-align: left; padding: 16px 24px; font-size: 0.65rem; color: #444; letter-spacing: 0.1em; border-bottom: 1px solid #1a1a1a; }
        .dues-table td { padding: 16px 24px; border-bottom: 1px solid #0f0f0f; font-size: 0.9rem; }
        .dues-table tr:last-child td { border-bottom: none; }
        
        .amount { font-weight: 700; color: #fff; }
        .status-pill { padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; }
        .status-pill.pending { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
        .status-pill.paid { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        
        .actions { display: flex; gap: 8px; }
        .action-btn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #222; background: #0a0a0a; color: #444; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .action-btn.approve:hover { background: #10B981; color: #000; border-color: #10B981; }
        .action-btn.revert:hover { background: #EF4444; color: #fff; border-color: #EF4444; }

        .empty-state, .loading-state { padding: 80px; text-align: center; color: #333; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .error-box { background: rgba(239, 68, 68, 0.1); color: #EF4444; padding: 16px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; font-size: 0.9rem; }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Application Styles from Lab Panel */
        .stats-grid-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 10px; }
        .stat-card-premium { background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; padding: 30px; border-radius: 12px; display: flex; align-items: center; gap: 20px; transition: 0.3s; }
        .stat-card-premium:hover { border-color: #333; transform: translateY(-2px); }
        .stat-icon-bg { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .stat-icon-bg.awaiting { background: rgba(201, 168, 76, 0.1); color: var(--accent-color); }
        .stat-icon-bg.approved { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .stat-icon-bg.rejected { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
        .stat-main { display: flex; flex-direction: column; }
        .stat-num { font-size: 1.8rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
        .stat-label { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.5; }

        .main-content-card { background: rgba(255,255,255,0.01); border: 1px solid #1a1a1a; border-radius: 16px; overflow: hidden; margin-bottom: 40px; }
        .card-header-flex { padding: 30px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1a1a1a; }
        .title-group h3 { font-size: 1.5rem; margin: 0 0 4px 0; }
        .subtitle { color: #555; }

        .nexus-table-wrapper { width: 100%; overflow-x: auto; }
        .nexus-styled-table { width: 100%; border-collapse: collapse; text-align: left; }
        .nexus-styled-table th { padding: 20px 40px; font-size: 0.65rem; color: #444; font-weight: 800; letter-spacing: 0.15em; border-bottom: 1px solid #1a1a1a; }
        .nexus-styled-table td { padding: 24px 40px; border-bottom: 1px solid #0f0f0f; vertical-align: middle; }
        .nexus-styled-table tr:last-child td { border-bottom: none; }
        
        .student-profile-cell { display: flex; flex-direction: column; }
        .student-profile-cell .full-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 4px; }
        .student-profile-cell .username { opacity: 0.5; }
        .uid-text { color: var(--accent-color); font-weight: 600; letter-spacing: 1px; }
        .purpose-label { padding: 6px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.8rem; }
        .docs-count { display: inline-flex; align-items: center; gap: 6px; background: rgba(201, 168, 76, 0.1); color: var(--accent-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
        .badge-status-pending { padding: 6px 12px; background: rgba(239, 68, 68, 0.1); color: #EF4444; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid rgba(239, 68, 68, 0.2); }
        .review-action-btn { background: #fff; color: #000; border: none; padding: 10px 24px; border-radius: 6px; font-weight: 800; font-size: 0.8rem; cursor: pointer; transition: 0.3s; }
        .review-action-btn:hover { background: var(--accent-color); }
        .empty-state-table { padding: 60px; text-align: center; color: #555; display: flex; flex-direction: column; align-items: center; gap: 15px; }
        .empty-state-table h4 { font-size: 1.2rem; color: #fff; margin: 0; }
      `}} />
    </div>
  )
}

export default LibrarianDashboardPanel
