use rusqlite::{Connection, Result};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use std::fs;

pub struct Database {
    conn: Connection,
}

impl Database {
    /// Open database at the app's data directory
    pub fn open(app_handle: &AppHandle) -> Result<Self> {
        let app_data_dir = app_handle.path().app_data_dir().unwrap();

        // Create directory if it doesn't exist
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir).unwrap();
        }

        let mut db_path: PathBuf = app_data_dir;
        db_path.push("packet_forge.db");

        let conn = Connection::open(db_path)?;

        let db = Database { conn };
        db.init_tables()?;

        Ok(db)
    }

    /// Initialize database tables
    fn init_tables(&self) -> Result<()> {
        // Create protocols table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS protocols (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create protocol_fields table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS protocol_fields (
                id TEXT PRIMARY KEY,
                protocol_id TEXT NOT NULL,
                name TEXT NOT NULL,
                length INTEGER,
                is_variable INTEGER NOT NULL DEFAULT 0,
                value_type TEXT NOT NULL DEFAULT 'hex',
                value TEXT NOT NULL DEFAULT '',
                field_order INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Migrate: add value_type column if it doesn't exist
        self.migrate_value_type_column()?;

        // Insert preset protocols if none exist
        self.insert_preset_protocols()?;

        Ok(())
    }

    /// Migrate existing databases to add value_type column
    fn migrate_value_type_column(&self) -> Result<()> {
        // Check if value_type column exists
        let has_value_type: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM pragma_table_info('protocol_fields') WHERE name = 'value_type'",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        if has_value_type == 0 {
            // Old schema detected - add the column
            self.conn.execute(
                "ALTER TABLE protocol_fields ADD COLUMN value_type TEXT NOT NULL DEFAULT 'hex'",
                [],
            )?;
        }

        Ok(())
    }

    /// Insert preset protocols
    fn insert_preset_protocols(&self) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();

        // Helper function to insert a protocol with fields
        let insert_protocol = |id: &str, name: &str, desc: &str, fields: Vec<(&str, &str, Option<i32>, bool, &str, &str)>| -> Result<()> {
            // Check if already exists
            let exists: i64 = self.conn.query_row(
                "SELECT COUNT(*) FROM protocols WHERE id = ?1",
                &[id],
                |row| row.get(0),
            )?;
            if exists > 0 {
                return Ok(()); // Already exists
            }

            self.conn.execute(
                "INSERT INTO protocols (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
                &[id, name, desc, &now, &now],
            )?;

            for (i, (fid, fname, flen, fvar, fvtype, fval)) in fields.iter().enumerate() {
                self.conn.execute(
                    "INSERT INTO protocol_fields (id, protocol_id, name, length, is_variable, value_type, value, field_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    &[
                        &format!("{}_{}", id, fid),
                        id,
                        *fname,
                        &flen.map(|l| l.to_string()).unwrap_or("0".to_string()),
                        &(if *fvar { 1 } else { 0 }).to_string(),
                        *fvtype,
                        *fval,
                        &(i as i32).to_string(),
                    ],
                )?;
            }
            Ok(())
        };

        // HTTP GET
        insert_protocol(
            "preset_http_get",
            "HTTP GET",
            "HTTP GET request format",
            vec![
                ("method", "Method", Some(4), false, "hex", "4745 54"), // "GET"
                ("space1", "Space", Some(1), false, "hex", "20"),
                ("path", "Path", Some(20), true, "text", "/index.html"),
                ("space2", "Space", Some(1), false, "hex", "20"),
                ("version", "Version", Some(8), false, "hex", "48 54 54 50 2F 31 2E 31"), // "HTTP/1.1"
                ("crlf", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("host", "Host Header", Some(25), true, "text", "Host: localhost"),
                ("crlf2", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("crlf3", "CRLF", Some(2), false, "hex", "0D 0A"),
            ],
        )?;

        // HTTP POST
        insert_protocol(
            "preset_http_post",
            "HTTP POST",
            "HTTP POST request format with Content-Length",
            vec![
                ("method", "Method", Some(4), false, "hex", "50 4F 53 54"), // "POST"
                ("space1", "Space", Some(1), false, "hex", "20"),
                ("path", "Path", Some(20), true, "text", "/api/data"),
                ("space2", "Space", Some(1), false, "hex", "20"),
                ("version", "Version", Some(8), false, "hex", "48 54 54 50 2F 31 2E 31"), // "HTTP/1.1"
                ("crlf", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("host", "Host Header", Some(25), true, "text", "Host: localhost"),
                ("crlf2", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("content_type", "Content-Type", Some(30), true, "text", "Content-Type: application/json"),
                ("crlf3", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("content_len", "Content-Length", Some(20), true, "text", "Content-Length: 13"),
                ("crlf4", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("crlf5", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("body", "Body", Some(20), true, "text", "{\"key\": \"value\"}"),
            ],
        )?;

        // Modbus TCP
        insert_protocol(
            "preset_modbus_tcp",
            "Modbus TCP",
            "Modbus TCP Read Holding Registers (Function 03)",
            vec![
                ("trans_id", "Transaction ID", Some(2), false, "hex", "00 01"),
                ("proto_id", "Protocol ID", Some(2), false, "hex", "00 00"),
                ("length", "Length", Some(2), false, "hex", "00 06"),
                ("unit_id", "Unit ID", Some(1), false, "hex", "01"),
                ("func_code", "Function Code", Some(1), false, "hex", "03"), // Read Holding Registers
                ("start_addr", "Start Address", Some(2), false, "hex", "00 00"),
                ("reg_count", "Register Count", Some(2), false, "hex", "00 01"),
            ],
        )?;

        // FTP (File Transfer Protocol) - Simple List Command
        insert_protocol(
            "preset_ftp",
            "FTP LIST",
            "FTP LIST command format",
            vec![
                ("user", "USER", Some(20), true, "text", "USER anonymous\r\n"),
                ("pass", "PASS", Some(20), true, "text", "PASS password\r\n"),
                ("list", "LIST", Some(10), true, "text", "LIST\r\n"),
            ],
        )?;

        // SMTP (Simple Mail Transfer Protocol) - EHLO & MAIL FROM
        insert_protocol(
            "preset_smtp",
            "SMTP Send",
            "SMTP mail sending format",
            vec![
                ("ehlo", "EHLO", Some(30), true, "text", "EHLO localhost\r\n"),
                ("mail_from", "MAIL FROM", Some(40), true, "text", "MAIL FROM:<sender@example.com>\r\n"),
                ("rcpt_to", "RCPT TO", Some(40), true, "text", "RCPT TO:<receiver@example.com>\r\n"),
                ("data", "DATA", Some(10), false, "hex", "44 41 54 41 0D 0A"), // DATA\r\n
                ("subject", "Subject", Some(40), true, "text", "Subject: Test\r\n"),
                ("crlf", "CRLF", Some(2), false, "hex", "0D 0A"),
                ("body", "Body", Some(50), true, "text", "This is a test\r\n"),
                ("end", "End", Some(5), false, "hex", "0D 0A 2E 0D 0A"), // \r\n.\r\n
            ],
        )?;

        // WebSocket Handshake
        insert_protocol(
            "preset_websocket",
            "WebSocket Handshake",
            "WebSocket client handshake",
            vec![
                ("get_line", "GET Line", Some(50), true, "text", "GET /chat HTTP/1.1\r\n"),
                ("host", "Host", Some(30), true, "text", "Host: localhost:8000\r\n"),
                ("upgrade", "Upgrade", Some(40), true, "text", "Upgrade: websocket\r\n"),
                ("connection", "Connection", Some(40), true, "text", "Connection: Upgrade\r\n"),
                ("sec_key", "Sec-WebSocket-Key", Some(50), true, "text", "Sec-WebSocket-Key: dGWydGWydGWydGWydGWydG==\r\n"),
                ("sec_version", "Sec-WebSocket-Version", Some(40), true, "text", "Sec-WebSocket-Version: 13\r\n"),
                ("crlf", "CRLF", Some(2), false, "hex", "0D 0A"),
            ],
        )?;

        // Redis RESP (REdis Serialization Protocol)
        insert_protocol(
            "preset_redis",
            "Redis SET",
            "Redis SET command (RESP protocol)",
            vec![
                ("asterisk1", "* Array Marker", Some(3), false, "hex", "2A 33 0D 0A"), // *3\r\n (3 elements)
                ("dollar1", "$ Length for SET", Some(3), false, "hex", "24 33 0D 0A"), // $3\r\n
                ("set", "SET", Some(3), false, "hex", "53 45 54 0D 0A"), // SET\r\n
                ("dollar2", "$ Length for key", Some(3), false, "hex", "24 34 0D 0A"), // $4\r\n
                ("key", "Key", Some(4), false, "hex", "6B 65 79 0D 0A"), // key\r\n
                ("dollar3", "$ Length for value", Some(3), false, "hex", "24 35 0D 0A"), // $5\r\n
                ("value", "Value", Some(5), false, "hex", "76 61 6C 75 65 0D 0A"), // value\r\n
            ],
        )?;

        // Telnet (IAC commands)
        insert_protocol(
            "preset_telnet",
            "Telnet Options",
            "Telnet negotiation (IAC DO/DONT/WONT/WILL)",
            vec![
                ("iac_will", "IAC WILL", Some(3), false, "hex", "FF FB 18"), // IAC WILL TERMINAL-TYPE
                ("iac_sb", "IAC SB", Some(10), true, "text", "\u{FF}\u{FA}\u{18}\u{01}\u{FF}\u{F0}\r\n"), // IAC SB TERMINAL-TYPE SEND IAC SE
                ("iac_do", "IAC DO", Some(3), false, "hex", "FF FD 03"), // IAC DO SUPPRESS-GO-AHEAD
            ],
        )?;

        Ok(())
    }

    /// Get a reference to the underlying connection
    pub fn conn(&self) -> &Connection {
        &self.conn
    }
}

// Thread-safe wrapper for database access
use std::sync::Mutex;

pub struct DbPool(Mutex<Option<Database>>);

unsafe impl Send for DbPool {}
unsafe impl Sync for DbPool {}

impl DbPool {
    pub fn new() -> Self {
        DbPool(Mutex::new(None))
    }

    pub fn init(&self, db: Database) {
        *self.0.lock().unwrap() = Some(db);
    }

    pub fn with<F, R>(&self, f: F) -> Result<R>
    where
        F: FnOnce(&Database) -> Result<R>,
    {
        let guard = self.0.lock().unwrap();
        match guard.as_ref() {
            Some(db) => f(db),
            None => Err(rusqlite::Error::InvalidQuery),
        }
    }
}

impl Default for DbPool {
    fn default() -> Self {
        Self::new()
    }
}
