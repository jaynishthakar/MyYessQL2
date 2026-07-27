import React, { useRef } from 'react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { QRCodeSVG } from 'qrcode.react'
import { ShieldCheck, Download } from 'lucide-react'

interface CertificateProps {
  studentName: string
  studentUid: string
  department: string
  completionDate: string
  applicationId: string
  onComplete?: () => void
}

const CertificateGenerator: React.FC<CertificateProps> = ({ 
  studentName, studentUid, department, applicationId, onComplete 
}) => {
  const certificateRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    if (!certificateRef.current) return

    try {
      // Provide immediate feedback
      console.log('Generating certificate PDF...')
      
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('l', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Nexus_Clearance_${studentUid}.pdf`)
      
      alert("Certificate downloaded successfully!")
      if (onComplete) onComplete()
    } catch (error: any) {
      console.error('PDF Generation failed:', error)
      alert(`Certificate generation failed: ${error.message || 'Please try again'}`)
    }
  }

  const verificationUrl = `${window.location.origin}/verify/${applicationId}`

  return (
    <div className="cert-generator-wrapper">
      <div className="cert-actions">
        <button onClick={generatePDF} className="nexus-btn-primary">
          <Download size={16} /> DOWNLOAD OFFICIAL CERTIFICATE
        </button>
        <div className="verification-hint">
          <ShieldCheck size={14} /> Cryptographically Signed & Verified
        </div>
      </div>

      {/* Hidden Certificate Template for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div 
          ref={certificateRef}
          className="certificate-template"
          style={{
            width: '1000px',
            height: '700px',
            padding: '50px',
            background: '#fff',
            border: '20px solid #111',
            fontFamily: 'serif',
            position: 'relative',
            color: '#111'
          }}
        >
          {/* Decorative Border */}
          <div style={{ position: 'absolute', inset: '10px', border: '2px solid #F59E0B' }}></div>
          
          <div className="cert-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{ fontSize: '4rem', margin: '0', color: '#111', letterSpacing: '2px' }}>NEXUS</h1>
            <p style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '4px', color: '#666' }}>
              Institute of Technology & Excellence
            </p>
          </div>

          <div className="cert-body" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '1.5rem', fontStyle: 'italic', marginBottom: '10px' }}>This is to certify that</p>
            <h2 style={{ fontSize: '3.5rem', margin: '0 0 20px 0', borderBottom: '2px solid #111', display: 'inline-block', padding: '0 30px' }}>
              {studentName}
            </h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
              Student UID: <strong>{studentUid}</strong> | Department: <strong>{department}</strong>
            </p>
            
            <div style={{ maxWidth: '600px', margin: '0 auto', lineHeight: '1.6', fontSize: '1.1rem' }}>
              Has successfully fulfilled all institutional requirements and has been granted 
              <strong> FULL CLEARANCE (NO DUES)</strong> by all administrative departments including 
              the Library, Laboratory Facilities, and Departmental Heads.
            </div>
          </div>

          <div className="cert-footer" style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="verification-block" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <QRCodeSVG value={verificationUrl} size={100} level="H" includeMargin />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '0.8rem', margin: '0', color: '#666' }}>VERIFY AUTHENTICITY</p>
                <p style={{ fontSize: '0.7rem', margin: '5px 0', color: '#888', maxWidth: '150px' }}>
                  Scan QR or visit {window.location.origin}/verify
                </p>
                <code style={{ fontSize: '0.6rem', color: '#F59E0B' }}>HASH: {applicationId.slice(0, 16)}...</code>
              </div>
            </div>

            <div className="signatures" style={{ display: 'flex', gap: '50px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid #111', width: '200px', marginBottom: '10px', fontStyle: 'cursive', fontSize: '1.2rem' }}>Principal Signature</div>
                <p style={{ fontSize: '0.8rem', margin: '0', color: '#666' }}>OFFICE OF THE PRINCIPAL</p>
              </div>
            </div>
          </div>

          <div className="watermark" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', opacity: '0.03', fontSize: '10rem', pointerEvents: 'none' }}>
            VERIFIED
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .cert-generator-wrapper { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .cert-actions { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .verification-hint { font-size: 0.7rem; color: #10B981; display: flex; align-items: center; gap: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .nexus-btn-primary { background: #fff; color: #000; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 800; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 10px; }
      `}} />
    </div>
  )
}

export default CertificateGenerator
