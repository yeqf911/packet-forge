import { Button, Input, InputNumber, Table, Popconfirm, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProtocolField } from '../types/protocol-simple';
import { useState } from 'react';

interface ProtocolFieldEditorProps {
  fields: ProtocolField[];
  onChange: (fields: ProtocolField[]) => void;
}

export default function ProtocolFieldEditor({ fields, onChange }: ProtocolFieldEditorProps) {
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});

  // Format hex value with spaces between bytes
  const formatHexValue = (value: string, maxLength?: number): string => {
    // Remove all non-hex characters
    const cleanHex = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();

    // Apply length limit if specified
    const limitedHex = maxLength ? cleanHex.substring(0, maxLength * 2) : cleanHex;

    // Add space between each byte (2 hex characters)
    const formatted = limitedHex.match(/.{1,2}/g)?.join(' ') || '';

    return formatted;
  };

  // Parse formatted hex value back to clean hex
  const parseHexValue = (formatted: string): string => {
    return formatted.replace(/\s/g, '').toUpperCase();
  };

  // Check if value is hex
  const isHexValue = (value: string): boolean => {
    const clean = value.replace(/\s/g, '');
    return /^[0-9A-Fa-f]+$/.test(clean) && clean.length % 2 === 0;
  };

  const addField = () => {
    const newField: ProtocolField = {
      id: `field_${Date.now()}`,
      name: `Field${fields.length + 1}`,
      length: 1,
      isVariable: false,
      value: '',
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<ProtocolField>) => {
    onChange(
      fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  const handleValueChange = (id: string, inputValue: string, field: ProtocolField) => {
    // For non-variable fields, only accept hex characters (0-9, A-F, a-f, spaces)
    if (!field.isVariable) {
      // Filter out non-hex characters (keep only 0-9, A-F, a-f, and spaces)
      const filtered = inputValue.replace(/[^0-9A-Fa-f\s]/g, '');

      // Format as hex with spaces
      const formatted = formatHexValue(filtered, field.length);
      setEditingFields(prev => ({ ...prev, [id]: formatted }));
      updateField(id, { value: parseHexValue(formatted) });
    } else {
      // For variable fields, check if it's hex or text
      const clean = inputValue.replace(/\s/g, '');
      if (/^[0-9A-Fa-f]+$/.test(clean) || clean === '') {
        // Format as hex
        const formatted = formatHexValue(inputValue);
        setEditingFields(prev => ({ ...prev, [id]: formatted }));
        updateField(id, { value: parseHexValue(formatted) });
      } else {
        // Text input, store as-is
        setEditingFields(prev => ({ ...prev, [id]: inputValue }));
        updateField(id, { value: inputValue });
      }
    }
  };

  const handleValueBlur = (id: string, field: ProtocolField) => {
    // Clear editing state on blur
    setEditingFields(prev => {
      const newEditing = { ...prev };
      delete newEditing[id];
      return newEditing;
    });
  };

  const deleteField = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  const columns = [
    {
      title: 'Field Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string, record: ProtocolField) => (
        <Input
          value={text}
          onChange={(e) => updateField(record.id, { name: e.target.value })}
          placeholder="Field name"
          size="small"
          className="protocol-field-input"
        />
      ),
    },
    {
      title: 'Variable',
      dataIndex: 'isVariable',
      key: 'isVariable',
      width: 100,
      render: (isVariable: boolean, record: ProtocolField) => (
        <Checkbox
          checked={isVariable || false}
          onChange={(e) => updateField(record.id, { isVariable: e.target.checked })}
          style={{ color: '#cccccc' }}
        />
      ),
    },
    {
      title: 'Length',
      dataIndex: 'length',
      key: 'length',
      width: 80,
      render: (length: number | undefined, record: ProtocolField) => (
        <InputNumber
          value={length}
          onChange={(value) => updateField(record.id, { length: value || 1 })}
          min={1}
          max={1024}
          disabled={record.isVariable}
          size="small"
          className="protocol-field-input"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: ProtocolField) => {
        // Determine display value
        let displayValue = editingFields[record.id] !== undefined ? editingFields[record.id] : text;

        // Format hex values for display
        if (text && /^[0-9A-Fa-f\s]+$/.test(text)) {
          const clean = text.replace(/\s/g, '');
          if (clean.length > 0 && clean.length % 2 === 0) {
            displayValue = editingFields[record.id] !== undefined
              ? editingFields[record.id]
              : formatHexValue(text, !record.isVariable && record.length ? record.length : undefined);
          }
        }

        return (
          <Input
            value={displayValue}
            onChange={(e) => handleValueChange(record.id, e.target.value, record)}
            onBlur={() => handleValueBlur(record.id, record)}
            placeholder={record.isVariable ? "Enter data (text or hex)" : "Enter hex (e.g., 01 02 03)"}
            size="small"
            className="protocol-field-input"
          />
        );
      },
    },
    {
      title: 'Actions',
      key: 'action',
      width: 90,
      render: (_: any, record: ProtocolField) => (
        <Popconfirm
          title="Are you sure to delete this field?"
          onConfirm={() => deleteField(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={addField}
          size="small"
        >
          Add Field
        </Button>
      </div>
      <div
        style={{ flex: 1, overflow: 'hidden', background: '#252526', paddingBottom: '8px', minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Table
          columns={columns}
          dataSource={fields}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 600 }}
          style={{
            background: '#252526',
          }}
        />
      </div>
    </div>
  );
}
 