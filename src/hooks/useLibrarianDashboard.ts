import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ApplicationWithStudent, Approval, Document } from '../types/workflow'

export interface DueRecord {
  id: string
  student_id: string
  department: string
  amount: number
  status: 'pending' | 'paid'
  student?: {
    full_name: string
    student_uid: string
  }
}

export const useLibrarianDashboard = () => {
  const { user } = useAuth()
  const [dues, setDues] = useState<DueRecord[]>([])
  const [systemLogs, setSystemLogs] = useState<any[]>([])
  const [stats, setStats] = useState({ awaiting: 0, approved: 0, rejected: 0 })
  const [applications, setApplications] = useState<ApplicationWithStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (initialLoad = false) => {
    if (!user) {
      setIsLoading(false)
      return
    }
    if (initialLoad) setIsLoading(true)
    setError(null)

    try {
      // 1. Fetch Dues
      const { data: duesData } = await supabase
        .from('dues')
        .select('*, student:profiles(full_name, student_uid)')
        .order('status', { ascending: false })

      // 2. Fetch Librarian Stats
      const { data: statsData } = await supabase
        .from('approvals')
        .select('status')
        .eq('role', 'librarian')

      const counts = (statsData || []).reduce((acc, curr) => {
        if (curr.status === 'approved') acc.approved++
        else if (curr.status === 'rejected') acc.rejected++
        else if (curr.status === 'pending') acc.awaiting++
        return acc
      }, { awaiting: 0, approved: 0, rejected: 0 })

      // 3. Fetch Recent Cleared/Action Logs
      const { data: logsData } = await supabase
        .from('approvals')
        .select('id, status, updated_at, comment, application:applications(student:profiles(full_name, student_uid))')
        .eq('role', 'librarian')
        .neq('status', 'pending')
        .order('updated_at', { ascending: false })
        .limit(10)

      // 4. Fetch Applications at 'librarian' stage
      const { data: appsData } = await supabase
        .from('applications')
        .select('*, student:profiles!inner(full_name, student_uid, department, username)')
        .eq('current_stage', 'librarian')
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      setDues(duesData || [])
      setApplications(appsData || [])
      setSystemLogs(logsData || [])

      setStats({
        awaiting: counts.awaiting,
        approved: counts.approved,
        rejected: counts.rejected
      })

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)

    const channel = supabase
      .channel('librarian-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dues' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData())
      .on('broadcast', { event: 'PAYMENT_COMPLETED' }, () => fetchData())
      .subscribe()

    // Slower polling — 10 seconds to avoid jitter
    const interval = setInterval(() => fetchData(), 10000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [user?.id])

  const uploadCSV = async (csvData: string) => {
    setIsLoading(true)
    try {
      const lines = csvData.split('\n')
      const records = lines.slice(1).filter(line => line.trim() !== '')

      const newDues = []
      for (const line of records) {
        const [student_uid, amount, department] = line.split(',')
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('student_uid', student_uid.trim())
          .maybeSingle()

        if (profile) {
          newDues.push({
            student_id: profile.id,
            amount: parseInt(amount.trim()),
            department: department.trim(),
            status: 'pending'
          })
        }
      }

      if (newDues.length > 0) {
        const { error: insertError } = await supabase
          .from('dues')
          .insert(newDues)
        if (insertError) throw insertError
      }

      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateDueStatus = async (dueId: string, status: 'pending' | 'paid') => {
    try {
      const { error } = await supabase
        .from('dues')
        .update({ status })
        .eq('id', dueId)
      if (error) throw error
      setDues(prev => prev.map(d => d.id === dueId ? { ...d, status } : d))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchApplicationDocuments = async (docIds: string[]): Promise<Document[]> => {
    if (!docIds || docIds.length === 0) return []
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', docIds)
    if (error) { setError(error.message); return [] }
    return data || []
  }

  const fetchApplicationApprovals = async (applicationId: string): Promise<Approval[]> => {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('application_id', applicationId)
      .order('updated_at', { ascending: true })
    if (error) { setError(error.message); return [] }
    return data || []
  }

  const approveApplication = async (applicationId: string, comment: string) => {
    try {
      await supabase
        .from('approvals')
        .update({ status: 'approved', comment, actor_id: user?.id, updated_at: new Date().toISOString() })
        .eq('application_id', applicationId)
        .eq('role', 'librarian')
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const rejectApplication = async (applicationId: string, comment: string) => {
    try {
      await supabase
        .from('approvals')
        .update({ status: 'rejected', comment, actor_id: user?.id, updated_at: new Date().toISOString() })
        .eq('application_id', applicationId)
        .eq('role', 'librarian')
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return {
    dues,
    systemLogs,
    stats,
    applications,
    isLoading,
    error,
    uploadCSV,
    updateDueStatus,
    fetchApplicationDocuments,
    fetchApplicationApprovals,
    approveApplication,
    rejectApplication,
    refresh: () => fetchData(true)
  }
}
