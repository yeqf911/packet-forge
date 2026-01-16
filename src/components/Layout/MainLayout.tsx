import { Layout, Typography, Space, Tag, Select } from 'antd';
import { Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useZoom, ZOOM_LEVELS } from '../../contexts/ZoomContext';
import { useFontSize, FONT_SIZE_LEVELS } from '../../contexts/FontSizeContext';
import { versionService } from '../../services/versionService';
import Sidebar from './Sidebar';
import Connections from '../../pages/Connections';
import Protocols from '../../pages/Protocols';
import Messages from '../../pages/Messages';
import Testing from '../../pages/Testing';
import History from '../../pages/History';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function MainLayout() {
  const { zoom, setZoom } = useZoom();
  const { fontSize, setFontSize } = useFontSize();
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    versionService.getAppVersion()
      .then(setAppVersion)
      .catch(() => setAppVersion('1.0.0'));
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: '#1e1e1e' }}>
      <Layout style={{ flexDirection: 'row' }}>
        <Sider
          width={50}
          style={{
            background: '#2d2d30',
            borderRight: '1px solid #3e3e42',
          }}
        >
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #3e3e42',
              fontSize: 20,
              fontWeight: 'bold',
              color: '#ff6c37',
            }}
          >
            T
          </div>
          <Sidebar />
        </Sider>
        <Layout style={{ background: '#1e1e1e' }}>
          <Header
            style={{
              background: '#252526',
              padding: '0 16px',
              height: 48,
              lineHeight: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #3e3e42',
            }}
          >
            <Space>
              <Title level={5} style={{ color: '#cccccc', margin: 0, fontWeight: 500 }}>
                TCP Packet Sender Tool
              </Title>
              <Tag
                color="orange"
                style={{
                  margin: 0,
                  background: 'rgba(255, 108, 55, 0.1)',
                  border: '1px solid rgba(255, 108, 55, 0.3)',
                  color: '#ff6c37',
                }}
              >
                v{appVersion}
              </Tag>
            </Space>
            <Space>
              <span style={{ color: '#858585' }}>Zoom:</span>
              <Select
                value={zoom}
                onChange={setZoom}
                style={{ width: 80 }}
                size="small"
                options={ZOOM_LEVELS.map(level => ({
                  label: `${level}%`,
                  value: level,
                }))}
              />
              <span style={{ color: '#858585' }}>Font:</span>
              <Select
                value={fontSize}
                onChange={setFontSize}
                style={{ width: 70 }}
                size="small"
                options={FONT_SIZE_LEVELS.map(size => ({
                  label: `${size}px`,
                  value: size,
                }))}
              />
            </Space>
          </Header>
          <Content
            style={{
              background: '#1e1e1e',
              minHeight: 'calc(100vh - 48px)',
              overflow: 'auto',
            }}
          >
            <Routes>
              <Route path="/" element={<Messages />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/protocols" element={<Protocols />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/testing" element={<Testing />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
}
