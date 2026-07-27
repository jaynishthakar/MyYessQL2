import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Approval, ApprovalRole, Document, ParsedPurpose } from '../types/workflow'
import ApplicationStatusTracker from './ApplicationStatusTracker'
import { X, FileText, Image as ImageIcon, Download, CheckCircle, XCircle } from 'lucide-react'

interface ApplicationReviewDrawerProps {
  application: any // Using any to accommodate different dashboard data structures
  actorRole: ApprovalRole
  readOnly?: boolean
  approvals?: Approval[]
  onClose: () => void
  onAction: () => void
}

const ApplicationReviewDrawer: React.FC<ApplicationReviewDrawerProps> = ({
  application,
  approvals: initialApprovals,
  actorRole,
  readOnly = false,
  onClose,
  onAction
}) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals || [])
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Safety check to prevent crashes if application is not provided
  if (!application) return null

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Documents
        if (application.document_ids && application.document_ids.length > 0) {
          const { data: docs } = await supabase
            .from('documents')
            .select('*')
            .in('id', application.document_ids)
          if (docs) setDocuments(docs)
        }

        // Fetch Approvals for status tracker
        const { data: apps } = await supabase
          .from('approvals')
          .select('*')
          .eq('application_id', application.id)
          .order('updated_at', { ascending: true })
        if (apps) setApprovals(apps)

      } catch (err) {
        console.error("Error fetching review data:", err)
      }
    }
    fetchData()
  // CRITICAL: only depend on application.id (a stable string).
  // document_ids is an array — new reference on every render = infinite loop.
  }, [application.id])

  const myApproval = approvals.find(a => a.role === actorRole)
  const hasAlreadyActed = myApproval && myApproval.status !== 'pending'

  const handleAction = async (status: 'approved' | 'rejected') => {
    setIsSubmitting(true)
    setActionError(null)

    // Guard against demo/mock data that has no real DB record
    if (application.id.startsWith('p-mock') || application.id.startsWith('l-mock') || application.id.startsWith('h-mock') || application.id.startsWith('cert-demo')) {
      setActionError('This is demo data only. Submit a real application to use this feature.')
      setIsSubmitting(false)
      return
    }

    try {
      const actorId = (await supabase.auth.getUser()).data.user?.id

      // 1. Find existing approval record to get its ID
      const { data: existingApproval } = await supabase
        .from('approvals')
        .select('id')
        .eq('application_id', application.id)
        .eq('role', actorRole)
        .maybeSingle()

      if (status === 'approved') {
        const { error: approvalError } = await supabase
          .from('approvals')
          .upsert({
            id: existingApproval?.id, // Use ID if it exists to avoid constraint errors
            application_id: application.id,
            role: actorRole,
            status: 'approved',
            comment,
            actor_id: actorId,
            updated_at: new Date().toISOString()
          })

        if (approvalError) throw approvalError

        // Advance stage
        const stageAdvanceMap: Record<string, string> = {
          librarian: 'lab',
          lab: 'hod',
          hod: 'principal'
        }

        if (actorRole === 'principal') {
          const { error: appError } = await supabase
            .from('applications')
            .update({ status: 'approved', current_stage: 'approved' })
            .eq('id', application.id)
          if (appError) throw appError
        } else {
          const nextStage = stageAdvanceMap[actorRole] || actorRole
          const { error: appError } = await supabase
            .from('applications')
            .update({ current_stage: nextStage })
            .eq('id', application.id)
          if (appError) throw appError
        }

      } else {
        // REJECTION — regress application to previous stage for re-review
        const stageRegressMap: Record<string, { stage: string; status: string; resetRole: string | null }> = {
          principal: { stage: 'hod',      status: 'hod_pending',      resetRole: 'hod' },
          hod:       { stage: 'lab',       status: 'lab_pending',       resetRole: 'lab' },
          lab:       { stage: 'librarian', status: 'librarian_pending', resetRole: 'librarian' },
          librarian: { stage: 'librarian', status: 'librarian_pending', resetRole: null }
        }
        const regression = stageRegressMap[actorRole]

        // 1. Mark THIS actor's approval as rejected
        await supabase
          .from('approvals')
          .upsert({
            id: existingApproval?.id,
            application_id: application.id,
            role: actorRole,
            status: 'rejected',
            comment,
            actor_id: actorId,
            updated_at: new Date().toISOString()
          })

        // 2. Reset the PREVIOUS stage's approval back to pending
        if (regression.resetRole) {
          // Find the previous stage's approval ID
          const { data: prevApproval } = await supabase
            .from('approvals')
            .select('id')
            .eq('application_id', application.id)
            .eq('role', regression.resetRole)
            .maybeSingle()

          await supabase
            .from('approvals')
            .upsert({
              id: prevApproval?.id,
              application_id: application.id,
              role: regression.resetRole,
              status: 'pending',
              comment: null,
              actor_id: null,
              updated_at: new Date().toISOString()
            })
        }

        // 3. Regress the application stage
        const { error: appError } = await supabase
          .from('applications')
          .update({ status: regression.status as any, current_stage: regression.stage })
          .eq('id', application.id)
        if (appError) throw appError
      }

      onAction()
    } catch (err: any) {
      console.error('Action error:', err)
      setActionError(err.message || 'An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const parsePurpose = (purposeStr: string | null | undefined): ParsedPurpose => {
    try {
      if (!purposeStr) return { type: 'N/A', notes: 'No notes provided.' }
      return JSON.parse(purposeStr)
    } catch {
      return { type: purposeStr || 'N/A', notes: '' }
    }
  }

  const purpose = parsePurpose(application.purpose)

  const downloadDocument = async (doc: Document) => {
    try {
      // Extract storage path from public URL
      const path = doc.file_url.split('/documents/').pop();
      if (!path) throw new Error('Invalid file URL');
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(path)
      
      if (error) throw error;

      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.file_name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error("Download error:", err)
      alert(`Failed to download: ${err.message}`)
    }
  }

  return (
    <>
      <div className="review-drawer-overlay" onClick={onClose} />
      <div className={`review-drawer-side ${selectedDoc ? 'split-view' : ''}`}>
        <header className="drawer-header">
          <div className="student-badge">
            <h2 className="serif">{application.student?.full_name}</h2>
            <div className="meta-row">
              <span className="label text-accent">{application.student?.student_uid}</span>
              <span className="separator">•</span>
              <span className="label">{application.student?.department}</span>
            </div>
          </div>
          <button className="close-icon-btn" onClick={onClose}><X size={24} /></button>
        </header>

        <div className="drawer-main-content">
          <div className="drawer-scroll-content">
            <section className="drawer-block">
              <h4 className="block-title">APPLICATION DETAILS</h4>
              <div className="details-card">
                <div className="details-grid-secondary">
                  <div className="detail-item">
                    <span className="label">PURPOSE</span>
                    <p className="value">{purpose.type}</p>
                  </div>
                  <div className="detail-item">
                    <span className="label">CGPA</span>
                    <p className="value">{purpose.cgpa || 'N/A'}</p>
                  </div>
                  <div className="detail-item">
                    <span className="label">PHONE</span>
                    <p className="value">{purpose.phone || 'N/A'}</p>
                  </div>
                </div>

                <div className="detail-item" style={{ marginTop: '20px' }}>
                  <span className="label">ADDRESS</span>
                  <p className="value">{purpose.address} {purpose.pincode ? `(PIN: ${purpose.pincode})` : ''}</p>
                </div>

                {purpose.notes && (
                  <div className="detail-item" style={{ marginTop: '20px' }}>
                    <span className="label">ADDITIONAL NOTES</span>
                    <p className="value notes">{purpose.notes}</p>
                  </div>
                )}
              </div>
            </section>

            <section className="drawer-block">
              <h4 className="block-title">ATTACHED DOCUMENTS</h4>
              <div className="docs-vertical-list">
                {documents.length > 0 ? documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className={`doc-row-item ${selectedDoc?.id === doc.id ? 'active' : ''}`}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div className="doc-type-icon">
                      {doc.file_type.includes('pdf') ? <FileText size={20} /> : <ImageIcon size={20} />}
                    </div>
                    <div className="doc-main-info">
                      <span className="filename">{doc.file_name}</span>
                      <span className="filedate label">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <div className="doc-row-actions">
                      <button className="icon-action-btn" onClick={(e) => { e.stopPropagation(); downloadDocument(doc); }} title="Download"><Download size={18} /></button>
                    </div>
                  </div>
                )) : <div className="empty-inline">No documents attached.</div>}
              </div>
            </section>

            <section className="drawer-block">
              <h4 className="block-title">APPROVAL TRAIL</h4>
              <ApplicationStatusTracker application={application} approvals={approvals} />
            </section>

            {!readOnly && (
              <section className="drawer-block action-area">
                <h4 className="block-title">YOUR DECISION</h4>
                {hasAlreadyActed ? (
                  <div className={`decision-summary ${myApproval.status}`}>
                    <div className="summary-header">
                      {myApproval.status === 'approved' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                      <span>You {myApproval.status} this application</span>
                    </div>
                    {myApproval.comment && <p className="summary-comment">"{myApproval.comment}"</p>}
                  </div>
                ) : (
                  <div className="action-form">
                    <textarea 
                      placeholder="Add a comment (visible to student)..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="review-input"
                    />
                    {actionError && (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#EF4444', fontSize: '0.85rem', marginBottom: '12px' }}>
                        ⚠ {actionError}
                      </div>
                    )}
                    <div className="button-group">
                      <button 
                        className="reject-btn" 
                        onClick={() => handleAction('rejected')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : 'Reject'}
                      </button>
                      <button 
                        className="approve-btn" 
                        onClick={() => handleAction('approved')}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Processing...' : 'Approve Application'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>

          {selectedDoc && (
            <div className="side-document-viewer">
              <header className="viewer-header">
                <span className="label">VERIFICATION VIEW</span>
                <button className="close-viewer-btn" onClick={() => setSelectedDoc(null)}><X size={16} /></button>
              </header>
              <div className="viewer-body">
                {selectedDoc.file_type.includes('pdf') ? (
                  <iframe src={selectedDoc.file_url} className="pdf-viewer-inline" title="PDF Viewer" />
                ) : (
                  <img src={selectedDoc.file_url} className="img-viewer-inline" alt="Document" />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .review-drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .review-drawer-side {
          position: fixed;
          top: 0;
          right: 0;
          width: 600px;
          height: 100%;
          background: #0a0a0a;
          z-index: 1001;
          border-left: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          box-shadow: -20px 0 60px rgba(0,0,0,0.8);
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .review-drawer-side.split-view { width: 1200px; }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .drawer-main-content { display: flex; flex: 1; overflow: hidden; }

        .drawer-header {
          padding: 30px 40px;
          border-bottom: 1px solid #1a1a1a;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .student-badge h2 { font-size: 1.8rem; margin: 0 0 4px 0; }
        .meta-row { display: flex; align-items: center; gap: 12px; }
        .separator { opacity: 0.3; }
        .close-icon-btn { opacity: 0.5; transition: 0.2s; background: none; border: none; color: #fff; cursor: pointer; }
        .close-icon-btn:hover { opacity: 1; color: var(--accent-color); }

        .drawer-scroll-content {
          flex: 1;
          overflow-y: auto;
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          border-right: 1px solid #1a1a1a;
        }
        .block-title { font-size: 0.6rem; letter-spacing: 0.2em; color: #444; margin-bottom: 16px; font-weight: 800; }
        
        .details-card { background: #0d0d0d; border: 1px solid #1a1a1a; padding: 20px; border-radius: 8px; }
        .details-grid-secondary { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        .detail-item .label { font-size: 0.55rem; color: #444; }
        .detail-item .value { font-size: 0.95rem; font-weight: 600; margin-top: 2px; }
        .detail-item .notes { font-size: 0.8rem; color: #777; line-height: 1.5; }

        .docs-vertical-list { display: flex; flex-direction: column; gap: 8px; }
        .doc-row-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          background: #0d0d0d;
          border: 1px solid #1a1a1a;
          border-radius: 8px;
          transition: 0.2s;
          cursor: pointer;
        }
        .doc-row-item:hover { border-color: #333; background: #111; }
        .doc-row-item.active { border-color: var(--accent-color); background: rgba(201, 168, 76, 0.03); }
        .doc-type-icon { color: var(--accent-color); margin-right: 12px; opacity: 0.6; }
        .doc-main-info { flex: 1; display: flex; flex-direction: column; }
        .filename { font-size: 0.8rem; font-weight: 600; }
        .filedate { font-size: 0.6rem; opacity: 0.4; }
        .doc-row-actions { display: flex; gap: 8px; }
        .icon-action-btn { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: transparent; color: #444; transition: 0.2s; border: none; cursor: pointer; }
        .icon-action-btn:hover { background: #222; color: var(--accent-color); }

        .side-document-viewer { flex: 1; background: #000; display: flex; flex-direction: column; }
        .viewer-header { padding: 12px 20px; background: #080808; border-bottom: 1px solid #1a1a1a; display: flex; justify-content: space-between; align-items: center; }
        .viewer-header .label { font-size: 0.6rem; letter-spacing: 0.1em; color: var(--accent-color); font-weight: 800; }
        .close-viewer-btn { background: none; border: none; color: #444; cursor: pointer; }
        .viewer-body { flex: 1; position: relative; }
        .pdf-viewer-inline { width: 100%; height: 100%; border: none; }
        .img-viewer-inline { width: 100%; height: 100%; object-fit: contain; }

        .action-form { display: flex; flex-direction: column; gap: 16px; }
        .review-input {
          width: 100%;
          min-height: 80px;
          background: #0d0d0d;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 12px;
          color: white;
          font-family: inherit;
          resize: vertical;
          font-size: 0.85rem;
        }
        .button-group { display: flex; gap: 12px; }
        .approve-btn { flex: 2; background: var(--accent-color); color: #000; font-weight: 800; padding: 14px; border-radius: 8px; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; border: none; cursor: pointer; }
        .reject-btn { flex: 1; background: transparent; color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 14px; border-radius: 8px; font-weight: 700; text-transform: uppercase; font-size: 0.7rem; cursor: pointer; }
        
        .decision-summary { padding: 20px; border-radius: 8px; }
        .decision-summary.approved { background: rgba(16, 185, 129, 0.03); border: 1px solid rgba(16, 185, 129, 0.1); color: #10B981; }
        .decision-summary.rejected { background: rgba(239, 68, 68, 0.03); border: 1px solid rgba(239, 68, 68, 0.1); color: #EF4444; }
      ` }} />
    </>
  )
}

export default ApplicationReviewDrawer
