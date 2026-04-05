import React from 'react';
import ReactDOM from 'react-dom/client';
import { configureBoneyard } from 'boneyard-js/react';
import App from './App';
import './index.css';
import './bones/registry';

configureBoneyard({
  color: 'rgba(255,255,255,0.06)',
  darkColor: 'rgba(6,182,212,0.09)',
  animate: 'pulse',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
