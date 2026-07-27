import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Application, Approval, Document } from '../types/workflow'

export const useStudentApplication = () => {
  const { user } = useAuth()
  const [application, setApplication] = useState<Application | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [vaultDocuments, setVaultDocuments] = useState<Document[]>([])
  const [profile, setProfile] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [dues, setDues] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<any>(null)
  // Track the current application ID in a ref to avoid stale closures
  const applicationIdRef = useRef<string | null>(null)

  const fetchData = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      // 0. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError
      
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Student',
            role: user.user_metadata?.role || 'student',
            student_uid: user.user_metadata?.student_uid || null,
            department: user.user_metadata?.department || null
          }])
          .select()
          .maybeSingle()

        if (createError) throw createError
        setProfile(newProfile)
      } else {
        setProfile(profileData)
      }

      // 1. Fetch Application
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .eq('student_id', user.id)
        .maybeSingle()

      if (appError) throw appError
      setApplication(appData)
      // Keep ref in sync — avoids triggering useEffect on every render
      applicationIdRef.current = appData?.id ?? null

      if (appData) {
        // 2. Fetch Approvals
        const { data: approvalsData, error: approvalsError } = await supabase
          .from('approvals')
          .select('*')
          .eq('application_id', appData.id)
          .order('updated_at', { ascending: true })

        if (approvalsError) throw approvalsError
        setApprovals(approvalsData || [])
      }

      // 3. Fetch Vault Documents
      const { data: docsData, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('student_id', user.id)

      if (docsError) throw docsError
      setVaultDocuments(docsData || [])

      // 4. Fetch Dues
      const { data: duesData, error: duesError } = await supabase
        .from('dues')
        .select('*')
        .eq('student_id', user.id)

      if (duesError) throw duesError
      setDues(duesData || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel(`student-updates-${user?.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `student_id=eq.${user?.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dues', filter: `student_id=eq.${user?.id}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, (payload) => {
        // Use the ref (not state) to avoid stale closure & infinite re-subscribe
        if (applicationIdRef.current && payload.new && (payload.new as any).application_id === applicationIdRef.current) {
          fetchData()
        }
      })
      .subscribe()

    // Polling fallback — every 10 seconds (not 5s) to avoid hammering
    const interval = setInterval(() => fetchData(), 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  // CRITICAL FIX: Only depend on user.id (a primitive), NOT on application object
  }, [user?.id])

  const createApplication = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        setError('You must be logged in to create an application. Please log in again.')
        setIsLoading(false)
        return
      }

      const userId = session.user.id

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, student_uid, department, role')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      let profileData = existingProfile;
      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            full_name: session.user.user_metadata?.full_name || 'Student',
            role: session.user.user_metadata?.role || 'student',
            student_uid: session.user.user_metadata?.student_uid || null,
            department: session.user.user_metadata?.department || null
          }])
          .select()
          .maybeSingle()
        
        if (createError) throw createError
        profileData = newProfile
      }

      if (!profileData) {
        setError(`Unable to establish profile. Please contact administrator.`)
        setIsLoading(false)
        return
      }

      if (profileData.role !== 'student') {
        setError(`This page is for students only. Your account role is: ${profileData.role}`)
        setIsLoading(false)
        return
      }

      const { data: existing } = await supabase
        .from('applications')
        .select('id')
        .eq('student_id', userId)
        .maybeSingle()

      if (existing) {
        setError('You already have an existing application. Refreshing...')
        await fetchData()
        setIsLoading(false)
        return
      }

      const { data: newApp, error: insertError } = await supabase
        .from('applications')
        .insert([{
          student_id: userId,
          department: profileData.department ?? 'Unassigned',
          is_submitted: false,
          status: 'librarian_pending',
          current_stage: 'librarian'
        }])
        .select()
        .single()

      if (insertError) {
        setError(`Failed to create application: ${insertError.message} (code: ${insertError.code})`)
        setIsLoading(false)
        return
      }

      setApplication(newApp)
      applicationIdRef.current = newApp.id
    } catch (err: any) {
      setError(`An unexpected error occurred: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = useCallback(async (field: string, value: any) => {
    if (!application || application.is_submitted) return

    setApplication(prev => prev ? { ...prev, [field]: value } : null)
    setIsSaving(true)

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('applications')
          .update({ [field]: value })
          .eq('id', application.id)

        if (error) throw error
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }, [application])

  const updateDocumentSelection = async (docIds: string[]) => {
    if (!application || application.is_submitted) return

    setApplication(prev => prev ? { ...prev, document_ids: docIds } : null)
    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('applications')
        .update({ document_ids: docIds })
        .eq('id', application.id)

      if (error) throw error
      setShowSaved(true)
      setTimeout(() => setShowSaved(false), 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const submitApplication = async () => {
    if (!application) return
    setIsLoading(true)
    try {
      const { error: submitError } = await supabase
        .from('applications')
        .update({
          is_submitted: true,
          department: application.department
        })
        .eq('id', application.id)

      if (submitError) throw submitError;
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePaymentSuccess = async (paidDues: any[]) => {
    if (!application || !profile) return
    setIsLoading(true)
    
    try {
      const { generateReceipt } = await import('../lib/ReceiptGenerator')
      
      const totalAmount = paidDues.reduce((sum, d) => sum + d.amount, 0)
      const departments = [...new Set(paidDues.map(d => d.department))]
      const txId = 'TXN-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      
      generateReceipt({
        studentName: profile.full_name,
        studentUid: profile.student_uid,
        amount: totalAmount,
        departments,
        transactionId: txId,
        date: new Date().toLocaleString()
      })

      if (application.is_submitted && application.current_stage !== 'done') {
        const { error: approvalError } = await supabase
          .from('approvals')
          .update({ 
            status: 'approved', 
            comment: 'System: Automatically approved via Payment Gateway.',
            updated_at: new Date().toISOString()
          })
          .eq('application_id', application.id)
          .eq('role', application.current_stage)

        if (approvalError) throw approvalError

        if (application.current_stage === 'librarian') {
          const { error: stageError } = await supabase
            .from('applications')
            .update({ current_stage: 'lab' })
            .eq('id', application.id)
          if (stageError) throw stageError
        }
      } else if (!application.is_submitted) {
        const { error: submitError } = await supabase
          .from('applications')
          .update({
            is_submitted: true,
            department: application.department,
            current_stage: 'librarian'
          })
          .eq('id', application.id)

        if (submitError) throw submitError
      }

      await fetchData()

      // Broadcast to Librarian Dashboard
      const syncChannel = supabase.channel('global-sync-bridge')
      await syncChannel.subscribe()
      await syncChannel.send({
        type: 'broadcast',
        event: 'PAYMENT_COMPLETED',
        payload: { studentId: profile.id }
      })
      supabase.removeChannel(syncChannel)
    } catch (err: any) {
      setError('Payment logged, but failed to advance pipeline: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
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
    error,
    refresh: fetchData
  }
}
