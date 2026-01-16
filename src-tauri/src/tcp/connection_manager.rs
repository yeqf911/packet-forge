use super::client::{TcpClient, TcpClientConfig};
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type ConnectionId = String;

pub struct ConnectionManager {
    connections: Arc<Mutex<HashMap<ConnectionId, TcpClient>>>,
}

impl ConnectionManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_connection(
        &self,
        id: ConnectionId,
        config: TcpClientConfig,
    ) -> Result<()> {
        let mut connections = self.connections.lock().await;

        if connections.contains_key(&id) {
            anyhow::bail!("Connection with id '{}' already exists", id);
        }

        let client = TcpClient::new(config);
        connections.insert(id, client);

        Ok(())
    }

    pub async fn connect(&self, id: &ConnectionId) -> Result<()> {
        let mut connections = self.connections.lock().await;

        let client = connections
            .get_mut(id)
            .context(format!("Connection '{}' not found", id))?;

        client.connect().await
    }

    pub async fn disconnect(&self, id: &ConnectionId) -> Result<()> {
        let mut connections = self.connections.lock().await;

        let client = connections
            .get_mut(id)
            .context(format!("Connection '{}' not found", id))?;

        client.disconnect().await
    }

    pub async fn send(&self, id: &ConnectionId, data: &[u8]) -> Result<()> {
        let mut connections = self.connections.lock().await;

        let client = connections
            .get_mut(id)
            .context(format!("Connection '{}' not found", id))?;

        client.send(data).await
    }

    pub async fn receive(&self, id: &ConnectionId, buffer_size: usize) -> Result<Vec<u8>> {
        let mut connections = self.connections.lock().await;

        let client = connections
            .get_mut(id)
            .context(format!("Connection '{}' not found", id))?;

        client.receive(buffer_size).await
    }

    pub async fn send_and_receive(
        &self,
        id: &ConnectionId,
        data: &[u8],
        buffer_size: usize,
    ) -> Result<Vec<u8>> {
        let mut connections = self.connections.lock().await;

        let client = connections
            .get_mut(id)
            .context(format!("Connection '{}' not found", id))?;

        client.send_and_receive(data, buffer_size).await
    }

    pub async fn is_connected(&self, id: &ConnectionId) -> Result<bool> {
        let connections = self.connections.lock().await;

        let client = connections
            .get(id)
            .context(format!("Connection '{}' not found", id))?;

        Ok(client.is_connected())
    }

    pub async fn remove_connection(&self, id: &ConnectionId) -> Result<()> {
        let mut connections = self.connections.lock().await;

        if let Some(mut client) = connections.remove(id) {
            let _ = client.disconnect().await;
        }

        Ok(())
    }

    pub async fn list_connections(&self) -> Vec<ConnectionId> {
        let connections = self.connections.lock().await;
        connections.keys().cloned().collect()
    }

    /// Disconnect all connections (called on app shutdown)
    pub async fn disconnect_all(&self) {
        let mut connections = self.connections.lock().await;
        for (_id, mut client) in connections.drain() {
            let _ = client.disconnect().await;
        }
    }
}

impl Default for ConnectionManager {
    fn default() -> Self {
        Self::new()
    }
}
