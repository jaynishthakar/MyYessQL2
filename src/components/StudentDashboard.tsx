import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import ActivityStrip from './ActivityStrip';
import DashboardCard from './DashboardCard';
import AnimatedPipeline from './AnimatedPipeline';
import { useStudentApplication } from '../hooks/useStudentApplication';
import CertificateGenerator from './CertificateGenerator';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { dues, application, approvals, profile } = useStudentApplication();

  const pendingDues = dues.filter(d => d.status === 'pending');
  const totalPendingAmount = pendingDues.reduce((sum, d) => sum + d.amount, 0);

  const isFullyApproved = application?.status === 'approved' || application?.current_stage === 'approved';

  const getStatusCase = () => {
    if (!application || !application.is_submitted) return 1;
    if (isFullyApproved) return 3;
    if (application.status?.includes('rejected')) return 4;
    return 2;
  };

  return (
    <div className="dashboard-container container" style={{ padding: '60px 40px' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ActivityStrip statusCase={getStatusCase() as any} />
        </motion.div>

        <motion.div 
          className="dashboard-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {isFullyApproved && (
            <DashboardCard 
              label="CERTIFICATE"
              title="Official Clearance"
              body="Your institutional clearance is complete. Download your verified digital certificate."
              icon={<Award size={20} />}
              status={
                <CertificateGenerator 
                  studentName={profile?.full_name || 'Student'}
                  studentUid={profile?.student_uid || 'N/A'}
                  department={profile?.department || 'General'}
                  applicationId={application?.id || ''}
                  completionDate={new Date().toLocaleDateString()}
                />
              }
              cta=""
              onClick={() => {}}
            />
          )}

          <DashboardCard 
            label="FINANCES"
            title="Resolution Center"
            body="View and clear any flagged dues — library fines, lab charges, or hostel fees."
            status={
              pendingDues.length > 0 
                ? <div style={{ color: '#EF4444', fontWeight: 600 }}>{pendingDues.length} dues pending · Total ₹{totalPendingAmount}</div>
                : <div style={{ color: '#10B981', fontWeight: 600 }}>All Clear! No pending dues.</div>
            }
            cta="Manage Payments →"
            onClick={() => navigate('/student/finances')}
          />

          <DashboardCard 
            label="DOCUMENTS"
            title="Document Vault"
            body="Upload your required clearance documents — student ID, lab manual, and library receipt."
            status={
              <div style={{ color: 'var(--text-secondary)' }}>Central repository for verification artifacts</div>
            }
            cta="Open Vault →"
            onClick={() => navigate('/student/vault')}
          />

          <DashboardCard 
            label="APPROVALS"
            title="Clearance Pipeline"
            body="Track your multi-stage approval progress across all departments."
            status={<AnimatedPipeline application={application} approvals={approvals} />}
            cta="View Full Pipeline →"
            onClick={() => navigate('/student/application')}
          />
        </motion.div>
      </motion.div>

      <footer className="footer" style={{ marginTop: 'auto', background: 'transparent', borderTop: '1px solid var(--border-color)', padding: '20px 0' }}>
        <div className="footer-container">
          <div className="footer-left label" style={{ fontSize: '0.6rem' }}>© 2025 NEXUS</div>
          <div className="footer-center label" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)' }}>
            Need help? Contact department admin.
          </div>
          <div className="footer-right label" style={{ fontSize: '0.6rem' }}>Built for students.</div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .vault-view-nav {
          padding: 20px 40px 0;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.3s ease;
          font-size: 0.7rem;
        }
        .back-btn:hover {
          color: var(--accent-color);
        }
      `}} />
    </div>
  );
};

export default StudentDashboard;
