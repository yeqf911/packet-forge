import type { ProtocolField } from '../types/protocol-simple';

export interface ProtocolPreset {
  id: string;
  name: string;
  description?: string;
  fields: Omit<ProtocolField, 'id'>[];
}

export const protocolPresets: ProtocolPreset[] = [
  {
    id: 'modbus_tcp',
    name: 'Modbus TCP',
    description: 'Modbus TCP protocol frame format',
    fields: [
      { name: 'Transaction ID', length: 2, value: '1', valueFormat: 'dec', description: 'Transaction identifier' },
      { name: 'Protocol ID', length: 2, value: '0', valueFormat: 'dec', description: 'Protocol identifier (0 = Modbus)' },
      { name: 'Length', length: 2, value: '6', valueFormat: 'dec', description: 'Number of following bytes' },
      { name: 'Unit ID', length: 1, value: '1', valueFormat: 'dec', description: 'Slave address' },
      { name: 'Function Code', length: 1, value: '3', valueFormat: 'dec', description: 'Function code (e.g., 0x03 = Read Holding Registers)' },
      { name: 'Data', length: 4, value: '1', valueFormat: 'dec', description: 'Request data' },
    ],
  },
  {
    id: 'http_simple',
    name: 'Simple HTTP',
    description: 'Simple HTTP GET request',
    fields: [
      { name: 'Method', length: 3, isVariable: true, valueType: 'text', value: 'GET', description: 'HTTP method' },
      { name: 'Space', length: 1, value: '32', valueFormat: 'dec', description: 'Space character (ASCII 32)' },
      { name: 'Path', length: 10, isVariable: true, valueType: 'text', value: '/index.html', description: 'Request path' },
      { name: 'Version', length: 8, isVariable: true, valueType: 'text', value: 'HTTP/1.1', description: 'HTTP version' },
      { name: 'CRLF', length: 2, value: '3338', valueFormat: 'dec', description: 'Carriage return + Line feed (0D0A = 3338)' },
    ],
  },
  {
    id: 'custom_header',
    name: 'Custom Header',
    description: 'Custom protocol header with magic number',
    fields: [
      { name: 'Magic Number', length: 4, value: '2864434397', valueFormat: 'dec', description: 'Protocol magic number (AABBCCDD)' },
      { name: 'Version', length: 2, value: '256', valueFormat: 'dec', description: 'Protocol version (0100 = 256)' },
      { name: 'Message Type', length: 1, value: '1', valueFormat: 'dec', description: 'Message type' },
      { name: 'Sequence', length: 4, value: '1', valueFormat: 'dec', description: 'Sequence number' },
      { name: 'Payload Length', length: 4, value: '16', valueFormat: 'dec', description: 'Payload length (16 bytes)' },
    ],
  },
];

export function getProtocolPresetById(id: string): ProtocolPreset | undefined {
  return protocolPresets.find(preset => preset.id === id);
}

export function applyProtocolPreset(preset: ProtocolPreset): ProtocolField[] {
  return preset.fields.map((field, index) => ({
    ...field,
    id: `field_${Date.now()}_${index}`,
    enabled: field.enabled ?? true,
    // Non-variable fields default to DEC format if not specified
    valueFormat: field.isVariable ? field.valueFormat : (field.valueFormat ?? 'dec'),
  }));
}
