import { Input } from 'antd';

const { TextArea } = Input;

interface ResponseViewerProps {
  data: string;
  height?: string;
}

// Convert hex string to text (try to decode as UTF-8)
function hexToText(hex: string): string {
  // Remove spaces and line breaks
  const cleanHex = hex.replace(/\s/g, '');

  // Check if it's valid hex
  if (!/^[0-9A-Fa-f]*$/.test(cleanHex)) {
    return data; // Not hex, return as-is
  }

  try {
    // Convert hex to bytes
    const bytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      if (i + 2 <= cleanHex.length) {
        bytes.push(parseInt(cleanHex.substr(i, 2), 16));
      }
    }

    // Try to decode as UTF-8
    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    return data; // Failed to decode, return as-is
  }
}

// Format hex string with spaces for better readability
function formatHexString(hex: string): string {
  const cleanHex = hex.replace(/\s/g, '');
  const formatted: string[] = [];
  for (let i = 0; i < cleanHex.length; i += 2) {
    if (i + 2 <= cleanHex.length) {
      formatted.push(cleanHex.substr(i, 2));
    }
  }
  // Group by 16 bytes (8 hex pairs per line)
  const result: string[] = [];
  for (let i = 0; i < formatted.length; i += 8) {
    result.push(formatted.slice(i, i + 8).join(' '));
  }
  return result.join('\n');
}

export default function ResponseViewer({ data, height = '100%' }: ResponseViewerProps) {
  // Format the hex data for display
  const hexDisplay = formatHexString(data);

  // Decode hex to text
  const textDisplay = hexToText(data);

  return (
    <div style={{ display: 'flex', height, gap: '8px' }}>
      {/* Left side: Hex display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '4px 8px',
            background: '#252526',
            fontSize: 14,
            color: '#858585',
            fontWeight: 500,
          }}
        >
          Hexadecimal
        </div>
        <TextArea
          value={hexDisplay}
          readOnly
          placeholder="Hex data will be displayed here..."
          style={{
            flex: 1,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            fontSize: 16,
            background: '#1e1e1e',
            color: '#4ec9b0',
            resize: 'none',
          }}
        />
      </div>

      {/* Right side: Decoded text display */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '4px 8px',
            background: '#252526',
            fontSize: 14,
            color: '#858585',
            fontWeight: 500,
          }}
        >
          Decoded Text
        </div>
        <TextArea
          value={textDisplay}
          readOnly
          placeholder="Decoded text will be displayed here..."
          style={{
            flex: 1,
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            fontSize: 16,
            background: '#1e1e1e',
            color: '#cccccc',
            resize: 'none',
          }}
        />
      </div>
    </div>
  );
}
