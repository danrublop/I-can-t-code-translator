'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-black hover:text-gray-600 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                This Privacy Policy describes how "i cant code" ("we," "our," or "us") collects, uses, and shares information about you when you use our desktop application and website (collectively, the "Service"). We are committed to protecting your privacy and being transparent about our data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Information You Provide</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Account Information:</strong> When you create an account, we collect your email address, name, and password</li>
                <li><strong>Code Submissions:</strong> Code snippets and text you submit for explanation</li>
                <li><strong>Preferences:</strong> Your application settings and preferences</li>
                <li><strong>Communications:</strong> Messages you send to us through support channels</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">Information Automatically Collected</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Usage Data:</strong> How you interact with the Service, features used, and time spent</li>
                <li><strong>Device Information:</strong> Operating system, device type, and application version</li>
                <li><strong>Log Data:</strong> Error logs and performance metrics to improve the Service</li>
                <li><strong>Analytics:</strong> Aggregated usage statistics to understand user behavior</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process your code submissions and generate explanations</li>
                <li>Authenticate your account and provide personalized features</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Respond to your comments, questions, and customer service requests</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Service Providers:</strong> We may share information with third-party service providers who perform services on our behalf (e.g., hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in response to valid legal requests</li>
                <li><strong>Business Transfers:</strong> In connection with any merger, sale of assets, or acquisition of all or a portion of our business</li>
                <li><strong>Protection of Rights:</strong> To protect the rights, property, or safety of "i cant code," our users, or others</li>
                <li><strong>Consent:</strong> With your explicit consent for any other purpose</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure coding practices and regular security audits</li>
              </ul>
              <p className="text-gray-700 mb-4">
                However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. We may also retain and use your information to comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Account Data:</strong> Retained until you delete your account</li>
                <li><strong>Code Submissions:</strong> May be retained for service improvement but are anonymized</li>
                <li><strong>Usage Data:</strong> Typically retained for 2 years for analytics purposes</li>
                <li><strong>Log Data:</strong> Automatically deleted after 90 days unless needed for security purposes</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information, subject to certain exceptions</li>
                <li><strong>Portability:</strong> Request a copy of your data in a machine-readable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
                <li><strong>Account Settings:</strong> Update your preferences and settings within the application</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                Our website may use cookies and similar tracking technologies to enhance your experience. Cookies are small data files stored on your device that help us remember your preferences and understand how you use our Service.
              </p>
              <p className="text-gray-700 mb-4">
                You can control cookies through your browser settings, but disabling cookies may affect the functionality of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                Our Service may integrate with third-party services (such as AI language models, authentication providers, or analytics services). These third parties have their own privacy policies, and we encourage you to review them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete such information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us through our GitHub repository or support channels. We will respond to your inquiry within a reasonable timeframe.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
