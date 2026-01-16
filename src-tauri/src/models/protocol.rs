use serde::{Deserialize, Serialize};
use std::default::Default;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolField {
    pub id: String,
    pub name: String,
    pub length: Option<i32>,
    #[serde(rename = "isVariable", default)]
    pub is_variable: bool,
    #[serde(rename = "valueType", default)]
    pub value_type: String, // "text" or "hex"
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

impl Default for ProtocolField {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            length: None,
            is_variable: false,
            value_type: "hex".to_string(),
            value: String::new(),
            description: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Protocol {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub fields: Vec<ProtocolField>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProtocolRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub fields: Vec<ProtocolField>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProtocolRequest {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub fields: Vec<ProtocolField>,
}
