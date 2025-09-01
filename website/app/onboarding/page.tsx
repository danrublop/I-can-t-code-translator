'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Code, Brain, Zap, CheckCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface OnboardingData {
  preferredLanguages: string[]
  experienceLevel: string
  useCase: string
  notifications: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    preferredLanguages: [],
    experienceLevel: 'beginner',
    useCase: 'personal',
    notifications: true
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      router.push('/login')
      return
    }

    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      try {
        const { data: existingPreferences } = await supabase
          .from('user_preferences')
          .select('id')
          .eq('user_id', user.id)
          .single()

        if (existingPreferences) {
          // User has already completed onboarding, redirect to download
          router.push('/download')
        }
      } catch (error) {
        // No preferences found, user needs to complete onboarding
        console.log('User needs to complete onboarding')
      }
    }

    checkOnboardingStatus()
  }, [user, router])

  const handleLanguageToggle = (language: string) => {
    setOnboardingData(prev => ({
      ...prev,
      preferredLanguages: prev.preferredLanguages.includes(language)
        ? prev.preferredLanguages.filter(l => l !== language)
        : [...prev.preferredLanguages, language]
    }))
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!user) return
    
    setLoading(true)
    
    try {
      // Save onboarding data to Supabase
      const { error } = await supabase
        .from('user_preferences')
        .insert([
          {
            user_id: user.id,
            preferred_languages: onboardingData.preferredLanguages,
            experience_level: onboardingData.experienceLevel,
            use_case: onboardingData.useCase,
            notifications: onboardingData.notifications,
          },
        ])

      if (error) {
        console.error('Error saving preferences:', error)
        throw error
      }

      // Redirect to download page
      router.push('/download')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">What programming languages do you use?</h3>
              <p className="text-gray-600">Select all that apply to personalize your experience</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {['JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'TypeScript'].map((language) => (
                <button
                  key={language}
                  onClick={() => handleLanguageToggle(language)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    onboardingData.preferredLanguages.includes(language)
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">What's your experience level?</h3>
              <p className="text-gray-600">This helps us tailor explanations to your skill level</p>
            </div>
            
            <div className="space-y-4">
              {[
                { value: 'beginner', label: 'Beginner', description: 'New to programming or learning basics' },
                { value: 'intermediate', label: 'Intermediate', description: 'Some experience, comfortable with fundamentals' },
                { value: 'advanced', label: 'Advanced', description: 'Experienced developer, looking for optimization tips' }
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => setOnboardingData(prev => ({ ...prev, experienceLevel: level.value }))}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    onboardingData.experienceLevel === level.value
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{level.label}</div>
                  <div className={`text-sm ${onboardingData.experienceLevel === level.value ? 'text-gray-200' : 'text-gray-600'}`}>
                    {level.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">How will you use i cant code?</h3>
              <p className="text-gray-600">Select your primary use case</p>
            </div>
            
            <div className="space-y-4">
              {[
                { value: 'personal', label: 'Personal Projects', description: 'Learning and building for fun' },
                { value: 'work', label: 'Work/Professional', description: 'Professional development and team projects' },
                { value: 'education', label: 'Education', description: 'Studying or teaching programming' }
              ].map((useCase) => (
                <button
                  key={useCase.value}
                  onClick={() => setOnboardingData(prev => ({ ...prev, useCase: useCase.value }))}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    onboardingData.useCase === useCase.value
                      ? 'border-black bg-black text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{useCase.label}</div>
                  <div className={`text-sm ${onboardingData.useCase === useCase.value ? 'text-gray-200' : 'text-gray-600'}`}>
                    {useCase.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Final preferences</h3>
              <p className="text-gray-600">Customize your experience</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium">Enable notifications</span>
                  <input
                    type="checkbox"
                    checked={onboardingData.notifications}
                    onChange={(e) => setOnboardingData(prev => ({ ...prev, notifications: e.target.checked }))}
                    className="h-5 w-5 text-black focus:ring-black border-gray-300 rounded"
                  />
                </label>
                <p className="text-sm text-gray-600 mt-1">Get updates about new features and improvements</p>
              </div>
              

            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">i cant code</span>
            </Link>
            <div className="text-sm text-gray-500">
              Step {currentStep} of 3
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-gray-700">{Math.round((currentStep / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-black h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <div className="flex space-x-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    Complete Setup
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
