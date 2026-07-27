import { jsPDF } from 'jspdf';

export interface ReceiptData {
  studentName: string;
  studentUid: string;
  amount: number;
  departments: string[];
  transactionId: string;
  date: string;
}

export const generateReceipt = (data: ReceiptData, returnBlob = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // ... (styling and content logic remains the same)
  // Border
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(1);
  doc.rect(10, 10, 190, 277);

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 30, 30);
  doc.text('NEXUS DIGITAL RECEIPT', 105, 30, { align: 'center' });

  // Subheader
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Institutional Dues Clearance', 105, 38, { align: 'center' });

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 45, 190, 45);

  // Transaction Details Box
  doc.setFillColor(245, 245, 245);
  doc.rect(20, 55, 170, 35, 'F');
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Transaction Details', 25, 65);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Transaction ID: ${data.transactionId}`, 25, 75);
  doc.text(`Date & Time: ${data.date}`, 25, 82);

  // Student Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Billed To:', 20, 110);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Name: ${data.studentName}`, 20, 120);
  doc.text(`UID: ${data.studentUid}`, 20, 128);

  // Payment Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Cleared Departments', 20, 150);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  let yPos = 160;
  data.departments.forEach((dept, index) => {
    doc.text(`${index + 1}. ${dept}`, 25, yPos);
    yPos += 8;
  });

  // Total Box
  doc.setFillColor(230, 245, 230);
  doc.rect(130, yPos + 10, 60, 25, 'F');
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Paid:', 135, yPos + 20);
  doc.setTextColor(16, 185, 129); // Green
  doc.setFontSize(16);
  doc.text(`Rs. ${data.amount.toLocaleString()}`, 135, yPos + 30);

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This is an automatically generated digital receipt. No signature is required.', 105, 270, { align: 'center' });

  if (returnBlob) {
    return doc.output('blob');
  }

  // Save PDF
  doc.save(`Nexus_Receipt_${data.transactionId}.pdf`);
};
