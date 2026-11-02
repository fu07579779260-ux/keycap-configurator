import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './i18n/LanguageProvider'
import { DesignProvider } from './model/DesignProvider'
import { applyDisplay } from './model/display'

// Before the first paint, so large text / high contrast don't flash
applyDisplay()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <DesignProvider>
        <App />
      </DesignProvider>
    </LanguageProvider>
  </StrictMode>,
)
