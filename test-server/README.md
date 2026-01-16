# TCP Test Server

测试用的TCP服务器，用于测试TCP Sender工具。

## 功能特性

- 支持解析所有预置协议类型
- 返回友好的JSON格式响应
- 显示协议详情、字段明细和操作类型

## 支持的协议

| 协议 | 描述 |
|------|------|
| Modbus TCP | MBAP头 + PDU解析 |
| HTTP GET/POST | 请求行、头部、Body解析 |
| FTP | USER/PASS/LIST命令解析 |
| SMTP | EHLO/MAIL FROM/RCPT TO/DATA解析 |
| WebSocket | 握手请求解析 |
| Redis RESP | SET/GET等命令解析 |
| Telnet | IAC命令协商解析 |
| Custom Header | 自定义协议头解析 |

## 运行

```bash
cd test-server
cargo run
```

服务器将在 `127.0.0.1:18080` 启动。

## 响应格式

```json
{
  "protocol": "Modbus TCP",
  "protocol_display": "Modbus TCP (MBAP Header + PDU)",
  "operation": "Function Code 0x03 - 读保持寄存器",
  "fields": {
    "transaction_id": 1,
    "protocol_id": 0,
    "length": 6,
    "unit_id": "0x01",
    "function_code": "0x03",
    "function_name": "Read Holding Registers",
    "start_address": "0x0000",
    "register_count": 1
  },
  "raw_hex": "00 01 00 00 00 06 01 03 00 00 00 01",
  "raw_ascii": "................",
  "message": "Modbus请求: 功能码=3, 起始地址=0, 寄存器数量=1"
}
```

## 控制台输出示例

```
🚀 TCP Test Server listening on 127.0.0.1:18080
📋 Supported protocols: Modbus TCP, HTTP GET/POST, FTP, SMTP, WebSocket, Redis RESP, Telnet
📨 Waiting for connections...

📥 New connection from: 127.0.0.1:52341
   📨 [1] Modbus TCP - Function Code 0x03 - 读保持寄存器
      transaction_id = 1
      function_code = "0x03"
      start_address = "0x0000"
      register_count = 1
   ✅ Connection closed (total messages: 1)
```
