import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Authenticator } from '@aws-amplify/ui-react';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Reactの開発モードでは、React.StrictModeが有効になっていると、コンポーネントの副作用が二重に実行されることがあります。これには、useEffectの実行も含まれます。StrictModeは、開発中に副作用のバグを検出しやすくするために、useEffectやuseLayoutEffectが2回呼ばれるようにしています。これが原因で、useEffectが2回呼ばれる可能性があります
  // <React.StrictMode>
    <Authenticator.Provider>
      <App />
    </Authenticator.Provider>
  // </React.StrictMode>,
);
