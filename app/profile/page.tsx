'use client'

import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'

export default function ProfilePage() {
  const { dutyLogs } = useDuty()
  const { showToast } = useToast()

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const calculateDuration = (start: string, end?: string) => {
    if (!end) return 'In progress'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const hours = Math.floor(duration / 3600000)
    const minutes = Math.floor((duration % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  // Calculate stats for different time periods
  const getStats = () => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - 7)

    const todayLogs = dutyLogs.filter(log => new Date(log.onDutyTime) >= todayStart)
    const weekLogs = dutyLogs.filter(log => new Date(log.onDutyTime) >= weekStart)

    return {
      lifetime: {
        arrests: dutyLogs.reduce((sum, log) => sum + log.totalArrests, 0),
        fines: dutyLogs.reduce((sum, log) => sum + log.totalFines, 0),
        shifts: dutyLogs.length,
        hours: dutyLogs.reduce((sum, log) => {
          if (!log.offDutyTime) return sum
          const duration = new Date(log.offDutyTime).getTime() - new Date(log.onDutyTime).getTime()
          return sum + (duration / 3600000)
        }, 0)
      },
      week: {
        arrests: weekLogs.reduce((sum, log) => sum + log.totalArrests, 0),
        fines: weekLogs.reduce((sum, log) => sum + log.totalFines, 0),
        shifts: weekLogs.length,
        hours: weekLogs.reduce((sum, log) => {
          if (!log.offDutyTime) return sum
          const duration = new Date(log.offDutyTime).getTime() - new Date(log.onDutyTime).getTime()
          return sum + (duration / 3600000)
        }, 0)
      },
      today: {
        arrests: todayLogs.reduce((sum, log) => sum + log.totalArrests, 0),
        fines: todayLogs.reduce((sum, log) => sum + log.totalFines, 0),
        shifts: todayLogs.length,
        hours: todayLogs.reduce((sum, log) => {
          if (!log.offDutyTime) return sum
          const duration = new Date(log.offDutyTime).getTime() - new Date(log.onDutyTime).getTime()
          return sum + (duration / 3600000)
        }, 0)
      }
    }
  }

  const stats = getStats()

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all duty logs?')) {
      localStorage.removeItem('dutyLogs')
      location.reload()
      showToast('Duty logs cleared', 'success')
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Officer Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your comprehensive performance statistics and shift history.
          </p>
        </div>
        {dutyLogs.length > 0 && (
          <button
            onClick={clearLogs}
            className="btn bg-red-600 text-white hover:bg-red-700"
          >
            Clear All Logs
          </button>
        )}
      </div>

      {dutyLogs.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Duty Logs Yet</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start a duty shift from the Reports page to see your logs here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Comprehensive Statistics Section */}
          <div className="space-y-4">
            {/* Today's Stats */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Today's Performance
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Arrests Today</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.today.arrests}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fines Today</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.today.fines}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shifts Today</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.today.shifts}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hours Today</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.today.hours.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* This Week's Stats */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                This Week's Performance (Last 7 Days)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Arrests This Week</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.week.arrests}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fines This Week</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.week.fines}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shifts This Week</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.week.shifts}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Hours This Week</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.week.hours.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {/* Lifetime Stats */}
            <div className="card p-6">
              <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Lifetime Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Arrests</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.lifetime.arrests}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Fines</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lifetime.fines}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Shifts</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.lifetime.shifts}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Hours</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.lifetime.hours.toFixed(1)}</p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 p-4 rounded-lg border border-pink-200 dark:border-pink-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Actions/Shift</p>
                  <p className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                    {stats.lifetime.shifts > 0 ? ((stats.lifetime.arrests + stats.lifetime.fines) / stats.lifetime.shifts).toFixed(1) : '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Shift History Header */}
          <div className="pt-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Shift History</h2>
          </div>

          {/* Duty Log Entries */}
          {dutyLogs.map((log) => (
            <div key={log.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Shift #{log.id}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Duration: {calculateDuration(log.onDutyTime, log.offDutyTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(log.onDutyTime)}
                  </p>
                  {log.offDutyTime && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      to {formatDate(log.offDutyTime)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Stats */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Performance</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Arrests</span>
                      <span className="font-bold text-green-600 dark:text-green-400">{log.totalArrests}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Fines</span>
                      <span className="font-bold text-yellow-600 dark:text-yellow-400">{log.totalFines}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Events Attended</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{log.eventsAttended || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Equipment */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Equipment</h4>
                  <div className="space-y-2">
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Weapons Taken</p>
                      <ul className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                        {log.weaponsTaken.map((weapon, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            {weapon}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Weapons Returned</p>
                      <ul className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                        {log.weaponsReturned.map((weapon, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            {weapon}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
