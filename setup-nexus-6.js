#!/usr/bin/env node
/**
 * Nexus Frontend Setup - Part 6
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function writeFile(filePath, content) {
  const fullPath = path.join(ROOT, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content.trim() + '\n');
  console.log('✓ ' + filePath);
}

console.log('🚀 Nexus Frontend Setup\n');

writeFile('apps/web/package.json', `{
  "name": "@nexus/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/"
  },
  "dependencies": {
    "@nexus/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.0",
    "socket.io-client": "^4.7.4",
    "zustand": "^4.5.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "react-markdown": "^9.0.1",
    "react-syntax-highlighter": "^15.5.0",
    "emoji-mart": "^5.5.2",
    "@emoji-mart/data": "^1.1.2",
    "@emoji-mart/react": "^1.1.1",
    "lucide-react": "^0.323.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@types/react-syntax-highlighter": "^15.5.11",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.0",
    "vite": "^5.0.12",
    "vite-plugin-pwa": "^0.17.5"
  }
}`);

writeFile('apps/web/tsconfig.json', `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`);

writeFile('apps/web/tsconfig.node.json', `{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}`);

writeFile('apps/web/vite.config.ts', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Nexus',
        short_name: 'Nexus',
        description: 'Team Communication Platform',
        theme_color: '#5865F2',
        background_color: '#1a1a1a',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});`);

writeFile('apps/web/tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Discord-inspired colors
        brand: {
          DEFAULT: '#5865F2',
          hover: '#4752C4',
        },
        background: {
          primary: '#313338',
          secondary: '#2B2D31',
          tertiary: '#1E1F22',
          floating: '#111214',
        },
        text: {
          normal: '#DBDEE1',
          muted: '#949BA4',
          link: '#00A8FC',
        },
        channel: {
          default: '#80848E',
          hover: '#DBDEE1',
        },
        status: {
          online: '#23A55A',
          idle: '#F0B232',
          dnd: '#F23F43',
          offline: '#80848E',
        },
        interactive: {
          normal: '#B5BAC1',
          hover: '#DBDEE1',
          active: '#FFFFFF',
          muted: '#4E5058',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}`);

writeFile('apps/web/postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);

writeFile('apps/web/index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#5865F2" />
    <meta name="description" content="Nexus - Team Communication Platform" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet" />
    <title>Nexus</title>
  </head>
  <body class="bg-background-tertiary">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);

writeFile('apps/web/src/main.tsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);`);

writeFile('apps/web/src/styles/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }
  
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }
  
  body {
    @apply bg-background-tertiary text-text-normal;
    margin: 0;
    min-height: 100vh;
    overflow: hidden;
  }
  
  #root {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-background-tertiary rounded;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-interactive-muted;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors duration-200;
  }

  .btn-primary {
    @apply bg-brand text-white hover:bg-brand-hover;
  }

  .btn-secondary {
    @apply bg-background-secondary text-text-normal hover:bg-background-primary;
  }

  .btn-danger {
    @apply bg-status-dnd text-white hover:opacity-90;
  }

  .input {
    @apply w-full px-3 py-2 bg-background-tertiary text-text-normal 
           border border-background-floating rounded
           focus:outline-none focus:ring-2 focus:ring-brand;
  }

  .channel-item {
    @apply flex items-center gap-2 px-2 py-1.5 rounded text-channel-default
           hover:bg-background-primary hover:text-channel-hover cursor-pointer;
  }

  .channel-item.active {
    @apply bg-background-primary text-channel-hover;
  }
}`);

writeFile('apps/web/src/App.tsx', `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { MainLayout } from './components/layout/MainLayout';
import { ChannelView } from './pages/ChannelView';
import { DMView } from './pages/DMView';
import { WelcomePage } from './pages/WelcomePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/channels/:workspaceId/:channelId" element={<ChannelView />} />
                <Route path="/dm/:channelId" element={<DMView />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}`);

console.log('\n✅ Frontend base setup created!');
