import { Button, Input, InputNumber, Table, Popconfirm, Checkbox, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusCircleOutlined } from '@ant-design/icons';
import type { ProtocolField } from '../types/protocol-simple';
import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { useFontSize } from '../contexts/FontSizeContext';

interface ProtocolFieldEditorProps {
  fields: ProtocolField[];
  onChange: (fields: ProtocolField[]) => void;
}

function ProtocolFieldEditor({ fields, onChange }: ProtocolFieldEditorProps) {
  const { fontSize } = useFontSize();
  const [editingFields, setEditingFields] = useState<Record<string, string>>({});

  // Use ref to store fields and onChange to avoid columns re-creation
  const fieldsRef = useRef(fields);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    fieldsRef.current = fields;
    onChangeRef.current = onChange;
  }, [fields, onChange]);

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
    const currentFields = fieldsRef.current;
    const newField: ProtocolField = {
      id: `field_${Date.now()}`,
      name: `Field${currentFields.length + 1}`,
      length: 1,
      isVariable: false,
      valueType: 'text',
      value: '',
    };
    onChangeRef.current([...currentFields, newField]);
  };

  const updateField = useCallback((id: string, updates: Partial<ProtocolField>) => {
    onChangeRef.current(
      fieldsRef.current.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  }, []);

  // 计算值的实际字节长度
  const calculateByteLength = (value: string, valueType: 'text' | 'hex', isVariable: boolean): number => {
    if (!value) return 0;

    if (isVariable) {
      if (valueType === 'text') {
        // Text 类型：直接返回字符数（UTF-8 字节数）
        return new TextEncoder().encode(value).length;
      } else {
        // Hex 类型：返回 hex 字符串长度 / 2
        const cleanHex = value.replace(/\s/g, '');
        return Math.floor(cleanHex.length / 2);
      }
    }
    return 0;
  };

  const handleValueChange = useCallback((id: string, inputValue: string, field: ProtocolField) => {
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
        const actualLength = calculateByteLength(parseHexValue(formatted), 'hex', true);
        updateField(id, { value: parseHexValue(formatted), length: actualLength });
      } else {
        // Text type - accept any input
        setEditingFields(prev => ({ ...prev, [id]: inputValue }));
        const actualLength = calculateByteLength(inputValue, 'text', true);
        updateField(id, { value: inputValue, length: actualLength });
      }
    }
  }, []);

  const handleValueBlur = useCallback((id: string) => {
    setEditingFields(prev => {
      const newEditing = { ...prev };
      delete newEditing[id];
      return newEditing;
    });
  }, []);

  const toggleValueType = useCallback((id: string) => {
    const field = fieldsRef.current.find(f => f.id === id);
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

      // 更新长度为新类型的实际字节长度
      const newLength = calculateByteLength(newValue, newType, true);
      updateField(id, { valueType: newType, value: newValue, length: newLength });
    }
  }, []);

  const deleteField = useCallback((id: string) => {
    onChangeRef.current(fieldsRef.current.filter((field) => field.id !== id));
  }, []);

  const moveFieldUp = useCallback((index: number) => {
    const currentFields = fieldsRef.current;
    if (index === 0) return;
    const newFields = [...currentFields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    onChangeRef.current(newFields);
  }, []);

  const moveFieldDown = useCallback((index: number) => {
    const currentFields = fieldsRef.current;
    if (index === currentFields.length - 1) return;
    const newFields = [...currentFields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    onChangeRef.current(newFields);
  }, []);

  const insertFieldAfter = useCallback((index: number) => {
    const currentFields = fieldsRef.current;
    const newField: ProtocolField = {
      id: `field_${Date.now()}`,
      name: `Field${currentFields.length + 1}`,
      length: 1,
      isVariable: false,
      valueType: 'text',
      value: '',
    };
    const newFields = [...currentFields];
    newFields.splice(index + 1, 0, newField);
    onChangeRef.current(newFields);
  }, []);

  // Create columns once with refs to avoid re-renders
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
          onChange={(e) => {
            const updates: Partial<ProtocolField> = {
              isVariable: e.target.checked,
              valueType: e.target.checked ? 'text' : undefined,
            };
            // 如果勾选为 variable，更新长度为实际字节长度
            if (e.target.checked) {
              updates.length = calculateByteLength(record.value || '', 'text', true);
            }
            updateField(record.id, updates);
          }}
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
        record.isVariable ? (
          <span style={{ color: '#858585', fontSize: 14 }}>{length || 0}</span>
        ) : (
          <InputNumber
            value={length}
            onChange={(value) => updateField(record.id, { length: value || 1 })}
            min={1}
            max={1024}
            size="small"
            className="protocol-field-input"
            style={{ width: '100%' }}
          />
        )
      ),
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      render: (text: string, record: ProtocolField) => {
        const displayValue = editingFields[record.id] !== undefined
          ? editingFields[record.id]
          : (() => {
              const shouldFormatHex = !record.isVariable || record.valueType === 'hex';
              if (text && shouldFormatHex && /^[0-9A-Fa-f\s]+$/.test(text)) {
                const clean = text.replace(/\s/g, '');
                if (clean.length > 0 && clean.length % 2 === 0) {
                  return formatHexValue(text, !record.isVariable && record.length ? record.length : undefined);
                }
              }
              return text;
            })();

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
                  height: 24,
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
      width: 100,
      render: (_: any, record: ProtocolField, index: number) => {
        const currentFields = fieldsRef.current;
        return (
          <div style={{ display: 'flex', gap: 2 }}>
            <Tooltip title="Insert Below">
              <Button
                type="text"
                size="small"
                icon={<PlusCircleOutlined />}
                onClick={() => insertFieldAfter(index)}
                style={{ color: '#4ec9b0' }}
              />
            </Tooltip>
            <Tooltip title="Move Up">
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                onClick={() => moveFieldUp(index)}
                disabled={index === 0}
                style={{ color: index === 0 ? '#555555' : '#cccccc' }}
              />
            </Tooltip>
            <Tooltip title="Move Down">
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                onClick={() => moveFieldDown(index)}
                disabled={index === currentFields.length - 1}
                style={{ color: index === currentFields.length - 1 ? '#555555' : '#cccccc' }}
              />
            </Tooltip>
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
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ 
			height: '100%', 
			display: 'flex', 
			flexDirection: 'column', 
			overflow: 'hidden',
			//background: '#000000',
			marginLeft: 8
		}}>
      <div style={{ 
			flexShrink: 0,
			paddingBotom: 0,
			paddingTop: 8,
			paddingLeft: 8
		}}>
        <Button
          icon={<PlusOutlined />}
          onClick={addField}
          size="small"
        >
          Add Field
        </Button>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: 250,
          overflow: 'hidden',
          background: '#252526',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          display: 'flex',
          borderBottom: '0px solid #3e3e42',
          background: '#252526',
          flexShrink: 0,
        }}>
          <div style={{ width: 140, padding: '8px', color: '#cccccc', fontSize, fontWeight: 500 }}>Field Name</div>
          <div style={{ width: 100, padding: '8px', color: '#cccccc', fontSize, fontWeight: 500 }}>Variable</div>
          <div style={{ width: 80, padding: '8px', color: '#cccccc', fontSize, fontWeight: 500 }}>Length</div>
          <div style={{ flex: 1, padding: '8px', color: '#cccccc', fontSize, fontWeight: 500 }}>Value</div>
          <div style={{ width: 100, padding: '8px', color: '#cccccc', fontSize, fontWeight: 500 }}>Actions</div>
        </div>
        <div style={{
          flex: 1,
          overflow: 'auto',
          background: '#252526',
        }}>
          <Table
            key="protocol-fields-table"
            columns={columns}
            dataSource={fields}
            rowKey="id"
            pagination={false}
            size="small"
            showHeader={false}
            style={{
              background: '#252526',
            }}
            tableLayout="fixed"
          />
        </div>
      </div>
    </div>
  );
}

export default memo(ProtocolFieldEditor);