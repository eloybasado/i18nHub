import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        theme="light"
        closeButton
        richColors={false}
        toastOptions={{
          className: 'sonner-toast',
          descriptionClassName: 'sonner-toast-description',
          duration: 2800,
        }}
      />
    </BrowserRouter>
  </StrictMode>,
);
