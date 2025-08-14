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
const Toolbar = () => {
    const [state, setState] = (0, react_1.useState)({
        status: 'ready',
        statusText: 'Ready',
        contextFileCount: 0,
        isOllamaConnected: false
    });
    (0, react_1.useEffect)(() => {
        // Check Ollama connection status
        checkOllamaConnection();
        // Set up periodic connection check
        const interval = setInterval(checkOllamaConnection, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
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
            }
            else {
                setState(prev => ({
                    ...prev,
                    status: 'warning',
                    statusText: 'Ollama API Error',
                    isOllamaConnected: false
                }));
            }
        }
        catch (error) {
            setState(prev => ({
                ...prev,
                status: 'error',
                statusText: 'Ollama Not Running',
                isOllamaConnected: false
            }));
        }
    };
    const getStatusDotClass = (status) => {
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
                translate: '⌘⇧T',
                toggle: '⌘⇧H'
            };
        }
        else {
            return {
                translate: 'Ctrl+Shift+T',
                toggle: 'Ctrl+Shift+H'
            };
        }
    };
    const shortcuts = getShortcutKeys();
    return (<div className="toolbar-container">
      <div className="toolbar-section">
        <div className="status-indicator">
          <div className={getStatusDotClass(state.status)}></div>
          <span id="status-text">{state.statusText}</span>
        </div>
        <div className="context-files">
          <span>Context:</span>
          <span className="file-count" id="file-count">{state.contextFileCount}</span>
        </div>
      </div>
      
      <div className="shortcuts-info">
        <div className="shortcut">
          <span>Translate:</span>
          <span className="key" id="translate-key">{shortcuts.translate}</span>
        </div>
        <div className="shortcut">
          <span>Toggle:</span>
          <span className="key" id="toggle-key">{shortcuts.toggle}</span>
        </div>
      </div>
    </div>);
};
// Initialize the React app
const root = client_1.default.createRoot(document.getElementById('root'));
root.render(<Toolbar />);
// Export for potential external use
exports.default = Toolbar;
//# sourceMappingURL=toolbar.js.map