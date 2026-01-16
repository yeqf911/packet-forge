import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import { ZoomProvider, useZoom } from './contexts/ZoomContext';
import { FontSizeProvider, useFontSize } from './contexts/FontSizeContext';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

function AppContent() {
  const { zoom } = useZoom();
  const { fontSize } = useFontSize();

  useEffect(() => {
    // Apply zoom to body element
    document.body.style.zoom = `${zoom}%`;
  }, [zoom]);

  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#ff6c37',
          colorBgContainer: '#1e1e1e',
          colorBgElevated: '#252526',
          borderRadius: 2,
          fontSize,
        },
        components: {
          Layout: {
            headerBg: '#252526',
            siderBg: '#2d2d30',
            bodyBg: '#1e1e1e',
          },
          Menu: {
            darkItemBg: '#2d2d30',
            darkItemSelectedBg: '#37373d',
            darkItemHoverBg: '#37373d',
          },
          Input: {
            colorBgContainer: '#1e1e1e',
            colorBorder: '#1e1e1e',
            borderRadius: 2,
          },
          InputNumber: {
            colorBgContainer: '#1e1e1e',
            colorBorder: '#1e1e1e',
            borderRadius: 2,
          },
          Select: {
            colorBgContainer: '#1e1e1e',
            colorBorder: '#1e1e1e',
            borderRadius: 2,
            optionSelectedBg: '#37373d',
          },
          Button: {
            colorBorder: 'transparent',
            colorPrimary: '#ff6c37',
            colorPrimaryHover: '#ff7c52',
            colorPrimaryActive: '#e55a2a',
            defaultBg: '#3e3e42',
            defaultBorderColor: '#3e3e42',
            defaultColor: '#cccccc',
            borderRadius: 2,
          },
        },
      }}
    >
      <Router>
        <MainLayout />
      </Router>
    </ConfigProvider>
  );
}

function App() {
  return (
    <FontSizeProvider>
      <ZoomProvider>
        <AppContent />
      </ZoomProvider>
    </FontSizeProvider>
  );
}

export default App;
