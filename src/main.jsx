
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

const BASE_NAME = '/AnimeVault/';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Anime Vault: root element #root was not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter basename={BASE_NAME}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
