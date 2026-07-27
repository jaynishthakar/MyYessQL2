import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ApplicationWithStudent } from '../types/workflow'

export const useLabDashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({ awaiting: 0, approved: 0, rejected: 0 })
  const [applications, setApplications] = useState<ApplicationWithStudent[]>([])
  const [clearedStudents, setClearedStudents] = useState<ApplicationWithStudent[]>([])
  const [labDues, setLabDues] = useState<any[]>([])
  const [inventory] = useState([
    { id: '1', name: 'Oscilloscope X100', status: 'In Stock', condition: 'Excellent' },
    { id: '2', name: 'Digital Multimeter', status: 'Checked Out', condition: 'Good' },
    { id: '3', name: 'Signal Generator', status: 'In Stock', condition: 'Maintenance' },
    { id: '4', name: 'Power Supply 30V', status: 'In Stock', condition: 'Good' }
  ])
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

      // Default to Computer Science if not assigned, to ensure user sees content
      const dept = profile?.department || 'Computer Science'

      // 1. Fetch Stats
      const { data: statsData } = await supabase
        .from('approvals')
        .select('status, applications!inner(department)')
        .eq('role', 'lab')
        .eq('applications.department', dept)

      const counts = (statsData || []).reduce((acc, curr) => {
        if (curr.status === 'approved') acc.approved++
        else if (curr.status === 'rejected') acc.rejected++
        else if (curr.status === 'pending') acc.awaiting++
        return acc
      }, { awaiting: 0, approved: 0, rejected: 0 })

      // 2. Pending Applications
      const { data: pending } = await supabase
        .from('applications')
        .select('*, student:profiles!inner(full_name, student_uid, department, username)')
        .eq('department', dept)
        .eq('current_stage', 'lab')
        .eq('is_submitted', true)
        .order('created_at', { ascending: false })

      // 3. Cleared Students
      const { data: cleared } = await supabase
        .from('applications')
        .select('*, student:profiles!inner(full_name, student_uid, department, username)')
        .eq('department', dept)
        .eq('status', 'approved')
        .limit(10)

      // 4. Lab Dues Management
      const { data: duesData } = await supabase
        .from('dues')
        .select('*, student:profiles(full_name, student_uid)')
        .eq('department', dept)

      setApplications(pending || [])
      setClearedStudents(cleared || [])
      setLabDues(duesData || [])
      setStats(counts)

    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)

    const channel = supabase
      .channel('lab-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approvals' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dues' }, () => fetchData())
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
      // 1. Update Approval
      const { error: approvalError } = await supabase
        .from('approvals')
        .update({
          status: 'approved',
          comment,
          updated_at: new Date().toISOString()
        })
        .eq('application_id', applicationId)
        .eq('role', 'lab')
      if (approvalError) throw approvalError

      // 2. Advance stage to HOD
      const { error: appError } = await supabase
        .from('applications')
        .update({ current_stage: 'hod' })
        .eq('id', applicationId)
      if (appError) throw appError

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
      const { error } = await supabase
        .from('approvals')
        .update({
          status: 'rejected',
          comment,
          actor_id: user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('application_id', applicationId)
        .eq('role', 'lab')

      if (error) throw error
      
      // Optimistic update
      setApplications(prev => prev.filter(app => app.id !== applicationId))
      setStats(prev => ({ ...prev, awaiting: prev.awaiting - 1, rejected: prev.rejected + 1 }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const updateDueStatus = async (dueId: string, status: 'pending' | 'paid') => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('dues')
        .update({ status })
        .eq('id', dueId)
      if (error) throw error
      await fetchData()
    } finally {
      setIsLoading(false)
    }
  }

  return {
    stats,
    applications,
    clearedStudents,
    labDues,
    inventory,
    isLoading,
    approveApplication,
    rejectApplication,
    updateDueStatus,
    error,
    refresh: () => fetchData(true)
  }
}
