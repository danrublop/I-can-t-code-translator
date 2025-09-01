'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Download, LogOut, User, Settings, Code, Brain, Zap, Github, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface UserPreferences {
  preferred_languages: string[]
  experience_level: string
  use_case: string
  notifications: boolean
  theme: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, signOut, loading: authLoading } = useAuth()
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<UserPreferences | null>(null)
  const [saving, setSaving] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login-website?mode=signin')
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) return

    // Fetch user preferences
    const fetchPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching preferences:', error)
        } else if (data) {
          setUserPreferences(data)
        }
      } catch (error) {
        console.error('Error fetching preferences:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [user])

  const handleLogout = async () => {
    await signOut()
    router.push('/login-website?mode=signup')
  }

  const handleDownload = () => {
    router.push('/download')
  }

  const startEditing = () => {
    if (userPreferences) {
      setEditForm({ ...userPreferences })
      setIsEditing(true)
    } else {
      // If no preferences exist, create default ones
      setEditForm({
        preferred_languages: [],
        experience_level: 'beginner',
        use_case: 'personal',
        notifications: true,
        theme: 'auto'
      })
      setIsEditing(true)
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm(null)
  }

  const savePreferences = async () => {
    if (!editForm || !user) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferred_languages: editForm.preferred_languages,
          experience_level: editForm.experience_level,
          use_case: editForm.use_case,
          notifications: editForm.notifications,
          theme: editForm.theme,
        })

      if (error) {
        console.error('Error saving preferences:', error)
        alert('Error saving preferences. Please try again.')
      } else {
        setUserPreferences(editForm)
        setIsEditing(false)
        setEditForm(null)
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Error saving preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const availableLanguages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'Haskell', 'Elixir', 'Dart'
  ]

  const toggleLanguage = (language: string) => {
    if (!editForm) return
    
    const updatedLanguages = editForm.preferred_languages.includes(language)
      ? editForm.preferred_languages.filter(lang => lang !== language)
      : [...editForm.preferred_languages, language]
    
    setEditForm({
      ...editForm,
      preferred_languages: updatedLanguages
    })
  }

  // Show loading while checking auth or loading data
  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Floating Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-full shadow-lg">
        <div className="px-6 py-3">
          <div className="flex justify-center items-center">
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/danrublop/code-translator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-2 border border-gray-300/50 rounded-full text-sm font-medium text-gray-700 bg-white/50 hover:bg-white/80 transition-all duration-200"
              >
                <Github className="mr-2 h-4 w-4" />
                <Star className="h-4 w-4" />
              </a>
              <button
                onClick={handleDownload}
                className="bg-gray-800/90 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-full inline-flex items-center shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300/50 rounded-full text-sm font-medium text-gray-700 bg-white/50 hover:bg-white/80 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden">
              <img 
                src="/dashboard-icon.png" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user.user_metadata?.name || 'Developer'}!
              </h1>
              <p className="text-gray-600">
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-black">
                {userPreferences?.preferred_languages?.length || 0}
              </div>
              <div className="text-gray-600">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black capitalize">
                {userPreferences?.experience_level || 'Not set'}
              </div>
              <div className="text-gray-600">Experience Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-black capitalize">
                {userPreferences?.use_case || 'Not set'}
              </div>
              <div className="text-gray-600">Primary Use Case</div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Preferences</h2>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Preferences
              </button>
            )}
          </div>

          {isEditing && editForm ? (
            <div className="space-y-6">
              {/* Edit Mode */}
              
              {/* Programming Languages */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferred Languages</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {availableLanguages.map((language) => (
                    <button
                      key={language}
                      onClick={() => toggleLanguage(language)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        editForm.preferred_languages.includes(language)
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Experience Level</h3>
                <div className="flex space-x-4">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setEditForm({ ...editForm, experience_level: level })}
                      className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                        editForm.experience_level === level
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Use Case */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Primary Use Case</h3>
                <div className="flex space-x-4">
                  {['personal', 'work', 'education'].map((useCase) => (
                    <button
                      key={useCase}
                      onClick={() => setEditForm({ ...editForm, use_case: useCase })}
                      className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                        editForm.use_case === useCase
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {useCase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Notifications</span>
                    <button
                      onClick={() => setEditForm({ ...editForm, notifications: !editForm.notifications })}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        editForm.notifications
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {editForm.notifications ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : userPreferences ? (
            <div>
              {/* View Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Programming Languages */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Code className="w-5 h-5 mr-2" />
                  Preferred Languages
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userPreferences.preferred_languages.map((language) => (
                    <span
                      key={language}
                      className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience & Use Case */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Brain className="w-5 h-5 mr-2" />
                  Experience & Goals
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-600">Level: </span>
                    <span className="font-medium capitalize">{userPreferences.experience_level}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Use Case: </span>
                    <span className="font-medium capitalize">{userPreferences.use_case}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Notifications</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    userPreferences.notifications 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {userPreferences.notifications ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

              </div>
            </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No preferences set yet</p>
              <button
                onClick={startEditing}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
              >
                Set Up Preferences
              </button>
            </div>
          )}
        </div>


      </div>
    </div>
  )
}
