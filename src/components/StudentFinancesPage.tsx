import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  ArrowRight, 
  Receipt, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import PaymentModal from './PaymentModal';
import { useStudentApplication } from '../hooks/useStudentApplication';

const StudentFinancesPage: React.FC = () => {
  const { dues, isLoading, handlePaymentSuccess } = useStudentApplication();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<any | null>(null);

  const totalPending = dues
    .filter(d => d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0);

  const handlePay = (due: any) => {
    setSelectedDue(due);
    setIsPaymentModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="finances-loading">
        <Loader2 className="spinner" size={48} />
        <p className="label">Accessing Ledger...</p>
      </div>
    );
  }

  return (
    <div className="finances-container">
      <motion.div 
        className="finances-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="header-left">
          <h1 className="serif">Resolution Center</h1>
          <p className="subtitle">Manage and clear institutional dues for graduation eligibility.</p>
        </div>
        <div className="total-due-card">
          <div className="label">Total Outstanding</div>
          <div className="amount">₹{totalPending}</div>
          <div className="status-indicator">
            {totalPending > 0 ? (
              <span className="warning"><AlertCircle size={14} /> Action Required</span>
            ) : (
              <span className="success"><CheckCircle size={14} /> Clear Standing</span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="finances-grid">
        <div className="dues-list-section">
          <h3 className="section-title label">Outstanding Dues</h3>
          <div className="dues-cards">
            {dues.filter(d => d.status === 'pending').length > 0 ? (
              dues.filter(d => d.status === 'pending').map((due, i) => (
                <motion.div 
                  key={due.id}
                  className="due-item-card"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="due-icon">
                    <Receipt size={24} />
                  </div>
                  <div className="due-info">
                    <span className="dept">{due.department}</span>
                    <span className="desc">Institutional fine / service charge</span>
                  </div>
                  <div className="due-amount">₹{due.amount}</div>
                  <button className="pay-btn" onClick={() => handlePay(due)}>
                    Pay Now <ArrowRight size={16} />
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="empty-dues">
                <ShieldCheck size={48} />
                <p>All clear! No pending dues found in the registry.</p>
              </div>
            )}
          </div>

          <h3 className="section-title label" style={{ marginTop: '60px' }}>Recent Transactions</h3>
          <div className="transaction-history">
            {dues.filter(d => d.status === 'paid').map((due) => (
              <div key={due.id} className="history-row">
                <span className="date">{new Date().toLocaleDateString()}</span>
                <span className="item">{due.department} Dues</span>
                <span className="amount">₹{due.amount}</span>
                <span className="status-badge paid">PAID</span>
              </div>
            ))}
          </div>
        </div>

        <aside className="finances-sidebar">
          <div className="guidance-card">
            <h4 className="label">Policy Reminder</h4>
            <p>Institutional clearance is only granted when all departmental dues are reconciled. Payments are processed through the secure university gateway.</p>
            <div className="security-badge">
              <ShieldCheck size={16} />
              <span>256-bit SSL Encrypted</span>
            </div>
          </div>

          <div className="payment-methods">
            <h4 className="label">Supported Methods</h4>
            <div className="method-icons">
              <CreditCard size={20} />
              <span className="label">UPI / Net Banking / Cards</span>
            </div>
          </div>
        </aside>
      </div>

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        dues={selectedDue ? [selectedDue] : []}
        onSuccess={() => handlePaymentSuccess(selectedDue ? [selectedDue] : [])}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .finances-container { padding: 60px; max-width: 1400px; margin: 0 auto; }
        .finances-loading { height: 70vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; }
        
        .finances-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 60px; border-bottom: 1px solid var(--border-color); padding-bottom: 40px; }
        .finances-header h1 { font-size: 3.5rem; margin-bottom: 10px; }
        .finances-header .subtitle { color: var(--text-secondary); font-size: 1.1rem; }
        
        .total-due-card { background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 30px 40px; border-radius: 16px; text-align: right; }
        .total-due-card .amount { font-size: 3rem; font-weight: 800; color: var(--text-primary); margin: 8px 0; font-family: 'Newsreader', serif; }
        .status-indicator { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
        .status-indicator .warning { color: #EF4444; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
        .status-indicator .success { color: #10B981; display: flex; align-items: center; justify-content: flex-end; gap: 6px; }

        .finances-grid { display: grid; grid-template-columns: 1fr 340px; gap: 60px; }
        .section-title { margin-bottom: 30px; display: block; opacity: 0.5; }
        
        .dues-cards { display: flex; flex-direction: column; gap: 16px; }
        .due-item-card { 
          background: rgba(255, 255, 255, 0.03); 
          border: 1px solid var(--border-color); 
          padding: 24px 32px; 
          border-radius: 12px; 
          display: flex; 
          align-items: center; 
          gap: 24px;
          transition: 0.3s;
        }
        .due-item-card:hover { border-color: var(--accent-color); background: rgba(201, 168, 76, 0.05); }
        .due-icon { width: 50px; height: 50px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--accent-color); }
        .due-info { flex: 1; display: flex; flex-direction: column; }
        .due-info .dept { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .due-info .desc { font-size: 0.8rem; color: #555; }
        .due-amount { font-size: 1.5rem; font-weight: 700; font-family: 'Courier New', monospace; }
        .pay-btn { background: var(--accent-color); color: #000; padding: 10px 20px; border-radius: 6px; font-weight: 800; font-size: 0.75rem; text-transform: uppercase; display: flex; align-items: center; gap: 8px; transition: 0.3s; }
        .pay-btn:hover { transform: scale(1.05); box-shadow: 0 5px 15px rgba(201, 168, 76, 0.3); }

        .empty-dues { padding: 80px; text-align: center; color: #333; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        
        .transaction-history { display: flex; flex-direction: column; }
        .history-row { display: flex; align-items: center; padding: 16px 0; border-bottom: 1px solid var(--border-color); font-size: 0.9rem; }
        .history-row .date { width: 120px; color: #555; }
        .history-row .item { flex: 1; color: #aaa; }
        .history-row .amount { width: 100px; text-align: right; margin-right: 30px; }
        .status-badge { padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; }
        .status-badge.paid { background: rgba(16, 185, 129, 0.1); color: #10B981; }

        .finances-sidebar { display: flex; flex-direction: column; gap: 30px; }
        .guidance-card { background: rgba(201, 168, 76, 0.03); border: 1px solid rgba(201, 168, 76, 0.1); padding: 30px; border-radius: 20px; }
        .guidance-card p { font-size: 0.85rem; line-height: 1.6; color: #888; margin: 16px 0; }
        .security-badge { display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #10B981; font-weight: 700; text-transform: uppercase; }
        
        .payment-methods { padding: 30px; border: 1px solid var(--border-color); border-radius: 20px; }
        .method-icons { display: flex; align-items: center; gap: 12px; margin-top: 15px; color: #555; }
        
        @media (max-width: 1100px) {
          .finances-grid { grid-template-columns: 1fr; }
          .finances-header { flex-direction: column; align-items: flex-start; gap: 30px; }
          .total-due-card { width: 100%; text-align: left; }
          .status-indicator .warning, .status-indicator .success { justify-content: flex-start; }
        }
      ` }} />
    </div>
  );
};

export default StudentFinancesPage;
