import { jsPDF } from 'jspdf';

export interface CertificateData {
  studentName: string;
  studentUid: string;
  department: string;
  batch: string;
  issueDate: string;
  certificateId: string;
}

export const generateCertificate = async (data: CertificateData, returnBlob = false) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Background/Border
  doc.setDrawColor(201, 168, 76); // Gold color
  doc.setLineWidth(1);
  doc.rect(5, 5, 287, 200);
  doc.setLineWidth(0.5);
  doc.rect(7, 7, 283, 196);

  // Logo Placeholder
  doc.setFont('serif', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(30, 30, 30);
  doc.text('NEXUS CLEARANCE PROTOCOL', 148.5, 40, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(100, 100, 100);
  doc.text('OFFICIAL NO-DUES CERTIFICATE', 148.5, 55, { align: 'center' });

  // Main Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text('This is to certify that', 148.5, 80, { align: 'center' });

  doc.setFont('serif', 'bolditalic');
  doc.setFontSize(32);
  doc.setTextColor(0, 0, 0);
  doc.text(data.studentName.toUpperCase(), 148.5, 100, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(60, 60, 60);
  doc.text(`UID: ${data.studentUid} | Department of ${data.department}`, 148.5, 115, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`Has successfully completed the administrative clearance process for the batch of ${data.batch}.`, 148.5, 130, { align: 'center' });
  doc.text('No outstanding dues or obligations remain with the institution.', 148.5, 140, { align: 'center' });

  // Verification QR Code
  // Since jsPDF doesn't directly support SVG, we use a canvas-based approach or just a placeholder for now
  doc.setDrawColor(0, 0, 0);
  doc.rect(20, 160, 30, 30);
  doc.setFontSize(8);
  doc.text('SCAN TO VERIFY', 35, 195, { align: 'center' });
  doc.text(`ID: ${data.certificateId}`, 35, 158, { align: 'center' });

  // Signatures
  doc.setDrawColor(150, 150, 150);
  doc.line(180, 180, 260, 180);
  doc.setFontSize(12);
  doc.text('REGISTRAR / PRINCIPAL', 220, 188, { align: 'center' });
  doc.text(`Issued on: ${data.issueDate}`, 220, 195, { align: 'center' });

  if (returnBlob) {
    return doc.output('blob');
  }

  // Save the PDF
  doc.save(`Nexus_Certificate_${data.studentUid}.pdf`);
};
