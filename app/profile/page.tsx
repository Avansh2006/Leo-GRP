'use client'

import { useState, useEffect } from 'react'
import { useDuty } from '@/contexts/DutyContext'
import { useToast } from '@/components/ToastProvider'
import { useNotifications } from '@/contexts/NotificationContext'
import { useUserProfile, WeaponLoadout } from '@/contexts/UserProfileContext'
import SimpleBarChart from '@/components/SimpleBarChart'

export default function ProfilePage() {
  const { dutyLogs } = useDuty()
  const { showToast } = useToast()
  const { achievements, checkAchievements } = useNotifications()
  const { profile, updateProfile, addLoadout, removeLoadout, updateLoadout } = useUserProfile()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'returned' | 'lost' | 'broken' | 'used'>('all')
  const [showAchievements, setShowAchievements] = useState(false)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [showLoadoutModal, setShowLoadoutModal] = useState(false)
  const [editingLoadout, setEditingLoadout] = useState<WeaponLoadout | null>(null)

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: profile.name,
    id: profile.id,
    rank: profile.rank,
    badgeNumber: profile.badgeNumber,
  })

  const [loadoutForm, setLoadoutForm] = useState<WeaponLoadout>({
    id: '',
    name: '',
    vests: [],
    weapons: [],
  })

  const [newVest, setNewVest] = useState('')
  const [newWeapon, setNewWeapon] = useState({ weapon: '', ammo: '' })

  useEffect(() => {
    setProfileForm({
      name: profile.name,
      id: profile.id,
      rank: profile.rank,
      badgeNumber: profile.badgeNumber,
    })
  }, [profile])

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    // Display in GMT+0 (server time)
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
    const gmt0 = new Date(utc)
    return gmt0.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }) + ' (GMT+0)'
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

  // Check achievements whenever stats change
  useEffect(() => {
    checkAchievements(
      stats.lifetime.arrests,
      stats.lifetime.fines,
      stats.lifetime.shifts,
      stats.lifetime.hours
    )
  }, [stats.lifetime.arrests, stats.lifetime.fines, stats.lifetime.shifts, stats.lifetime.hours])

  // Filter logs based on search and weapon status
  const filteredLogs = dutyLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.eventsAttended?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.arrestRecords?.some(r => 
        r.suspectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.suspectId && r.suspectId.toLowerCase().includes(searchTerm.toLowerCase()))
      ) ||
      formatDate(log.onDutyTime).toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' ||
      log.weaponStatus?.some(w => w.status === filterStatus)

    return matchesSearch && matchesFilter
  })

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all duty logs?')) {
      localStorage.removeItem('dutyLogs')
      location.reload()
      showToast('Duty logs cleared', 'success')
    }
  }

  const handleProfileSave = () => {
    updateProfile(profileForm)
    setShowProfileEdit(false)
    showToast('Profile updated successfully', 'success')
  }

  const handleLoadoutSave = () => {
    if (!loadoutForm.name.trim()) {
      showToast('Please enter a loadout name', 'error')
      return
    }

    if (editingLoadout) {
      updateLoadout(editingLoadout.id, loadoutForm)
      showToast('Loadout updated successfully', 'success')
    } else {
      const newLoadout = { ...loadoutForm, id: Date.now().toString() }
      addLoadout(newLoadout)
      showToast('Loadout created successfully', 'success')
    }
    
    resetLoadoutForm()
    setShowLoadoutModal(false)
  }

  const handleDeleteLoadout = (id: string) => {
    if (confirm('Are you sure you want to delete this loadout?')) {
      removeLoadout(id)
      showToast('Loadout deleted successfully', 'success')
    }
  }

  const handleEditLoadout = (loadout: WeaponLoadout) => {
    setEditingLoadout(loadout)
    setLoadoutForm({ ...loadout })
    setShowLoadoutModal(true)
  }

  const resetLoadoutForm = () => {
    setLoadoutForm({
      id: '',
      name: '',
      vests: [],
      weapons: [],
    })
    setEditingLoadout(null)
    setNewVest('')
    setNewWeapon({ weapon: '', ammo: '' })
  }

  const addVestToLoadout = () => {
    if (newVest.trim()) {
      setLoadoutForm(prev => ({
        ...prev,
        vests: [...prev.vests, newVest.trim()],
      }))
      setNewVest('')
    }
  }

  const removeVestFromLoadout = (index: number) => {
    setLoadoutForm(prev => ({
      ...prev,
      vests: prev.vests.filter((_, i) => i !== index),
    }))
  }

  const addWeaponToLoadout = () => {
    if (newWeapon.weapon.trim() && newWeapon.ammo.trim()) {
      setLoadoutForm(prev => ({
        ...prev,
        weapons: [...prev.weapons, { ...newWeapon }],
      }))
      setNewWeapon({ weapon: '', ammo: '' })
    }
  }

  const removeWeaponFromLoadout = (index: number) => {
    setLoadoutForm(prev => ({
      ...prev,
      weapons: prev.weapons.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">Officer Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your profile, loadouts, and view performance statistics.
          </p>
        </div>
        <div className="flex gap-2">
          {achievements.filter(a => a.unlocked).length > 0 && (
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="btn bg-yellow-600 text-white hover:bg-yellow-700"
            >
              🏆 Achievements ({achievements.filter(a => a.unlocked).length}/{achievements.length})
            </button>
          )}
          {dutyLogs.length > 0 && (
            <button
              onClick={clearLogs}
              className="btn bg-red-600 text-white hover:bg-red-700"
            >
              Clear All Logs
            </button>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">👤 Officer Information</h2>
          <button
            onClick={() => setShowProfileEdit(true)}
            className="btn bg-blue-600 text-white hover:bg-blue-700"
          >
            ✏️ Edit Profile
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile.name || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">ID</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile.id || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rank</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile.rank || 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Badge Number</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {profile.badgeNumber || 'Not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Loadouts Card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">🔫 Custom Loadouts</h2>
          <button
            onClick={() => {
              resetLoadoutForm()
              setShowLoadoutModal(true)
            }}
            className="btn bg-green-600 text-white hover:bg-green-700"
          >
            ➕ Create Loadout
          </button>
        </div>

        {profile.loadouts.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No custom loadouts created yet. Click "Create Loadout" to add your first loadout.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.loadouts.map((loadout) => (
              <div
                key={loadout.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{loadout.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditLoadout(loadout)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteLoadout(loadout.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {loadout.vests.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Vests:</p>
                    {loadout.vests.map((vest, idx) => (
                      <span key={idx} className="inline-block bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs mr-1 mb-1">
                        {vest}
                      </span>
                    ))}
                  </div>
                )}
                
                {loadout.weapons.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Weapons:</p>
                    {loadout.weapons.map((weapon, idx) => (
                      <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 mb-1">
                        • {weapon.weapon} ({weapon.ammo} ammo)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Edit Modal */}
      {showProfileEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Profile</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="John Doe"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ID
                  </label>
                  <input
                    type="text"
                    value={profileForm.id}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="12345"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rank
                  </label>
                  <input
                    type="text"
                    value={profileForm.rank}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, rank: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Officer"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Badge Number
                  </label>
                  <input
                    type="text"
                    value={profileForm.badgeNumber}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, badgeNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="B-1234"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleProfileSave}
                  className="flex-1 btn bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowProfileEdit(false)}
                  className="flex-1 btn bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loadout Modal */}
      {showLoadoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingLoadout ? 'Edit Loadout' : 'Create New Loadout'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Loadout Name *
                  </label>
                  <input
                    type="text"
                    value={loadoutForm.name}
                    onChange={(e) => setLoadoutForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g., Standard Patrol"
                  />
                </div>
                
                {/* Vests Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vests
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newVest}
                      onChange={(e) => setNewVest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addVestToLoadout()}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., Vest Level 3"
                    />
                    <button
                      onClick={addVestToLoadout}
                      className="btn bg-green-600 text-white hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {loadoutForm.vests.map((vest, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                        <span className="text-sm text-gray-900 dark:text-gray-100">{vest}</span>
                        <button
                          onClick={() => removeVestFromLoadout(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Weapons Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Weapons
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newWeapon.weapon}
                      onChange={(e) => setNewWeapon(prev => ({ ...prev, weapon: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Weapon name"
                    />
                    <input
                      type="text"
                      value={newWeapon.ammo}
                      onChange={(e) => setNewWeapon(prev => ({ ...prev, ammo: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && addWeaponToLoadout()}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Ammo"
                    />
                    <button
                      onClick={addWeaponToLoadout}
                      className="btn bg-green-600 text-white hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {loadoutForm.weapons.map((weapon, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded">
                        <span className="text-sm text-gray-900 dark:text-gray-100">
                          {weapon.weapon} ({weapon.ammo} ammo)
                        </span>
                        <button
                          onClick={() => removeWeaponFromLoadout(idx)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleLoadoutSave}
                  className="flex-1 btn bg-blue-600 text-white hover:bg-blue-700"
                >
                  {editingLoadout ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowLoadoutModal(false)
                    resetLoadoutForm()
                  }}
                  className="flex-1 btn bg-gray-500 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                  🏆 Achievements
                </h2>
                <button
                  onClick={() => setShowAchievements(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`p-4 rounded-lg border-2 ${
                      achievement.unlocked
                        ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-400'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-4xl">{achievement.icon}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{achievement.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{achievement.description}</p>
                        {achievement.unlocked && achievement.unlockedAt && (
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                            Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                          </p>
                        )}
                        {!achievement.unlocked && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">🔒 Locked</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

          {/* Analytics Charts */}
          {dutyLogs.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Performance Analytics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Last 7 shifts arrests trend */}
                <SimpleBarChart
                  title="Recent Shift Arrests"
                  data={dutyLogs.slice(0, 7).reverse().map((log, idx) => ({
                    label: `Shift ${idx + 1}`,
                    value: log.totalArrests,
                    color: 'bg-gradient-to-r from-green-400 to-green-600'
                  }))}
                />

                {/* Last 7 shifts fines trend */}
                <SimpleBarChart
                  title="Recent Shift Fines"
                  data={dutyLogs.slice(0, 7).reverse().map((log, idx) => ({
                    label: `Shift ${idx + 1}`,
                    value: log.totalFines,
                    color: 'bg-gradient-to-r from-yellow-400 to-yellow-600'
                  }))}
                />

                {/* Top events */}
                <SimpleBarChart
                  title="Most Common Events"
                  data={(() => {
                    const eventCounts: { [key: string]: number } = {}
                    dutyLogs.forEach(log => {
                      log.eventCounters?.forEach(counter => {
                        eventCounts[counter.name] = (eventCounts[counter.name] || 0) + counter.count
                      })
                    })
                    return Object.entries(eventCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([label, value]) => ({
                        label,
                        value,
                        color: 'bg-gradient-to-r from-blue-400 to-blue-600'
                      }))
                  })()}
                />
              </div>

              {/* Weapon Status Summary */}
              {dutyLogs.some(log => log.weaponStatus && log.weaponStatus.length > 0) && (
                <div className="mt-6">
                  <SimpleBarChart
                    title="Overall Weapon Status"
                    data={(() => {
                      const statusCounts = { returned: 0, lost: 0, broken: 0, used: 0 }
                      dutyLogs.forEach(log => {
                        log.weaponStatus?.forEach(weapon => {
                          statusCounts[weapon.status]++
                        })
                      })
                      return [
                        { label: '✅ Returned', value: statusCounts.returned, color: 'bg-gradient-to-r from-green-400 to-green-600' },
                        { label: '🔴 Lost', value: statusCounts.lost, color: 'bg-gradient-to-r from-red-400 to-red-600' },
                        { label: '💔 Broken', value: statusCounts.broken, color: 'bg-gradient-to-r from-orange-400 to-orange-600' },
                        { label: '⚡ Used', value: statusCounts.used, color: 'bg-gradient-to-r from-yellow-400 to-yellow-600' },
                      ].filter(item => item.value > 0)
                    })()}
                  />
                </div>
              )}
            </div>
          )}

          {/* Shift History Header */}
          <div className="pt-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Shift History</h2>
            
            {/* Search and Filter */}
            <div className="card p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by event, suspect name, or date..."
                    className="input w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="input"
                  >
                    <option value="all">All Weapons</option>
                    <option value="returned">✅ Returned</option>
                    <option value="lost">🔴 Lost</option>
                    <option value="broken">💔 Broken</option>
                    <option value="used">⚡ Used</option>
                  </select>
                  {(searchTerm || filterStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setFilterStatus('all')
                      }}
                      className="btn-secondary"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {filteredLogs.length !== dutyLogs.length && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Showing {filteredLogs.length} of {dutyLogs.length} shifts
                </p>
              )}
            </div>
          </div>

          {/* Duty Log Entries */}
          {filteredLogs.map((log) => (
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
                    
                    {/* Weapon Status with colors */}
                    {log.weaponStatus && log.weaponStatus.length > 0 && (
                      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Weapon Status</p>
                        <ul className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                          {log.weaponStatus.map((weapon, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              {weapon.status === 'returned' && <span className="text-green-500">✅</span>}
                              {weapon.status === 'lost' && <span className="text-red-500">🔴</span>}
                              {weapon.status === 'broken' && <span className="text-orange-500">💔</span>}
                              {weapon.status === 'used' && <span className="text-yellow-500">⚡</span>}
                              <span className={
                                weapon.status === 'returned' ? 'text-green-600 dark:text-green-400' :
                                weapon.status === 'lost' ? 'text-red-600 dark:text-red-400' :
                                weapon.status === 'broken' ? 'text-orange-600 dark:text-orange-400' :
                                'text-yellow-600 dark:text-yellow-400'
                              }>
                                {weapon.name} - {weapon.status.toUpperCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Arrest Records */}
              {log.arrestRecords && log.arrestRecords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Arrest Records ({log.arrestRecords.length})</h4>
                  <div className="space-y-3">
                    {log.arrestRecords.map((arrest) => (
                      <div key={arrest.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">{arrest.suspectName}</p>
                            {arrest.suspectId && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">ID: {arrest.suspectId}</p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(arrest.timestamp)}</p>
                          </div>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">${arrest.fines}</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          <p className="font-medium mb-1">Charges:</p>
                          <ul className="space-y-1 text-xs">
                            {arrest.charges.map((charge, idx) => (
                              <li key={idx}>• {charge}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Counters */}
              {log.eventCounters && log.eventCounters.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Event Counters</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {log.eventCounters.map((event) => (
                      <div key={event.name} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400">{event.name}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{event.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
