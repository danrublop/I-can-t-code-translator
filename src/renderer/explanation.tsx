import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { UserProfile } from '../main/services/auth.service';
import LetterGlitch from './LetterGlitch';
import LicenseStatus from './components/LicenseStatus';

// Function to parse markdown-style formatting from Mistral
const parseMarkdown = (text: string): string => {
  if (!text) return '';
  
  let parsed = text;
  
  // Convert headers (##, ###, ####, etc.)
  parsed = parsed.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  parsed = parsed.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  parsed = parsed.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Convert **text** to <strong>text</strong> for bold
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *text* to <em>text</em> for italic
  parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert `text` to <code>text</code> for inline code
  parsed = parsed.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Convert ```code``` blocks to <pre><code>code</code></pre>
  parsed = parsed.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Convert unordered lists
  parsed = parsed.replace(/^\- (.*$)/gim, '<li>$1</li>');
  parsed = parsed.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert ordered lists
  parsed = parsed.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  parsed = parsed.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  
  // Convert line breaks to <br>
  parsed = parsed.replace(/\n/g, '<br>');
  
  return parsed;
};

// Notebook View Component
const NotebookView: React.FC = () => {
  const [explanations, setExplanations] = useState<any[]>([]);
  const [filteredExplanations, setFilteredExplanations] = useState<any[]>([]);
  const [selectedExplanation, setSelectedExplanation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExplanations();
  }, []);

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
              
              {/* Markdown Styles for Codebook */}
              <style>{`
                .explanation-content h1 {
                  color: #f9fafb;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 20px 0 16px 0;
                  padding-bottom: 8px;
                  border-bottom: 2px solid #374151;
                }
                
                .explanation-content h2 {
                  color: #f3f4f6;
                  font-size: 20px;
                  font-weight: 600;
                  margin: 18px 0 14px 0;
                  padding-bottom: 6px;
                  border-bottom: 1px solid #4b5563;
                }
                
                .explanation-content h3 {
                  color: #e5e7eb;
                  font-size: 18px;
                  font-weight: 600;
                  margin: 16px 0 12px 0;
                }
                
                .explanation-content ul, .explanation-content ol {
                  margin: 12px 0;
                  padding-left: 24px;
                }
                
                .explanation-content li {
                  margin: 6px 0;
                  line-height: 1.5;
                }
                
                .explanation-content pre {
                  background: #1f2937;
                  border: 1px solid #374151;
                  border-radius: 6px;
                  padding: 16px;
                  margin: 16px 0;
                  overflow-x: auto;
                }
                
                .explanation-content pre code {
                  background: transparent;
                  padding: 0;
                  border-radius: 0;
                  color: #e5e7eb;
                  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                }
                
                .explanation-content code {
                  background: #374151;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                  color: #10b981;
                }
                
                .explanation-content strong {
                  font-weight: bold;
                  color: #fbbf24;
                }
                
                .explanation-content em {
                  font-style: italic;
                  color: #a78bfa;
                }
                
                .explanation-content br {
                  margin: 8px 0;
                }
              `}</style>
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
  const [showLogin, setShowLogin] = useState(false);
  
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
          
          // Auto-save the new explanation to notebook
          autoSaveToNotebook(newData);
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
    setIsAuthenticated(false);
    setUser(null);
  };

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
          console.log('Auto-saved explanation to notebook:', result.explanation);
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
              
            </div>
            
            <style>{`
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
           showNotebook ? 'Codebook' : 
           'Copy text in any app and press Cmd+Shift+T'}
        </div>
        
        {/* License Status */}
        <LicenseStatus />
        
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
        <NotebookView />
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
                    </div>
                  )}
                </div>
                
                                  {/* LetterGlitch Component Below Code Container - Only show when waiting for code */}
                  {!data.code && (
                    <div style={{ marginTop: '20px', height: '400px' }}>
                      <LetterGlitch
                        glitchSpeed={50}
                        centerVignette={true}
                        outerVignette={false}
                        smooth={true}
                      />
                    </div>
                  )}
              </div>
              

              
              {/* AI Explanation Section - Flows naturally on the page */}
              <div id="explanation-content" style={{
                minHeight: 'auto',
                overflow: 'visible'
              }}>
                {renderContent()}
              </div>
              
              {/* Markdown Styles */}
              <style>{`
                #explanation-content h1 {
                  color: #f9fafb;
                  font-size: 24px;
                  font-weight: bold;
                  margin: 20px 0 16px 0;
                  padding-bottom: 8px;
                  border-bottom: 2px solid #374151;
                }
                
                #explanation-content h2 {
                  color: #f3f4f6;
                  font-size: 20px;
                  font-weight: 600;
                  margin: 18px 0 14px 0;
                  padding-bottom: 6px;
                  border-bottom: 1px solid #4b5563;
                }
                
                #explanation-content h3 {
                  color: #e5e7eb;
                  font-size: 18px;
                  font-weight: 600;
                  margin: 16px 0 12px 0;
                }
                
                #explanation-content ul, #explanation-content ol {
                  margin: 12px 0;
                  padding-left: 24px;
                }
                
                #explanation-content li {
                  margin: 6px 0;
                  line-height: 1.5;
                }
                
                #explanation-content pre {
                  background: #1f2937;
                  border: 1px solid #374151;
                  border-radius: 6px;
                  padding: 16px;
                  margin: 16px 0;
                  overflow-x: auto;
                }
                
                #explanation-content pre code {
                  background: transparent;
                  padding: 0;
                  border-radius: 0;
                  color: #e5e7eb;
                  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                }
                
                #explanation-content code {
                  background: #374151;
                  padding: 2px 6px;
                  border-radius: 4px;
                  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
                  color: #10b981;
                }
                
                #explanation-content strong {
                  font-weight: bold;
                  color: #fbbf24;
                }
                
                #explanation-content em {
                  font-style: italic;
                  color: #a78bfa;
                }
                
                #explanation-content br {
                  margin: 8px 0;
                }
              `}</style>
              

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