import React, { useState, useEffect } from 'react';

interface LicenseInfo {
  type: 'free' | 'trial' | 'paid';
  status: 'active' | 'expired' | 'revoked';
  trialStartDate?: Date | null;
  trialEndDate?: Date | null;
  features: string[];
  createdAt: Date;
  lastUpdated: Date;
}

interface LicenseStatusProps {
  className?: string;
}

const LicenseStatus: React.FC<LicenseStatusProps> = ({ className = '' }) => {
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo | null>(null);
  const [isFreeMode, setIsFreeMode] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLicenseInfo = async () => {
      try {
        if (window.electronAPI) {
          try {
            const result = await window.electronAPI.getLicenseInfo();
            if (result.success) {
              setLicenseInfo(result.licenseInfo);
              setIsFreeMode(result.isFreeMode || false);
            }
          } catch (error) {
            console.error('Error loading license info:', error);
          }
        }
      } catch (error) {
        console.error('Error loading license info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLicenseInfo();
  }, []);

  if (loading) {
    return null; // Don't show anything while loading
  }

  // Don't show anything in free mode (clean UI)
  if (isFreeMode) {
    return null;
  }

  // Show trial/subscription status
  if (licenseInfo?.type === 'trial') {
    const daysLeft = licenseInfo.trialEndDate 
      ? Math.max(0, Math.ceil((new Date(licenseInfo.trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    return (
      <div className={`license-status trial ${className}`} style={{
        fontSize: '11px',
        color: '#fbbf24',
        textAlign: 'center',
        marginTop: '4px',
        padding: '2px 8px',
        background: 'rgba(251, 191, 36, 0.1)',
        borderRadius: '4px',
        border: '1px solid rgba(251, 191, 36, 0.3)'
      }}>
        🚀 Trial: {daysLeft} days remaining
      </div>
    );
  }

  if (licenseInfo?.type === 'paid') {
    return (
      <div className={`license-status paid ${className}`} style={{
        fontSize: '11px',
        color: '#10b981',
        textAlign: 'center',
        marginTop: '4px',
        padding: '2px 8px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '4px',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        ✅ Premium Active
      </div>
    );
  }

  return null;
};

export default LicenseStatus;
