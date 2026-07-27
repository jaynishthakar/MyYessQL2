import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, ShieldCheck, CreditCard, Lock, Loader2, CheckCircle } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  dues: any[]
  onSuccess: () => void
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, dues, onSuccess }) => {
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const totalAmount = dues.reduce((sum, d) => sum + d.amount, 0)

  const handlePay = async () => {
    setIsProcessing(true)
    setStep('processing')
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 2000))

    try {
      const dueIds = dues.map(d => d.id)
      const { error } = await supabase
        .from('dues')
        .update({ status: 'paid' })
        .in('id', dueIds)

      if (error) throw error
      
      setStep('success')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } catch (err) {
      alert("Payment failed simulation. Please try again.")
      setStep('details')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="payment-modal-overlay">
      <div className="payment-card">
        <header className="payment-header">
          <div className="logo">Nexus Pay</div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="payment-body">
          {step === 'details' && (
            <>
              <div className="summary-box">
                <label className="label">TOTAL AMOUNT PAYABLE</label>
                <div className="amount serif">₹{totalAmount.toLocaleString()}</div>
                <div className="dues-list-mini">
                  {dues.map(d => (
                    <div key={d.id} className="due-line">
                      <span>{d.department}</span>
                      <span>₹{d.amount}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="payment-form">
                <div className="input-row">
                  <div className="input-block">
                    <label className="label">CARD NUMBER</label>
                    <div className="styled-input">
                      <CreditCard size={16} />
                      <input type="text" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" readOnly />
                    </div>
                  </div>
                </div>
                <div className="input-row-double">
                  <div className="input-block">
                    <label className="label">EXPIRY</label>
                    <input type="text" placeholder="MM/YY" defaultValue="12/28" readOnly />
                  </div>
                  <div className="input-block">
                    <label className="label">CVV</label>
                    <input type="password" placeholder="***" defaultValue="123" readOnly />
                  </div>
                </div>
              </div>

              <button className="pay-submit-btn" onClick={handlePay} disabled={isProcessing}>
                <Lock size={14} /> {isProcessing ? 'PROCESSING...' : 'COMPLETE SECURE PAYMENT'}
              </button>
              
              <div className="security-footer">
                <ShieldCheck size={14} />
                <span>256-bit SSL Secured Sandbox Payment</span>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="processing-state" style={{ padding: '60px 0', textAlign: 'center' }}>
              <div className="processing-animation">
                <Loader2 className="spinner" size={64} style={{ color: 'var(--accent-color)', marginBottom: '30px' }} />
              </div>
              <h3 className="serif" style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Verifying Transaction</h3>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>Communicating with secure payment gateway...</p>
            </div>
          )}

          {step === 'success' && (
            <div className="success-state" style={{ padding: '40px 0', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
              <div className="success-icon-wrapper" style={{ 
                width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', 
                color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px' 
              }}>
                <CheckCircle size={64} />
              </div>
              <h3 className="serif" style={{ fontSize: '2rem', marginBottom: '10px' }}>Payment Confirmed</h3>
              <p style={{ color: '#888', marginBottom: '30px' }}>Transaction ID: {Math.random().toString(36).substring(2, 12).toUpperCase()}</p>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', marginBottom: '30px', textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Digital Receipt Summary</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: '#888' }}>Total Amount:</span>
                  <span style={{ color: '#fff', fontWeight: 700 }}>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#888' }}>Status:</span>
                  <span style={{ color: '#10B981', fontWeight: 700 }}>SUCCESS</span>
                </div>
              </div>

              <button 
                className="nexus-primary-btn" 
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                style={{ width: '100%' }}
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .payment-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .payment-card { background: #111; border: 1px solid #222; width: 450px; border-radius: 20px; overflow: hidden; box-shadow: 0 50px 100px rgba(0,0,0,0.8); animation: modalIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        
        .payment-header { padding: 24px 30px; border-bottom: 1px solid #222; display: flex; justify-content: space-between; align-items: center; }
        .payment-header .logo { font-weight: 900; letter-spacing: -0.02em; font-size: 1.2rem; color: #fff; }
        .close-btn { background: none; border: none; color: #444; cursor: pointer; }
        
        .payment-body { padding: 40px; }
        .summary-box { background: rgba(255,255,255,0.02); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px; }
        .amount { font-size: 3rem; margin: 10px 0 20px; color: #fff; }
        .dues-list-mini { border-top: 1px solid #222; padding-top: 15px; }
        .due-line { display: flex; justify-content: space-between; font-size: 0.7rem; color: #666; margin-bottom: 5px; }
        
        .payment-form { display: flex; flex-direction: column; gap: 20px; margin-bottom: 30px; }
        .input-block label { display: block; margin-bottom: 8px; font-weight: 800; font-size: 0.6rem; color: #444; }
        .styled-input { display: flex; align-items: center; gap: 12px; background: #080808; border: 1px solid #222; padding: 0 16px; border-radius: 8px; color: #444; }
        .styled-input input { background: none; border: none; padding: 14px 0; color: #fff; font-size: 0.9rem; flex: 1; outline: none; }
        .input-row-double { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .input-row-double input { background: #080808; border: 1px solid #222; padding: 14px 16px; border-radius: 8px; color: #fff; font-size: 0.9rem; outline: none; }
        
        .pay-submit-btn { width: 100%; background: #fff; color: #000; border: none; padding: 18px; border-radius: 8px; font-weight: 900; letter-spacing: 0.05em; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: 0.3s; }
        .pay-submit-btn:hover { background: #ccc; }
        
        .security-footer { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 24px; color: #444; font-size: 0.65rem; font-weight: 600; }
        
        .processing-state, .success-state { text-align: center; padding: 40px 0; }
        .processing-state h3, .success-state h3 { font-size: 1.8rem; margin: 20px 0 10px; }
        .processing-state p, .success-state p { color: #555; }
        .success-check { color: #10B981; margin-bottom: 30px; }
        .spinner { animation: spin 1s linear infinite; margin: 0 auto; color: #F59E0B; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  )
}

export default PaymentModal
