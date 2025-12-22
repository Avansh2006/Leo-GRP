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
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Duty Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your shift history and performance statistics.
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
        <div className="space-y-4">
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Shifts</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{dutyLogs.length}</p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Arrests</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {dutyLogs.reduce((sum, log) => sum + log.totalArrests, 0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Fines</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {dutyLogs.reduce((sum, log) => sum + log.totalFines, 0)}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg per Shift</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {(dutyLogs.reduce((sum, log) => sum + log.totalArrests + log.totalFines, 0) / dutyLogs.length).toFixed(1)} actions
              </p>
            </div>
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
