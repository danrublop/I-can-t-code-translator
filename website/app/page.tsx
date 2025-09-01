'use client'

import Link from 'next/link'
import { Github, Zap, Code, Brain, ArrowRight, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isMac, setIsMac] = useState(true)
  const [showLanguages, setShowLanguages] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Detect operating system
    const platform = navigator.platform.toLowerCase()
    setIsMac(platform.includes('mac'))
    
    // Detect mobile device
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    setIsMobile(mobileCheck)
  }, [])

  const getKeyLabel = (key: string) => {
    return isMac ? key.replace('Ctrl', 'Cmd') : key.replace('Cmd', 'Ctrl')
  }

  return (
    <div className="min-h-screen">
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
                href={isMobile ? "#" : "/login-website?mode=signup"} 
                className={`bg-gray-800/90 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-full inline-flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 backdrop-blur-sm ${isMobile ? 'cursor-not-allowed opacity-75' : ''}`}
                onClick={isMobile ? (e) => {
                  e.preventDefault();
                  alert('Desktop app download is not available on mobile devices. Please visit this site on a desktop computer.');
                } : undefined}
              >
                {isMac ? (
                  <img src="/mac-logo.webp" alt="macOS" className="w-5 h-5 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] -mt-0.5 lg:mr-2" />
                ) : (
                  <img src="/windows-logo.svg" alt="Windows" className="w-6 h-6 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] lg:mr-2" />
                )}
                <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] hidden lg:inline whitespace-nowrap">Get Started for Free</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>


      {/* New PC Section */}
      <section className="py-32 bg-white">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-16 items-start">
            <div className="flex flex-col justify-start pt-20">
              <div className="text-8xl font-bold text-gray-900 leading-none">
                <div>{'{'}I</div>
                <div>cant</div>
                <div>code{'}'}.</div>
              </div>
              
              <div className="mt-8 text-center text-6xl font-bold text-gray-900">
                <div>\</div>
                <div>/</div>
                <div>\</div>
                <div>/</div>
                <div className="text-8xl mt-4">⇩</div>
              </div>
            </div>
            
            <div className="lg:col-span-2 flex justify-center">
              <img 
                src="/pc.png" 
                alt="Development setup with i cant code" 
                className="rounded-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Vibecoder Section */}
      <section className="py-32 bg-white">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-16 items-start">
            <div className="flex flex-col justify-start">
              <div className="text-8xl font-bold text-gray-900 leading-none">
                <div>are you a</div>
                <div>vibe-</div>
                <div>coder</div>
                <div>who doesnt</div>
                <div>know how</div>
                <div>to code?</div>
                <div>learn</div>
                <div>to</div>
                <div>code</div>
                <div>while</div>
                <div>vibe-</div>
                <div>codeing</div>
                <div>for</div>
                <div>free</div>
              </div>
              
              {/* Responsive pattern that extends to match image column height */}
              <div className="flex flex-col items-center justify-start text-6xl font-bold text-gray-900 leading-tight mt-8 h-full">
                <div className="flex flex-col space-y-2 repeat-pattern">
                  <div>\</div>
                  <div>/</div>
                  <div>\</div>
                  <div className="pl-4">/</div>
                  <div>\</div>
                  <div>/</div>
                  <div>\</div>
                  <div className="pl-4">/</div>
                  <div>\</div>
                  <div>/</div>
                  <div>\</div>
                  <div className="pl-4">/</div>
                  <div>\</div>
                  <div>/</div>
                  <div>\</div>
                  <div className="pl-4">/</div>
                  <div>\</div>
                  <div>/</div>
                  <div>\</div>
                  <div className="pl-4">/</div>
                  <div className="text-8xl mt-4">⇩</div>
                  <Link href="/login-website?mode=signup" className="mt-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg inline-flex items-center shadow-lg transition-all duration-300 hover:scale-105 text-lg">
                    {isMac ? (
                      <img src="/mac-logo.webp" alt="macOS" className="w-6 h-6 mr-3 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.5)] -mt-0.5" />
                    ) : (
                      <img src="/windows-logo.svg" alt="Windows" className="w-7 h-7 mr-3 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
                    )}
                    <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">Get Started for Free</span>
                  </Link>
                </div>
                <p className="mt-6 text-lg text-gray-600 text-center">
                  **The i cant code toolbar sits discreetly on top of your screen, ready to help whenever you need it.
                </p>
              </div>
            </div>
            
            <div className="lg:col-span-2 flex flex-col space-y-8">
              <img 
                src="/code-cop2y.png" 
                alt="Code example 1" 
                className="rounded-lg w-full h-auto"
              />
              <img 
                src="/code-copy1.png" 
                alt="Code example 2" 
                className="rounded-lg w-full h-auto"
              />
              <img 
                src="/code-copy4.png" 
                alt="Code example 3" 
                className="rounded-lg w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-16">
            <div>
              <div className="text-6xl font-bold text-black mb-4">
                {getKeyLabel('Cmd+C')}
              </div>
              <p className="text-xl text-black">
                Use {getKeyLabel('Cmd+C')} to select the code you want explained
              </p>
            </div>
            
            <div>
              <div className="text-6xl font-bold text-black mb-4">
                {getKeyLabel('Cmd+Shift+T')}
              </div>
              <p className="text-xl text-black">
                Press {getKeyLabel('Cmd+Shift+T')} to get the explanation in a popup window
              </p>
            </div>
            
            <div>
              <div className="text-6xl font-bold text-black mb-4">
                {getKeyLabel('Cmd+Shift+H')}
              </div>
              <p className="text-xl text-black">
                Use {getKeyLabel('Cmd+Shift+H')} to hide the toolbar when not needed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <img 
                src="/fedora.png" 
                alt="Fedora image" 
                className="rounded-lg w-full h-auto max-w-lg"
              />
            </div>
            
            <div className="text-center lg:text-left">
              <ul className="text-2xl text-black space-y-4">
                <li>-15+ languages</li>
                <li>-powered by local llm</li>
                <li>-no charge $$</li>
                <li>-built by vibecoders for vibecoders</li>
                <li>-instant explanations</li>
                                  <li className="flex items-center justify-center lg:justify-start">
                    <span>-please star </span>
                    <a
                      href="https://github.com/danrublop/code-translator"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-2 px-3 py-2 border border-gray-700 rounded-md text-lg font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors duration-200"
                    >
                      <Github className="mr-2 h-5 w-5" />
                      <Star className="h-5 w-5" />
                    </a>
                  </li>
                <li>-help us get jobs plz 🙏💰</li>
              </ul>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center space-x-8 text-gray-400">
            <span className="text-lg font-semibold text-white">Product</span>
            <Link href="/download" className="hover:text-white">Download</Link>
            <Link href="#features" className="hover:text-white">Features</Link>
            <span className="text-lg font-semibold text-white">Support</span>
            <Link href="https://github.com/danrublop/code-translator" className="hover:text-white">GitHub</Link>
            <Link href="/instagram" className="hover:text-white">Instagram</Link>
            <Link href="/x" className="hover:text-white">X</Link>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 i cant code. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Fixed Sign In Button */}
      <Link 
        href="/login-website?mode=signin" 
        className="fixed bottom-6 right-6 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-full shadow-lg transition-all duration-300 hover:scale-105 z-50"
      >
        Sign In
      </Link>
    </div>
  )
}
