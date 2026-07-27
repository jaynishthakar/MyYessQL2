import React, { useState } from 'react'
import { usePrincipalDashboard } from '../hooks/usePrincipalDashboard'
import type { Application } from '../types/workflow'
import ApplicationReviewDrawer from './ApplicationReviewDrawer'
import { FileText, Search, RefreshCw, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import CertificateGenerator from './CertificateGenerator'

const PrincipalDashboardPanel: React.FC = () => {
  const { 
    applications, certificateQueue, studentRegistry, 
    isLoading, refresh, error 
  } = usePrincipalDashboard()
  
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [approvals, setApprovals] = useState<any[]>([])
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const openReview = async (app: Application, readOnly = false) => {
    try {
      const { data } = await supabase
        .from('approvals')
        .select('*')
        .eq('application_id', app.id)
        .order('updated_at', { ascending: true })
      
      setApprovals(data || [])
      setSelectedApp(app)
      setIsReadOnly(readOnly)
    } catch (err) {
      console.error("Failed to load review:", err)
      // Fallback: open with empty approvals if fetch fails
      setApprovals([])
      setSelectedApp(app)
      setIsReadOnly(readOnly)
    }
  }

  if (isLoading && applications.length === 0 && !error) {
    return (
      <div className="nexus-loading-area">
        <div className="spinner-dots">
          <div></div><div></div><div></div>
        </div>
        <p>Synchronizing Institution Records...</p>
      </div>
    )
  }

  const filteredStudents = studentRegistry.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.student_uid?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="principal-panel-root">
      {error && <div className="error-banner"><AlertCircle size={16} /> {error}</div>}

      <div className="principal-content-stack">
        
        {/* SECTION: CERTIFICATE QUEUE */}
        <section id="cert-queue" className="principal-section">
          <div className="section-header">
            <div className="title-block">
              <h3 className="serif">Certificate Generation Queue</h3>
              <p className="label">Ready for Graduation/Clearance Certificates</p>
            </div>
            <button className="nexus-btn-ghost" onClick={() => refresh()}><RefreshCw size={14} /> Sync</button>
          </div>
          <div className="nexus-table-wrapper">
            <table className="nexus-styled-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>UID</th>
                  <th>DEPARTMENT</th>
                  <th>CLEARED ON</th>
                  <th className="text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {certificateQueue.length > 0 ? certificateQueue.map(app => (
                  <tr key={app.id}>
                    <td><span className="text-white font-bold">{app.student?.full_name}</span></td>
                    <td className="mono">{app.student?.student_uid}</td>
                    <td><span className="dept-badge">{app.department}</span></td>
                    <td>{new Date(app.updated_at || app.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <CertificateGenerator 
                        studentName={app.student?.full_name || 'N/A'}
                        studentUid={app.student?.student_uid || 'N/A'}
                        department={app.department || 'N/A'}
                        completionDate={app.updated_at || app.created_at}
                        applicationId={app.id}
                      />
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="empty-mini">No applications in certificate queue.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: PENDING FINAL APPROVALS */}
        <section id="pending-final" className="principal-section">
          <div className="section-header">
            <div className="title-block">
              <h3 className="serif">Pending Final Approvals</h3>
              <p className="label">Awaiting Principal's Signature</p>
            </div>
          </div>
          <div className="nexus-table-wrapper">
            <table className="nexus-styled-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>DEPARTMENT</th>
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
                        <span className="uid-label mono">{app.student?.student_uid}</span>
                      </div>
                    </td>
                    <td>{app.department}</td>
                    <td>
                      <div className="docs-count">
                        <FileText size={14} /> {app.document_ids?.length || 0}
                      </div>
                    </td>
                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button className="nexus-btn-primary" onClick={() => openReview(app)}>FINAL REVIEW</button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="empty-mini">No applications awaiting your signature.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION: FULL STUDENT REGISTRY */}
        <section id="student-registry" className="principal-section">
          <div className="section-header">
            <div className="title-block">
              <h3 className="serif">Full Student Registry</h3>
              <p className="label">Institution-wide Student Database</p>
            </div>
            <div className="search-box-premium">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search UID or Name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="nexus-table-wrapper">
            <table className="nexus-styled-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>UID</th>
                  <th>DEPARTMENT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td><span className="text-white font-bold">{student.full_name}</span></td>
                    <td className="mono">{student.student_uid}</td>
                    <td>{student.department || 'General'}</td>
                    <td>
                      <span className={`role-badge ${student.role}`}>ACTIVE STUDENT</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="empty-mini">No students found matching search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>

      {selectedApp && (
        <ApplicationReviewDrawer
          application={selectedApp}
          approvals={approvals}
          actorRole="principal"
          readOnly={isReadOnly}
          onClose={() => setSelectedApp(null)}
          onAction={() => {
            setSelectedApp(null)
            refresh()
          }}
        />
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .principal-panel-root { display: flex; flex-direction: column; gap: 40px; animation: fadeIn 0.5s ease; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .metric-card-premium { background: #111; border: 1px solid #222; padding: 25px; border-radius: 24px; display: flex; align-items: center; gap: 20px; position: relative; overflow: hidden; }
        .metric-card-premium::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(45deg, transparent, rgba(255,255,255,0.02)); pointer-events: none; }
        
        .metric-icon { width: 50px; height: 50px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .metric-icon.gold { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
        .metric-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
        .metric-icon.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .metric-icon.purple { background: rgba(168, 85, 247, 0.1); color: #A855F7; }
        
        .metric-info { display: flex; flex-direction: column; }
        .metric-label { font-size: 0.7rem; color: #555; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
        .metric-value { font-size: 1.8rem; font-weight: 900; color: #fff; line-height: 1.1; }
        .metric-chart-mini { position: absolute; right: 20px; top: 20px; color: #222; }

        .principal-content-stack { display: flex; flex-direction: column; gap: 40px; }
        .principal-section { background: #111; border: 1px solid #222; border-radius: 28px; padding: 40px; scroll-margin-top: 100px; }
        .section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 35px; }
        .title-block h3 { font-size: 1.6rem; color: #fff; margin-bottom: 5px; }
        .title-block .label { font-size: 0.75rem; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

        .search-box-premium { background: #161616; border: 1px solid #333; border-radius: 12px; display: flex; align-items: center; padding: 0 15px; width: 300px; }
        .search-box-premium input { background: none; border: none; color: #fff; padding: 12px; font-size: 0.85rem; width: 100%; outline: none; }
        .search-box-premium svg { color: #555; }

        .nexus-styled-table { width: 100%; border-collapse: collapse; }
        .nexus-styled-table th { text-align: left; padding: 15px; font-size: 0.7rem; color: #444; border-bottom: 2px solid #1a1a1a; text-transform: uppercase; }
        .nexus-styled-table td { padding: 20px 15px; border-bottom: 1px solid #1a1a1a; font-size: 0.95rem; color: #aaa; }
        
        .student-profile-cell { display: flex; flex-direction: column; }
        .student-profile-cell .full-name { color: #fff; font-weight: 700; font-size: 1rem; }
        .uid-label { font-size: 0.8rem; color: #555; }
        .dept-badge { background: rgba(59, 130, 246, 0.1); color: #3B82F6; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 800; border: 1px solid rgba(59, 130, 246, 0.2); }
        .role-badge { font-size: 0.65rem; font-weight: 800; padding: 4px 8px; border-radius: 4px; }
        .role-badge.student { background: rgba(16, 185, 129, 0.1); color: #10B981; }

        .nexus-btn-primary { background: #fff; color: #000; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 800; font-size: 0.8rem; cursor: pointer; }
        .nexus-btn-primary.small { padding: 8px 16px; font-size: 0.7rem; }
        .nexus-btn-ghost { background: none; border: 1px solid #222; color: #444; padding: 8px 16px; border-radius: 8px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 8px; }

        .empty-mini { text-align: center; padding: 60px; color: #333; font-style: italic; }
        .nexus-loading-area { height: 500px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #666; }
        .spinner-dots { display: flex; gap: 8px; }
        .spinner-dots div { width: 10px; height: 10px; background: #F59E0B; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
        .spinner-dots div:nth-child(1) { animation-delay: -0.32s; }
        .spinner-dots div:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  )
}

export default PrincipalDashboardPanel
