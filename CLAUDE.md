# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TCP Sender is a cross-platform TCP message testing tool built with Tauri 2 + React 19 + TypeScript. It provides a Postman-like interface for sending and receiving TCP messages with support for Text, Hex, and Protocol modes.

**Tech Stack:**
- Frontend: React 19, TypeScript 5, Ant Design 6, Vite 7
- Backend: Tauri 2, Rust 1.92, Tokio (async runtime)
- Styling: VS Code Dark+ theme with JetBrains Mono font
- Build: GitHub Actions for cross-platform releases

## Development Commands

### Running the App
```bash
npm run tauri dev          # Start development server with hot reload
```

### Building
```bash
npm run tauri build        # Create production build for current platform
npm run build              # Build frontend only (TypeScript + Vite)
```

Build artifacts are generated in:
- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/` or `nsis/`
- Linux: `src-tauri/target/release/bundle/deb/` or `appimage/`

### Frontend Only
```bash
npm run dev                # Frontend dev server (without Tauri)
npm run preview            # Preview production build
```

### Releasing
Create a Git tag to trigger GitHub Actions build pipeline:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This automatically builds all platforms (macOS Intel/ARM, Windows x64, Linux x64) and creates a GitHub Release.

## Architecture

### Rust Backend (src-tauri/src/)

The backend uses a manager pattern for TCP connections:

**Core Modules:**
- `tcp/client.rs` - `TcpClient` struct handles individual TCP connections using Tokio
- `tcp/connection_manager.rs` - `ConnectionManager` maintains a `HashMap` of active connections, provides thread-safe access via `Arc<Mutex<>>`, and manages connection lifecycle
- `commands/connection.rs` - Tauri commands for connection management (create, connect, disconnect, etc.)
- `commands/message.rs` - Tauri commands for message operations (send, receive, send_and_receive)

**Key Patterns:**
- All TCP I/O is async using Tokio
- Connections are identified by string IDs (e.g., "conn_1")
- `ConnectionManager` is shared via Tauri's state management (`Arc<ConnectionManager>`)
- Commands return `Result<T, String>` for error handling across the FFI boundary

**Command Registration:**
All Tauri commands are registered in `src-tauri/src/lib.rs` via `invoke_handler!` macro.

### Frontend (src/)

**Layout Structure:**
- `components/Layout/MainLayout.tsx` - Postman-style split layout with icon sidebar + main content
- `components/Layout/Sidebar.tsx` - Icon-based navigation sidebar
- `pages/Messages.tsx` - Main TCP message sending interface (core functionality)

**Services:**
- `services/connectionService.ts` - TypeScript wrapper around Tauri connection commands
- `services/messageService.ts` - TypeScript wrapper around Tauri message commands

**State Management:**
- Uses React hooks (useState) for local component state
- Tab-based connection management (each tab = separate connection)
- Connection state tied to active tab via `connectionId` pattern

**Message Modes:**
1. **Text Mode** - Send plain text strings
2. **Hex Mode** - Send hexadecimal byte sequences (e.g., "48 65 6C 6C 6F")
3. **Protocol Mode** - Visual field editor for structured protocol messages (see `components/ProtocolFieldEditor.tsx`)

### Type Definitions

Types are defined in `src/types/`:
- `connection.ts` - Connection configuration and status types
- `message.ts` - Message request/response types
- `protocol.ts` / `protocol-simple.ts` - Protocol field definitions

## Important Constraints

### Tauri Commands
- All command parameters must be serializable (use `#[derive(Serialize, Deserialize)]`)
- Return types must be `Result<T, String>` where T is serializable
- Use `#[tauri::command]` attribute on all exported functions
- Register new commands in `lib.rs` invoke_handler!

### Frontend-Backend Communication
- Use `invoke()` from `@tauri-apps/api/core` to call Rust commands
- Command names use snake_case (e.g., `connect_to_server`)
- Parameters are passed as objects (e.g., `{ connectionId: "conn_1" }`)

### Async Patterns
- All TCP operations in Rust are async (use `.await`)
- ConnectionManager uses `Arc<Mutex<>>` for thread safety
- Frontend uses async/await with try/catch for error handling

### Styling
- Global theme configured in `App.tsx` using Ant Design's `ConfigProvider`
- Color scheme: #1e1e1e (main bg), #252526 (secondary bg), #ff6c37 (primary color)
- JetBrains Mono font loaded from `src/assets/fonts/`

## Project-Specific Notes

### Connection Lifecycle
1. Create connection config via `createConnection()` (stores in manager)
2. Call `connect()` to establish TCP connection
3. Use `send_and_receive()` or `send_only()`/`receive_only()` for I/O
4. Call `disconnect()` and `removeConnection()` when done

### Testing
Use the included test server:
```bash
node test-server.cjs       # Starts echo server on localhost:8080
```

The test server echoes received data with "Echo: " prefix for validation.

### GitHub Actions
- Build workflow: `.github/workflows/build.yml`
- Triggered on Git tags (`v*`) or manual dispatch
- Builds for macOS (x64 + ARM64), Windows (x64), Linux (x64)
- Automatically creates GitHub Release with artifacts when tag is pushed
