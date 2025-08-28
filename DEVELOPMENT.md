# Development Workflow

## Hot Reloading for UI Changes

This project supports hot reloading for the renderer process (UI components), which means you can see changes to React components in real-time without restarting the Electron app.

### Development Commands

#### For UI Development (Hot Reloading)
```bash
# Start development with hot reloading for renderer
npm run dev

# Or use the explicit hot reload command
npm run dev:hot
```

This will:
1. Watch for changes in `src/renderer/` files
2. Automatically rebuild the renderer when files change
3. Keep the Electron app running
4. Show UI changes immediately

#### For Main Process Changes
```bash
# Build main process (required when changing main.ts)
npm run build:main

# Then restart the app
npm run dev
```

### What Gets Hot Reloaded

✅ **Hot Reloaded (No Restart Needed):**
- React components (`src/renderer/*.tsx`)
- CSS styles
- HTML templates
- Renderer logic

❌ **Requires App Restart:**
- Main process code (`src/main/*.ts`)
- Electron configuration
- IPC handlers
- Services

### Workflow Tips

1. **For UI changes**: Just edit the `.tsx` files and save - changes appear immediately
2. **For main process changes**: Edit `main.ts`, run `npm run build:main`, then restart
3. **For both**: Use `npm run dev` which watches renderer and builds main process
4. **Quick testing**: Use `npm run dev:hot` for rapid UI iteration

### File Structure
```
src/
├── main/           # Main process (requires restart)
│   ├── main.ts
│   └── services/
└── renderer/       # Renderer process (hot reloaded)
    ├── explanation.tsx
    ├── toolbar.tsx
    └── LetterGlitch.tsx
```

### Troubleshooting

- If hot reloading stops working, restart the dev server
- For persistent issues, check the webpack output in the terminal
- Main process changes always require a full restart

