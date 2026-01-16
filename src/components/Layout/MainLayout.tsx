import { Layout, Typography, Space, Tag } from 'antd';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import Connections from '../../pages/Connections';
import Protocols from '../../pages/Protocols';
import Messages from '../../pages/Messages';
import Testing from '../../pages/Testing';
import History from '../../pages/History';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export default function MainLayout() {
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
                v1.2.0
              </Tag>
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
