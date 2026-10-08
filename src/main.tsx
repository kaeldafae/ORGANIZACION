import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { config } from './config';
import { Arranque } from './Arranque';
import './estilos.css';

const raiz = document.getElementById('root');
if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <Arranque config={config} />
    </StrictMode>,
  );
}
