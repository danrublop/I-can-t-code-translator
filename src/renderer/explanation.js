"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const Explanation = () => {
    const [data, setData] = (0, react_1.useState)({
        status: 'processing'
    });
    const [detailLevel, setDetailLevel] = (0, react_1.useState)('intermediate');
    const [isResizing, setIsResizing] = (0, react_1.useState)(false);
    const [startSize, setStartSize] = (0, react_1.useState)({ width: 0, height: 0 });
    const [startPos, setStartPos] = (0, react_1.useState)({ x: 0, y: 0 });
    const resizeHandleRef = (0, react_1.useRef)(null);
    const windowRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        console.log('Explanation component mounted');
        console.log('window.electronAPI available:', !!window.electronAPI);
        // Listen for explanation data from main process
        if (window.electronAPI) {
            console.log('Setting up explanation data listener');
            window.electronAPI.onExplanationData((newData) => {
                console.log('Received explanation data:', newData);
                setData(newData);
            });
        }
        else {
            console.error('electronAPI not available!');
        }
        // Set up window controls
        setupWindowControls();
        // Set up resize functionality
        setupResizeHandling();
        return () => {
            if (window.electronAPI) {
                console.log('Removing explanation data listener');
                window.electronAPI.removeExplanationDataListener();
            }
        };
    }, []);
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
        if (!resizeHandleRef.current)
            return;
        const handleMouseDown = (e) => {
            e.preventDefault();
            setIsResizing(true);
            setStartSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
            setStartPos({ x: e.clientX, y: e.clientY });
        };
        const handleMouseMove = (e) => {
            if (!isResizing)
                return;
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
    const handleDetailLevelChange = async (level) => {
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
                }
                else {
                    setData(prev => ({
                        ...prev,
                        status: 'error',
                        error: result.error
                    }));
                }
            }
            catch (error) {
                setData(prev => ({
                    ...prev,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        }
    };
    const getLanguageIcon = (language) => {
        if (!language)
            return '?';
        const languageMap = {
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
    const getLanguageColor = (language) => {
        if (!language)
            return '#3b82f6';
        const colorMap = {
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
                if (data.explanation && data.explanation.trim()) {
                    return (<div>
              <div className="partial-explanation">
                <div dangerouslySetInnerHTML={{ __html: data.explanation }}/>
                <div className="typing-indicator">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>);
                }
                else {
                    return (<div className="loading">
              <div className="spinner"></div>
              <div>Analyzing your code...</div>
              <div style={{ fontSize: '12px', marginTop: '8px', color: '#9ca3af' }}>
                Generating AI explanation using Mistral
              </div>
            </div>);
                }
            case 'completed':
                return (<div>
            <div dangerouslySetInnerHTML={{ __html: data.explanation || '' }}/>
            <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#22c55e'
                    }}>
              ✅ Explanation completed! You can change the detail level above to get different perspectives.
            </div>
          </div>);
            case 'error':
                return (<div className="error">
            <h3>Error Generating Explanation</h3>
            <p>{data.error || 'An unknown error occurred'}</p>
            <p>Please check that:</p>
            <ul style={{ textAlign: 'left', marginTop: '8px' }}>
              <li>Ollama is running on your system</li>
              <li>The Mistral model is available (`ollama pull mistral:latest`)</li>
              <li>You have text selected when using the shortcut</li>
            </ul>
          </div>);
            default:
                return (<div className="loading">
            <div className="spinner"></div>
            <div>Waiting for code...</div>
            <div style={{ fontSize: '12px', marginTop: '8px', color: '#9ca3af' }}>
              Use Cmd+Shift+T (or Ctrl+Shift+T) to analyze highlighted text
            </div>
          </div>);
        }
    };
    return (<div className="explanation-container" ref={windowRef}>
      <div className="title-bar">
        <div className="title">CodeLens Translator</div>
        <div className="window-controls">
          <button className="control-btn minimize-btn" id="minimize-btn"></button>
          <button className="control-btn maximize-btn" id="maximize-btn"></button>
          <button className="control-btn close-btn" id="close-btn"></button>
        </div>
      </div>
      
              <div className="content">
          <div className="detail-level-selector">
            <button className={`detail-btn ${detailLevel === 'beginner' ? 'active' : ''}`} onClick={() => handleDetailLevelChange('beginner')} data-level="beginner">
              Beginner
            </button>
            <button className={`detail-btn ${detailLevel === 'intermediate' ? 'active' : ''}`} onClick={() => handleDetailLevelChange('intermediate')} data-level="intermediate">
              Intermediate
            </button>
            <button className={`detail-btn ${detailLevel === 'expert' ? 'active' : ''}`} onClick={() => handleDetailLevelChange('expert')} data-level="expert">
              Expert
            </button>
          </div>
          
          {/* Progress Bar */}
          {data.status === 'processing' && data.progress !== undefined && (<div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${data.progress}%` }}></div>
              </div>
              <div className="progress-text">
                Generating AI explanation... {data.progress}%
              </div>
            </div>)}
        
        <div className="main-content">
          <div className="code-section">
            <div className="section-header">
              <div className="language-icon" id="language-icon" style={{ background: getLanguageColor(data.language) }}>
                {getLanguageIcon(data.language)}
              </div>
              <span>Copied Code</span>
              {data.language && (<span style={{
                fontSize: '12px',
                color: '#9ca3af',
                marginLeft: '8px',
                padding: '2px 6px',
                background: '#374151',
                borderRadius: '4px'
            }}>
                  {data.language}
                </span>)}
            </div>
            <div className="code-viewer" id="code-viewer">
              {data.code ? (<div>
                  <div style={{
                fontSize: '11px',
                color: '#9ca3af',
                marginBottom: '8px',
                padding: '4px 8px',
                background: '#1f2937',
                borderRadius: '4px',
                border: '1px solid #374151'
            }}>
                    📋 Text copied from your application
                  </div>
                  <pre><code>{data.code}</code></pre>
                </div>) : (<div className="loading">
                  <div className="spinner"></div>
                  <div>Waiting for code...</div>
                  <div style={{ fontSize: '11px', marginTop: '8px', color: '#6b7280' }}>
                    Highlight text in any app and press Cmd+Shift+T
                  </div>
                </div>)}
            </div>
          </div>
          
          <div className="explanation-section">
            <div className="section-header">
              <span>AI Explanation</span>
            </div>
            <div className="explanation-content" id="explanation-content">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="resize-handle" id="resize-handle" ref={resizeHandleRef}></div>
    </div>);
};
// Initialize the React app
const root = client_1.default.createRoot(document.getElementById('root'));
root.render(<Explanation />);
// Export for potential external use
exports.default = Explanation;
//# sourceMappingURL=explanation.js.map