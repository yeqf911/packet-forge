import { useState, useEffect } from 'react';
import { Button, Select, Space, Input, Tabs, message as antMessage } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import { protocolService, Protocol as SavedProtocol } from '../services/protocolService';
import ProtocolFieldEditor from '../components/ProtocolFieldEditor';
import ProtocolHexPreview from '../components/ProtocolHexPreview';
import ResponseViewer from '../components/ResponseViewer';
import { useFontSize } from '../contexts/FontSizeContext';
import type { ProtocolField } from '../types/protocol-simple';

const { TextArea } = Input;

// localStorage keys
const MESSAGES_STATE_KEY = 'tcp_sender_messages_state';

// 从 localStorage 加载状态
const loadState = (): { activeTab: string; tabs: TabData[] } | null => {
  try {
    const saved = localStorage.getItem(MESSAGES_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 重置所有连接状态为 false（TCP 连接已断开）
      if (parsed.tabs) {
        parsed.tabs = parsed.tabs.map((tab: TabData) => ({
          ...tab,
          isConnected: false,
        }));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load messages state:', e);
  }
  return null;
};

// 保存状态到 localStorage
const saveState = (activeTab: string, tabs: TabData[]) => {
  try {
    localStorage.setItem(MESSAGES_STATE_KEY, JSON.stringify({
      activeTab,
      tabs,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Failed to save messages state:', e);
  }
};

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
  const { fontSize } = useFontSize();
  // 计算 HexPreview 容器宽度（与 ProtocolHexPreview 中的计算一致）
  const hexPreviewWidth = Math.ceil(75 * fontSize * 0.6 + 16);

  const [activeTab, setActiveTab] = useState(() => {
    const saved = loadState();
    return saved?.activeTab || '1';
  });
  const [tabs, setTabs] = useState<TabData[]>(() => {
    const saved = loadState();
    return saved?.tabs || [
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
    ];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [savedProtocols, setSavedProtocols] = useState<SavedProtocol[]>([]);

  // Load saved protocols on mount
  useEffect(() => {
    protocolService.listProtocols()
      .then(setSavedProtocols)
      .catch(err => console.error('Failed to load protocols:', err));
  }, []);

  // Check and sync connection status on mount
  useEffect(() => {
    const syncConnectionStatus = async () => {
      const updates = await Promise.all(
        tabs.map(async (tab) => {
          const connId = `conn_${tab.key}`;
          try {
            const isConnected = await connectionService.checkStatus(connId);
            return { key: tab.key, isConnected };
          } catch {
            return { key: tab.key, isConnected: false };
          }
        })
      );

      // Update tabs with actual connection status
      setTabs(prev => prev.map(tab => {
        const update = updates.find(u => u.key === tab.key);
        return update ? { ...tab, isConnected: update.isConnected } : tab;
      }));
    };

    syncConnectionStatus();
  }, []); // Only run on mount

  // Periodically check connection status for current tab
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const connId = `conn_${activeTab}`;
      try {
        const isConnected = await connectionService.checkStatus(connId);
        // Only update if status changed
        const currentTab = tabs.find(tab => tab.key === activeTab);
        if (currentTab && currentTab.isConnected !== isConnected) {
          updateTab(activeTab, { isConnected });
        }
      } catch {
        // If check fails, assume disconnected
        const currentTab = tabs.find(tab => tab.key === activeTab);
        if (currentTab && currentTab.isConnected) {
          updateTab(activeTab, { isConnected: false });
        }
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [activeTab, tabs]);

  // Save state to localStorage whenever tabs or activeTab changes
  useEffect(() => {
    saveState(activeTab, tabs);
  }, [activeTab, tabs]);

  const connectionId = `conn_${activeTab}`;
  const currentTab = tabs.find(tab => tab.key === activeTab)!;

  const updateTab = (key: string, updates: Partial<TabData>) => {
    setTabs(tabs.map(tab => (tab.key === key ? { ...tab, ...updates } : tab)));
  };

  const handleProtocolPresetChange = async (protocolId: string) => {
    if (!protocolId) {
      updateTab(activeTab, {
        selectedProtocolPreset: undefined,
        protocolFields: [],
      });
      return;
    }

    try {
      const protocol = await protocolService.getProtocol(protocolId);
      if (protocol) {
        // Calculate byte length for variable fields
        const calculateByteLength = (value: string, valueType: 'text' | 'hex'): number => {
          if (!value) return 0;
          if (valueType === 'text') {
            return new TextEncoder().encode(value).length;
          } else {
            const cleanHex = value.replace(/\s/g, '');
            return Math.floor(cleanHex.length / 2);
          }
        };

        // Convert saved protocol fields to tab fields with new IDs
        // Also recalculate length for variable fields
        const fields = protocol.fields.map((field, index) => ({
          ...field,
          id: `field_${Date.now()}_${index}`,
          // Recalculate length for variable fields based on current value
          length: field.isVariable
            ? calculateByteLength(field.value || '', field.valueType || 'text')
            : field.length,
        }));
        updateTab(activeTab, {
          selectedProtocolPreset: protocolId,
          protocolFields: fields,
        });
      }
    } catch (error) {
      antMessage.error('Failed to load protocol: ' + error);
    }
  };

  const addTab = () => {
    const newKey = String(tabs.length + 1);
    // 获取当前活动标签页作为参考
    const currentTab = tabs.find(tab => tab.key === activeTab) || tabs[tabs.length - 1];

    const newTab: TabData = {
      key: newKey,
      label: `New Connection ${newKey}`,
      closable: true,
      host: currentTab.host,
      port: currentTab.port,
      isConnected: false,
      requestMode: 'protocol',
      requestData: '',
      responseData: '',
      responseTime: 0,
      protocolFields: [],
      selectedProtocolPreset: undefined,
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

      // Check if connection already exists and is connected
      let alreadyConnected = false;
      try {
        alreadyConnected = await connectionService.checkStatus(connectionId);
      } catch {
        // Connection doesn't exist, will create new one
      }

      if (alreadyConnected) {
        antMessage.info('Already connected');
        updateTab(activeTab, { isConnected: true });
        setIsLoading(false);
        return;
      }

      // Clean up any stale connection
      try {
        await connectionService.removeConnection(connectionId);
      } catch {}

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
        if (field.valueType === 'text') {
          // Text type - convert to hex
          const bytes = new TextEncoder().encode(value);
          for (let i = 0; i < bytes.length; i++) {
            hexData += bytes[i].toString(16).padStart(2, '0');
          }
        } else {
          // Hex type (default) - just remove spaces and append
          hexData += value.replace(/\s/g, '');
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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', overflow: 'hidden' }}>
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
          }`
        }</style>
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
        {/* Request Editor */}
        <div
          style={{
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            background: '#252526',
            borderBottom: '1px solid #2d2d30',
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
              <span style={{ color: '#cccccc', fontWeight: 500 }}>Request</span>
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
                  <span style={{ color: '#858585' }}>|</span>
                  <Select
                    value={currentTab.selectedProtocolPreset}
                    onChange={handleProtocolPresetChange}
                    placeholder="Select saved protocol"
                    style={{ width: 180 }}
                    options={savedProtocols.map(protocol => ({
                      value: protocol.id,
                      label: protocol.name,
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
                  updateTab(activeTab, { protocolFields: [], responseData: '', responseTime: 0 });
                } else {
                  updateTab(activeTab, { requestData: '', responseData: '', responseTime: 0 });
                }
              }}>Clear</Button>
              <Button size="small">Format</Button>
            </Space>
          </div>
          <div style={{ 
					flex: 1, 
					overflow: 'hidden', 
					display: 'flex', 
					flexDirection: 'column', 
					minHeight: 0,
					//background: '#00ff00',
					//height: '50%'
				}}>
            {currentTab.requestMode === 'protocol' ? (
              <div style={{ display: 'flex', gap: 8, height: '100%', minHeight: 0 }}>
                {/* Left: Field Editor (自适应) */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <ProtocolFieldEditor
                    fields={currentTab.protocolFields}
                    onChange={(fields) => updateTab(activeTab, { protocolFields: fields })}
                  />
                </div>
                {/* Right: Hex Preview (动态宽度) */}
                <div style={{ 
						//width: hexPreviewWidth, 
						overflow: 'hidden', 
						flexShrink: 0, 
						marginRight: 8,
						//marginBottom: 0
					}}>
                  <ProtocolHexPreview hexData={buildProtocolData()} />
                </div>
              </div>
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
                  background: '#1e1e1e',
                  color: '#cccccc',
                  resize: 'none',
                }}
              />
            )}
          </div>
        </div>

        {/* Response Viewer */}
        <div style={{ 
				flex: 1, 
				display: 'flex', 
				flexDirection: 'column', 
				//background: '#0000ff',
				minHeight: 0,
				paddingBottom: '50px'
			}}>
          <div
            style={{
              padding: '8px 16px',
              background: '#252526',
              borderBottom: '1px solid #2d2d30',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Space>
              <span style={{ color: '#cccccc', fontWeight: 500 }}>Response</span>
              <span style={{ color: '#858585' }}>{currentTab.responseTime} ms</span>
            </Space>
            <Space>
              <Button size="small">Copy</Button>
              <Button size="small">Save</Button>
            </Space>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, height: '100%' }}>
            <ResponseViewer data={currentTab.responseData} />
          </div>
        </div>
      </div>
    </div>
  );
}
                                                     