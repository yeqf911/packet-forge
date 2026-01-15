import { Menu, Tooltip } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  ApiOutlined,
  FileTextOutlined,
  SendOutlined,
  ExperimentOutlined,
  HistoryOutlined,
} from '@ant-design/icons';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: (
        <Tooltip title="Home" placement="right">
          <HomeOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
    {
      key: '/connections',
      icon: (
        <Tooltip title="Connections" placement="right">
          <ApiOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
    {
      key: '/protocols',
      icon: (
        <Tooltip title="Protocols" placement="right">
          <FileTextOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
    {
      key: '/messages',
      icon: (
        <Tooltip title="Messages" placement="right">
          <SendOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
    {
      key: '/testing',
      icon: (
        <Tooltip title="Testing" placement="right">
          <ExperimentOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
    {
      key: '/history',
      icon: (
        <Tooltip title="History" placement="right">
          <HistoryOutlined style={{ fontSize: 20 }} />
        </Tooltip>
      ),
      label: null,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      theme="dark"
      style={{
        height: '100%',
        borderRight: 0,
        paddingTop: 8,
      }}
      inlineCollapsed={true}
    />
  );
}
