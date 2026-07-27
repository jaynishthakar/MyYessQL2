import JSZip from 'jszip';
import { supabase } from './supabase';
import { generateCertificate } from './CertificateGenerator';
import { generateReceipt } from './ReceiptGenerator';

export const exportDigitalLocker = async (studentId: string, studentUid: string) => {
  const zip = new JSZip();
  const folder = zip.folder(`Nexus_Archive_${studentUid}`);

  try {
    // 0. Fetch Profile & Application for generating assets
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    const { data: application } = await supabase
      .from('applications')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    // 1. Fetch all documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('student_id', studentId);

    if (docsError) throw docsError;

    // 2. Download and add each document to the ZIP
    if (documents) {
      for (const doc of documents) {
        // Extract full storage path (e.g., student_id/filename) from public URL
        const path = doc.file_url.split('/documents/').pop();
        if (!path) continue;

        const { data, error: downloadError } = await supabase.storage
          .from('documents')
          .download(path);

        if (downloadError) {
          console.error(`Error downloading ${doc.file_name}:`, downloadError);
          continue;
        }

        if (data) {
          folder?.file(doc.file_name, data);
        }
      }
    }

    // 3. Generate and add official assets if application exists
    if (application && profile) {
      // Library Receipt
      const receiptBlob = generateReceipt({
        studentName: profile.full_name,
        studentUid: profile.student_uid,
        amount: 0, // Mock for archive
        departments: ['Library', 'Laboratories', 'Administrative'],
        transactionId: `TXN-${application.id.substring(0, 8).toUpperCase()}`,
        date: new Date(application.created_at).toLocaleString()
      }, true);
      folder?.file(`Official_NoDues_Receipt.pdf`, receiptBlob as Blob);

      // Final Certificate (if approved)
      if (application.status === 'approved') {
        const certBlob = await generateCertificate({
          studentName: profile.full_name,
          studentUid: profile.student_uid,
          department: application.department || 'General',
          batch: '2022-2026',
          issueDate: new Date().toLocaleDateString(),
          certificateId: application.id.substring(0, 8).toUpperCase()
        }, true);
        folder?.file(`Final_Clearance_Certificate.pdf`, certBlob as Blob);
      }
    }

    // 4. Generate the ZIP file
    const content = await zip.generateAsync({ type: 'blob' });
    
    // 5. Trigger download
    const url = window.URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Nexus_Locker_${studentUid}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (err) {
    console.error("Export error:", err);
    alert("Failed to export digital locker. Please try again.");
  }
};
