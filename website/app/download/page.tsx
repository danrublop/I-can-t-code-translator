'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Download, CheckCircle, Clock, Star, Github } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Release {
  id: number
  name: string
  tag_name: string
  published_at: string
  body: string
  assets: ReleaseAsset[]
}

interface ReleaseAsset {
  id: number
  name: string
  browser_download_url: string
  size: number
  download_count: number
}

interface UserPreferences {
  preferred_languages: string[]
  experience_level: string
  use_case: string
}

export default function DownloadPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [releases, setReleases] = useState<Release[]>([])
  const [loading, setLoading] = useState(true)
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [showOllamaModal, setShowOllamaModal] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<ReleaseAsset | null>(null)
  const [downloadCounts, setDownloadCounts] = useState<{[key: string]: number}>({
    mac: 0,
    windows: 0
  })
  const [userPlatform, setUserPlatform] = useState<string>('unknown')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login-website?mode=signin')
      return
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      detectUserPlatform()
      fetchReleases()
      fetchDownloadCounts()
      fetchUserPreferences()
    }
  }, [user])

  const detectUserPlatform = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform.toLowerCase()
    
    // Check if it's macOS
    if (userAgent.includes('mac') || platform.includes('mac')) {
      // More reliable Apple Silicon detection
      if (navigator.userAgent.includes('arm') || 
          navigator.userAgent.includes('apple') ||
          (navigator as any).hardwareConcurrency >= 8 || // Apple Silicon typically has 8+ cores
          (navigator as any).deviceMemory >= 8) { // Apple Silicon typically has 8GB+ RAM
        setUserPlatform('mac-apple-silicon')
      } else {
        setUserPlatform('mac-intel')
      }
    } else if (userAgent.includes('win')) {
      setUserPlatform('windows')
    } else {
      setUserPlatform('unknown')
    }
  }

  const fetchReleases = async () => {
    try {
      // In a real app, you'd fetch from your GitHub repository
      // For now, we'll use mock data
      const mockReleases: Release[] = [
        {
          id: 1,
          name: 'i cant code v1.0.7',
          tag_name: 'v1.0.7',
          published_at: '2025-08-31T23:30:00Z',
          body: 'Latest stable release with user-friendly installation and white blank window fix.',
          assets: [
            {
              id: 1,
              name: 'i-cant-code-mac-v1.0.7.dmg',
              browser_download_url: '/downloads/i-cant-code-mac-v1.0.7.dmg',
              size: 178395473, // ~170.1MB
              download_count: 1250
            },
            {
              id: 2,
              name: 'i-cant-code-windows-v1.0.6.exe',
              browser_download_url: '/downloads/i-cant-code-windows-v1.0.6.exe',
              size: 80772418, // ~77.0MB
              download_count: 980
            }
          ]
        }
      ]
      
      setReleases(mockReleases)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching releases:', error)
      setLoading(false)
    }
  }

  const fetchUserPreferences = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferred_languages, experience_level, use_case')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching preferences:', error)
      } else if (data) {
        setUserPreferences(data)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }

  const fetchDownloadCounts = async () => {
    try {
      console.log('Fetching download counts...')
      const { data, error } = await supabase.rpc('get_download_counts')
      
      if (error) {
        console.error('Error fetching download counts:', error)
        // Try alternative method if RPC fails
        const { data: altData, error: altError } = await supabase
          .from('downloads')
          .select('platform')
        
        if (altError) {
          console.error('Alternative fetch also failed:', altError)
          return
        }
        
        console.log('Using alternative count method, raw data:', altData)
        const counts = { mac: 0, windows: 0 }
        if (altData) {
          altData.forEach((item: { platform: string }) => {
            if (item.platform === 'mac') counts.mac++
            if (item.platform === 'windows') counts.windows++
          })
        }
        console.log('Alternative counts:', counts)
        setDownloadCounts(counts)
        return
      }

      console.log('RPC data received:', data)
      const counts = { mac: 0, windows: 0 }
      if (data) {
        data.forEach((item: { platform: string; count: number }) => {
          counts[item.platform as keyof typeof counts] = item.count
        })
      }
      console.log('Final counts:', counts)
      setDownloadCounts(counts)
    } catch (error) {
      console.error('Error fetching download counts:', error)
    }
  }

  const generateDeviceFingerprint = () => {
    // Create a device fingerprint based on browser characteristics
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx?.fillText('Device fingerprint', 10, 10)
    const canvasFingerprint = canvas.toDataURL()
    
    const fingerprint = btoa(JSON.stringify({
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      canvas: canvasFingerprint.substring(0, 100) // First 100 chars
    }))
    
    return fingerprint
  }

  const recordDownload = async (platform: string) => {
    if (!user) {
      console.log('No user logged in, cannot record download')
      return
    }

    try {
      const deviceFingerprint = generateDeviceFingerprint()
      console.log('Recording download:', { platform, user_id: user.id, deviceFingerprint })
      
      const { data, error } = await supabase
        .from('downloads')
        .upsert({
          user_id: user.id,
          device_fingerprint: deviceFingerprint,
          platform: platform,
          version: 'v1.0.6',
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,device_fingerprint,platform'
        })

      if (error) {
        console.error('Error recording download:', error)
        // Try to insert instead of upsert if there's an issue
        const { data: insertData, error: insertError } = await supabase
          .from('downloads')
          .insert({
            user_id: user.id,
            device_fingerprint: deviceFingerprint,
            platform: platform,
            version: 'v1.0.6',
            user_agent: navigator.userAgent,
          })
        
        if (insertError) {
          console.error('Error inserting download:', insertError)
        } else {
          console.log('Download recorded successfully via insert')
        }
      } else {
        console.log('Download recorded successfully:', data)
      }
      
      // Refresh download counts regardless
      await fetchDownloadCounts()
    } catch (error) {
      console.error('Error recording download:', error)
    }
  }

  const getPlatformIcon = (platform: string) => {
    if (platform.includes('mac')) return '/mac-logo.webp'
    if (platform.includes('windows')) return '/windows-logo.svg'
    return '💻'
  }

  const getPlatformName = (platform: string) => {
    if (platform.includes('apple-silicon')) return 'macOS (Apple Silicon)'
    if (platform.includes('mac')) return 'macOS (Universal)'
    if (platform.includes('windows')) return 'Windows'
    return 'Unknown'
  }

  const getFilteredAssets = (assets: ReleaseAsset[]) => {
    if (userPlatform === 'mac-apple-silicon' || userPlatform === 'mac-intel') {
      return assets.filter(asset => asset.name.includes('mac'))
    } else if (userPlatform === 'windows') {
      return assets.filter(asset => asset.name.includes('windows'))
    } else {
      // If platform is unknown, show all options
      return assets
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDownloadClick = (asset: ReleaseAsset) => {
    setSelectedAsset(asset)
    setShowOllamaModal(true)
  }

  const proceedWithDownload = async () => {
    if (selectedAsset) {
      // Determine platform from asset name
      const platform = selectedAsset.name.includes('mac') ? 'mac' : 'windows'
      
      // Record the download
      await recordDownload(platform)
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a')
      link.href = selectedAsset.browser_download_url
      link.download = selectedAsset.name // This suggests the filename for download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
    setShowOllamaModal(false)
    setSelectedAsset(null)
  }

  const closeModal = () => {
    setShowOllamaModal(false)
    setSelectedAsset(null)
  }

  // Show loading while checking auth or loading data
  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading releases...'}
          </p>
        </div>
      </div>
    )
  }

  const latestRelease = releases[0]

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
              <Link 
                href="/dashboard" 
                className="inline-flex items-center justify-center transition-all duration-300 hover:scale-105"
              >
                <img 
                  src="/dashboard-icon.png" 
                  alt="Dashboard" 
                  className="w-8 h-8 object-contain"
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:8 py-12 pt-24">
        {/* Welcome Section */}
        {user && userPreferences ? (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome back, {user.user_metadata?.name || 'Developer'}! 👋
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Your preferences are all set up. Download the app and start coding smarter.
              </p>
              
              {/* Preferences Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-black">
                    {userPreferences.preferred_languages.length}
                  </div>
                  <div className="text-gray-600">Languages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-black capitalize">
                    {userPreferences.experience_level}
                  </div>
                  <div className="text-gray-600">Experience Level</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-black capitalize">
                    {userPreferences.use_case}
                  </div>
                  <div className="text-gray-600">Primary Use Case</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Download i cant code
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get the desktop application and start using instant AI-powered code explanations to learn how to code.
            </p>
          </div>
        )}

        {/* Latest Release */}
        {latestRelease && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {latestRelease.name}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Released {formatDate(latestRelease.published_at)}
                  </span>
                  <span className="flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Latest version
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-black">
                  {latestRelease.tag_name}
                </div>
                <div className="text-sm text-gray-600">Current version</div>
              </div>
            </div>

            <div className="prose max-w-none mb-8">
              <p className="text-gray-700">{latestRelease.body}</p>
              <p className="text-red-600 font-semibold mt-2">
                ** Follow installation instructions below
              </p>
              {userPlatform !== 'unknown' && (
                <p className="text-sm text-gray-500 mt-2">
                  Detected platform: {(userPlatform === 'mac-apple-silicon' || userPlatform === 'mac-intel') ? 'macOS (Universal)' : 
                                    userPlatform === 'windows' ? 'Windows' : 'Unknown'}
                </p>
              )}
            </div>

            {/* Download Assets */}
            <div className="grid md:grid-cols-1 gap-6">
              {getFilteredAssets(latestRelease.assets).map((asset) => (
                <div
                  key={asset.id}
                  className="border-2 border-gray-200 rounded-lg p-6 hover:border-black transition-colors"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <img
                      src={getPlatformIcon(asset.name)}
                      alt={getPlatformName(asset.name)}
                      className="w-12 h-12 object-contain"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getPlatformName(asset.name)}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(asset.size)} • {
                          asset.name.includes('mac') 
                            ? downloadCounts.mac.toLocaleString()
                            : downloadCounts.windows.toLocaleString()
                        } downloads
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDownloadClick(asset)}
                    className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download for {getPlatformName(asset.name)}
                  </button>
                </div>
              ))}
            </div>
            
            {/* Show all download options if platform is unknown or user wants alternatives */}
            {userPlatform === 'unknown' && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  All Download Options
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {latestRelease.assets.map((asset) => (
                    <div
                      key={`all-${asset.id}`}
                      className="border border-gray-200 rounded-lg p-4 hover:border-black transition-colors"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <img
                          src={getPlatformIcon(asset.name)}
                          alt={getPlatformName(asset.name)}
                          className="w-8 h-8 object-contain"
                        />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {getPlatformName(asset.name)}
                          </h4>
                          <p className="text-xs text-gray-600">
                            {formatFileSize(asset.size)}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDownloadClick(asset)}
                        className="w-full bg-gray-800 hover:bg-black text-white text-sm font-medium py-2 px-4 rounded transition-colors flex items-center justify-center"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Installation Instructions */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Installation Instructions
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* macOS Instructions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/mac-logo.webp" alt="macOS" className="w-8 h-8" />
                <h3 className="text-xl font-semibold text-gray-900">macOS</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Download the .dmg file above</li>
                <li>Double-click the downloaded file</li>
                <li>Drag the app to your Applications folder</li>
                <li className="font-medium text-orange-700">
                  <strong>Important:</strong> Right-click the app and select "Open" (don't double-click)
                </li>
                <li>Click "Open" when macOS asks about the unverified developer</li>
                <li>Follow the setup wizard to configure your preferences</li>
              </ol>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">📱 Installation Note</h4>
                <p className="text-sm text-blue-700 mb-2">
                  This is an indie app distributed directly (not through the App Store). 
                  macOS will show a standard security dialog - this is normal and safe to bypass.
                </p>
                <p className="text-xs text-blue-600">
                  Many popular developer tools like VS Code, Docker, and Homebrew use the same distribution method.
                </p>
              </div>
            </div>

            {/* Windows Instructions */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <img src="/windows-logo.svg" alt="Windows" className="w-8 h-8" />
                <h3 className="text-xl font-semibold text-gray-900">Windows</h3>
              </div>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Download the .exe file above</li>
                <li>Run the installer as administrator</li>
                <li>Follow the installation wizard</li>
                <li>Launch from Start Menu or Desktop shortcut</li>
                <li>Complete the initial setup and login</li>
              </ol>
            </div>
          </div>
        </div>



        {/* Alternative Installation Methods */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Alternative Installation Methods
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Homebrew */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-black transition-colors">
              <div className="flex items-center space-x-4 mb-4">
                <div className="text-4xl">🍺</div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Homebrew</h3>
                  <p className="text-sm text-gray-600">For command-line users • No security warnings</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <code className="text-sm font-mono">
                  brew install --cask danrublop/i-cant-code/i-cant-code
                </code>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  No security warnings
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Automatic Ollama installation
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Easy updates with <code>brew upgrade</code>
                </div>
              </div>
            </div>

            {/* GitHub Releases */}
            <div className="border-2 border-gray-200 rounded-lg p-6 hover:border-black transition-colors">
              <div className="flex items-center space-x-4 mb-4">
                <svg className="w-12 h-12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">GitHub Releases</h3>
                  <p className="text-sm text-gray-600">For developers • Version history</p>
                </div>
              </div>
              
              <a 
                href="https://github.com/danrublop/I-can-t-code-translator/releases/latest"
                className="block bg-gray-900 hover:bg-gray-800 text-white text-center font-medium py-3 px-6 rounded-lg transition-colors mb-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download from GitHub
              </a>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Professional release notes
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Version history and changelogs
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Trusted by developers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Update Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How to Update Your App
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Homebrew Updates */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🍺</div>
                <h3 className="text-lg font-semibold text-gray-900">Homebrew Users</h3>
                <p className="text-sm text-gray-600">Easiest way to update</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <code className="text-sm font-mono text-gray-800">
                  brew upgrade --cask i-cant-code
                </code>
              </div>
              
              <div className="text-sm text-gray-600">
                <div className="flex items-center mb-1">
                  <span className="text-green-600 mr-2">✓</span>
                  One command updates
                </div>
                <div className="flex items-center mb-1">
                  <span className="text-green-600 mr-2">✓</span>
                  No security warnings
                </div>
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">✓</span>
                  Automatic dependencies
                </div>
              </div>
            </div>

            {/* Manual Updates */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <img 
                    src="/fedora-copy.png" 
                    alt="Fedora" 
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Manual Updates</h3>
                <p className="text-sm text-gray-600">For direct downloads</p>
              </div>
              
              <div className="space-y-2 text-sm text-gray-700 mb-4">
                <div>1. Download latest version</div>
                <div>2. Drag to Applications</div>
                <div>3. Replace existing app</div>
                <div>4. Right-click → Open</div>
              </div>
              
              <a 
                href="https://github.com/danrublop/I-can-t-code-translator/releases/latest"
                className="block bg-gray-900 hover:bg-gray-800 text-white text-center text-sm font-medium py-2 px-4 rounded transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Check for Updates
              </a>
            </div>

            {/* Get Notified */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-center mb-4">
                <div className="flex justify-center mb-2">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Stay Updated</h3>
                <p className="text-sm text-gray-600">Get notified of new releases</p>
              </div>
              
              <div className="space-y-3">
                <a 
                  href="https://github.com/danrublop/I-can-t-code-translator"
                  className="inline-flex items-center justify-center px-3 py-2 border border-gray-300/50 rounded-full text-sm font-medium text-gray-700 bg-white/50 hover:bg-white/80 transition-all duration-200 w-full"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  <Star className="h-4 w-4" />
                </a>
                <div className="text-xs text-gray-600 text-center">
                  Get notified when new versions are released
                </div>
              </div>
            </div>
          </div>
          

        </div>

        {/* Support Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Need help getting started? Check out our documentation or contact support.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="/instagram" className="text-black hover:text-gray-800 font-medium">
              Instagram
            </a>
            <a href="/x" className="text-black hover:text-gray-800 font-medium">
              X
            </a>
            <a href="https://github.com/yourusername/i-cant-code" className="text-black hover:text-gray-800 font-medium">
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Ollama Check Modal */}
      {showOllamaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Do you have Ollama installed?
            </h3>
            <p className="text-gray-600 mb-6">
              i cant code requires Ollama to run the local language model for code explanations.
            </p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={proceedWithDownload}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Yes, I have Ollama installed
              </button>
              
              <div className="text-center">
                <button
                  onClick={closeModal}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-lg transition-colors w-full mb-4"
                >
                  No, I need to install Ollama first
                </button>
                
                <div className="bg-gray-50 p-4 rounded-lg text-left">
                  <h4 className="font-semibold text-gray-900 mb-2">How to install Ollama:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">ollama.ai</a></li>
                    <li>Download Ollama for your operating system</li>
                    <li>Install and run Ollama</li>
                    <li>Open terminal and run: <code className="bg-gray-200 px-1 rounded">ollama pull mistral</code></li>
                    <li>Come back here and download i cant code</li>
                  </ol>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={closeModal}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      I'll install Ollama first, close this dialog
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

