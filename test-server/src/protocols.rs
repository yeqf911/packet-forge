use std::collections::HashMap;

// 协议解析结果

pub struct ModbusResult {
    pub transaction_id: u16,
    pub protocol_id: u16,
    pub length: u16,
    pub unit_id: u8,
    pub function_code: u8,
    pub start_address: u16,
    pub register_count: u16,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct HttpResult {
    pub method: String,
    pub path: String,
    pub version: String,
    pub host: String,
    pub content_length: Option<usize>,
    pub body: Option<String>,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct RedisResult {
    pub command: String,
    pub key: String,
    pub value: String,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct FtpResult {
    pub command: String,
    pub username: String,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct SmtpResult {
    pub from: String,
    pub to: String,
    pub subject: String,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct WebSocketResult {
    pub method: String,
    pub path: String,
    pub host: String,
    pub key: String,
    pub version: String,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct TelnetResult {
    pub command: String,
    pub fields: HashMap<String, serde_json::Value>,
}

pub struct CustomHeaderResult {
    pub magic: String,
    pub version: u16,
    pub message_type: u8,
    pub sequence: u32,
    pub payload_length: u32,
    pub fields: HashMap<String, serde_json::Value>,
}

// Modbus TCP 解析器
// 格式: [Transaction ID(2)][Protocol ID(2)][Length(2)][Unit ID(1)][Function Code(1)][Start Address(2)][Register Count(2)]
pub fn parse_modbus_tcp(data: &[u8]) -> Option<ModbusResult> {
    if data.len() < 8 {
        return None;
    }

    // 检查协议ID (Modbus TCP应该是0)
    let protocol_id = u16::from_be_bytes([data[2], data[3]]);
    if protocol_id != 0 {
        return None;
    }

    let transaction_id = u16::from_be_bytes([data[0], data[1]]);
    let length = u16::from_be_bytes([data[4], data[5]]);
    let unit_id = data[6];
    let function_code = data[7];

    // 只处理读保持寄存器(03)和读输入寄存器(04)等标准请求
    let (start_address, register_count) = if data.len() >= 12 {
        let addr = u16::from_be_bytes([data[8], data[9]]);
        let count = u16::from_be_bytes([data[10], data[11]]);
        (addr, count)
    } else {
        (0, 0)
    };

    let mut fields = HashMap::new();
    fields.insert("transaction_id".to_string(), serde_json::json!(transaction_id));
    fields.insert("protocol_id".to_string(), serde_json::json!(protocol_id));
    fields.insert("length".to_string(), serde_json::json!(length));
    fields.insert("unit_id".to_string(), serde_json::json!(format!("0x{:02X}", unit_id)));
    fields.insert("function_code".to_string(), serde_json::json!(format!("0x{:02X}", function_code)));
    fields.insert("function_name".to_string(), serde_json::json!(get_modbus_fn_name(function_code)));
    fields.insert("start_address".to_string(), serde_json::json!(format!("0x{:04X}", start_address)));
    fields.insert("register_count".to_string(), serde_json::json!(register_count));

    Some(ModbusResult {
        transaction_id,
        protocol_id,
        length,
        unit_id,
        function_code,
        start_address,
        register_count,
        fields,
    })
}

fn get_modbus_fn_name(code: u8) -> &'static str {
    match code {
        0x01 => "Read Coils",
        0x02 => "Read Discrete Inputs",
        0x03 => "Read Holding Registers",
        0x04 => "Read Input Registers",
        0x05 => "Write Single Coil",
        0x06 => "Write Single Register",
        0x0F => "Write Multiple Coils",
        0x10 => "Write Multiple Registers",
        _ => "Unknown",
    }
}

// HTTP 解析器
pub fn parse_http(data: &[u8]) -> Option<HttpResult> {
    let text = String::from_utf8(data.to_vec()).ok()?;
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() {
        return None;
    }

    // 解析请求行: GET /path HTTP/1.1
    let request_line: Vec<&str> = lines[0].split_whitespace().collect();
    if request_line.len() < 2 {
        return None;
    }

    let method = request_line[0].to_string();
    let path = request_line[1].to_string();
    let version = if request_line.len() > 2 {
        request_line[2].to_string()
    } else {
        "HTTP/1.1".to_string()
    };

    // 检查是否是HTTP方法
    if !matches!(method.as_str(), "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH") {
        return None;
    }

    let mut host = "unknown".to_string();
    let mut content_length: Option<usize> = None;
    let mut body: Option<String> = None;
    let mut headers = HashMap::new();

    // 解析头部
    let mut _header_end = false;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if line.is_empty() {
            _header_end = true;
            // 获取body部分
            if i + 1 < lines.len() {
                body = Some(lines[i + 1..].join("\n"));
            }
            break;
        }
        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().to_string();
            headers.insert(key.clone(), value.clone());
            if key == "host" {
                host = value;
            } else if key == "content-length" {
                content_length = value.parse().ok();
            }
        }
    }

    let mut fields = HashMap::new();
    fields.insert("method".to_string(), serde_json::json!(method.clone()));
    fields.insert("path".to_string(), serde_json::json!(path.clone()));
    fields.insert("version".to_string(), serde_json::json!(version));
    fields.insert("host".to_string(), serde_json::json!(host.clone()));

    for (key, value) in headers {
        fields.insert(key, serde_json::json!(value));
    }

    if let Some(body) = &body {
        fields.insert("body".to_string(), serde_json::json!(body));
    }

    Some(HttpResult {
        method,
        path,
        version,
        host,
        content_length,
        body,
        fields,
    })
}

// Redis RESP 解析器
// 格式: *3\r\n$3\r\nSET\r\n$4\r\nkey\r\n$5\r\nvalue\r\n
pub fn parse_redis_resp(data: &[u8]) -> Option<RedisResult> {
    let text = String::from_utf8(data.to_vec()).ok()?;

    // 检查RESP数组标记
    if !text.starts_with('*') {
        return None;
    }

    let parts: Vec<&str> = text.split("\r\n").collect();

    if parts.len() < 7 {
        return None;
    }

    // *3\r\n$3\r\nSET\r\n$4\r\nkey\r\n$5\r\nvalue\r\n
    //  0    1    2     3    4    5     6

    let array_count = parts[0].strip_prefix('*')?.parse::<usize>().ok()?;
    if array_count < 1 {
        return None;
    }

    let mut idx = 1;
    let mut command = String::new();
    let mut key = String::new();
    let mut value = String::new();

    // 解析命令
    if idx < parts.len() && parts[idx].starts_with('$') {
        let _len = parts[idx].strip_prefix('$')?.parse::<usize>().ok()?;
        idx += 1;
        if idx < parts.len() {
            command = parts[idx].to_string();
            idx += 1;
        }
    }

    // 解析key
    if idx < parts.len() && parts[idx].starts_with('$') {
        let _len = parts[idx].strip_prefix('$')?;
        idx += 1;
        if idx < parts.len() {
            key = parts[idx].to_string();
            idx += 1;
        }
    }

    // 解析value
    if idx < parts.len() && parts[idx].starts_with('$') {
        let _len = parts[idx].strip_prefix('$')?;
        idx += 1;
        if idx < parts.len() {
            value = parts[idx].to_string();
        }
    }

    let mut fields = HashMap::new();
    fields.insert("command".to_string(), serde_json::json!(command.clone()));
    fields.insert("key".to_string(), serde_json::json!(key.clone()));
    fields.insert("value".to_string(), serde_json::json!(value.clone()));
    fields.insert("array_count".to_string(), serde_json::json!(array_count));

    Some(RedisResult {
        command,
        key,
        value,
        fields,
    })
}

// FTP 解析器
pub fn parse_ftp(data: &[u8]) -> Option<FtpResult> {
    let text = String::from_utf8(data.to_vec()).ok()?;
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() {
        return None;
    }

    let first_line = lines[0].trim().to_uppercase();
    let mut command = "UNKNOWN".to_string();
    let mut username = "anonymous".to_string();

    if first_line.starts_with("USER") {
        command = "USER".to_string();
        let parts: Vec<&str> = first_line.split_whitespace().collect();
        if parts.len() > 1 {
            username = parts[1].to_string();
        }
    } else if first_line.starts_with("PASS") {
        command = "PASS".to_string();
    } else if first_line.starts_with("LIST") {
        command = "LIST".to_string();
    } else if first_line.starts_with("RETR") {
        command = "RETR".to_string();
    } else if first_line.starts_with("STOR") {
        command = "STOR".to_string();
    } else if first_line.starts_with("QUIT") {
        command = "QUIT".to_string();
    } else {
        // 检查是否是FTP相关命令
        for line in &lines {
            let upper = line.trim().to_uppercase();
            if upper.starts_with("USER") || upper.starts_with("PASS") || upper.starts_with("LIST") {
                return parse_ftp(data); // 递归调用处理
            }
        }
    }

    let mut fields = HashMap::new();
    fields.insert("command".to_string(), serde_json::json!(command.clone()));
    fields.insert("username".to_string(), serde_json::json!(username.clone()));
    fields.insert("raw_command".to_string(), serde_json::json!(lines[0]));

    Some(FtpResult {
        command,
        username,
        fields,
    })
}

// SMTP 解析器
pub fn parse_smtp(data: &[u8]) -> Option<SmtpResult> {
    let text = String::from_utf8(data.to_vec()).ok()?;
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() {
        return None;
    }

    let mut from = "unknown".to_string();
    let mut to = "unknown".to_string();
    let mut subject = "".to_string();

    // 检查是否是SMTP命令
    let is_smtp = lines.iter().any(|line| {
        let upper = line.trim().to_uppercase();
        upper.starts_with("EHLO") || upper.starts_with("MAIL FROM:") ||
        upper.starts_with("RCPT TO:") || upper.starts_with("DATA") ||
        upper.starts_with("HELO") || upper.starts_with("SUBJECT:")
    });

    if !is_smtp {
        return None;
    }

    for line in &lines {
        let upper = line.trim().to_uppercase();
        if upper.starts_with("MAIL FROM:") {
            from = line[9..].trim().to_string();
        } else if upper.starts_with("RCPT TO:") {
            to = line[8..].trim().to_string();
        } else if upper.starts_with("SUBJECT:") {
            subject = line[8..].trim().to_string();
        }
    }

    let mut fields = HashMap::new();
    fields.insert("mail_from".to_string(), serde_json::json!(from.clone()));
    fields.insert("rcpt_to".to_string(), serde_json::json!(to.clone()));
    fields.insert("subject".to_string(), serde_json::json!(subject.clone()));

    Some(SmtpResult {
        from,
        to,
        subject,
        fields,
    })
}

// WebSocket 握手解析器
pub fn parse_websocket(data: &[u8]) -> Option<WebSocketResult> {
    let text = String::from_utf8(data.to_vec()).ok()?;
    let lines: Vec<&str> = text.lines().collect();

    if lines.is_empty() {
        return None;
    }

    // 检查WebSocket升级请求
    let request_line: Vec<&str> = lines[0].split_whitespace().collect();
    if request_line.len() < 2 {
        return None;
    }

    if request_line[0] != "GET" {
        return None;
    }

    let mut host = "unknown".to_string();
    let mut key = "".to_string();
    let mut version = "13".to_string();

    for line in &lines[1..] {
        let lower = line.to_lowercase();
        if lower.starts_with("host:") {
            host = line[5..].trim().to_string();
        } else if lower.starts_with("sec-websocket-key:") {
            key = line[17..].trim().to_string();
        } else if lower.starts_with("sec-websocket-version:") {
            version = line[23..].trim().to_string();
        }
    }

    // 必须有Upgrade和Connection头
    let has_upgrade = lines.iter().any(|l| l.to_lowercase().contains("upgrade"));
    let has_connection = lines.iter().any(|l| l.to_lowercase().contains("connection"));

    if !has_upgrade || !has_connection {
        return None;
    }

    let mut fields = HashMap::new();
    fields.insert("method".to_string(), serde_json::json!("GET"));
    fields.insert("path".to_string(), serde_json::json!(request_line[1]));
    fields.insert("http_version".to_string(), serde_json::json!(request_line.get(2).unwrap_or(&"HTTP/1.1")));
    fields.insert("host".to_string(), serde_json::json!(host.clone()));
    fields.insert("sec_websocket_key".to_string(), serde_json::json!(key.clone()));
    fields.insert("sec_websocket_version".to_string(), serde_json::json!(version));

    Some(WebSocketResult {
        method: "GET".to_string(),
        path: request_line[1].to_string(),
        host,
        key,
        version,
        fields,
    })
}

// Telnet 解析器
// IAC (0xFF) + 命令字节 + 选项字节
pub fn parse_telnet(data: &[u8]) -> Option<TelnetResult> {
    if data.len() < 3 {
        return None;
    }

    // 检查是否有IAC字符 (0xFF)
    let has_iac = data.iter().any(|&b| b == 0xFF);
    if !has_iac {
        return None;
    }

    let mut commands = Vec::new();
    let mut i = 0;

    while i < data.len().saturating_sub(2) {
        if data[i] == 0xFF {
            let cmd = data[i + 1];
            let opt = data[i + 2];
            let cmd_name = get_telnet_command_name(cmd);
            let opt_name = get_telnet_option_name(opt);
            commands.push(format!("IAC {} {}", cmd_name, opt_name));
            i += 3;
        } else {
            i += 1;
        }
    }

    let mut fields = HashMap::new();
    fields.insert("iac_detected".to_string(), serde_json::json!(true));
    fields.insert("commands".to_string(), serde_json::json!(commands));
    fields.insert("data_length".to_string(), serde_json::json!(data.len()));

    Some(TelnetResult {
        command: commands.join("; "),
        fields,
    })
}

fn get_telnet_command_name(cmd: u8) -> &'static str {
    match cmd {
        0xFB => "WILL",
        0xFC => "WONT",
        0xFD => "DO",
        0xFE => "DONT",
        0xFA => "SB",
        0xF0 => "SE",
        _ => "UNKNOWN",
    }
}

fn get_telnet_option_name(opt: u8) -> &'static str {
    match opt {
        0x01 => "Echo",
        0x03 => "Suppress-Go-Ahead",
        0x18 => "Terminal-Type",
        0x1F => "Negotiate-About-Window-Size",
        _ => &"Unknown",
    }
}

// 自定义协议头解析器
// [Magic(4)][Version(2)][MessageType(1)][Sequence(4)][PayloadLength(4)]
pub fn parse_custom_header(data: &[u8]) -> Option<CustomHeaderResult> {
    if data.len() < 15 {
        return None;
    }

    // 检查魔术字 (默认: AA BB CC DD 或类似)
    let magic = format!("{:02X} {:02X} {:02X} {:02X}", data[0], data[1], data[2], data[3]);
    let version = u16::from_le_bytes([data[4], data[5]]);
    let message_type = data[6];
    let sequence = u32::from_le_bytes([data[7], data[8], data[9], data[10]]);
    let payload_length = u32::from_le_bytes([data[11], data[12], data[13], data[14]]);

    // 检查是否是合理的魔术字区域
    let is_valid_magic = data[0] == 0xAA || data[0] == 0xAB || data[0] == 0x7E;

    if !is_valid_magic {
        return None;
    }

    let mut fields = HashMap::new();
    fields.insert("magic_number".to_string(), serde_json::json!(magic.clone()));
    fields.insert("version".to_string(), serde_json::json!(version));
    fields.insert("message_type".to_string(), serde_json::json!(format!("0x{:02X}", message_type)));
    fields.insert("message_type_name".to_string(), serde_json::json!(get_message_type_name(message_type)));
    fields.insert("sequence".to_string(), serde_json::json!(sequence));
    fields.insert("payload_length".to_string(), serde_json::json!(payload_length));

    Some(CustomHeaderResult {
        magic,
        version,
        message_type,
        sequence,
        payload_length,
        fields,
    })
}

fn get_message_type_name(ty: u8) -> &'static str {
    match ty {
        0x01 => "Request",
        0x02 => "Response",
        0x03 => "Notify",
        0x04 => "Error",
        _ => "Unknown",
    }
}
