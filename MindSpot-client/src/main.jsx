import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import i18n from './i18n/index.js'
import App from './App.jsx'

document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr'
i18n.on('languageChanged', (lang) => {
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
