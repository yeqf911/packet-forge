import { Button, Empty, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { useFontSize } from '../contexts/FontSizeContext';

interface ResponseViewerProps {
  data: string;
}

interface HexLine {
  offset: string;
  hexBytes: string;
  ascii: string;
}

// Convert hex string to text (try to decode as UTF-8)
function hexToText(hex: string): string {
  const cleanHex = hex.replace(/\s/g, '');

  if (!/^[0-9A-Fa-f]*$/.test(cleanHex)) {
    return hex;
  }

  try {
    const bytes: number[] = [];
    for (let i = 0; i < cleanHex.length; i += 2) {
      if (i + 2 <= cleanHex.length) {
        bytes.push(parseInt(cleanHex.substr(i, 2), 16));
      }
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    return decoder.decode(new Uint8Array(bytes));
  } catch {
    return hex;
  }
}

// 将纯 hex 字符串格式化为多行显示（与 ProtocolHexPreview 相同的格式）
function formatHexData(data: string): HexLine[] {
  const cleanHex = data.replace(/\s/g, '');
  const lines: HexLine[] = [];

  for (let i = 0; i < cleanHex.length; i += 32) {
    const offset = (i / 2).toString(16).padStart(8, '0').toUpperCase();
    const lineHex = cleanHex.substring(i, i + 32);
    const bytes: string[] = [];

    for (let j = 0; j < lineHex.length; j += 2) {
      bytes.push(lineHex.substring(j, j + 2));
    }

    const padByte = (byte: string): string => {
      return byte.padStart(2, '0').toUpperCase();
    };

    // 格式化 hex 显示，前 8 字节和后 8 字节之间多一个空格
    const firstHalf = bytes.slice(0, 8).map(padByte).join(' ');
    const secondHalf = bytes.slice(8, 16).map(padByte).join(' ');

    // 保持 hex 区域固定长度
    const firstHalfPadded = firstHalf.padEnd(23, ' ');
    const secondHalfPadded = secondHalf.padEnd(23, ' ');
    const hexBytes = `${firstHalfPadded}  ${secondHalfPadded}`;

    // 转换为 ASCII
    let ascii = '';
    for (let j = 0; j < bytes.length; j++) {
      const byteVal = parseInt(bytes[j], 16);
      ascii += (byteVal >= 32 && byteVal <= 126) ? String.fromCharCode(byteVal) : '.';
    }

    lines.push({
      offset,
      hexBytes,
      ascii: ascii.padEnd(16, ' '),
    });
  }

  return lines;
}

export default function ResponseViewer({ data }: ResponseViewerProps) {
  const { fontSize } = useFontSize();
  const textDisplay = hexToText(data);
  const hexLines = formatHexData(data);
  const isHexEmpty = !data || hexLines.length === 0;
  const isTextEmpty = !textDisplay;

  // 计算容器宽度（与 ProtocolHexPreview 一致）
  const contentWidth = 75 * fontSize * 0.6;
  const hexPreviewWidth = Math.ceil(contentWidth + 24);

  const handleCopyHex = () => {
    if (!data) {
      message.warning('Nothing to copy');
      return;
    }
    const cleanHex = data.replace(/\s/g, '');
    const formattedHex = cleanHex.match(/.{1,2}/g)?.join(' ') || '';
    navigator.clipboard.writeText(formattedHex)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => message.error('Failed to copy'));
  };

  const handleCopyText = () => {
    if (!textDisplay) {
      message.warning('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(textDisplay)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => message.error('Failed to copy'));
  };

  // Footer高度
  const footerHeight = fontSize + 8;

  return (
    <div style={{ display: 'flex', gap: '8px', height: '100%', padding: '8px', background: '#252526' }}>
      {/* Left: Decoded Text display - 占据剩余空间 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        //background: '#ff0000',
        minWidth: 0,
      }}>
        {/* Header */}
        <div style={{
          padding: '8px',
          borderBottom: '0px solid #2d2d30',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#cccccc', fontSize, fontWeight: 500 }}>Decoded Text</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyText}
            disabled={isTextEmpty}
            style={{ color: isTextEmpty ? '#555555' : '#cccccc', fontSize: fontSize - 2 }}
          >
            Copy
          </Button>还是
        </div>

        {/* Content - 使用calc计算高度，确保Footer可见 */}
        <div style={{
          height: isTextEmpty ? '100%' : `calc(100% - 50px - ${footerHeight}px)`,
          overflow: 'auto',
          padding: '8px',
		   background: '#1e1e1e'
        }}>
          {isTextEmpty ? (
            <Empty
              description="No data"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ color: '#858585', marginTop: 40 }}
            />
          ) : (
            <pre style={{
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
              fontSize,
              color: '#27AE60',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {textDisplay}
            </pre>
          )}
        </div>

        {/* Footer info - 固定在容器底部 */}
        {!isTextEmpty && (
          <div style={{
            padding: '10px 8px',
            fontSize: fontSize - 3,
            color: '#858585',
            height: footerHeight,
            boxSizing: 'border-box',
			  background: '#1e1e1e',
		     paddingBottom: 20
          }}>
            Total: {textDisplay.length} chars
          </div>
        )}
      </div>

      {/* Right: Hexadecimal display - 固定宽度与 ProtocolHexPreview 一致 */}
      <div style={{
        width: hexPreviewWidth,
        display: 'flex',
        flexDirection: 'column',
        //background: '#1e1e1e',
      }}>
        {/* Header */}
        <div style={{
          padding: '8px',
          borderBottom: '0px solid #2d2d30',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#cccccc', fontSize, fontWeight: 500 }}>Hexadecimal</span>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopyHex}
            disabled={isHexEmpty}
            style={{ color: isHexEmpty ? '#555555' : '#cccccc', fontSize: fontSize - 2 }}
          >
            Copy
          </Button>
        </div>

        {/* Content - 使用calc计算高度，确保Footer可见 */}
        <div style={{
          height: isHexEmpty ? '100%' : `calc(100% - 50px - ${footerHeight}px)`,
          overflow: 'auto',
          padding: '8px',
		   background: '#1e1e1e'
        }}>
          {isHexEmpty ? (
            <Empty
              description="No data"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ color: '#858585', marginTop: 40 }}
            />
          ) : (
            <div style={{
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
              fontSize,
              lineHeight: 1.6,
              whiteSpace: 'pre',
              color: '#cccccc',
            }}>
              {hexLines.map((line, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: '#858585', userSelect: 'none' }}>{line.offset}:</span>
                  <span style={{ color: '#cccccc' }}>{line.hexBytes}</span>
                  <span style={{ color: '#4ec9b0' }}>{line.ascii}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info - 固定在容器底部 */}
        {!isHexEmpty && (
          <div style={{
            padding: '10px 8px',
            fontSize: fontSize - 3,
            color: '#858585',
            height: footerHeight,
            boxSizing: 'border-box',
			  background: '#1e1e1e',
		     paddingBottom: 20
          }}>
            Total: {(data.replace(/\s/g, '').length / 2).toFixed(0)} bytes
          </div>
        )}
      </div>
    </div>
  );
}
