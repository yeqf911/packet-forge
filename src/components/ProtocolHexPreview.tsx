import { Button, Empty } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { useFontSize } from '../contexts/FontSizeContext';

interface ProtocolHexPreviewProps {
  hexData: string;
}

interface HexLine {
  offset: string;
  hexBytes: string;
  ascii: string;
}

export default function ProtocolHexPreview({ hexData }: ProtocolHexPreviewProps) {
  const { fontSize } = useFontSize();

  // 计算容器宽度：75字符 × 字体宽度(约0.6) + gap(16px) + 内边距(8px)
  const contentWidth = 75 * fontSize * 0.6;
  const containerWidth = Math.ceil(contentWidth + 24); // 24px = gaps + padding + buffer

  // 将纯 hex 字符串格式化为多行显示
  const formatHexData = (data: string): HexLine[] => {
    const cleanHex = data.replace(/\s/g, '');
    const lines: HexLine[] = [];

    for (let i = 0; i < cleanHex.length; i += 32) {
      const offset = (i / 2).toString(16).padStart(8, '0').toUpperCase();
      const lineHex = cleanHex.substring(i, i + 32);
      const bytes: string[] = [];

      // 每两个字符为一个字节
      for (let j = 0; j < lineHex.length; j += 2) {
        bytes.push(lineHex.substring(j, j + 2));
      }

      // 格式化 hex 显示，前 8 字节和后 8 字节之间多一个空格
      const firstHalf = bytes.slice(0, 8).map(padByte).join(' ');
      const secondHalf = bytes.slice(8, 16).map(padByte).join(' ');

      // 保持 hex 区域固定长度：前8字节(23字符) + 2空格 + 后8字节(23字符) + 1空格 = 49字符
      // 前8字节完整格式: "01 02 03 04 05 06 07 08" = 23 字符
      // 后8字节完整格式: "09 0A 0B 0C 0D 0E 0F 10" = 23 字符
      // 中间分隔: "  " = 2 字符
      // 总长度应为 48 字符（不含额外空格）
      const firstHalfPadded = firstHalf.padEnd(23, ' ');
      const secondHalfPadded = secondHalf.padEnd(23, ' ');
      const hexBytes = `${firstHalfPadded}  ${secondHalfPadded}`; // 总共 48 字符

      // 转换为 ASCII
      let ascii = '';
      for (let j = 0; j < bytes.length; j++) {
        const byteVal = parseInt(bytes[j], 16);
        // 可打印字符：32-126
        ascii += (byteVal >= 32 && byteVal <= 126) ? String.fromCharCode(byteVal) : '.';
      }

      lines.push({
        offset,
        hexBytes,
        ascii: ascii.padEnd(16, ' '),
      });
    }

    return lines;
  };

  const padByte = (byte: string): string => {
    return byte.padStart(2, '0').toUpperCase();
  };

  const handleCopy = () => {
    const cleanHex = hexData.replace(/\s/g, '');
    if (!cleanHex) {
      message.warning('Nothing to copy');
      return;
    }

    // 添加空格格式，每字节一个空格
    const formattedHex = cleanHex.match(/.{1,2}/g)?.join(' ') || '';
    navigator.clipboard.writeText(formattedHex)
      .then(() => message.success('Copied to clipboard'))
      .catch(() => message.error('Failed to copy'));
  };

  const lines = formatHexData(hexData);
  const isEmpty = !hexData || lines.length === 0;

  return (
    <div style={{
      width: containerWidth,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#252526',
      //borderRadius: '40px'
    }}>
    	<div style={{
      	  //padding: '0px 8px',
      	  borderBottom: '0px solid #2d2d30',
      	  display: 'flex',
      	  justifyContent: 'space-between',
      	  alignItems: 'center',
      	  flexShrink: 0,
		  //paddingTop: 2,
	   	  //background: '#ff00ff',
    	}}>
         <Button
          type="text"
          size="small"
          style={{
              color: isEmpty ? '#555555' : '#cccccc',
              fontSize: fontSize - 2
          }}></Button></div>
    
      {/* Header */}
      <div style={{
        borderBottom: '0px solid #2d2d30',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
		 //background: '#ff00ff',
		 padding: '12px 0px 6px 0px'
      }}>
        <span style={{ color: '#cccccc', fontSize, fontWeight: 500 }}>Hex Preview</span>
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleCopy}
          disabled={isEmpty}
          style={{ color: isEmpty ? '#555555' : '#cccccc', fontSize: fontSize - 2 }}
        >
          Copy
        </Button>
      </div>

      {/* Content - 与左侧 Table 内容对齐 */}
      <div style={{
        height: '100%',
        overflow: 'auto',
        paddingLeft: '8px',
        paddingTop: '4px',
        paddingBottom: '4px',
        paddingRight: '8px',
		 background: '#1e1e1e',
		 borderRadius: '4px 4px 0px 0px'
      }}>
        {isEmpty ? (
          <Empty
            description="No data"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ color: '#858585', marginTop: 40, borderRadius: '4px'}}
          />
        ) : (
          <div style={{
            fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            fontSize,
            lineHeight: 1.6,
            whiteSpace: 'pre',
            color: '#cccccc',
          }}>
            {lines.map((line, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#858585', userSelect: 'none' }}>{line.offset}:</span>
                <span style={{ color: '#cccccc' }}>{line.hexBytes}</span>
                <span style={{ color: '#4ec9b0' }}>{line.ascii}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      { (
        <div style={{
          padding: '4px 8px',
          fontSize: fontSize - 3,
          color: '#858585',
		   background: '#1e1e1e',
		   borderRadius: '0 0 4px 4px'
        }}>
			{isEmpty ? ('') : (<span>Total: {(hexData.replace(/\s/g, '').length / 2).toFixed(0)} bytes</span>)}
        </div>
      )}
    </div>
  );
}