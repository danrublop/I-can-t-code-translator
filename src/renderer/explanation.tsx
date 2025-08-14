import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import LetterGlitch from './LetterGlitch';

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
    status: 'processing' // Changed from 'idle' to start in main interface
  });
  const [detailLevel, setDetailLevel] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [isResizing, setIsResizing] = useState(false);
  const [startSize, setStartSize] = useState({ width: 0, height: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Add ref for the main content area to enable auto-scrolling
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // State to track if auto-scroll should be enabled
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
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
        } else if (newData.status === 'processing' && data.explanation) {
          // Progress updates during generation
          setData(newData);
        }
        // Don't change status for initial setup data
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

    // Listen for settings page requests from toolbar
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'open-settings-page') {
        console.log('Received open-settings-page request from toolbar');
        setShowSettingsPage(true);
        setShowSettings(false);
      }
    };
    
    window.addEventListener('message', handleMessage);

    // Set up window controls
    setupWindowControls();
    
    // Set up resize functionality
    setupResizeHandling();

    return () => {
      if (window.electronAPI) {
        console.log('Removing explanation data listener');
        window.electronAPI.removeExplanationDataListener();
      }
      window.removeEventListener('message', handleMessage);
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

  const setupWindowControls = () => {
    const closeBtn = document.getElementById('close-btn');
    const minimizeBtn = document.getElementById('minimize-btn');
    const maximizeBtn = document.getElementById('maximize-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        window.close();
      });
    }

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        // Minimize window (Electron will handle this)
        if (window.electronAPI) {
          // Could implement custom minimize logic here
        }
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        // Toggle maximize/restore
        if (window.electronAPI) {
          // Could implement custom maximize logic here
        }
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
          setData(prev => ({
            ...prev,
            explanation: result.explanation,
            status: 'completed'
          }));
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

  // Function to parse markdown-style formatting from Mistral
  const parseMarkdown = (text: string): string => {
    if (!text) return '';
    
    // Convert **text** to <strong>text</strong> for bold
    let parsed = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert *text* to <em>text</em> for italic (if needed)
    parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Convert `text` to <code>text</code> for inline code
    parsed = parsed.replace(/`(.*?)`/g, '<code>$1</code>');
    
    return parsed;
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
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#e5e7eb',
                  margin: 0,
                  padding: '20px',
                  background: 'transparent'
                }}>
                  <span dangerouslySetInnerHTML={{ __html: parseMarkdown(data.explanation) }} />
                </pre>
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
              <pre style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#e5e7eb',
                margin: 0,
                padding: '20px',
                background: 'transparent'
              }}>
                <span dangerouslySetInnerHTML={{ __html: parseMarkdown(data.explanation || '') }} />
              </pre>
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
              <LetterGlitch
                glitchSpeed={50}
                centerVignette={true}
                outerVignette={false}
                smooth={true}
              />
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
          <div className="control-button close" style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ff5f56',
            border: '1px solid #e0443e'
          }}></div>
          <div className="control-button minimize" style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ffbd2e',
            border: '1px solid #dea123'
          }}></div>
          <div className="control-button maximize" style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#27ca3f',
            border: '1px solid #1aab29'
          }}></div>
        </div>
        
        {/* Right side - Settings button */}
        <div className="header-actions" style={{
          ...({
            WebkitAppRegion: 'no-drag' // Prevents dragging on button
          } as any)
        }}>
          <button
            onClick={() => setShowSettingsPage(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#e5e7eb',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
          {showSettingsPage ? 'Settings & Debug' : 'Highlight text in any app and press Cmd+Shift+T'}
        </div>
        
        {/* X button appears only on settings page */}
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
              borderRadius: '3px',
              transition: 'background 0.2s',
              position: 'absolute',
              right: '20px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#374151'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="Close Settings"
          >
            ×
          </button>
        )}
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
                    onClick={() => setDetailLevel(level as 'beginner' | 'intermediate' | 'expert')}
                    style={{
                      background: detailLevel === level ? '#6b7280' : '#374151',
                      color: '#e5e7eb',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      textTransform: 'capitalize'
                    }}
                    onMouseEnter={(e) => {
                      if (detailLevel !== level) {
                        e.currentTarget.style.background = '#4b5563';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (detailLevel !== level) {
                        e.currentTarget.style.background = '#374151';
                      }
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
                <div style={{ color: '#9ca3af' }}>Electron API:<span style={{ color: '#10b981', marginLeft: '8px' }}>Available</span></div>
                <div style={{ color: '#9ca3af' }}>Component State:<span style={{ color: '#10b981', marginLeft: '8px' }}>Active</span></div>
                <div style={{ color: '#9ca3af' }}>Data Received:<span style={{ color: '#10b981', marginLeft: '8px' }}>Yes</span></div>
                <div style={{ color: '#9ca3af' }}>Explanation Length:<span style={{ color: '#10b981', marginLeft: '8px' }}>{data.explanation ? data.explanation.length : 0} characters</span></div>
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
                    background: '#374151',
                    color: '#e5e7eb',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
                >
                  Log State to Console
                </button>
                <button
                  onClick={() => console.log('Testing translation API...')}
                  style={{
                    background: '#374151',
                    color: '#e5e7eb',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
                >
                  Test Translation API
                </button>
              </div>
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