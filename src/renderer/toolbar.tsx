/// <reference path="./electron-api.d.ts" />
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './toolbar.css';

interface ToolbarProps {}

interface ToolbarState {
  status: 'ready' | 'processing' | 'error' | 'warning';
  statusText: string;
  contextFileCount: number;
  lineCount: number;
  charCount: number;
  hasContent: boolean;
  isAuthenticated: boolean;
  user: any;
}

const Toolbar: React.FC<ToolbarProps> = () => {
  const [state, setState] = useState<ToolbarState>({
    status: 'ready',
    statusText: 'Ready',
    contextFileCount: 0,
    lineCount: 0,
    charCount: 0,
    hasContent: false,
    isAuthenticated: false,
    user: null
  });

  useEffect(() => {
    // Set status to ready (no Ollama checking)
    setState(prev => ({
      ...prev,
      status: 'ready',
      statusText: 'Ready'
    }));
    
    // No periodic connection check needed
    
    // Set up clipboard update listener
    if (window.electronAPI) {
      console.log('Setting up clipboard update listener');
      window.electronAPI.onClipboardUpdate((data) => {
        console.log('Clipboard update received:', data);
        setState(prev => ({
          ...prev,
          lineCount: data.lineCount,
          charCount: data.charCount,
          hasContent: data.hasContent
        }));
      });
      
      // Set up authentication status listener
      (window.electronAPI as any).onAuthStatus((data: any) => {
        console.log('Auth status received:', data);
        setState(prev => ({
          ...prev,
          isAuthenticated: data.isAuthenticated,
          user: data.user
        }));
      });
      
      // Set up authentication state change listener
      (window.electronAPI as any).onAuthStateChanged((data: any) => {
        console.log('Auth state changed:', data);
        setState(prev => ({
          ...prev,
          isAuthenticated: data.isAuthenticated,
          user: data.user
        }));
      });
    } else {
      console.error('electronAPI not available in toolbar');
    }
    
    return () => {
      // No interval to clear
      if (window.electronAPI) {
        window.electronAPI.removeClipboardUpdateListener();
        (window.electronAPI as any).removeAuthStatusListener();
        (window.electronAPI as any).removeAuthStateChangedListener();
      }
    };
  }, []);

  // Removed checkOllamaConnection - always show "Ready" status

  const getStatusDotClass = (status: string) => {
    switch (status) {
      case 'ready':
        return 'status-dot';
      case 'processing':
        return 'status-dot warning';
      case 'error':
        return 'status-dot error';
      case 'warning':
        return 'status-dot warning';
      default:
        return 'status-dot';
    }
  };

  const getShortcutKeys = () => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    if (isMac) {
      return {
        copy: '⌘C',
        translate: '⌘⇧T',
        toggle: '⌘⇧H'
      };
    } else {
      return {
        copy: 'Ctrl+C',
        translate: 'Ctrl+Shift+T',
        toggle: 'Ctrl+Shift+H'
      };
    }
  };

  const shortcuts = getShortcutKeys();



  return (
    <div className="toolbar-container">
      <div className="toolbar-section" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: '700px'
      }}>
        {/* Left side - Shortcuts and counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="shortcuts-info">
            <div className="shortcut">
              <span>Copy:</span>
              <span className="key" id="copy-key">{shortcuts.copy}</span>
            </div>
            <div className="shortcut">
              <span>Translate:</span>
              <span className="key" id="translate-key">{shortcuts.translate}</span>
            </div>
            <div className="shortcut">
              <span>Hide:</span>
              <span className="key" id="toggle-key">{shortcuts.toggle}</span>
            </div>
          </div>
          
          <div className="context-files">
            <span>Context:</span>
            <span className="file-count" id="file-count">{state.contextFileCount}</span>
          </div>
          
          {/* Line Counter */}
          {state.hasContent && (
            <div className="line-counter" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              <span>Lines:</span>
              <span className="line-count">{state.lineCount}</span>
              <span>Chars:</span>
              <span className="char-count">{state.charCount}</span>
            </div>
          )}
        </div>
        
        {/* Right side - Status and settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Status Indicator */}
          <div className="status-indicator" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {state.isAuthenticated ? (
              <>
                <div className={getStatusDotClass(state.status)}></div>
                <span id="status-text">{state.statusText}</span>
              </>
            ) : (
              <>
                <div className="status-dot error"></div>
                <span 
                  id="status-text" 
                  style={{ 
                    color: '#ef4444', 
                    fontWeight: '500',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                  onClick={() => {
                    console.log('Login Required clicked');
                    if (window.electronAPI) {
                      console.log('electronAPI available, calling openAuthWebsite');
                      window.electronAPI.openAuthWebsite();
                    } else {
                      console.error('electronAPI not available in toolbar');
                    }
                  }}
                  title="Click to login"
                >
                  Login Required
                </span>
              </>
            )}
          </div>
          
          {/* Notebook Button - Only show when authenticated */}
          {state.isAuthenticated && (
            <button 
              className="notebook-button"
              onClick={() => {
                console.log('Notebook button clicked');
                if (window.electronAPI) {
                  console.log('electronAPI available, calling openNotebookInExplanation');
                  window.electronAPI.openNotebookInExplanation();
                } else {
                  console.error('electronAPI not available in toolbar');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e5e7eb',
                padding: '6px 12px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '8px',
                fontWeight: '500'
              }}
              title="Codebook"
            >
              codebook
            </button>
          )}


          
          {/* Settings Button - Only show when authenticated */}
          {state.isAuthenticated && (
            <button 
              className="settings-button"
              onClick={() => {
                console.log('Settings button clicked');
                if (window.electronAPI) {
                  console.log('electronAPI available, calling openSettingsPage');
                  window.electronAPI.openSettingsPage();
                } else {
                  console.error('electronAPI not available in toolbar');
                  // Fallback: Send a custom event that the explanation window can listen for
                  window.postMessage({ type: 'open-settings-page' }, '*');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e5e7eb',
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '16px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Settings"
            >
              ⋯
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Initialize the React app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<Toolbar />);

// Export for potential external use
export default Toolbar;
