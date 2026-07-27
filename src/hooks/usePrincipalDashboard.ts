import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Application } from '../types/workflow'

export const usePrincipalDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ awaiting: 0, approved: 0, rejected: 0, total: 0 })
  const [metrics, setMetrics] = useState({ activeStudents: 0, completionRate: 0, totalRevenue: 0 })
  const [applications, setApplications] = useState<Application[]>([])
  const [allApplications, setAllApplications] = useState<Application[]>([])
  const [certificateQueue, setCertificateQueue] = useState<Application[]>([])
  const [studentRegistry, setStudentRegistry] = useState<any[]>([])
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
      // 1. Fetch Applications at 'principal' stage
      const { data: principalApps } = await supabase
        .from('applications')
        .select('*, student:profiles(full_name, username, student_uid)')
        .eq('current_stage', 'principal')
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      // 2. Fetch ALL applications
      const { data: allApps } = await supabase
        .from('applications')
        .select('*, student:profiles(full_name, username, student_uid)')
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      // 3. Certificate Queue — fetch apps where Principal has fully approved them
      // Uses created_at for ordering since applications table has no updated_at column
      const { data: certApps, error: certError } = await supabase
        .from('applications')
        .select('*, student:profiles(full_name, username, student_uid)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (certError) {
        console.error('Certificate queue error:', certError.message)
      }

      setCertificateQueue(certApps || [])

      // 4. Student Registry
      const { data: students } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('full_name', { ascending: true })
      setStudentRegistry(students || [])

      // 5. Global Stats
      const { data: approvalsData } = await supabase
        .from('approvals')
        .select('status')
        .eq('role', 'principal')

      const counts = (approvalsData || []).reduce((acc, curr) => {
        if (curr.status === 'pending') acc.awaiting++
        else if (curr.status === 'approved') acc.approved++
        else if (curr.status === 'rejected') acc.rejected++
        return acc
      }, { awaiting: 0, approved: 0, rejected: 0 })

      setStats({
        awaiting: counts.awaiting,
        approved: counts.approved,
        rejected: counts.rejected,
        total: allApps?.length || 0
      })

      // 6. Metrics
      const completed = allApps?.filter(a => a.status === 'approved').length || 0
      const rate = allApps?.length ? Math.round((completed / allApps.length) * 100) : 0
      setMetrics({
        activeStudents: students?.length || 0,
        completionRate: rate,
        totalRevenue: 0 // Financial integration pending
      })

      // Only show REAL applications in the final approvals queue.
      // Mock data cannot be actioned against the DB.
      setApplications(principalApps || [])

      setAllApplications(allApps || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    const channel = supabase
      .channel('principal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
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
      await supabase.from('approvals').update({ status: 'approved', comment, updated_at: new Date().toISOString() }).eq('application_id', applicationId).eq('role', 'principal')
      await supabase.from('applications').update({ status: 'approved' }).eq('id', applicationId)
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
      await supabase.from('approvals').update({ status: 'rejected', comment, updated_at: new Date().toISOString() }).eq('application_id', applicationId).eq('role', 'principal')
      await supabase.from('applications').update({ status: 'rejected' }).eq('id', applicationId)
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stats, metrics, applications, allApplications, certificateQueue, studentRegistry,
    isLoading, approveApplication, rejectApplication, error,
    refresh: () => fetchData(true)
  }
}
