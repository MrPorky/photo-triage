import { StrictMode, use, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

import './styles.css';
import App from './App';
import reportWebVitals from './reportWebVitals.ts';
import { fileSystemService } from './services/filesystem.ts';

const mediaPermissionsGranted = fileSystemService.ensureMediaPermissions();

const Root = () => {
  use(mediaPermissionsGranted);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

  useEffect(() => {
    // Load photos when the app mounts
    setIsLoadingPhotos(true);
    fileSystemService
      .loadPhotos()
      .catch((error) => {
        console.error('Error loading photos on app start:', error);
      })
      .finally(() => {
        setIsLoadingPhotos(false);
      });
  }, []);

  return (
    <StrictMode>
      <App isLoadingPhotos={isLoadingPhotos} />
    </StrictMode>
  );
};

// Render the app
const rootElement = document.getElementById('app');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(<Root />);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
