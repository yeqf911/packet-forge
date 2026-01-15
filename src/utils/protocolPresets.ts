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
      { name: 'Transaction ID', length: 2, value: '00 01', description: 'Transaction identifier' },
      { name: 'Protocol ID', length: 2, value: '00 00', description: 'Protocol identifier (0 = Modbus)' },
      { name: 'Length', length: 2, value: '00 06', description: 'Number of following bytes' },
      { name: 'Unit ID', length: 1, value: '01', description: 'Slave address' },
      { name: 'Function Code', length: 1, value: '03', description: 'Function code (e.g., 0x03 = Read Holding Registers)' },
      { name: 'Data', length: 4, value: '00 00 00 01', description: 'Request data' },
    ],
  },
  {
    id: 'http_simple',
    name: 'Simple HTTP',
    description: 'Simple HTTP GET request',
    fields: [
      { name: 'Method', length: 3, value: 'GET', description: 'HTTP method' },
      { name: 'Space', length: 1, value: '20', description: 'Space character' },
      { name: 'Path', length: 10, value: '/index.html', description: 'Request path' },
      { name: 'Version', length: 8, value: 'HTTP/1.1', description: 'HTTP version' },
      { name: 'CRLF', length: 2, value: '0D 0A', description: 'Carriage return + Line feed' },
    ],
  },
  {
    id: 'custom_header',
    name: 'Custom Header',
    description: 'Custom protocol header with magic number',
    fields: [
      { name: 'Magic Number', length: 4, value: 'AA BB CC DD', description: 'Protocol magic number' },
      { name: 'Version', length: 2, value: '01 00', description: 'Protocol version' },
      { name: 'Message Type', length: 1, value: '01', description: 'Message type' },
      { name: 'Sequence', length: 4, value: '00 00 00 01', description: 'Sequence number' },
      { name: 'Payload Length', length: 4, value: '00 00 00 10', description: 'Payload length' },
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
  }));
}
