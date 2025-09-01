'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Github, CheckCircle, Star } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { handleAuthSuccess, continueToApplication } from '@/lib/electron-utils'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, signUp, signOut } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [authSuccess, setAuthSuccess] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Check URL parameters to determine if we should show signup form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const mode = urlParams.get('mode')
      if (mode === 'signup') {
        setIsLogin(false)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isLogin) {
        // Handle login
        const { error } = await signIn(formData.email, formData.password)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Login successful!')
          setAuthSuccess(true)
          setUserData({ email: formData.email, success: true })
          
          // If in Electron, send auth success
          if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
            try {
              await window.electronAPI.sendAuthSuccess({ email: formData.email, success: true })
            } catch (err) {
              console.error('Error sending auth success to Electron:', err)
            }
          }
        }
      } else {
        // Handle registration
        const { error, success } = await signUp(formData.email, formData.password, formData.name)
        if (error) {
          setError(error.message)
        } else if (success) {
          // Check onboarding status and redirect accordingly
          checkOnboardingStatus()
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleGithubAuth = () => {
    // Implement GitHub OAuth with Supabase
    console.log('GitHub authentication')
  }

  const checkOnboardingStatus = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user
      console.log('Checking onboarding status for user:', user?.id)
      
      if (!user) {
        console.log('No user found, redirecting to onboarding')
        router.push('/onboarding')
        return
      }

      // Use a simpler query approach
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)

      console.log('Query result:', { data, error })

      if (data && data.length > 0) {
        console.log('User has completed onboarding, redirecting to download')
        // User has already completed onboarding, redirect to download
        router.push('/download')
      } else {
        console.log('No preferences found, user needs onboarding')
        // User needs to complete onboarding
        router.push('/onboarding')
      }
    } catch (error) {
      // No preferences found, user needs to complete onboarding
      console.log('Error checking onboarding status:', error)
      router.push('/onboarding')
    }
  }

  const handleReturnToApp = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
      // Use the new continue to application flow
      continueToApplication()
    } else {
      // Check onboarding status and redirect accordingly
      checkOnboardingStatus()
    }
  }

  // If authentication was successful, show success message
  if (authSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back! 🎉
            </h2>
            <p className="text-gray-600 mb-8">
              You have successfully logged in to your i cant code account.
            </p>
            
            <button
              onClick={handleReturnToApp}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              Return to Application
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              This will close this window and return you to the main application.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
              <Link href="/" className="transition-transform duration-300 hover:scale-110">
                <Image src="/home.png" alt="Home" width={64} height={64} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="sm:mx-auto sm:w-full sm:max-w-md pt-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-gray-600">
            {isLogin 
              ? 'Sign in to your i cant code account' 
              : 'Join thousands of developers using AI-powered code explanations'
            }
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {/* GitHub OAuth Button */}
          <button
            onClick={handleGithubAuth}
            className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black mb-6"
          >
            <Github className="h-5 w-5 mr-2" />
            Continue with GitHub
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-black hover:text-gray-800">
                    Forgot your password?
                  </a>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    {isLogin ? 'Sign in' : 'Create account'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setMessage('')
                  setFormData({ email: '', password: '', name: '' })
                }}
                className="font-medium text-black hover:text-gray-800"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            By continuing, you agree to our{' '}
            <a href="/terms" className="font-medium text-black hover:text-gray-800">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="font-medium text-black hover:text-gray-800">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
