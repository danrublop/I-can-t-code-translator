/// <reference path="./types/electron.d.ts" />
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { UserProfile } from '../main/services/auth.service';
import loadingManImage from './loadingman.png';

// Function to parse markdown-style formatting from Mistral
const parseMarkdown = (text: string): string => {
  if (!text) return '';
  
  let parsed = text;
  
  // Convert headings (must be done first, line by line)
  parsed = parsed.split('\n').map(line => {
    // Handle different heading levels
    if (line.startsWith('### ')) {
      return `<h3 style="color: #f9fafb; font-size: 18px; font-weight: 600; margin: 16px 0 8px 0;">${line.substring(4)}</h3>`;
    } else if (line.startsWith('## ')) {
      return `<h2 style="color: #f9fafb; font-size: 22px; font-weight: 700; margin: 20px 0 12px 0;">${line.substring(3)}</h2>`;
    } else if (line.startsWith('# ')) {
      return `<h1 style="color: #f9fafb; font-size: 26px; font-weight: 800; margin: 24px 0 16px 0;">${line.substring(2)}</h1>`;
    }
    return line;
  }).join('\n');
  
  // Convert code blocks (```language ... ```)
  parsed = parsed.replace(/```(\w+)?\n([\s\S]*?)```/g, 
    '<pre style="background: #1f2937; padding: 12px; border-radius: 6px; margin: 12px 0; overflow-x: auto;"><code style="color: #e5e7eb; font-family: \'SF Mono\', Monaco, Consolas, monospace;">$2</code></pre>'
  );
  
  // Convert **text** to <strong>text</strong> for bold
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f9fafb; font-weight: 600;">$1</strong>');
  
  // Convert *text* to <em>text</em> for italic (avoid conflicts with bold)
  // First handle the bold text, then handle single asterisks that aren't part of bold
  parsed = parsed.replace(/\*([^*]+?)\*/g, (match, p1) => {
    // Skip if this is part of bold formatting (surrounded by **)
    return `<em style="color: #d1d5db; font-style: italic;">${p1}</em>`;
  });
  
  // Convert `text` to <code>text</code> for inline code
  parsed = parsed.replace(/`([^`]+?)`/g, '<code style="background: #374151; color: #fbbf24; padding: 2px 6px; border-radius: 3px; font-family: \'SF Mono\', Monaco, Consolas, monospace;">$1</code>');
  
  // Convert numbered lists (1. item)
  parsed = parsed.replace(/^(\d+)\.\s+(.+)$/gm, 
    '<div style="margin: 4px 0; padding-left: 16px;"><span style="color: #60a5fa; font-weight: 600;">$1.</span> $2</div>'
  );
  
  // Convert bullet points (- item or * item)
  parsed = parsed.replace(/^[-*]\s+(.+)$/gm, 
    '<div style="margin: 4px 0; padding-left: 16px;"><span style="color: #34d399;">•</span> $1</div>'
  );
  
  // Convert line breaks to proper HTML
  parsed = parsed.replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.6;">');
  parsed = parsed.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped in block elements
  if (!parsed.includes('<h1>') && !parsed.includes('<h2>') && !parsed.includes('<h3>') && !parsed.includes('<pre>')) {
    parsed = `<p style="margin: 12px 0; line-height: 1.6;">${parsed}</p>`;
  } else {
    // Ensure content starts with proper paragraph if it doesn't start with a heading
    if (!parsed.match(/^<[h123]|^<pre/)) {
      parsed = `<p style="margin: 12px 0; line-height: 1.6;">${parsed}</p>`;
    }
  }
  
  return parsed;
};

// Notebook View Component
const NotebookView: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  const [explanations, setExplanations] = useState<any[]>([]);
  const [filteredExplanations, setFilteredExplanations] = useState<any[]>([]);
  const [selectedExplanation, setSelectedExplanation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExplanations();
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      loadExplanations();
    }
  }, [refreshTrigger]);

  const loadExplanations = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getAllExplanations();
        if (result.success) {
          setExplanations(result.explanations || []);
          setFilteredExplanations(result.explanations || []);
        }
      }
    } catch (error) {
      console.error('Error loading explanations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredExplanations(explanations);
    } else {
      const filtered = explanations.filter(exp => 
        exp.title?.toLowerCase().includes(query.toLowerCase()) ||
        exp.code?.toLowerCase().includes(query.toLowerCase()) ||
        exp.explanation?.toLowerCase().includes(query.toLowerCase()) ||
        exp.language?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredExplanations(filtered);
    }
  };

  const selectExplanation = (exp: any) => {
    setSelectedExplanation(exp);
  };

  const deleteExplanation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this explanation?')) return;
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deleteExplanation(id);
        if (result.success) {
          await loadExplanations();
          if (selectedExplanation?.id === id) {
            setSelectedExplanation(null);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting explanation:', error);
    }
  };



  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
        <div className="spinner"></div>
        <div>Loading notebook...</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '52px',
      left: 0,
      width: '100%',
      height: 'calc(100% - 52px)',
      background: '#000000',
      color: '#e5e7eb',
      overflow: 'hidden',
      zIndex: 1000
    }}>
      {/* Main Content - Same format as explanation window */}
      <div className="content" style={{ padding: '20px' }}>
        <div className="main-content" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '20px',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 120px)',
          paddingRight: '10px'
        }}>
          {/* Search Section - Top Container */}
          <div className="search-section">
            <div className="section-header">
              <span>Search</span>
            </div>
            <input
              type="text"
              placeholder="Search by title, code, explanation, or language..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{
                width: '300px',
                padding: '8px 12px',
                border: '1px solid #4b5563',
                borderRadius: '6px',
                background: '#374151',
                color: '#e5e7eb',
                fontSize: '14px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#4b5563'}
            />
          </div>

          {/* Explanations List Section */}
          <div className="explanations-section">
            <div className="section-header">
              <span>Saved Explanations</span>
              <span style={{ 
                fontSize: '12px', 
                color: '#9ca3af', 
                marginLeft: 'auto',
                padding: '2px 8px',
                background: '#374151',
                borderRadius: '4px'
              }}>
                {filteredExplanations.length} items
              </span>
            </div>
            
            <div className="explanations-list" style={{
              border: '1px solid #374151',
              borderRadius: '8px',
              background: '#1f2937',
              maxHeight: '300px',
              overflow: 'auto'
            }}>
              {filteredExplanations.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  {searchQuery ? 'No explanations found matching your search.' : 'No explanations saved yet.'}
                </div>
              ) : (
                filteredExplanations.map((exp) => (
                  <div
                    key={exp.id}
                    onClick={() => selectExplanation(exp)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #374151',
                      cursor: 'pointer',
                      background: selectedExplanation?.id === exp.id ? '#1e40af' : 'transparent',
                      transition: 'background 0.2s',
                      borderLeft: selectedExplanation?.id === exp.id ? '4px solid #3b82f6' : '4px solid transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedExplanation?.id !== exp.id) {
                        e.currentTarget.style.background = '#374151';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedExplanation?.id !== exp.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ 
                      fontWeight: '600', 
                      marginBottom: '8px', 
                      color: '#f9fafb',
                      fontSize: '14px'
                    }}>
                      {exp.language} {new Date(exp.timestamp).toLocaleDateString().replace(/\//g, '.')}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af', 
                      marginBottom: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        background: '#374151',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        color: '#e5e7eb'
                      }}>
                        {exp.language}
                      </span>
                      <span>{new Date(exp.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#d1d5db', 
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {exp.explanation.substring(0, 120)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Explanation Detail Section */}
          {selectedExplanation && (
            <div className="explanation-detail-section">
              <div className="section-header">
                <span>Explanation Details</span>
                <button
                  onClick={() => deleteExplanation(selectedExplanation.id)}
                  style={{
                    background: '#000000',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginLeft: '8px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="Delete Explanation"
                >
                  Delete
                </button>

              </div>

              {/* Code Section */}
              <div className="code-section" style={{ marginBottom: '20px' }}>
                <div className="code-viewer" style={{
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  background: '#1f2937',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <div>
                    <pre style={{
                      margin: 0,
                      padding: '16px',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      color: '#e5e7eb',
                      fontFamily: 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace'
                    }}>
                      <code>{selectedExplanation.code}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Explanation Section */}
              <div className="explanation-content" style={{
                border: '1px solid #374151',
                borderRadius: '8px',
                background: '#111827',
                padding: '16px',
                lineHeight: '1.6',
                color: '#e5e7eb',
                fontSize: '14px'
              }}>
                <span dangerouslySetInnerHTML={{ __html: parseMarkdown(selectedExplanation.explanation) }} />
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
};

interface ExplanationData {
  code?: string;
  language?: string;
  explanation?: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  error?: string;
  progress?: number;
}

interface ExplanationProps {}

const Explanation: React.FC<ExplanationProps> = () => {
  const [data, setData] = useState<ExplanationData>({
    status: 'idle' // Changed from 'processing' to 'idle' for initial state
  });
  const [detailLevel, setDetailLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notebookRefreshTrigger, setNotebookRefreshTrigger] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState<{
    connected: boolean;
    status: string;
    isStarting: boolean;
    lastChecked: Date | null;
    error?: string;
  }>({
    connected: false,
    status: 'Checking...',
    isStarting: false,
    lastChecked: null
  });
  
  // Update checking state
  const [updateInfo, setUpdateInfo] = useState<{
    appVersion: string;
    websiteVersion: string;
    hasUpdate: boolean;
    isChecking: boolean;
    lastChecked: Date | null;
    updateAvailable?: {
      version: string;
      releaseNotes: string;
      downloadUrl: string;
    };
    error?: string;
  }>({
    appVersion: '1.0.0',
    websiteVersion: '1.0.0',
    hasUpdate: false,
    isChecking: false,
    lastChecked: null
  });
  
  const [showLogin, setShowLogin] = useState(false);
  
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Add ref for the main content area to enable auto-scrolling
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // State to track if auto-scroll should be enabled
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  // Ollama connection checking
  const checkOllamaConnection = async () => {
    try {
      const result = await (window.electronAPI as any).getOllamaStatus();
      if (result.success && result.status) {
        setOllamaStatus({
          connected: result.status.isRunning,
          status: result.status.isStarting ? 'Starting...' : 
                  result.status.isRunning ? 'Connected' : 
                  result.status.error ? `Error: ${result.status.error}` : 'Not Running',
          isStarting: result.status.isStarting,
          lastChecked: new Date(),
          error: result.status.error
        });
      } else {
        setOllamaStatus(prev => ({
          ...prev,
          connected: false,
          status: 'Status Check Failed',
          isStarting: false,
          lastChecked: new Date(),
          error: result.error
        }));
      }
    } catch (error) {
      setOllamaStatus(prev => ({
        ...prev,
        connected: false,
        status: 'Status Check Failed',
        isStarting: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Manual Ollama start
  const startOllama = async () => {
    try {
      setOllamaStatus(prev => ({ ...prev, isStarting: true, status: 'Starting...' }));
      
      const result = await (window.electronAPI as any).startOllama();
      if (result.success && result.status) {
        setOllamaStatus({
          connected: result.status.isRunning,
          status: result.status.isStarting ? 'Starting...' : 
                  result.status.isRunning ? 'Connected' : 
                  result.status.error ? `Error: ${result.status.error}` : 'Not Running',
          isStarting: result.status.isStarting,
          lastChecked: new Date(),
          error: result.status.error
        });
      } else {
        setOllamaStatus(prev => ({
          ...prev,
          connected: false,
          status: 'Start Failed',
          isStarting: false,
          lastChecked: new Date(),
          error: result.error
        }));
      }
    } catch (error) {
      setOllamaStatus(prev => ({
        ...prev,
        connected: false,
        status: 'Start Failed',
        isStarting: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Check for updates
  const checkForUpdates = async () => {
    try {
      setUpdateInfo(prev => ({ ...prev, isChecking: true, error: undefined }));
      
      const result = await (window.electronAPI as any).checkForUpdates();
      if (result.success && result.versionInfo) {
        setUpdateInfo({
          appVersion: result.versionInfo.appVersion,
          websiteVersion: result.versionInfo.websiteVersion,
          hasUpdate: result.versionInfo.hasUpdate,
          isChecking: false,
          lastChecked: new Date(),
          updateAvailable: result.versionInfo.updateAvailable
        });
      } else {
        setUpdateInfo(prev => ({
          ...prev,
          isChecking: false,
          lastChecked: new Date(),
          error: result.error || 'Failed to check for updates'
        }));
      }
    } catch (error) {
      setUpdateInfo(prev => ({
        ...prev,
        isChecking: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Force version check (manual refresh)
  const forceVersionCheck = async () => {
    try {
      setUpdateInfo(prev => ({ ...prev, isChecking: true, error: undefined }));
      
      const result = await (window.electronAPI as any).forceVersionCheck();
      if (result.success) {
        if (result.requiresReauth) {
          // Website version changed, user needs to re-login
          setIsAuthenticated(false);
          setUser(null);
          setShowLogin(true);
        } else {
          // No version change, just check for updates normally
          await checkForUpdates();
        }
      } else {
        setUpdateInfo(prev => ({
          ...prev,
          isChecking: false,
          lastChecked: new Date(),
          error: result.error || 'Failed to check version'
        }));
      }
    } catch (error) {
      setUpdateInfo(prev => ({
        ...prev,
        isChecking: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };
  
  // Track user scroll behavior
  const handleScroll = () => {
    if (!mainContentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = mainContentRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px threshold
    
    // If user scrolls up from bottom, disable auto-scroll permanently
    if (!isAtBottom && autoScrollEnabled) {
      setAutoScrollEnabled(false);
    }
    // Remove the re-enabling logic - once disabled, it stays disabled
  };

  useEffect(() => {
    console.log('Explanation component mounted');
    console.log('window.electronAPI available:', !!window.electronAPI);
    console.log('window.electronAPI object:', window.electronAPI);
    
    // Listen for explanation data from main process
    if (window.electronAPI) {
      console.log('Setting up explanation data listener');
      window.electronAPI.onExplanationData((newData: ExplanationData) => {
        console.log('Received explanation data via IPC:', newData);
        
        // Only change status to 'processing' if we're actually generating an explanation
        // Keep 'idle' status for initial setup data
        if (newData.status === 'processing' && !data.explanation) {
          // This is the start of actual AI generation
          setData(newData);
        } else if (newData.status === 'completed' || newData.status === 'error') {
          // Final result
          setData(newData);
          
          // Auto-save completed explanations to notebook
          console.log('Auto-save check - Status:', newData.status);
          console.log('Auto-save check - Data:', newData);
          console.log('Auto-save check - Has explanation:', !!newData.explanation);
          console.log('Auto-save check - Has code:', !!newData.code);
          console.log('Auto-save check - Has language:', !!newData.language);
          
          if (newData.status === 'completed' && newData.explanation && newData.code && newData.language) {
            console.log('Auto-save triggered!');
            autoSaveToNotebook(newData);
          } else {
            console.log('Auto-save skipped - missing required data');
          }
        } else if (newData.status === 'processing' && data.explanation) {
          // Progress updates during generation
          setData(newData);
        } else if (newData.status === 'idle') {
          // Initial state
          setData(newData);
        }
        // Don't change status for initial setup data
      });
      
      // Listen for authentication status
      if (window.electronAPI) {
        (window.electronAPI as any).onAuthStatus((authData: any) => {
          console.log('Received auth status in explanation window:', authData);
          setIsAuthenticated(authData.isAuthenticated);
          setUser(authData.user);
          
          // Onboarding is now handled by the website during authentication
          console.log('Onboarding handled by website - skipping local onboarding');
        });
      } else {
        console.error('electronAPI not available!');
        
        // Fallback: try to listen for messages directly
        console.log('Attempting fallback message listening...');
        window.addEventListener('message', (event) => {
          console.log('Received message event:', event);
          if (event.data && event.data.type === 'explanation-data') {
            console.log('Received explanation data via message event:', event.data.data);
            setData(event.data.data);
          }
        });
      }
    } // Add missing closing brace for the if (window.electronAPI) statement

    // Listen for settings page requests from toolbar
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'open-settings-page') {
        console.log('Received open-settings-page request from toolbar');
        setShowSettingsPage(true);
        setShowSettings(false);
        setShowNotebook(false);
      }
    };
    
    window.addEventListener('message', handleMessage);

    // Listen for notebook requests from toolbar
    if (window.electronAPI) {
      window.electronAPI.onOpenNotebookInExplanation(() => {
        console.log('Received open-notebook-in-explanation request from toolbar');
        setShowNotebook(true);
        setShowSettingsPage(false);
        setShowSettings(false);
      });
    }

    // Listen for test onboarding message
    const handleTestOnboarding = (event: MessageEvent) => {
      if (event.data && event.data.type === 'test-onboarding') {
        console.log('Received test-onboarding request');
        // Onboarding is now handled by the website
      }
    };
    
    window.addEventListener('message', handleTestOnboarding);

    // Check authentication status - simplified for development
    const checkAuthStatus = async () => {
      // For development, we'll start with no authentication
      setIsAuthenticated(false);
      setUser(null);
    };
    
    checkAuthStatus();
    
    // Set up window controls immediately
    setupWindowControls();
    
    // Set up resize functionality
    setupResizeHandling();

    return () => {
      if (window.electronAPI) {
        console.log('Removing explanation data listener');
        window.electronAPI.removeExplanationDataListener();
      }
      window.removeEventListener('message', handleMessage);
      
      // Track session end
      // onboardingService.trackSessionEnd(); // Removed onboardingService
    };
  }, []);

  // Auto-scroll to bottom when new content arrives during streaming
  useEffect(() => {
    if (data.status === 'processing' && data.explanation && mainContentRef.current && autoScrollEnabled) {
      // Use setTimeout to ensure DOM has updated with new content
      setTimeout(() => {
        if (mainContentRef.current && autoScrollEnabled) {
          mainContentRef.current.scrollTo({
            top: mainContentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50); // Small delay to ensure content is rendered
    }
  }, [data.explanation, data.status, autoScrollEnabled]);

  // Auto-scroll to bottom when status changes to completed
  useEffect(() => {
    if (data.status === 'completed' && mainContentRef.current && autoScrollEnabled) {
      // Scroll to bottom to show the complete explanation
      setTimeout(() => {
        if (mainContentRef.current && autoScrollEnabled) {
          mainContentRef.current.scrollTo({
            top: mainContentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100); // Slightly longer delay for completion
    }
  }, [data.status, autoScrollEnabled]);

  // Check Ollama connection and updates when settings page is opened
  useEffect(() => {
    if (showSettingsPage) {
      checkOllamaConnection();
      checkForUpdates(); // Also check for updates when settings opens
      // Set up periodic checking while settings page is open
      const interval = setInterval(() => {
        checkOllamaConnection();
        // Check for updates every 30 seconds (less frequent than Ollama)
        if (Math.floor(Date.now() / 1000) % 30 === 0) {
          checkForUpdates();
        }
      }, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [showSettingsPage]);

  const setupWindowControls = () => {
    const closeBtn = document.getElementById('close-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        if (window.electronAPI) {
          await window.electronAPI.windowClose();
        } else {
          // Fallback: close window directly
          window.close();
        }
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', async () => {
        if (window.electronAPI) {
          await window.electronAPI.windowMinimize();
        }
        // Note: No fallback for minimize in frameless window
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', async () => {
        if (window.electronAPI) {
          await window.electronAPI.windowMaximize();
        }
        // Note: No fallback for maximize in frameless window
      });
    }
  };

  const setupResizeHandling = () => {
    if (!resizeHandleRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      setStartSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
      setStartPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaX = e.clientX - startPos.x;
      const deltaY = e.clientY - startPos.y;

      const newWidth = Math.max(600, startSize.width + deltaX);
      const newHeight = Math.max(400, startSize.height + deltaY);

      window.resizeTo(newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    resizeHandleRef.current.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (resizeHandleRef.current) {
        resizeHandleRef.current.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  };

  const handleDetailLevelChange = async (level: 'beginner' | 'intermediate' | 'expert') => {
    setDetailLevel(level);
    
    // If we have code, regenerate explanation with new detail level
    if (data.code && data.language && window.electronAPI) {
      try {
        setData(prev => ({ ...prev, status: 'processing' }));
        
        const result = await window.electronAPI.translateCode(data.code, level);
        
        if (result.success) {
          const newData = {
            ...data,
            explanation: result.explanation,
            status: 'completed' as const
          };
          
          setData(newData);
          
          // Auto-save is already handled by the IPC listener, no need to duplicate here
        } else {
          setData(prev => ({
            ...prev,
            status: 'error',
            error: result.error
          }));
        }
      } catch (error) {
        setData(prev => ({
          ...prev,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    }
  };

  const handleLogout = async () => {
    try {
      if (window.electronAPI) {
        console.log('Attempting logout...');
        const result = await (window.electronAPI as any).authLogout();
        if (result.success) {
          console.log('Logout successful');
          setIsAuthenticated(false);
          setUser(null);
          // The main process will handle closing the window and updating the toolbar
        } else {
          console.error('Logout failed:', result.error);
        }
      } else {
        console.error('electronAPI not available for logout');
        // Fallback: just clear local state
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Still clear local state as fallback
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Track saved explanations to prevent duplicates
  const [savedExplanationIds, setSavedExplanationIds] = useState<Set<string>>(new Set());

  // Auto-save completed explanations to notebook
  const autoSaveToNotebook = async (explanationData: ExplanationData) => {
    console.log('autoSaveToNotebook called with:', explanationData);
    
    if (!explanationData.explanation || !explanationData.code || !explanationData.language) {
      console.log('Missing required data for auto-save');
      console.log('explanation:', !!explanationData.explanation);
      console.log('code:', !!explanationData.code);
      console.log('language:', !!explanationData.language);
      return;
    }

    // Create a unique identifier for this explanation to prevent duplicates
    const explanationHash = btoa(explanationData.code + explanationData.explanation).substring(0, 20);
    
    if (savedExplanationIds.has(explanationHash)) {
      console.log('Explanation already saved, skipping duplicate save');
      return;
    }

    try {
      console.log('Attempting to save to notebook...');
      if (window.electronAPI) {
        const saveData = {
          code: explanationData.code,
          language: explanationData.language,
          explanation: explanationData.explanation,
          title: `Code Explanation - ${explanationData.language}`,
          tags: [explanationData.language, 'auto-saved'],
          timestamp: new Date().toISOString()
        };

        console.log('Save data prepared:', saveData);
        const result = await window.electronAPI.saveExplanation(saveData);
        console.log('Save result:', result);
        
        if (result.success) {
          if ((result as any).isDuplicate) {
            console.log('Explanation was already saved, skipping duplicate');
          } else {
            console.log('Auto-saved explanation to notebook:', result.explanation);
            // Trigger notebook refresh only for new saves
            setNotebookRefreshTrigger(prev => prev + 1);
          }
          // Mark this explanation as saved (whether new or duplicate)
          setSavedExplanationIds(prev => new Set(prev).add(explanationHash));
        } else {
          console.error('Failed to auto-save explanation:', result.error);
        }
      } else {
        console.error('electronAPI not available for saving');
      }
    } catch (error) {
      console.error('Error auto-saving explanation:', error);
    }
  };

  const getLanguageIcon = (language?: string) => {
    if (!language) return '?';
    
    const languageMap: { [key: string]: string } = {
      'javascript': 'JS',
      'typescript': 'TS',
      'python': 'PY',
      'java': 'JA',
      'cpp': 'C++',
      'csharp': 'C#',
      'go': 'GO',
      'rust': 'RS',
      'php': 'PHP',
      'ruby': 'RB',
      'swift': 'SW',
      'kotlin': 'KT',
      'html': 'HT',
      'css': 'CS',
      'sql': 'SQ',
      'shell': 'SH'
    };
    
    return languageMap[language.toLowerCase()] || language.substring(0, 2).toUpperCase();
  };

  const getLanguageColor = (language?: string) => {
    if (!language) return '#3b82f6';
    
    const colorMap: { [key: string]: string } = {
      'javascript': '#f7df1e',
      'typescript': '#3178c6',
      'python': '#3776ab',
      'java': '#007396',
      'cpp': '#00599c',
      'csharp': '#239120',
      'go': '#00add8',
      'rust': '#ce422b',
      'php': '#777bb4',
      'ruby': '#cc342d',
      'swift': '#ffac45',
      'kotlin': '#7f52ff',
      'html': '#e34f26',
      'css': '#1572b6',
      'sql': '#336791',
      'shell': '#4eaa25'
    };
    
    return colorMap[language.toLowerCase()] || '#3b82f6';
  };





  const renderContent = () => {
    switch (data.status) {
      case 'processing':
        return (
          <div className="explanation-content" style={{
            minHeight: 'auto',
            overflow: 'visible'
          }}>
            {data.explanation ? (
              <div>
                <div style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#e5e7eb',
                  margin: 0,
                  padding: '20px',
                  background: 'transparent',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text'
                }}>
                  <span dangerouslySetInnerHTML={{ __html: parseMarkdown(data.explanation) }} />
                </div>
              </div>
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                <div>Generating AI explanation...</div>
              </div>
            )}
          </div>
        );
      
      case 'completed':
        if (data.explanation && data.explanation.trim()) {
          return (
            <div className="explanation-content" style={{
              minHeight: 'auto',
              overflow: 'visible'
            }}>
              <div style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#e5e7eb',
                margin: 0,
                padding: '20px',
                background: 'transparent',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text'
              }}>
                <span dangerouslySetInnerHTML={{ __html: parseMarkdown(data.explanation || '') }} />
              </div>
            </div>
          );
        } else {
          return (
            <div className="error">
              <h3>No Explanation Generated</h3>
              <p>The AI didn't generate any explanation content.</p>
            </div>
          );
        }
      
      case 'error':
        return (
          <div className="error">
            <h3>Error Generating Explanation</h3>
            <p>{data.error || 'An unknown error occurred'}</p>
            <p>Please check that:</p>
            <ul style={{ textAlign: 'left', marginTop: '8px' }}>
              <li>Ollama is running on your system</li>
              <li>The Mistral model is available (`ollama pull mistral:latest`)</li>
              <li>You have text selected when using the shortcut</li>
            </ul>
          </div>
        );
      
      default:
        return (
          <div style={{ 
            position: 'relative',
            width: '100%',
            height: 'calc(100vh - 120px)',
            overflow: 'hidden'
          }}>
            {/* LetterGlitch Background - Full Container */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 1
            }}>
              
            </div>
            
            {/* Content Overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              zIndex: 10,
              width: '100%',
              padding: '0 20px'
            }}>
              {/* Main Text */}
              <h1 style={{
                color: '#ffffff',
                fontSize: '48px',
                fontWeight: 'bold',
                margin: '0 0 30px 0',
                textShadow: '0 0 20px rgba(97, 220, 163, 0.5)',
                letterSpacing: '2px'
              }}>
                
              </h1>
              
              {/* Loading Man Image */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <img 
                  src={loadingManImage} 
                  alt="Loading..." 
                  style={{
                    width: '120px',
                    height: 'auto',
                    opacity: 0.8
                  }}
                />
              </div>
              
              {/* Progress Bar */}
              {data.status !== 'idle' && typeof data.progress === 'number' ? (
                <div style={{
                  width: '400px',
                  height: '8px',
                  background: '#374151',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  margin: '0 auto'
                }}>
                  <div style={{
                    width: `${data.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #61dca3, #61b3dc)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
              ) : (
                <div style={{
                  width: '400px',
                  height: '8px',
                  background: '#374151',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  margin: '0 auto'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #61dca3, #61b3dc)',
                    borderRadius: '4px',
                    animation: 'progress-animation 2s ease-in-out infinite'
                  }}></div>
                </div>
              )}
              
              {/* CSS Animation for Progress Bar */}
            </div>
            
            {/* CSS Animation for Progress Bar */}
            <style>{`
              @keyframes progress-animation {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
              }
              
              @keyframes cursor-blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
              }
              
              /* Markdown formatting styles */
              strong {
                font-weight: bold;
                color: #fbbf24;
              }
              
              em {
                font-style: italic;
                color: #a78bfa;
              }
              
              code {
                background: #374151;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                color: #10b981;
              }
              
              /* Custom scrollbar for code container */
              .code-viewer::-webkit-scrollbar {
                width: 8px;
              }
              
              .code-viewer::-webkit-scrollbar-track {
                background: #374151;
                border-radius: 4px;
              }
              
              .code-viewer::-webkit-scrollbar-thumb {
                background: #6b7280;
                border-radius: 4px;
              }
              
              .code-viewer::-webkit-scrollbar-thumb:hover {
                background: #9ca3af;
              }
            `}</style>
          </div>
        );
    }
  };

  return (
    <div className="app-container" style={{ background: '#000000', minHeight: '100vh' }}>
      {/* Custom Mac-style Header */}
      <div className="mac-header" style={{
        background: '#000000',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        borderBottom: '1px solid #333',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        ...({
          WebkitAppRegion: 'drag' // Makes header draggable
        } as any)
      }}>
        {/* Left side - Three dot buttons */}
        <div className="window-controls" style={{
          display: 'flex',
          gap: '8px',
          ...({
            WebkitAppRegion: 'no-drag' // Prevents dragging on buttons
          } as any)
        }}>
          <div 
            id="close-btn"
            className="control-button close" 
            onClick={async () => {
              if (window.electronAPI) {
                await window.electronAPI.windowClose();
              } else {
                window.close();
              }
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ff5f56',
              border: '1px solid #e0443e',
              cursor: 'pointer'
            }}
          ></div>
          <div 
            id="minimize-btn"
            className="control-button minimize" 
            onClick={async () => {
              if (window.electronAPI) {
                await window.electronAPI.windowMinimize();
              }
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ffbd2e',
              border: '1px solid #dea123',
              cursor: 'pointer'
            }}
          ></div>
          <div 
            id="maximize-btn"
            className="control-button maximize" 
            onClick={async () => {
              if (window.electronAPI) {
                await window.electronAPI.windowMaximize();
              }
            }}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#27ca3f',
              border: '1px solid #1aab29',
              cursor: 'pointer'
            }}
          ></div>
        </div>
        
        {/* Right side - Home, Notebook and Settings buttons */}
        <div className="header-actions" style={{
          display: 'flex',
          gap: '8px',
          ...({
            WebkitAppRegion: 'no-drag' // Prevents dragging on buttons
          } as any)
        }}>
          <button
            onClick={() => {
              setShowNotebook(false);
              setShowSettingsPage(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: '500'
            }}
            title="Home"
          >
            home
          </button>
          <button
            onClick={() => {
              setShowNotebook(true);
              setShowSettingsPage(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: '500'
            }}
            title="Codebook"
          >
            codebook
          </button>
          <button
            onClick={() => {
              setShowSettingsPage(true);
              setShowNotebook(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px'
            }}
            title="Settings"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* Secondary Header - Always visible below Mac header */}
      <div style={{
        background: '#000000',
        height: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: '32px',
        zIndex: 999
      }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#e5e7eb', textAlign: 'center' }}>
          {showSettingsPage ? 'Settings & Debug' : 
           showNotebook ? 'Notebook' : 
           'Highlight text in any app and press Cmd+Shift+T ✨'}
        </div>
        
        {/* Navigation buttons */}
        <div style={{ position: 'absolute', right: '20px', display: 'flex', gap: '8px' }}>
          {showSettingsPage && (
            <button
              onClick={() => setShowSettingsPage(false)}
              style={{
                background: 'transparent',
                color: '#e5e7eb',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '3px'
              }}
              title="Close Settings"
            >
              ×
            </button>
          )}
          
          {showNotebook && (
            <button
              onClick={() => setShowNotebook(false)}
              style={{
                background: 'transparent',
                color: '#e5e7eb',
                border: 'none',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '3px'
              }}
              title="Close Notebook"
            >
              ×
            </button>
          )}
        </div>
      </div>



      {/* Settings Page */}
      {showSettingsPage ? (
        <div style={{
          position: 'fixed',
          top: '52px', // Start below both headers (32px + 20px)
          left: 0,
          width: '100%',
          height: 'calc(100% - 52px)', // Adjust height to account for both headers
          background: '#000000',
          color: '#e5e7eb',
          overflow: 'auto',
          zIndex: 1000,
          padding: '20px'
        }}>
          {/* Settings Content */}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Detail Level Selector */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>Detail Level</h2>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['beginner', 'intermediate', 'expert'].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleDetailLevelChange(level as 'beginner' | 'intermediate' | 'expert')}
                    style={{
                      background: detailLevel === level ? '#ffffff' : '#000000',
                      color: detailLevel === level ? '#000000' : '#ffffff',
                      border: '2px solid #ffffff',
                      padding: '10px 20px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textTransform: 'capitalize',
                      fontWeight: '500'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* System Status */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>System Status</h2>
              <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                <div style={{ color: '#9ca3af' }}>
                  Ollama Connection:
                  <span style={{ 
                    color: ollamaStatus.connected ? '#10b981' : '#ef4444', 
                    marginLeft: '8px',
                    fontWeight: '500'
                  }}>
                    {ollamaStatus.status}
                  </span>
                  {ollamaStatus.lastChecked && (
                    <span style={{ color: '#6b7280', marginLeft: '8px', fontSize: '12px' }}>
                      (checked {ollamaStatus.lastChecked.toLocaleTimeString()})
                    </span>
                  )}
                </div>
                <div style={{ color: '#9ca3af' }}>Electron API:<span style={{ color: '#10b981', marginLeft: '8px' }}>Available</span></div>
                <div style={{ color: '#9ca3af' }}>Component State:<span style={{ color: '#10b981', marginLeft: '8px' }}>Active</span></div>
                <div style={{ color: '#9ca3af' }}>Data Received:<span style={{ color: '#10b981', marginLeft: '8px' }}>Yes</span></div>
                <div style={{ color: '#9ca3af' }}>Explanation Length:<span style={{ color: '#10b981', marginLeft: '8px' }}>{data.explanation ? data.explanation.length : 0} characters</span></div>
              </div>
              
              {/* Ollama Status Actions */}
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={checkOllamaConnection}
                  disabled={ollamaStatus.isStarting}
                  style={{
                    background: ollamaStatus.isStarting ? '#374151' : '#000000',
                    color: '#ffffff',
                    border: '1px solid #374151',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: ollamaStatus.isStarting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: ollamaStatus.isStarting ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!ollamaStatus.isStarting) {
                      e.currentTarget.style.background = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!ollamaStatus.isStarting) {
                      e.currentTarget.style.background = '#000000';
                    }
                  }}
                >
                  {ollamaStatus.isStarting ? 'Checking...' : 'Refresh Status'}
                </button>
                
                {!ollamaStatus.connected && !ollamaStatus.isStarting && (
                  <button
                    onClick={startOllama}
                    style={{
                      background: '#059669',
                      color: '#ffffff',
                      border: '1px solid #10b981',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#047857';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#059669';
                    }}
                  >
                    Start Ollama
                  </button>
                )}
                
                {!ollamaStatus.connected && !ollamaStatus.isStarting && (
                  <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                    💡 Ollama will start automatically when the app opens, or click "Start Ollama" above
                  </div>
                )}
                
                {ollamaStatus.isStarting && (
                  <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                    🔄 Starting Ollama... This may take a moment.
                  </div>
                )}
                
                {ollamaStatus.error && (
                  <div style={{ fontSize: '12px', color: '#ef4444', maxWidth: '400px' }}>
                    ❌ Error: {ollamaStatus.error}
                  </div>
                )}
              </div>
            </div>

            {/* Update Information */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>App Updates</h2>
              <div style={{
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ color: '#9ca3af' }}>App Version:<span style={{ color: '#10b981', marginLeft: '8px' }}>{updateInfo.appVersion}</span></div>
                  <div style={{ color: '#9ca3af' }}>Website Version:<span style={{ color: '#10b981', marginLeft: '8px' }}>{updateInfo.websiteVersion}</span></div>
                  <div style={{ color: '#9ca3af' }}>Update Available:<span style={{ color: updateInfo.hasUpdate ? '#f59e0b' : '#10b981', marginLeft: '8px' }}>{updateInfo.hasUpdate ? 'Yes' : 'No'}</span></div>
                  <div style={{ color: '#9ca3af' }}>Last Checked:<span style={{ color: '#10b981', marginLeft: '8px' }}>{updateInfo.lastChecked ? updateInfo.lastChecked.toLocaleTimeString() : 'Never'}</span></div>
                </div>
                
                {/* Update Available Banner */}
                {updateInfo.hasUpdate && updateInfo.updateAvailable && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    border: '1px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    color: '#ffffff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🚀</span>
                      <strong style={{ fontSize: '16px' }}>Update Available: v{updateInfo.updateAvailable.version}</strong>
                    </div>
                    <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: '1.5' }}>
                      {updateInfo.updateAvailable.releaseNotes}
                    </p>
                    <button
                      onClick={() => {
                        if (updateInfo.updateAvailable?.downloadUrl) {
                          (window.electronAPI as any).openExternal(updateInfo.updateAvailable.downloadUrl);
                        }
                      }}
                      style={{
                        background: '#ffffff',
                        color: '#d97706',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                      }}
                    >
                      Download Update
                    </button>
                  </div>
                )}
                
                {/* Update Check Actions */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={checkForUpdates}
                    disabled={updateInfo.isChecking}
                    style={{
                      background: updateInfo.isChecking ? '#374151' : '#000000',
                      color: '#ffffff',
                      border: '1px solid #374151',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: updateInfo.isChecking ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: updateInfo.isChecking ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!updateInfo.isChecking) {
                        e.currentTarget.style.background = '#374151';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!updateInfo.isChecking) {
                        e.currentTarget.style.background = '#000000';
                      }
                    }}
                  >
                    {updateInfo.isChecking ? 'Checking...' : 'Check for Updates'}
                  </button>
                  
                  <button
                    onClick={forceVersionCheck}
                    disabled={updateInfo.isChecking}
                    style={{
                      background: updateInfo.isChecking ? '#374151' : '#059669',
                      color: '#ffffff',
                      border: '1px solid #10b981',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: updateInfo.isChecking ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: updateInfo.isChecking ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!updateInfo.isChecking) {
                        e.currentTarget.style.background = '#047857';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!updateInfo.isChecking) {
                        e.currentTarget.style.background = '#059669';
                      }
                    }}
                  >
                    Force Refresh
                  </button>
                </div>
                
                {updateInfo.isChecking && (
                  <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '8px' }}>
                    🔄 Checking for updates...
                  </div>
                )}
                
                {updateInfo.error && (
                  <div style={{ fontSize: '12px', color: '#ef4444', maxWidth: '400px', marginTop: '8px' }}>
                    ❌ Error: {updateInfo.error}
                  </div>
                )}
              </div>
            </div>

            {/* Debug Actions */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>Debug Actions</h2>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => console.log('Current state:', { data, detailLevel })}
                  style={{
                    background: '#000000',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    padding: '10px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Log State to Console
                </button>
                <button
                  onClick={() => console.log('Testing translation API...')}
                  style={{
                    background: '#000000',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    padding: '10px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(255, 255, 255, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#000000';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  Test Translation API
                </button>
              </div>
            </div>

            {/* Logout Section */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>Account</h2>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: '2px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title="Logout"
              >
                Logout
              </button>
            </div>

            {/* Raw Data Display */}
            <div style={{
              marginBottom: '24px'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '16px', color: '#f9fafb' }}>Raw Data</h2>
              <div style={{
                background: '#111827',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px',
                maxHeight: '300px',
                maxWidth: '400px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <pre style={{ margin: 0, color: '#e5e7eb' }}>
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : showNotebook ? (
        <NotebookView refreshTrigger={notebookRefreshTrigger} />
      ) : (
        <>
          {/* Main Content */}
          <div className="content" style={{ padding: '20px' }}>
            <div className="detail-level-selector">
              {/* Removed the old settings button since it's now in the header */}
            </div>
            

            
            <div className="main-content" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '20px',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 120px)', // Account for header and padding
              paddingRight: '10px' // Add some padding for scrollbar
            }} ref={mainContentRef} onScroll={handleScroll}>
              
              {/* Code Section - Top Container */}
              <div className="code-section">
                <div className="section-header">
                  <div 
                    className="language-icon" 
                    id="language-icon"
                    style={{ background: getLanguageColor(data.language) }}
                  >
                    {getLanguageIcon(data.language)}
                  </div>
                  <span>Copied Code</span>
                  {data.language && (
                    <span style={{ 
                      fontSize: '12px', 
                      color: '#9ca3af', 
                      marginLeft: '8px',
                      padding: '2px 6px',
                      background: '#374151',
                      borderRadius: '4px'
                    }}>
                      {data.language}
                    </span>
                  )}

                </div>
                <div className="code-viewer" id="code-viewer" style={{
                  maxHeight: '200px',
                  overflow: 'auto',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  background: '#1f2937'
                }}>
                  {data.code ? (
                    <div>
                      <pre style={{
                        margin: 0,
                        padding: '16px',
                        fontSize: '13px',
                        lineHeight: '1.4',
                        color: '#e5e7eb',
                        fontFamily: 'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, Courier New, monospace'
                      }}><code>{data.code}</code></pre>
                    </div>
                  ) : (
                    <div className="loading">
                      <div className="spinner"></div>
                      <div>Waiting for code...</div>
                      <div style={{ fontSize: '11px', marginTop: '8px', color: '#6b7280' }}>
                        Highlight text in any app and press Cmd+Shift+T
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Explanation Section - Flows naturally on the page */}
              <div id="explanation-content" style={{
                minHeight: 'auto',
                overflow: 'visible'
              }}>
                {renderContent()}
              </div>
            </div>
          </div>
        </>
      )}
      
      <div className="resize-handle" id="resize-handle" ref={resizeHandleRef}></div>
      
    </div>
  );
};

// Initialize the React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Explanation />);

// Export for potential external use
export default Explanation;