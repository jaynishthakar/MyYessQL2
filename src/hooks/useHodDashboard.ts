import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Application } from '../types/workflow'

export const useHodDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ awaiting: 0, approved: 0, rejected: 0 })
  const [metrics, setMetrics] = useState({ totalStudents: 0, totalCleared: 0, pendingDues: 0 })
  const [applications, setApplications] = useState<Application[]>([])
  const [allDepartmentApplications, setAllDepartmentApplications] = useState<Application[]>([])
  const [escalations, setEscalations] = useState<Application[]>([])
  const [approvalHistory, setApprovalHistory] = useState<any[]>([])
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('department')
        .eq('id', user.id)
        .single()

      const dept = profile?.department || 'Computer Science'

      // 1. Fetch Applications at 'hod' stage
      const { data: hodApps } = await supabase
        .from('applications')
        .select('*, student:profiles(full_name, username, student_uid)')
        .eq('department', dept)
        .eq('current_stage', 'hod')
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      // 2. Fetch ALL department applications
      const { data: allApps } = await supabase
        .from('applications')
        .select('*, student:profiles(full_name, username, student_uid)')
        .eq('department', dept)
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      // 3. Stats
      const { data: approvalsData } = await supabase
        .from('approvals')
        .select('status, applications!inner(department)')
        .eq('role', 'hod')
        .eq('applications.department', dept)

      const counts = (approvalsData || []).reduce((acc, curr) => {
        acc[curr.status as keyof typeof acc]++
        return acc
      }, { pending: 0, approved: 0, rejected: 0 })

      // 4. Metrics
      const totalStudents = allApps?.length || 0
      const totalCleared = allApps?.filter(a => a.status === 'approved')?.length || 0
      setMetrics({
        totalStudents: totalStudents,
        totalCleared: totalCleared,
        pendingDues: (totalStudents - totalCleared)
      })

      // 5. Escalations
      const { data: escalationData } = await supabase
        .from('approvals')
        .select('application:applications(*, student:profiles(full_name, username, student_uid))')
        .eq('status', 'rejected')
        .in('role', ['librarian', 'lab'])
        .eq('application.department', dept)
        .limit(5)
      
      const escApps = (escalationData || []).map(e => e.application).filter(Boolean) as any[]

      // 6. History
      const { data: historyData } = await supabase
        .from('approvals')
        .select(`
          id, status, updated_at, comment,
          application:applications(student:profiles(full_name, student_uid))
        `)
        .eq('role', 'hod')
        .neq('status', 'pending')
        .order('updated_at', { ascending: false })
        .limit(10)

      setApplications(hodApps || [])
      setAllDepartmentApplications(allApps || [])
      setEscalations(escApps)
      setApprovalHistory(historyData || [])
      setStats({ awaiting: counts.pending, approved: counts.approved, rejected: counts.rejected })

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    const channel = supabase
      .channel('hod-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .subscribe()
    const interval = setInterval(() => fetchData(), 5000)
    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [user])

  const approveApplication = async (applicationId: string, comment: string) => {
    setIsLoading(true)
    try {
      await supabase.from('approvals').update({ status: 'approved', comment, updated_at: new Date().toISOString() }).eq('application_id', applicationId).eq('role', 'hod')
      await supabase.from('applications').update({ current_stage: 'principal' }).eq('id', applicationId)
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const rejectApplication = async (applicationId: string, comment: string) => {
    setIsLoading(true)
    try {
      await supabase.from('approvals').update({ status: 'rejected', comment, updated_at: new Date().toISOString() }).eq('application_id', applicationId).eq('role', 'hod')
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stats, metrics, applications, allDepartmentApplications, escalations,
    approvalHistory, isLoading, approveApplication, rejectApplication, error,
    refresh: () => fetchData(true)
  }
}
