import { useState, useEffect } from 'react';
import { Button, Table, Modal, Input, Space, Popconfirm, message, Empty, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import ProtocolFieldEditor from '../components/ProtocolFieldEditor';
import { protocolService, Protocol } from '../services/protocolService';
import type { ProtocolField } from '../types/protocol-simple';

const { Title, Text } = Typography;

interface EditingProtocol {
  id?: string;
  name: string;
  description: string;
  fields: ProtocolField[];
}

export default function Protocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<EditingProtocol | null>(null);

  const loadProtocols = async () => {
    setLoading(true);
    try {
      const result = await protocolService.listProtocols();
      setProtocols(result);
    } catch (error) {
      message.error('Failed to load protocols: ' + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProtocols();
  }, []);

  const handleCreate = () => {
    setEditingProtocol({
      name: '',
      description: '',
      fields: [],
    });
    setModalVisible(true);
  };

  const handleEdit = (protocol: Protocol) => {
    setEditingProtocol({
      id: protocol.id,
      name: protocol.name,
      description: protocol.description || '',
      fields: protocol.fields.map((f, i) => ({
        id: `edit_${Date.now()}_${i}`,
        name: f.name,
        length: f.length,
        isVariable: f.isVariable ?? false,
        valueType: f.valueType ?? 'hex',
        valueFormat: f.valueFormat,
        value: f.value || '',
        description: f.description,
      })),
    });
    setModalVisible(true);
  };

  const handleDuplicate = async (protocol: Protocol) => {
    try {
      // Deep copy fields with new IDs
      const fields = protocol.fields.map((field, index) => ({
        id: `field_${Date.now()}_${index}`,
        name: field.name,
        length: field.length,
        isVariable: field.isVariable ?? false,
        valueType: field.valueType ?? 'hex',
        valueFormat: field.valueFormat,
        value: field.value || '',
        description: field.description,
      }));

      await protocolService.createProtocol({
        name: `${protocol.name}-copy`,
        description: protocol.description,
        fields,
      });
      message.success('Protocol duplicated successfully');
      loadProtocols();
    } catch (error) {
      message.error('Failed to duplicate protocol: ' + error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await protocolService.deleteProtocol(id);
      message.success('Protocol deleted successfully');
      loadProtocols();
    } catch (error) {
      message.error('Failed to delete protocol: ' + error);
    }
  };

  const handleSave = async () => {
    if (!editingProtocol) return;

    if (!editingProtocol.name.trim()) {
      message.error('Protocol name is required');
      return;
    }

    try {
      if (editingProtocol.id) {
        await protocolService.updateProtocol({
          id: editingProtocol.id,
          name: editingProtocol.name,
          description: editingProtocol.description || undefined,
          fields: editingProtocol.fields,
        });
        message.success('Protocol updated successfully');
      } else {
        await protocolService.createProtocol({
          name: editingProtocol.name,
          description: editingProtocol.description || undefined,
          fields: editingProtocol.fields,
        });
        message.success('Protocol created successfully');
      }
      setModalVisible(false);
      loadProtocols();
    } catch (error) {
      message.error('Failed to save protocol: ' + error);
    }
  };

  const columns = [
    {
      title: 'Protocol Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Protocol) => (
        <div>
          <div style={{ color: '#cccccc' }}>{name}</div>
          {record.description && (
            <div style={{ color: '#858585', fontSize: 12 }}>{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Fields',
      dataIndex: 'fields',
      key: 'fields',
      width: 100,
      render: (fields: ProtocolField[]) => (
        <span style={{ color: '#858585' }}>{fields.length}</span>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 220,
      render: (date: string) => (
        <span style={{ color: '#858585' }}>{new Date(date).toLocaleString()}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: Protocol) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ color: '#cccccc' }}
          />
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={() => handleDuplicate(record)}
            style={{ color: '#cccccc' }}
          />
          <Popconfirm
            title="Are you sure to delete this protocol?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ color: '#cccccc', margin: 0 }}>
          Protocol Templates
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          New Protocol
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={protocols}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description="No protocols yet"
              style={{ color: '#858585' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Create First Protocol
              </Button>
            </Empty>
          ),
        }}
        style={{
          flex: 1,
          background: '#1e1e1e',
        }}
        scroll={{ y: 'calc(100vh - 160px)' }}
      />

      <Modal
        title={editingProtocol?.id ? 'Edit Protocol' : 'New Protocol'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="Save"
        cancelText="Cancel"
        style={{ top: 20 }}
        bodyStyle={{ height: '60vh', overflow: 'hidden', padding: '16px' }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text style={{ color: '#cccccc', marginRight: 8 }}>Name:</Text>
            <Input
              value={editingProtocol?.name || ''}
              onChange={(e) => setEditingProtocol(prev => prev ? { ...prev, name: e.target.value } : null)}
              placeholder="Enter protocol name"
              style={{ maxWidth: 400 }}
            />
          </div>
          <div>
            <Text style={{ color: '#cccccc', marginRight: 8 }}>Description:</Text>
            <Input
              value={editingProtocol?.description || ''}
              onChange={(e) => setEditingProtocol(prev => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Enter description (optional)"
              style={{ maxWidth: 400 }}
            />
          </div>
          <div style={{ height: 'calc(60vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <Text style={{ color: '#cccccc', marginBottom: 8 }}>Fields:</Text>
            {editingProtocol && (
              <ProtocolFieldEditor
                fields={editingProtocol.fields}
                onChange={(fields) => setEditingProtocol(prev => prev ? { ...prev, fields } : null)}
              />
            )}
          </div>
        </Space>
      </Modal>
    </div>
  );
}
