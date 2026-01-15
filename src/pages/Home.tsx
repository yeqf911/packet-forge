import { Card, Typography, Row, Col, Statistic } from 'antd';
import {
  ApiOutlined,
  SendOutlined,
  HistoryOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export default function Home() {
  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <Card
        style={{
          background: '#252526',
          border: '1px solid #2d2d30',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ color: '#cccccc', marginTop: 0 }}>
          Welcome to TCP Message Tool
        </Title>
        <Paragraph style={{ color: '#858585', fontSize: 14 }}>
          A powerful TCP testing tool, similar to Postman, designed for TCP protocol.
        </Paragraph>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card
            style={{
              background: '#252526',
              border: '1px solid #2d2d30',
              textAlign: 'center',
            }}
          >
            <Statistic
              title={<span style={{ color: '#858585' }}>Active Connections</span>}
              value={0}
              prefix={<ApiOutlined style={{ color: '#ff6c37' }} />}
              valueStyle={{ color: '#cccccc' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: '#252526',
              border: '1px solid #2d2d30',
              textAlign: 'center',
            }}
          >
            <Statistic
              title={<span style={{ color: '#858585' }}>Messages Sent</span>}
              value={0}
              prefix={<SendOutlined style={{ color: '#4ec9b0' }} />}
              valueStyle={{ color: '#cccccc' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: '#252526',
              border: '1px solid #2d2d30',
              textAlign: 'center',
            }}
          >
            <Statistic
              title={<span style={{ color: '#858585' }}>History Records</span>}
              value={0}
              prefix={<HistoryOutlined style={{ color: '#569cd6' }} />}
              valueStyle={{ color: '#cccccc' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card
            style={{
              background: '#252526',
              border: '1px solid #2d2d30',
              textAlign: 'center',
            }}
          >
            <Statistic
              title={<span style={{ color: '#858585' }}>Success Rate</span>}
              value={0}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#89d185' }} />}
              valueStyle={{ color: '#cccccc' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          background: '#252526',
          border: '1px solid #2d2d30',
        }}
      >
        <Title level={4} style={{ color: '#cccccc' }}>
          Key Features
        </Title>
        <ul style={{ color: '#858585', lineHeight: 2 }}>
          <li>
            <strong style={{ color: '#cccccc' }}>TCP Connection Management</strong> - Support multiple concurrent connections
          </li>
          <li>
            <strong style={{ color: '#cccccc' }}>Custom Message Sending</strong> - Support Text/Hex/Protocol modes
          </li>
          <li>
            <strong style={{ color: '#cccccc' }}>Visual Protocol Configuration</strong> - Flexible protocol field definition
          </li>
          <li>
            <strong style={{ color: '#cccccc' }}>Complete Test Suite</strong> - Automated testing and assertion validation
          </li>
          <li>
            <strong style={{ color: '#cccccc' }}>History Management</strong> - Track all communication records
          </li>
        </ul>
        <Paragraph style={{ color: '#858585', marginTop: 16, marginBottom: 0 }}>
          Get started from the left menu.
        </Paragraph>
      </Card>
    </div>
  );
}
