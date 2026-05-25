import React from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsView } from './settings-view';

// Standalone settings window entry. The same view is also embedded in the
// notebook's right pane — see settings-view.tsx.
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<SettingsView showDrag />);
