import { Button, Input, InputNumber, Table, Popconfirm, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ProtocolField } from '../types/protocol-simple';
import { useState, useRef, useEffect } from 'react';

interface ProtocolFieldEditorProps {
  fields: ProtocolField[];
  onChange: (fields: ProtocolField[]) => void;
}

export default function ProtocolFieldEditor({ fields, onChange }: ProtocolFieldEditorProps) {
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});
  const [tableHeight, setTableHeight] = useState<number>(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      const container = containerRef.current;
      if (container) {
        const height = container.clientHeight;
        setTableHeight(Math.max(100, height - 80));
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // Format hex value with spaces between bytes
  const formatHexValue = (value: string, maxLength?: number): string => {
    const cleanHex = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const limitedHex = maxLength ? cleanHex.substring(0, maxLength * 2) : cleanHex;
    return limitedHex.match(/.{1,2}/g)?.join(' ') || '';
  };

  // Parse formatted hex value back to clean hex
  const parseHexValue = (formatted: string): string => {
    return formatted.replace(/\s/g, '').toUpperCase();
  };

  // Text → Hex: "hello" → "68 65 6C 6C 6F"
  const textToHex = (text: string): string => {
    const bytes = new TextEncoder().encode(text);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  };

  // Hex → Text: "68 65 6C 6C 6F" → "hello"
  const hexToText = (hex: string): string => {
    const cleanHex = hex.replace(/\s/g, '');
    if (cleanHex.length === 0) return '';
    const bytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      const byteValue = parseInt(cleanHex.substr(i, 2), 16);
      if (isNaN(byteValue)) return hex; // Invalid hex, return original
      bytes.push(byteValue);
    }
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      return decoder.decode(new Uint8Array(bytes));
    } catch {
      return hex; // Failed, return original
    }
  };

  const addField = () => {
    const newField: ProtocolField = {
      id: `field_${Date.now()}`,
      name: `Field${fields.length + 1}`,
      length: 1,
      isVariable: false,
      valueType: 'text',
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
    // For non-variable fields, only accept hex characters
    if (!field.isVariable) {
      const filtered = inputValue.replace(/[^0-9A-Fa-f\s]/g, '');
      const formatted = formatHexValue(filtered, field.length);
      setEditingFields(prev => ({ ...prev, [id]: formatted }));
      updateField(id, { value: parseHexValue(formatted) });
    } else {
      // For variable fields with hex type, only accept hex
      if (field.valueType === 'hex') {
        const filtered = inputValue.replace(/[^0-9A-Fa-f\s]/g, '');
        const formatted = formatHexValue(filtered);
        setEditingFields(prev => ({ ...prev, [id]: formatted }));
        updateField(id, { value: parseHexValue(formatted) });
      } else {
        // Text type - accept any input
        setEditingFields(prev => ({ ...prev, [id]: inputValue }));
        updateField(id, { value: inputValue });
      }
    }
  };

  const handleValueBlur = (id: string) => {
    setEditingFields(prev => {
      const newEditing = { ...prev };
      delete newEditing[id];
      return newEditing;
    });
  };

  const toggleValueType = (id: string) => {
    const field = fields.find(f => f.id === id);
    if (field?.isVariable) {
      const newType = field.valueType === 'text' ? 'hex' : 'text';
      let newValue = field.value;

      // Text → Hex: 转换并存储纯净 hex
      if (newType === 'hex' && field.valueType === 'text') {
        newValue = textToHex(field.value).replace(/\s/g, '');
      }
      // Hex → Text: 解码并存储
      else if (newType === 'text' && field.valueType === 'hex') {
        newValue = hexToText(field.value);
      }

      updateField(id, { valueType: newType, value: newValue });
    }
  };

  const deleteField = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  const columns = [
    {
      title: 'Field Name',
      dataIndex: 'name',
      key: 'name',
      width: 140,
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
          onChange={(e) => updateField(record.id, { isVariable: e.target.checked, valueType: e.target.checked ? 'text' : undefined })}
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
          style={{
            width: '100%',
            ...(record.isVariable && {
              color: '#555555',
              cursor: 'not-allowed',
              opacity: 0.6,
            }),
          }}
        />
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: ProtocolField) => {
        let displayValue = editingFields[record.id] !== undefined ? editingFields[record.id] : text;

        // Format hex values for display (for non-variable or hex-type fields)
        const shouldFormatHex = !record.isVariable || record.valueType === 'hex';
        if (text && shouldFormatHex && /^[0-9A-Fa-f\s]+$/.test(text)) {
          const clean = text.replace(/\s/g, '');
          if (clean.length > 0 && clean.length % 2 === 0) {
            displayValue = editingFields[record.id] !== undefined
              ? editingFields[record.id]
              : formatHexValue(text, !record.isVariable && record.length ? record.length : undefined);
          }
        }

        const placeholder =
          record.isVariable && record.valueType === 'text'
            ? 'Enter text'
            : 'Enter hex (e.g., 01 02 03)';

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Input
              value={displayValue}
              onChange={(e) => handleValueChange(record.id, e.target.value, record)}
              onBlur={() => handleValueBlur(record.id)}
              placeholder={placeholder}
              size="small"
              className="protocol-field-input"
              style={{ flex: 1 }}
            />
            {record.isVariable && (
              <Button
                type="text"
                size="small"
                onClick={() => toggleValueType(record.id)}
                style={{
                  padding: '0 8px',
                  height: 25,
                  fontSize: 12,
                  minWidth: 40,
                  background: record.valueType === 'text' ? '#3e3e42' : '#2d2d30',
                  color: record.valueType === 'text' ? '#cccccc' : '#858585',
                  border: '1px solid #3e3e42',
                }}
              >
                {record.valueType === 'text' ? 'Text' : 'Hex'}
              </Button>
            )}
          </div>
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
    <div ref={containerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 8, flexShrink: 0 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={addField}
          size="small"
        >
          Add Field
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={fields}
        rowKey="id"
        pagination={false}
        size="small"
        scroll={{ y: tableHeight }}
        style={{
          background: '#252526',
          flex: 1,
        }}
      />
    </div>
  );
}
