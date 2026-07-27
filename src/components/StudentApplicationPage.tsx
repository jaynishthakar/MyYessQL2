import React, { useState, useEffect } from 'react'
import { useStudentApplication } from '../hooks/useStudentApplication'
import { useAuth } from '../contexts/AuthContext'
import ApplicationStatusTracker from './ApplicationStatusTracker'
import {
  FileText,
  CheckCircle,
  ChevronRight,
  Info,
  AlertCircle,
  ExternalLink,
  Loader2,
  X,
  Archive
} from 'lucide-react'
import PaymentModal from './PaymentModal'
import { generateCertificate } from '../lib/CertificateGenerator'
import { exportDigitalLocker } from '../lib/LockerExport'
import { Link } from 'react-router-dom'

const StudentApplicationPage: React.FC = () => {
  const {
    application,
    approvals,
    vaultDocuments,
    profile,
    isLoading,
    isSaving,
    showSaved,
    createApplication,
    updateField,
    updateDocumentSelection,
    submitApplication,
    handlePaymentSuccess,
    dues,
    error
  } = useStudentApplication()

  const { user } = useAuth()

  const [declarationChecked, setDeclarationChecked] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isJustSubmitted, setIsJustSubmitted] = useState(false)
  const [parsedPurpose, setParsedPurpose] = useState({
    type: '',
    notes: '',
    cgpa: '',
    phone: '',
    address: '',
    pincode: ''
  })

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [duesToPay, setDuesToPay] = useState<any[]>([])

  useEffect(() => {
    if (application?.purpose) {
      try {
        const data = JSON.parse(application.purpose)
        setParsedPurpose({
          type: data.type || '',
          notes: data.notes || '',
          cgpa: data.cgpa || '',
          phone: data.phone || '',
          address: data.address || '',
          pincode: data.pincode || ''
        })
      } catch {
        setParsedPurpose(prev => ({ ...prev, type: application.purpose || '' }))
      }
    }
  }, [application?.purpose])

  const handlePurposeChange = (type: string) => {
    const newPurpose = { ...parsedPurpose, type }
    setParsedPurpose(newPurpose)
    updateField('purpose', JSON.stringify(newPurpose))
  }

  const handleNotesChange = (notes: string) => {
    if (notes.length > 500) return
    const newPurpose = { ...parsedPurpose, notes }
    setParsedPurpose(newPurpose)
    updateField('purpose', JSON.stringify(newPurpose))
  }

  const handleDataChange = (field: string, value: string) => {
    const newPurpose = { ...parsedPurpose, [field]: value }
    setParsedPurpose(newPurpose)
    updateField('purpose', JSON.stringify(newPurpose))
  }

  const toggleDocument = (docId: string) => {
    if (application?.is_submitted) return
    const currentIds = application?.document_ids || []
    const newIds = currentIds.includes(docId)
      ? currentIds.filter(id => id !== docId)
      : [...currentIds, docId]
    updateDocumentSelection(newIds)
  }

  const handleFinalSubmit = async () => {
    setShowConfirmModal(false)
    await submitApplication()
    setIsJustSubmitted(true)
  }

  const canSubmit =
    application &&
    application.department &&
    application.department !== 'Unassigned' &&
    parsedPurpose.type !== '' &&
    parsedPurpose.cgpa !== '' &&
    parsedPurpose.phone !== '' &&
    parsedPurpose.address !== '' &&
    parsedPurpose.pincode !== '' &&
    (application.document_ids?.length || 0) >= 3 &&
    declarationChecked &&
    !dues.some(d => d.status === 'pending')
    
  const pendingDues = dues.filter(d => d.status === 'pending')
  const totalDuesAmount = pendingDues.reduce((sum, d) => sum + d.amount, 0)

  const handleOpenPayment = (duesList: any[]) => {
    setDuesToPay(duesList)
    setIsPaymentModalOpen(true)
  }

  const handleDownloadCertificate = () => {
    if (!application || !profile) return
    generateCertificate({
      studentName: profile.full_name,
      studentUid: profile.student_uid,
      department: application.department || 'N/A',
      batch: '2022-2026', // Mock batch
      issueDate: new Date().toLocaleDateString(),
      certificateId: application.id.substring(0, 8).toUpperCase()
    })
  }

  const handleExportLocker = () => {
    if (!user || !profile) return
    exportDigitalLocker(user.id, profile.student_uid)
  }

  return (
    <div className="app-page-container">
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="global-loader-overlay">
          <Loader2 className="spinner" size={48} />
          <p className="label">Processing...</p>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button className="dismiss-btn" onClick={() => window.location.reload()}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Dues Blocking Banner */}
      {pendingDues.length > 0 && (
        <div className="dues-warning-banner">
          <div className="warning-content">
            <AlertCircle size={24} />
            <div className="text-stack">
              <span className="title">OUTSTANDING DUES DETECTED</span>
              <span className="desc">You have ₹{totalDuesAmount} in pending dues across {pendingDues.length} departments. Clearance is blocked until paid.</span>
            </div>
          </div>
          <button className="pay-now-btn" onClick={() => handleOpenPayment(pendingDues)}>
            PAY ALL DUES
          </button>
        </div>
      )}

      {/* State A: No Application */}
      {!application && !isLoading && (
        <div className="center-content" style={{ minHeight: '70vh' }}>
          <div className="start-card-premium">
            <div className="card-decoration">
              <FileText size={64} className="icon-main" />
            </div>
            <h1 className="serif">Start Your Clearance Application</h1>
            <p className="description">
              Submit your No-Dues application to begin the graduation clearance process.
              Ensure your documents are uploaded to your vault before proceeding.
            </p>
            <button className="nexus-primary-btn big" onClick={createApplication}>
              Create Application <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Success View */}
      {isJustSubmitted && (
        <div className="center-content" style={{ minHeight: '70vh' }}>
          <div className="success-card-premium">
            <div className="success-icon-box">
              <CheckCircle size={48} />
            </div>
            <h1 className="serif">Application Submitted!</h1>
            <p className="description">
              Your clearance application has been sent to the {application?.department} Lab Assistant for review.
              You can track the progress in real-time from your dashboard.
            </p>
            <button className="nexus-primary-btn" onClick={() => setIsJustSubmitted(false)}>
              View Status Tracker
            </button>
          </div>
        </div>
      )}

      {/* State B & C (Form and Tracker) */}
      {application && !isJustSubmitted && (
        <>
          <div className="app-header-compact">
            <div className="header-text">
              <h1 className="serif">
                {application.is_submitted ? 'Clearance Application View' : 'Clearance Application Draft'}
              </h1>
              <div className="status-row-info">
                <span className={`status-pill-small ${application.status}`}>
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className="dot">•</span>
                <span className="label">STAGE: {application.current_stage.toUpperCase()}</span>
              </div>
            </div>
            <div className="header-indicators">
              {isSaving && <div className="save-indicator saving">Saving changes...</div>}
              {showSaved && <div className="save-indicator">All changes saved</div>}
            </div>
          </div>

          <div className="app-main-layout">
            <div className="app-content-sections">

              {/* Section 1: Personal Details */}
              <section className="nexus-card-flat">
                <h3 className="section-title-label"><Info size={14} /> PERSONAL DETAILS</h3>
                <div className="profile-grid">
                  <div className="info-item">
                    <label className="label">FULL NAME</label>
                    <p className="info-val">{profile?.full_name || 'Loading...'}</p>
                  </div>
                  <div className="info-item">
                    <label className="label">STUDENT UID</label>
                    <p className="info-val mono">{profile?.student_uid || 'Not set'}</p>
                  </div>
                  <div className="info-item">
                    <label className="label">EMAIL ADDRESS</label>
                    <p className="info-val">{user?.email || 'Loading...'}</p>
                  </div>
                </div>
              </section>

              {/* Section 2: Application Details */}
              <section className="nexus-card-flat">
                <h3 className="section-title-label"><FileText size={14} /> APPLICATION DETAILS</h3>
                <div className="form-group-stack">
                  <div className="form-row-triple">
                    <div className="input-block">
                      <label className="label">ACADEMIC DEPARTMENT</label>
                      {application.is_submitted ? (
                        <p className="static-val">{application.department}</p>
                      ) : (
                        <select
                          value={application.department || ''}
                          onChange={(e) => updateField('department', e.target.value)}
                          className="nexus-select"
                        >
                          <option value="" disabled>Select department...</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Mechanical">Mechanical</option>
                          <option value="Civil">Civil</option>
                          <option value="Information Technology">Information Technology</option>
                        </select>
                      )}
                    </div>
                    <div className="input-block">
                      <label className="label">PURPOSE OF CLEARANCE</label>
                      {application.is_submitted ? (
                        <p className="static-val">{parsedPurpose.type}</p>
                      ) : (
                        <select
                          value={parsedPurpose.type}
                          onChange={(e) => handlePurposeChange(e.target.value)}
                          className="nexus-select"
                        >
                          <option value="" disabled>Select a purpose...</option>
                          <option value="Graduation Clearance">Graduation Clearance</option>
                          <option value="Transfer Certificate">Transfer Certificate</option>
                          <option value="Provisional Certificate">Provisional Certificate</option>
                          <option value="Scholarship Documentation">Scholarship Documentation</option>
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </div>
                    <div className="input-block">
                      <label className="label">CGPA (OUT OF 10.0)</label>
                      {application.is_submitted ? (
                        <p className="static-val">{parsedPurpose.cgpa}</p>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 8.50"
                          value={parsedPurpose.cgpa}
                          onChange={(e) => handleDataChange('cgpa', e.target.value)}
                          className="nexus-input"
                        />
                      )}
                    </div>
                    <div className="input-block">
                      <label className="label">TELEPHONE NUMBER</label>
                      {application.is_submitted ? (
                        <p className="static-val">{parsedPurpose.phone}</p>
                      ) : (
                        <input
                          type="tel"
                          placeholder="+91 00000 00000"
                          value={parsedPurpose.phone}
                          onChange={(e) => handleDataChange('phone', e.target.value)}
                          className="nexus-input"
                        />
                      )}
                    </div>
                  </div>

                  <div className="form-row-address">
                    <div className="input-block">
                      <label className="label">PERMANENT ADDRESS</label>
                      {application.is_submitted ? (
                        <p className="static-val">{parsedPurpose.address}</p>
                      ) : (
                        <input
                          type="text"
                          placeholder="Street, Area, City"
                          value={parsedPurpose.address}
                          onChange={(e) => handleDataChange('address', e.target.value)}
                          className="nexus-input"
                        />
                      )}
                    </div>
                    <div className="input-block" style={{ width: '150px' }}>
                      <label className="label">PIN CODE</label>
                      {application.is_submitted ? (
                        <p className="static-val">{parsedPurpose.pincode}</p>
                      ) : (
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="000000"
                          value={parsedPurpose.pincode}
                          onChange={(e) => handleDataChange('pincode', e.target.value)}
                          className="nexus-input"
                        />
                      )}
                    </div>
                  </div>

                  <div className="input-block">
                    <label className="label">ADDITIONAL NOTES ({parsedPurpose.notes.length}/500)</label>
                    {application.is_submitted ? (
                      <p className="static-val notes">{parsedPurpose.notes || "No additional notes provided."}</p>
                    ) : (
                      <textarea
                        placeholder="Add any additional context for your application..."
                        value={parsedPurpose.notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        className="nexus-textarea"
                        rows={3}
                      />
                    )}
                  </div>
                </div>
              </section>

              {/* Section 3: Document Vault Selection */}
              <section className="nexus-card-flat">
                <h3 className="section-title-label"><Archive size={14} /> ATTACH DOCUMENTS FROM VAULT</h3>
                <div className="vault-selection-grid">
                  {vaultDocuments.length > 0 ? (
                    vaultDocuments.map(doc => (
                      <div
                        key={doc.id}
                        className={`vault-doc-card ${application.document_ids?.includes(doc.id) ? 'selected' : ''} ${application.is_submitted ? 'readonly' : ''}`}
                        onClick={() => toggleDocument(doc.id)}
                      >
                        <div className="doc-icon-box">
                          {doc.file_type.includes('pdf') ? <FileText size={20} /> : <Archive size={20} />}
                        </div>
                        <div className="doc-content">
                          <span className="doc-name-text">{doc.file_name}</span>
                          <span className="label" style={{ fontSize: '0.6rem', opacity: 0.5 }}>
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </span>
                        </div>
                        {!application.is_submitted && (
                          <div className="custom-checkbox">
                            {application.document_ids?.includes(doc.id) && <div className="checked-dot" />}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="empty-vault-notice">
                      <AlertCircle size={24} />
                      <p>No documents found in your vault.</p>
                      <Link to="/student/vault" className="nexus-primary-btn">
                        Go to Vault <ExternalLink size={14} />
                      </Link>
                    </div>
                  )}
                </div>
                {!application.is_submitted && (
                  <div className="selection-count label">
                    {application.document_ids?.length || 0} document(s) selected (Min: 3)
                  </div>
                )}
              </section>

              {/* Section 4: Submission / Tracker */}
              {application.is_submitted ? (
                <section className="nexus-card-flat tracker-section">
                  <h3 className="section-title-label">APPLICATION STATUS TRACKER</h3>
                  <ApplicationStatusTracker application={application} approvals={approvals} />
                  
                  {application.status === 'approved' && (
                    <div className="completion-actions">
                      <div className="success-banner-inline">
                        <CheckCircle size={20} />
                        <span>Congratulations! Your clearance is complete.</span>
                      </div>
                      <button className="nexus-primary-btn big" onClick={handleDownloadCertificate}>
                        <FileText size={20} /> Download Final Certificate
                      </button>
                    </div>
                  )}
                </section>
              ) : (
                <section className="submission-gate-section">
                  <label className="declaration-row">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                    />
                    <span className="declaration-text">
                      I confirm that all information provided is accurate and the documents attached are genuine.
                    </span>
                  </label>
                  <button
                    className="nexus-primary-btn submit-btn"
                    disabled={!canSubmit}
                    onClick={() => setShowConfirmModal(true)}
                  >
                    Submit Application
                  </button>
                  {!canSubmit && (
                    <div className="validation-hint label" style={{ marginTop: '10px', color: '#ff4d4d', fontSize: '0.6rem', opacity: 0.8 }}>
                      REQUIREMENTS: PURPOSE + DEPT + CONTACT + ADDR + MIN 3 DOCUMENTS + DECLARATION {pendingDues.length > 0 && "+ NO PENDING DUES"}
                    </div>
                  )}
                </section>
              )}
            </div>

            <aside className="app-side-info">
              <div className="info-panel-card sticky">
                <h4 className="label">SYSTEM GUIDANCE</h4>
                <p className="side-text">
                  {application.is_submitted
                    ? "Your application is currently under review by institutional authorities. You will be notified of any actions taken."
                    : "Your progress is automatically saved as you fill out the form. You can return later to complete your submission."}
                </p>
                <div className="workflow-reminder">
                  <span className="label">WORKFLOW CHAIN:</span>
                  <ul className="mini-workflow">
                    {['librarian', 'lab', 'hod', 'principal'].map((stage) => {
                      const stageLabels: Record<string, string> = {
                        librarian: 'Librarian',
                        lab: 'Lab Assistant',
                        hod: 'HOD',
                        principal: 'Principal'
                      };
                      
                      const stageOrder = ['librarian', 'lab', 'hod', 'principal'];
                      const currentIndex = stageOrder.indexOf(application.current_stage);
                      const stageIndex = stageOrder.indexOf(stage);
                      
                      const isDone = stageIndex < currentIndex || application.status === 'approved';
                      const isActive = application.current_stage === stage && application.status !== 'approved';
                      
                      return (
                        <li key={stage} className={`${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                          {stageLabels[stage]}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="sidebar-action-box">
                  <h4 className="label">DIGITAL ASSETS</h4>
                  <button className="export-btn" onClick={handleExportLocker}>
                    <Archive size={14} /> One-Click Archive Export
                  </button>
                  <p className="tiny-label">Bundles all uploads & certificates into ZIP</p>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal">
            <h3 className="serif">Confirm Submission?</h3>
            <p>Once submitted, you cannot edit your application or change the attached documents.</p>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowConfirmModal(false)}>Go Back</button>
              <button className="confirm-btn" onClick={handleFinalSubmit}>Confirm & Submit</button>
            </div>
          </div>
        </div>
      )}

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        dues={duesToPay}
        onSuccess={() => handlePaymentSuccess(duesToPay)}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        .app-page-container { max-width: 1400px; margin: 0 auto; padding: 40px; min-height: 100vh; position: relative; }
        .center-content { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        
        /* Error Banner */
        .error-banner { 
          background: #7F1D1D; 
          color: #FECACA; 
          padding: 16px 24px; 
          border-radius: 12px; 
          margin-bottom: 30px; 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          border: 1px solid #991B1B;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .error-content { display: flex; align-items: center; gap: 12px; font-weight: 600; font-size: 0.9rem; }
        .dismiss-btn { background: rgba(0,0,0,0.2); border: none; color: inherit; padding: 8px; border-radius: 6px; cursor: pointer; display: flex; }
        .dismiss-btn:hover { background: rgba(0,0,0,0.4); }

        /* Loader Overlay */
        .global-loader-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }

        .nexus-card-flat { background: rgba(255,255,255,0.02); border: 1px solid #1a1a1a; padding: 40px; border-radius: 16px; }
        .start-card-premium { background: rgba(255,255,255,0.03); border: 1px solid #222; padding: 80px; text-align: center; border-radius: 24px; max-width: 700px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); }
        
        .nexus-primary-btn { 
          background: #C9A84C; 
          color: #000; 
          border: none; 
          padding: 14px 28px; 
          border-radius: 8px; 
          font-weight: 800; 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          gap: 10px; 
          transition: 0.3s;
        }
        .nexus-primary-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(201, 168, 76, 0.2); }
        .nexus-primary-btn.big { padding: 20px 40px; font-size: 1.1rem; }
        .nexus-primary-btn:disabled { opacity: 0.3; cursor: not-allowed; filter: grayscale(1); }

        .app-header-compact { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 1px solid #1a1a1a; }
        .header-text h1 { font-size: 2.5rem; margin-bottom: 8px; }
        .status-row-info { display: flex; align-items: center; gap: 12px; }
        .status-pill-small { padding: 4px 12px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; background: #222; }
        .status-pill-small.lab_pending { color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .save-indicator { font-size: 0.7rem; font-weight: 700; color: #10B981; }

        .app-main-layout { display: grid; grid-template-columns: 1fr 340px; gap: 50px; }
        .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .info-item label { opacity: 0.4; font-size: 0.6rem; margin-bottom: 8px; display: block; }
        .info-val { font-size: 1.1rem; font-weight: 600; }
        .mono { font-family: monospace; color: var(--accent-color); }

        .form-group-stack { display: flex; flex-direction: column; gap: 30px; }
        .form-row-triple { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .form-row-address { display: flex; gap: 20px; }
        .form-row-address .input-block:first-child { flex: 1; }
        .nexus-input, .nexus-select, .nexus-textarea { background: #0a0a0a; border: 1px solid #222; padding: 16px; border-radius: 8px; color: white; font-family: inherit; font-size: 1rem; width: 100%; outline: none; transition: 0.3s; }
        .nexus-input:focus, .nexus-select:focus, .nexus-textarea:focus { border-color: var(--accent-color); }
        
        .vault-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
        .vault-doc-card { background: #0f0f0f; border: 1px solid #1a1a1a; padding: 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; cursor: pointer; transition: 0.3s; }
        .vault-doc-card.selected { border-color: var(--accent-color); background: rgba(201, 168, 76, 0.05); }
        .doc-icon-box { width: 44px; height: 44px; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #444; }
        .vault-doc-card.selected .doc-icon-box { background: var(--accent-color); color: #000; }
        .custom-checkbox { width: 20px; height: 20px; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .checked-dot { width: 10px; height: 10px; background: var(--accent-color); border-radius: 50%; }

        .submission-gate-section { display: flex; flex-direction: column; align-items: flex-end; gap: 24px; margin-top: 40px; }
        .declaration-row { display: flex; align-items: center; gap: 12px; cursor: pointer; color: #888; font-size: 0.9rem; }
        .submit-btn { width: 300px; justify-content: center; padding: 18px; }

        .info-panel-card { background: rgba(201,168,76,0.03); border: 1px solid rgba(201,168,76,0.1); padding: 30px; border-radius: 20px; }
        .sticky { position: sticky; top: 40px; }
        .mini-workflow { list-style: none; padding: 0; margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
        .mini-workflow li { font-size: 0.75rem; font-weight: 700; color: #444; padding-left: 24px; position: relative; }
        .mini-workflow li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; border-radius: 50%; background: #222; }
        .mini-workflow li.done { color: #10B981; }
        .mini-workflow li.done::before { background: #10B981; }
        .mini-workflow li.active { color: var(--accent-color); }
        .mini-workflow li.active::before { background: var(--accent-color); box-shadow: 0 0 10px var(--accent-color); }

        /* Confirmation Modal Styles */
        .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .confirm-modal { background: #0D0D0D; border: 1px solid #222; padding: 50px; border-radius: 24px; max-width: 500px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .confirm-modal h3 { font-size: 2rem; margin-bottom: 20px; color: #fff; }
        .confirm-modal p { color: #888; margin-bottom: 40px; line-height: 1.6; }
        .modal-buttons { display: flex; gap: 16px; justify-content: center; }
        .cancel-btn { background: transparent; border: 1px solid #333; color: #888; padding: 14px 24px; border-radius: 8px; cursor: pointer; font-weight: 700; transition: 0.3s; }
        .cancel-btn:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: #666; }
        .confirm-btn { background: #10B981; border: none; color: #000; padding: 14px 32px; border-radius: 8px; cursor: pointer; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; transition: 0.3s; }
        .confirm-btn:hover { background: #34D399; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2); }

        /* Success Card Styles */
        .success-card-premium { background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 60px; text-align: center; border-radius: 24px; max-width: 600px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); animation: scaleUp 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .success-icon-box { width: 80px; height: 80px; background: #10B981; color: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; }
        .success-card-premium h1 { color: #10B981; margin-bottom: 16px; font-size: 2.5rem; }
        .success-card-premium .description { color: #aaa; margin-bottom: 40px; font-size: 1.1rem; line-height: 1.6; }

        .spinner { animation: spin 1s linear infinite; }

        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .dues-warning-banner {
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.3);
          padding: 24px 32px;
          border-radius: 16px;
          margin-bottom: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          animation: slideDown 0.4s ease;
        }
        .warning-content { display: flex; align-items: center; gap: 20px; color: #F59E0B; }
        .text-stack { display: flex; flex-direction: column; }
        .text-stack .title { font-weight: 900; letter-spacing: 0.05em; font-size: 0.9rem; }
        .text-stack .desc { font-size: 0.8rem; opacity: 0.8; }
        .pay-now-btn { background: #F59E0B; color: #000; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: 0.3s; }
        .pay-now-btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3); }
        .pay-now-btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(245, 158, 11, 0.3); }

        .completion-actions { margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 40px; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; }
        .success-banner-inline { display: flex; align-items: center; gap: 12px; color: #10B981; font-weight: 700; }
        
        .sidebar-action-box { margin-top: 40px; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); }
        .export-btn { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid #222; color: #fff; padding: 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; }
        .export-btn:hover { background: #222; border-color: #444; }
        .tiny-label { font-size: 0.6rem; color: #444; margin-top: 8px; text-align: center; }
      ` }} />
    </div>
  )
}

export default StudentApplicationPage
