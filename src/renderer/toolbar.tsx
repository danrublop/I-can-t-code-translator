import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

interface ToolbarProps {}

interface ToolbarState {
  status: 'ready' | 'processing' | 'error' | 'warning';
  statusText: string;
  contextFileCount: number;
  isOllamaConnected: boolean;
  lineCount: number;
  charCount: number;
  hasContent: boolean;
}

const Toolbar: React.FC<ToolbarProps> = () => {
  const [state, setState] = useState<ToolbarState>({
    status: 'ready',
    statusText: 'Ready',
    contextFileCount: 0,
    isOllamaConnected: false,
    lineCount: 0,
    charCount: 0,
    hasContent: false
  });

  useEffect(() => {
    // Check Ollama connection status
    checkOllamaConnection();
    
    // Set up periodic connection check
    const interval = setInterval(checkOllamaConnection, 30000); // Check every 30 seconds
    
    // Set up clipboard update listener
    if (window.electronAPI) {
      window.electronAPI.onClipboardUpdate((data) => {
        setState(prev => ({
          ...prev,
          lineCount: data.lineCount,
          charCount: data.charCount,
          hasContent: data.hasContent
        }));
      });
    }
    
    return () => {
      clearInterval(interval);
      if (window.electronAPI) {
        window.electronAPI.removeClipboardUpdateListener();
      }
    };
  }, []);

  const checkOllamaConnection = async () => {
    try {
      // Try to make a simple request to check if Ollama is running
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        setState(prev => ({
          ...prev,
          status: 'ready',
          statusText: 'Ready',
          isOllamaConnected: true
        }));
      } else {
        setState(prev => ({
          ...prev,
          status: 'warning',
          statusText: 'Ollama API Error',
          isOllamaConnected: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        status: 'error',
        statusText: 'Ollama Not Running',
        isOllamaConnected: false
      }));
    }
  };

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
        width: '100%'
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
              <span className="line-count" style={{
                background: '#374151',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#e5e7eb',
                fontWeight: 'bold',
                border: '1px solid #374151'
              }}>
                {state.lineCount}
              </span>
              <span>Chars:</span>
              <span className="char-count" style={{
                background: '#374151',
                padding: '2px 6px',
                borderRadius: '4px',
                color: '#e5e7eb',
                fontWeight: 'bold',
                border: '1px solid #374151'
              }}>
                {state.charCount}
              </span>
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
            <div className={getStatusDotClass(state.status)}></div>
            <span id="status-text">{state.statusText}</span>
          </div>
          
          {/* Settings Button */}
          <button 
            className="settings-button"
            onClick={() => {
              // Send a custom event that the explanation window can listen for
              window.postMessage({ type: 'open-settings-page' }, '*');
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
