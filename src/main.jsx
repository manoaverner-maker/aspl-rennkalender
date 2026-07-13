import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { SpracheProvider } from './i18n.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SpracheProvider>
      <App />
    </SpracheProvider>
  </React.StrictMode>
)
