import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'i cant code - AI-Powered Code Explanations',
  description: 'Download the i cant code desktop app for AI-powered code explanations using Mistral language model',
  keywords: ['AI', 'code', 'explanations', 'mistral', 'ollama', 'desktop app'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}

