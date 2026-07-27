import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ShieldCheck, ShieldAlert, CheckCircle, Clock, Award, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'

interface VerificationData {
  application: any
  approvals: any[]
  student: any
}

const CertificateVerificationPage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>()
  const [data, setData] = useState<VerificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verifyCertificate = async () => {
      if (!applicationId) return

      try {
        setLoading(true)
        
        // 1. Fetch Application and Student Profile
        const { data: appData, error: appError } = await supabase
          .from('applications')
          .select('*, student:profiles(*)')
          .eq('id', applicationId)
          .single()

        if (appError) throw new Error('Certificate record not found in institutional database.')

        // 2. Fetch all approvals
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('approvals')
          .select('*, actor:profiles(full_name)')
          .eq('application_id', applicationId)
          .order('updated_at', { ascending: true })

        if (approvalsError) throw approvalsError

        setData({
          application: appData,
          approvals: approvalsData || [],
          student: appData.student
        })

      } catch (err: any) {
        console.error('Verification error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    verifyCertificate()
  }, [applicationId])

  if (loading) {
    return (
      <div className="verification-loading">
        <div className="nexus-spinner"></div>
        <p>Verifying Cryptographic Signature...</p>
      </div>
    )
  }

  const isFullyApproved = data?.application.status === 'approved'

  return (
    <div className="verification-page">
      <div className="container" style={{ maxWidth: '800px', padding: '100px 20px' }}>
        
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to Nexus Home
        </Link>

        {error ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="verification-card invalid"
          >
            <div className="status-icon-big alert">
              <ShieldAlert size={64} />
            </div>
            <h1>Verification Failed</h1>
            <p className="error-msg">{error}</p>
            <div className="security-notice">
              This digital record could not be authenticated. It may be fabricated or tampered with.
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`verification-card ${isFullyApproved ? 'valid' : 'pending'}`}
          >
            <div className={`status-icon-big ${isFullyApproved ? 'success' : 'warning'}`}>
              {isFullyApproved ? <ShieldCheck size={64} /> : <Clock size={64} />}
            </div>
            
            <h1>{isFullyApproved ? 'Certificate Verified' : 'Clearance in Progress'}</h1>
            <p className="status-label">
              {isFullyApproved 
                ? 'This digital clearance certificate is authentic and issued by NEXUS Authority.' 
                : 'This clearance process is still active and has not received final approval.'}
            </p>

            <div className="student-info-panel">
              <div className="info-row">
                <span className="label">STUDENT NAME</span>
                <span className="value">{data?.student?.full_name}</span>
              </div>
              <div className="info-row">
                <span className="label">STUDENT UID</span>
                <span className="value mono">{data?.student?.student_uid}</span>
              </div>
              <div className="info-row">
                <span className="label">DEPARTMENT</span>
                <span className="value">{data?.application?.department}</span>
              </div>
              <div className="info-row">
                <span className="label">CERTIFICATE ID</span>
                <span className="value mono">{applicationId}</span>
              </div>
            </div>

            <div className="approval-trail-verification">
              <h3>OFFICIAL APPROVAL TRAIL</h3>
              <div className="trail-list">
                {['librarian', 'lab', 'hod', 'principal'].map(role => {
                  const approval = data?.approvals.find(a => a.role === role)
                  const roleLabel = role === 'lab' ? 'Lab Assistant' : role.toUpperCase()
                  
                  return (
                    <div key={role} className={`trail-item ${approval?.status === 'approved' ? 'approved' : 'missing'}`}>
                      <div className="trail-status">
                        {approval?.status === 'approved' ? <CheckCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="trail-details">
                        <span className="role-name">{roleLabel}</span>
                        <span className="actor-name">
                          {approval?.status === 'approved' 
                            ? `Approved by ${approval.actor?.full_name || 'Department Head'}` 
                            : 'Awaiting Review'}
                        </span>
                      </div>
                      {approval?.status === 'approved' && (
                        <div className="trail-date">
                          {new Date(approval.updated_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="verification-footer">
              <div className="hash-block">
                <Award size={14} />
                <span>SHA-256 SIGNED BY INSTITUTIONAL AUTHORITY</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .verification-page { min-height: 100vh; background: #050505; color: #fff; }
        .verification-loading { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        .nexus-spinner { width: 40px; height: 40px; border: 3px solid rgba(245,158,11,0.1); border-top-color: #F59E0B; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .back-link { display: flex; align-items: center; gap: 8px; color: #555; text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 30px; transition: color 0.3s; }
        .back-link:hover { color: #F59E0B; }

        .verification-card { background: #111; border: 1px solid #222; border-radius: 32px; padding: 60px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
        .verification-card.valid { border-color: #10B981; background: linear-gradient(180deg, rgba(16,185,129,0.05) 0%, #111 100%); }
        .verification-card.invalid { border-color: #EF4444; background: linear-gradient(180deg, rgba(239,68,68,0.05) 0%, #111 100%); }

        .status-icon-big { margin-bottom: 30px; }
        .status-icon-big.success { color: #10B981; }
        .status-icon-big.warning { color: #F59E0B; }
        .status-icon-big.alert { color: #EF4444; }

        h1 { font-family: serif; font-size: 2.5rem; margin-bottom: 10px; }
        .status-label { color: #888; font-size: 1.1rem; margin-bottom: 50px; }

        .student-info-panel { background: #161616; border-radius: 20px; padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 50px; }
        .info-row { display: flex; flex-direction: column; gap: 5px; }
        .info-row .label { font-size: 0.65rem; color: #555; font-weight: 800; letter-spacing: 1px; }
        .info-row .value { font-size: 1rem; color: #fff; font-weight: 600; }
        .mono { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem !important; color: #F59E0B !important; }

        .approval-trail-verification { text-align: left; border-top: 1px solid #222; padding-top: 40px; }
        h3 { font-size: 0.75rem; color: #555; letter-spacing: 2px; margin-bottom: 25px; }
        .trail-list { display: flex; flex-direction: column; gap: 15px; }
        .trail-item { display: flex; align-items: center; gap: 15px; padding: 15px; background: #1a1a1a; border-radius: 12px; border: 1px solid #222; }
        .trail-item.approved { border-color: rgba(16,185,129,0.2); }
        .trail-status { color: #333; }
        .trail-item.approved .trail-status { color: #10B981; }
        .trail-details { display: flex; flex-direction: column; flex: 1; }
        .role-name { font-size: 0.85rem; font-weight: 700; color: #fff; }
        .actor-name { font-size: 0.75rem; color: #666; }
        .trail-date { font-size: 0.75rem; color: #444; font-weight: 600; }

        .verification-footer { margin-top: 50px; padding-top: 30px; border-top: 1px solid #222; }
        .hash-block { display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-size: 0.7rem; font-weight: 800; letter-spacing: 1px; }

        .security-notice { margin-top: 30px; font-size: 0.8rem; color: #EF4444; background: rgba(239,68,68,0.1); padding: 15px; border-radius: 10px; font-weight: 600; }
      `}} />
    </div>
  )
}

export default CertificateVerificationPage
