import { useState, useEffect, useRef } from 'react';
import { Button, Select, Space, Input, Tabs, message as antMessage, Modal } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { connectionService } from '../services/connectionService';
import { messageService } from '../services/messageService';
import { protocolService, Protocol as SavedProtocol } from '../services/protocolService';
import ProtocolFieldEditor from '../components/ProtocolFieldEditor';
import ProtocolHexPreview from '../components/ProtocolHexPreview';
import ResponseViewer from '../components/ResponseViewer';
import type { ProtocolField } from '../types/protocol-simple';

const { TextArea } = Input;

// Resizable Splitter Component
interface ResizableSplitterProps {
  containerId: string;
  onDragEnd: (newPercent: number) => void;
}

function ResizableSplitter({ containerId, onDragEnd }: ResizableSplitterProps) {
  const splitterRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPercentRef = useRef(50);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const container = document.getElementById(containerId);
    if (!container) return;

    const requestDiv = container.children[0] as HTMLElement;
    if (!requestDiv) return;

    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    // 获取当前 Request div 的高度百分比作为基准
    const currentHeightPercent = parseFloat(requestDiv.style.height) || 50;
    startPercentRef.current = currentHeightPercent;

    splitterRef.current!.style.background = '#ff6c37';
    document.body.style.cursor = 'row-resize';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const deltaY = e.clientY - startYRef.current;
      const containerHeight = container.getBoundingClientRect().height;
      const deltaPercent = (deltaY / containerHeight) * 100;
      const newPercent = Math.max(10, Math.min(90, startPercentRef.current + deltaPercent));

      // Directly update DOM without React re-render
      const requestDiv = container.children[0] as HTMLElement;
      if (requestDiv) {
        requestDiv.style.height = `${newPercent}%`;
      }
    };

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return;

      isDraggingRef.current = false;
      splitterRef.current!.style.background = '#3e3e42';
      document.body.style.cursor = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.userSelect = '';

      const requestDiv = container.children[0] as HTMLElement;
      const currentHeight = parseFloat(requestDiv.style.height);
      onDragEnd(currentHeight);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={splitterRef}
      onMouseDown={handleMouseDown}
      style={{
        height: '2px',
        background: '#3e3e42',
        cursor: 'row-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '2px',
          background: '#858585',
          borderRadius: '1px',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

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

  // Splitter state
  const [requestHeightPercent, setRequestHeightPercent] = useState(50);

  // Save protocol modal state
  const [saveProtocolModalVisible, setSaveProtocolModalVisible] = useState(false);
  const [newProtocolName, setNewProtocolName] = useState('');
  const [newProtocolDescription, setNewProtocolDescription] = useState('');
  const [isSavingProtocol, setIsSavingProtocol] = useState(false);

  const handleSplitterDragEnd = (newPercent: number) => {
    setRequestHeightPercent(newPercent);
  };

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

  const openSaveProtocolModal = () => {
    if (currentTab.protocolFields.length === 0) {
      antMessage.warning('Please add at least one field before saving');
      return;
    }
    setNewProtocolName('');
    setNewProtocolDescription('');
    setSaveProtocolModalVisible(true);
  };

  const handleSaveAsProtocol = async () => {
    if (!newProtocolName.trim()) {
      antMessage.error('Protocol name is required');
      return;
    }

    if (currentTab.protocolFields.length === 0) {
      antMessage.error('Please add at least one field');
      return;
    }

    try {
      setIsSavingProtocol(true);

      // Prepare field data (generate new IDs)
      const fields = currentTab.protocolFields.map((field, index) => ({
        id: `field_${Date.now()}_${index}`,
        name: field.name,
        length: field.length,
        isVariable: field.isVariable ?? false,
        valueType: field.valueType ?? 'hex',
        value: field.value || '',
        description: field.description,
      }));

      const newProtocol = await protocolService.createProtocol({
        name: newProtocolName.trim(),
        description: newProtocolDescription.trim() || undefined,
        fields,
      });

      antMessage.success('Protocol saved successfully');

      // Refresh protocol list
      const updatedProtocols = await protocolService.listProtocols();
      setSavedProtocols(updatedProtocols);

      // Auto-apply the newly saved protocol
      updateTab(activeTab, {
        selectedProtocolPreset: newProtocol.id,
      });

      // Close modal and reset form
      setSaveProtocolModalVisible(false);
      setNewProtocolName('');
      setNewProtocolDescription('');
    } catch (error) {
      antMessage.error('Failed to save protocol: ' + error);
    } finally {
      setIsSavingProtocol(false);
    }
  };

  const addTab = () => {
    // Generate a unique key by finding the maximum existing key and incrementing
    const maxKey = tabs.reduce((max, tab) => {
      const numKey = parseInt(tab.key, 10);
      return !isNaN(numKey) && numKey > max ? numKey : max;
    }, 0);
    const newKey = String(maxKey + 1);

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
    // Prevent deleting the last tab
    if (tabs.length <= 1) {
      return;
    }

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
      // Skip disabled fields
      if (field.enabled === false) {
        continue;
      }

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
        let cleanHex = '';

        if (field.valueFormat === 'dec') {
          // DEC format: convert decimal to hex
          const num = BigInt(value || '0');
          cleanHex = num.toString(16).toUpperCase().padStart(fieldLength * 2, '0');
          cleanHex = cleanHex.slice(-fieldLength * 2); // Keep only last N bytes
        } else if (/^[0-9A-Fa-f\s]+$/.test(value)) {
          // It's hex
          cleanHex = value.replace(/\s/g, '');
        } else {
          // It's text, convert to hex
          const bytes = new TextEncoder().encode(value);
          for (let i = 0; i < fieldLength; i++) {
            if (i < bytes.length) {
              cleanHex += bytes[i].toString(16).padStart(2, '0');
            } else {
              cleanHex += '00';
            }
          }
        }

        // Pad with zeros at the beginning (left padding) for hex values
        const paddedHex = cleanHex.padStart(fieldLength * 2, '0');
        hexData += paddedHex.slice(-fieldLength * 2);
      }
    }
    return hexData;
  };

  // Build hex data for preview in text/hex mode
  const buildPreviewHexData = (): string => {
    if (currentTab.requestMode === 'text') {
      // Convert text to hex
      const text = currentTab.requestData || '';
      const bytes = new TextEncoder().encode(text);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0').toUpperCase();
      }
      return hex;
    } else if (currentTab.requestMode === 'hex') {
      // Clean hex string (remove spaces and convert to uppercase)
      const cleanHex = (currentTab.requestData || '').replace(/\s/g, '').toUpperCase();
      // Validate it's hex
      if (/^[0-9A-Fa-f]*$/.test(cleanHex)) {
        return cleanHex;
      }
      return '';
    }
    return '';
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
            closable: tabs.length > 1, // Only show close button when there's more than one tab
          }))}
          style={{ margin: 0 }}
          className="compressible-tabs"
          hideAdd={false}
          tabBarExtraContent={
            <Button
              size="small"
              onClick={() => {
                localStorage.removeItem(MESSAGES_STATE_KEY);
                setActiveTab('1');
                setTabs([{
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
                }]);
                antMessage.success('Tab history cleared');
              }}
              style={{ marginRight: 8 }}
            >
              Clear History
            </Button>
          }
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
          size="small"
          style={{ width: 165, }}
          value={currentTab.host}
          onChange={(e) => updateTab(activeTab, { host: e.target.value })}
          disabled={currentTab.isConnected}
        />
        <Input
          placeholder="Port"
          size="small"
          style={{ width: 100, }}
          value={currentTab.port}
          onChange={(e) => updateTab(activeTab, { port: e.target.value })}
          disabled={currentTab.isConnected}
        />
        {!currentTab.isConnected ? (
          <Button type="primary" size="small" style={{ }} onClick={handleConnect} loading={isLoading} >
            Connect
          </Button>
        ) : (
          <>
            <Button
              type="primary"
              size="small"
              icon={<SendOutlined />}
              style={{ }}
              onClick={handleSend}
              loading={isLoading}
            >
              Send
            </Button>
            <Button size="small" style={{ }} onClick={handleDisconnect} loading={isLoading}>
              Disconnect
            </Button>
          </>
        )}
      </div>

      {/* Split Workspace */}
      <div id="split-workspace" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Request Editor */}
        <div
          style={{
            height: `${requestHeightPercent}%`,
            display: 'flex',
            flexDirection: 'column',
            background: '#252526',
            borderBottom: '1px solid #2d2d30',
            overflow: 'hidden',
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
              flexShrink: 0,
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
              {currentTab.requestMode === 'protocol' && (
                <Button
                  size="small"
                  type="primary"
                  onClick={openSaveProtocolModal}
                >
                  Save as Protocol
                </Button>
              )}
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
				}}>
            {/* Two-column layout for all modes */}
            <div style={{ display: 'flex', gap: 8, height: '100%', minHeight: 0, paddingBottom: '8px' }}>
              {/* Left: Input area (自适应) */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                      background: '#1e1e1e',
                      color: '#cccccc',
                      resize: 'none',
                    }}
                  />
                )}
              </div>
              {/* Right: Hex Preview (动态宽度) */}
              <div style={{
						overflow: 'hidden',
						flexShrink: 0,
						marginRight: 8,
					}}>
                  <ProtocolHexPreview hexData={
                    currentTab.requestMode === 'protocol'
                      ? buildProtocolData()
                      : buildPreviewHexData()
                  } />
              </div>
            </div>
          </div>
        </div>

        {/* Resizable Splitter */}
        <ResizableSplitter
          containerId="split-workspace"
          onDragEnd={handleSplitterDragEnd}
        />

        {/* Response Viewer */}
        <div style={{
				flex: 1,
				display: 'flex',
				flexDirection: 'column',
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

      {/* Save as Protocol Modal */}
      <Modal
        title="Save as Protocol"
        open={saveProtocolModalVisible}
        onOk={handleSaveAsProtocol}
        onCancel={() => setSaveProtocolModalVisible(false)}
        okText="Save"
        cancelText="Cancel"
        confirmLoading={isSavingProtocol}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 8, color: '#cccccc' }}>
              Protocol Name <span style={{ color: '#ff4d4f' }}>*</span>
            </div>
            <Input
              value={newProtocolName}
              onChange={(e) => setNewProtocolName(e.target.value)}
              placeholder="Enter protocol name"
              maxLength={100}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, color: '#cccccc' }}>
              Description
            </div>
            <Input.TextArea
              value={newProtocolDescription}
              onChange={(e) => setNewProtocolDescription(e.target.value)}
              placeholder="Enter description (optional)"
              rows={3}
              maxLength={500}
            />
          </div>
          <div style={{ color: '#858585', fontSize: 12 }}>
            Fields: {currentTab.protocolFields.length}
          </div>
        </Space>
      </Modal>
    </div>
  );
}
                                                     