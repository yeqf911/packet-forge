import { useState } from 'react';
import { Button, Select, Space, Input, Tabs, message as antMessage } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import ProtocolFieldEditor from '../components/ProtocolFieldEditor';
import ResponseViewer from '../components/ResponseViewer';
import type { ProtocolField } from '../types/protocol-simple';
import { protocolPresets, applyProtocolPreset } from '../utils/protocolPresets';

const { TextArea } = Input;

interface TabData {
  key: string;
  label: string;
  closable: boolean;
  host: string;
  port: string;
  isConnected: boolean;
  requestMode: 'text' | 'hex' | 'protocol';
  requestData: string;
  responseData: string;
  responseTime: number;
  protocolFields: ProtocolField[];
  selectedProtocolPreset?: string;
}

export default function Messages() {
  const [activeTab, setActiveTab] = useState('1');
  const [tabs, setTabs] = useState<TabData[]>([
    {
      key: '1',
      label: 'New Connection 1',
      closable: false,
      host: '127.0.0.1',
      port: '8080',
      isConnected: false,
      requestMode: 'protocol',
      requestData: '',
      responseData: '',
      responseTime: 0,
      protocolFields: [],
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const connectionId = `conn_${activeTab}`;
  const currentTab = tabs.find(tab => tab.key === activeTab)!;

  const updateTab = (key: string, updates: Partial<TabData>) => {
    setTabs(tabs.map(tab => (tab.key === key ? { ...tab, ...updates } : tab)));
  };

  const handleProtocolPresetChange = (presetId: string) => {
    const preset = protocolPresets.find(p => p.id === presetId);
    if (preset) {
      const fields = applyProtocolPreset(preset);
      updateTab(activeTab, {
        selectedProtocolPreset: presetId,
        protocolFields: fields,
      });
    }
  };

  const addTab = () => {
    const newKey = String(tabs.length + 1);
    const previousTab = tabs[tabs.length - 1];

    const newTab: TabData = {
      key: newKey,
      label: `New Connection ${newKey}`,
      closable: true,
      host: previousTab.host,
      port: previousTab.port,
      isConnected: false,
      requestMode: 'protocol',
      requestData: '',
      responseData: '',
      responseTime: 0,
      protocolFields: [],
    };

    setTabs([...tabs, newTab]);
    setActiveTab(newKey);
  };

  const removeTab = (targetKey: string) => {
    // Disconnect if connected
    const tabToRemove = tabs.find(tab => tab.key === targetKey);
    if (tabToRemove?.isConnected) {
      const connId = `conn_${targetKey}`;
      connectionService.disconnect(connId);
      connectionService.removeConnection(connId);
    }

    const newTabs = tabs.filter((tab) => tab.key !== targetKey);
    if (activeTab === targetKey && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1].key);
    }
    setTabs(newTabs);
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);

      // Create connection
      await connectionService.createConnection({
        id: connectionId,
        host: currentTab.host,
        port: parseInt(currentTab.port),
        timeout: 30,
        keep_alive: true,
      });

      // Connect to server
      await connectionService.connect(connectionId);

      updateTab(activeTab, { isConnected: true });
    } catch (error) {
      antMessage.error(`Connection failed: ${error}`);
      updateTab(activeTab, { isConnected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await connectionService.disconnect(connectionId);
      await connectionService.removeConnection(connectionId);
      updateTab(activeTab, { isConnected: false });
    } catch (error) {
      antMessage.error(`Disconnect failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const buildProtocolData = (): string => {
    // Convert protocol fields to hex string
    let hexData = '';
    for (const field of currentTab.protocolFields) {
      const value = field.value || '';

      // Handle variable-length fields
      if (field.isVariable) {
        // For variable-length fields, use the value as-is without padding/truncating
        if (/^[0-9A-Fa-f\s]+$/.test(value)) {
          // It's hex, just remove spaces and append
          hexData += value.replace(/\s/g, '');
        } else {
          // It's text, convert to hex
          const bytes = new TextEncoder().encode(value);
          for (let i = 0; i < bytes.length; i++) {
            hexData += bytes[i].toString(16).padStart(2, '0');
          }
        }
      } else {
        // Handle fixed-length fields
        const fieldLength = field.length || 1;
        if (/^[0-9A-Fa-f\s]+$/.test(value)) {
          // It's hex
          const cleanHex = value.replace(/\s/g, '');
          const paddedHex = cleanHex.padEnd(fieldLength * 2, '0');
          hexData += paddedHex.substring(0, fieldLength * 2);
        } else {
          // It's text, convert to hex
          const bytes = new TextEncoder().encode(value);
          for (let i = 0; i < fieldLength; i++) {
            if (i < bytes.length) {
              hexData += bytes[i].toString(16).padStart(2, '0');
            } else {
              hexData += '00';
            }
          }
        }
      }
    }
    return hexData;
  };

  const handleSend = async () => {
    if (!currentTab.isConnected) {
      antMessage.warning('Please connect to server first');
      return;
    }

    let dataToSend = currentTab.requestData;
    let mode: 'text' | 'hex' = currentTab.requestMode === 'protocol' ? 'hex' : currentTab.requestMode;

    if (currentTab.requestMode === 'protocol') {
      if (currentTab.protocolFields.length === 0) {
        antMessage.warning('Please add protocol fields');
        return;
      }
      dataToSend = buildProtocolData();
    } else if (!currentTab.requestData.trim()) {
      antMessage.warning('Please enter data to send');
      return;
    }

    try {
      setIsLoading(true);
      updateTab(activeTab, { responseData: '', responseTime: 0 });

      const response = await messageService.sendMessage({
        connection_id: connectionId,
        data: dataToSend,
        mode: mode,
      });

      if (response.success) {
        updateTab(activeTab, {
          responseData: response.response_data,
          responseTime: response.response_time_ms,
        });
      } else {
        antMessage.error(`Send failed: ${response.error}`);
      }
    } catch (error) {
      antMessage.error(`Send failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
      {/* Tabs at the top */}
      <div style={{ background: '#252526', borderBottom: '1px solid #2d2d30' }}>
        <Tabs
          type="editable-card"
          activeKey={activeTab}
          onChange={setActiveTab}
          onEdit={(targetKey, action) => {
            if (action === 'add') addTab();
            else if (action === 'remove') removeTab(targetKey as string);
          }}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            closable: tab.closable,
          }))}
          style={{ margin: 0 }}
          className="compressible-tabs"
          hideAdd={false}
        />
        <style>{`
          .compressible-tabs .ant-tabs-nav {
            margin-bottom: 0;
            padding-right: 0;
          }
          .compressible-tabs .ant-tabs-nav-wrap {
            overflow: hidden !important;
          }
          .compressible-tabs .ant-tabs-nav-list {
            display: flex !important;
            width: 100% !important;
            padding-right: 0 !important;
          }
          .compressible-tabs .ant-tabs-tab {
            flex: 0 1 auto !important;
            min-width: 60px !important;
            max-width: none !important;
            display: flex !important;
            align-items: center !important;
            transition: none !important;
          }
          .compressible-tabs .ant-tabs-tab + .ant-tabs-tab {
            margin-left: 2px !important;
          }
          .compressible-tabs .ant-tabs-tab-btn {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
            min-width: 0;
          }
          .compressible-tabs .ant-tabs-tab-remove {
            flex-shrink: 0;
            margin-left: 4px;
          }
          .compressible-tabs .ant-tabs-nav-operations {
            flex-shrink: 0 !important;
            margin-left: 2px !important;
          }
          .compressible-tabs .ant-tabs-add {
            flex-shrink: 0 !important;
            margin-left: 2px !important;
          }
        `}</style>
      </div>

      {/* Connection Controls */}
      <div
        style={{
          padding: '8px 16px',
          background: '#252526',
          borderBottom: '1px solid #2d2d30',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Input
          placeholder="Host"
          style={{ width: 150 }}
          value={currentTab.host}
          onChange={(e) => updateTab(activeTab, { host: e.target.value })}
          disabled={currentTab.isConnected}
        />
        <Input
          placeholder="Port"
          style={{ width: 100 }}
          value={currentTab.port}
          onChange={(e) => updateTab(activeTab, { port: e.target.value })}
          disabled={currentTab.isConnected}
        />
        {!currentTab.isConnected ? (
          <Button type="primary" onClick={handleConnect} loading={isLoading}>
            Connect
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
            >
              Send
            </Button>
            <Button onClick={handleDisconnect} loading={isLoading}>
              Disconnect
            </Button>
          </>
        )}
      </div>

      {/* Split Workspace */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Request Editor (Top Half) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#252526',
            borderBottom: '1px solid #2d2d30',
            minHeight: 200,
          }}
        >
          <div
            style={{
              padding: '8px 16px',
              background: '#252526',
              borderBottom: '1px solid #2d2d30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Space>
              <span style={{ color: '#cccccc', fontSize: 16, fontWeight: 500 }}>Request</span>
              <Select
                value={currentTab.requestMode}
                onChange={(value) => updateTab(activeTab, { requestMode: value })}
                style={{ width: 120 }}
                options={[
                  { value: 'protocol', label: 'Protocol' },
                  { value: 'text', label: 'Text' },
                  { value: 'hex', label: 'Hex' },
                ]}
                size="small"
              />
              {currentTab.requestMode === 'protocol' && (
                <>
                  <span style={{ color: '#858585', fontSize: 16 }}>|</span>
                  <Select
                    value={currentTab.selectedProtocolPreset}
                    onChange={handleProtocolPresetChange}
                    placeholder="Select protocol preset"
                    style={{ width: 150 }}
                    options={protocolPresets.map(preset => ({
                      value: preset.id,
                      label: preset.name,
                    }))}
                    size="small"
                    allowClear
                  />
                </>
              )}
            </Space>
            <Space>
              <Button size="small" onClick={() => {
                if (currentTab.requestMode === 'protocol') {
                  updateTab(activeTab, { protocolFields: [] });
                } else {
                  updateTab(activeTab, { requestData: '' });
                }
              }}>Clear</Button>
              <Button size="small">Format</Button>
            </Space>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {currentTab.requestMode === 'protocol' ? (
              <ProtocolFieldEditor
                fields={currentTab.protocolFields}
                onChange={(fields) => updateTab(activeTab, { protocolFields: fields })}
              />
            ) : (
              <TextArea
                value={currentTab.requestData}
                onChange={(e) => updateTab(activeTab, { requestData: e.target.value })}
                placeholder={
                  currentTab.requestMode === 'text'
                    ? 'Enter text data to send...'
                    : 'Enter hexadecimal data (e.g., 01 02 03 FF)'
                }
                style={{
                  height: '100%',
                  fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
                  fontSize: 16,
                  background: '#1e1e1e',
                  color: '#cccccc',
                  resize: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Response Viewer (Bottom Half) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#252526', minHeight: 200 }}>
          <div
            style={{
              padding: '8px 16px',
              background: '#252526',
              borderBottom: '1px solid #2d2d30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Space>
              <span style={{ color: '#cccccc', fontSize: 16, fontWeight: 500 }}>Response</span>
              <span style={{ color: '#858585', fontSize: 16 }}>{currentTab.responseTime} ms</span>
            </Space>
            <Space>
              <Button size="small">Copy</Button>
              <Button size="small">Save</Button>
            </Space>
          </div>
          <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>
            <ResponseViewer data={currentTab.responseData} />
          </div>
        </div>
      </div>
    </div>
  );
}
