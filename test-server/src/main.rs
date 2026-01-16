mod protocols;

use protocols::*;
use std::collections::HashMap;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

#[derive(Debug, serde::Serialize)]
struct ServerResponse {
    protocol: String,
    protocol_display: String,
    operation: String,
    fields: HashMap<String, serde_json::Value>,
    raw_hex: String,
    raw_ascii: String,
    message: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:18080").await?;
    println!("🚀 TCP Test Server listening on 127.0.0.1:18080");
    println!("📋 Supported protocols: Modbus TCP, HTTP GET/POST, FTP, SMTP, WebSocket, Redis RESP, Telnet");
    println!("📨 Waiting for connections...\n");

    loop {
        match listener.accept().await {
            Ok((mut socket, addr)) => {
                println!("📥 New connection from: {}", addr);

                tokio::spawn(async move {
                    let mut buf = vec![0u8; 4096];
                    let mut response_count = 0;

                    loop {
                        match socket.read(&mut buf).await {
                            Ok(0) => {
                                println!("   Connection closed by client");
                                break;
                            }
                            Ok(n) => {
                                response_count += 1;
                                let data = &buf[..n];

                                // 检测协议类型并解析
                                let response = parse_and_respond(data, response_count);

                                // 打印到控制台
                                println!("   📨 [{}] {} - {}", response_count, response.protocol, response.operation);

                                // 发送JSON响应回客户端
                                let json_response = serde_json::to_string_pretty(&response)
                                    .unwrap_or_else(|_| "Error formatting response".to_string());

                                if let Err(e) = socket.write_all(json_response.as_bytes()).await {
                                    eprintln!("   ❌ Send error: {}", e);
                                    break;
                                }
                                if let Err(e) = socket.write_all(b"\n\n").await {
                                    eprintln!("   ❌ Send error: {}", e);
                                    break;
                                }

                                // 打印详细字段信息
                                for (key, value) in &response.fields {
                                    println!("      {} = {}", key, value);
                                }
                            }
                            Err(e) => {
                                eprintln!("   ❌ Read error: {}", e);
                                break;
                            }
                        }
                    }

                    println!("   ✅ Connection closed (total messages: {})\n", response_count);
                });
            }
            Err(e) => {
                eprintln!("❌ Accept error: {}", e);
            }
        }
    }
}

fn parse_and_respond(data: &[u8], msg_id: usize) -> ServerResponse {
    let hex_string: String = data.iter().map(|b| format!("{:02X}", b)).collect::<Vec<_>>().join(" ");
    let ascii_string = bytes_to_ascii(data);

    // 尝试按协议优先级解析
    if let Some(result) = protocols::parse_modbus_tcp(data) {
        return ServerResponse {
            protocol: "Modbus TCP".to_string(),
            protocol_display: "Modbus TCP (MBAP Header + PDU)".to_string(),
            operation: format!("Function Code 0x{:02X} - {}", result.function_code, get_modbus_function_name(result.function_code)),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("Modbus请求: 功能码={}, 起始地址={}, 寄存器数量={}",
                result.function_code, result.start_address, result.register_count),
        };
    }

    if let Some(result) = protocols::parse_http(data) {
        return ServerResponse {
            protocol: result.method.clone(),
            protocol_display: format!("HTTP/1.1 {}", result.method),
            operation: format!("{} {}", result.method, result.path),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("HTTP请求: {} {}, Host: {}", result.method, result.path, result.host),
        };
    }

    if let Some(result) = protocols::parse_redis_resp(data) {
        return ServerResponse {
            protocol: "Redis RESP".to_string(),
            protocol_display: "Redis Serialization Protocol (RESP)".to_string(),
            operation: format!("Redis Command: {}", result.command),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("Redis命令: {} {} {}", result.command, result.key, result.value),
        };
    }

    if let Some(result) = protocols::parse_ftp(data) {
        return ServerResponse {
            protocol: "FTP".to_string(),
            protocol_display: "File Transfer Protocol".to_string(),
            operation: format!("FTP Command: {}", result.command),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("FTP命令: {}, 用户: {}", result.command, result.username),
        };
    }

    if let Some(result) = protocols::parse_smtp(data) {
        return ServerResponse {
            protocol: "SMTP".to_string(),
            protocol_display: "Simple Mail Transfer Protocol".to_string(),
            operation: format!("Mail from: {}", result.from),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("SMTP邮件: 发件人={}, 收件人={}", result.from, result.to),
        };
    }

    if let Some(result) = protocols::parse_websocket(data) {
        return ServerResponse {
            protocol: "WebSocket".to_string(),
            protocol_display: "WebSocket Handshake (RFC 6455)".to_string(),
            operation: "WebSocket握手升级".to_string(),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("WebSocket握手: Host={}, Key={}", result.host, result.key),
        };
    }

    if let Some(result) = protocols::parse_telnet(data) {
        return ServerResponse {
            protocol: "Telnet".to_string(),
            protocol_display: "Telnet Protocol (RFC 854)".to_string(),
            operation: "Telnet选项协商".to_string(),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("Telnet命令: {}", result.command),
        };
    }

    if let Some(result) = protocols::parse_custom_header(data) {
        return ServerResponse {
            protocol: "Custom Header".to_string(),
            protocol_display: "自定义协议头".to_string(),
            operation: format!("消息类型: 0x{:02X}", result.message_type),
            fields: result.fields,
            raw_hex: hex_string,
            raw_ascii: ascii_string,
            message: format!("自定义协议: 魔术字={}, 版本={}, 类型={}, 序列号={}",
                result.magic, result.version, result.message_type, result.sequence),
        };
    }

    // 无法识别的协议
    ServerResponse {
        protocol: "Unknown".to_string(),
        protocol_display: "未知协议".to_string(),
        operation: "原始数据".to_string(),
        fields: {
            let mut f = HashMap::new();
            f.insert("data_length".to_string(), serde_json::json!(data.len()));
            f.insert("preview".to_string(), serde_json::json!(ascii_string));
            f
        },
        raw_hex: hex_string,
        raw_ascii: ascii_string,
        message: format!("收到未知数据，长度: {} 字节", data.len()),
    }
}

fn bytes_to_ascii(data: &[u8]) -> String {
    data.iter()
        .map(|&b| if b.is_ascii_graphic() || b == b' ' { b as char } else { '.' })
        .collect()
}

fn get_modbus_function_name(code: u8) -> &'static str {
    match code {
        0x01 => "读线圈状态",
        0x02 => "读离散输入",
        0x03 => "读保持寄存器",
        0x04 => "读输入寄存器",
        0x05 => "写单个线圈",
        0x06 => "写单个寄存器",
        0x0F => "写多个线圈",
        0x10 => "写多个寄存器",
        _ => "未知功能",
    }
}
