import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ActivityProvider } from './context/ActivityContext.tsx'
import { ComplejosCarryOverProvider } from './context/ComplejosCarryOverContext.tsx'
import './styles/tokens.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ActivityProvider>
      <ComplejosCarryOverProvider>
        <App />
      </ComplejosCarryOverProvider>
    </ActivityProvider>
  </StrictMode>,
)
