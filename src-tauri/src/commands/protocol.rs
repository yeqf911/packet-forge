use crate::database::DbPool;
use crate::models::{Protocol, ProtocolField, CreateProtocolRequest, UpdateProtocolRequest};
use chrono::Utc;
use tauri::State;
use uuid::Uuid;

type DbResult<T = ()> = Result<T, String>;

/// List all protocols
#[tauri::command]
pub fn list_protocols(db_pool: State<DbPool>) -> DbResult<Vec<Protocol>> {
    db_pool.with(|db| {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, description, created_at, updated_at FROM protocols ORDER BY created_at DESC"
        )?;

        let protocol_map = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?, // id
                row.get::<_, String>(1)?, // name
                row.get::<_, Option<String>>(2)?, // description
                row.get::<_, String>(3)?, // created_at
                row.get::<_, String>(4)?, // updated_at
            ))
        })?;

        let mut protocols = Vec::new();

        for protocol_data in protocol_map {
            let (id, name, description, created_at, updated_at) = protocol_data?;

            // Fetch fields for this protocol
            let mut field_stmt = db.conn().prepare(
                "SELECT id, name, length, is_variable, value_type, value_format, value
                 FROM protocol_fields
                 WHERE protocol_id = ?1
                 ORDER BY field_order ASC"
            )?;

            let fields = field_stmt.query_map([&id], |row| {
                let value_format: Option<String> = row.get(5)?;
                Ok(ProtocolField {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    length: row.get(2)?,
                    is_variable: row.get::<_, i32>(3)? == 1,
                    value_type: row.get(4)?,
                    value_format: if value_format.is_some() && !value_format.as_ref().unwrap().is_empty() {
                        Some(value_format.unwrap())
                    } else {
                        None
                    },
                    value: row.get(6)?,
                    description: None,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

            protocols.push(Protocol {
                id,
                name,
                description,
                fields,
                created_at,
                updated_at,
            });
        }

        Ok(protocols)
    })
    .map_err(|e| e.to_string())
}

/// Get a single protocol by ID
#[tauri::command]
pub fn get_protocol(db_pool: State<DbPool>, id: String) -> DbResult<Option<Protocol>> {
    db_pool.with(|db| {
        let mut stmt = db.conn().prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM protocols WHERE id = ?1"
        )?;

        let protocol_data = stmt.query_row([&id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
            ))
        });

        match protocol_data {
            Ok((id, name, description, created_at, updated_at)) => {
                // Fetch fields
                let mut field_stmt = db.conn().prepare(
                    "SELECT id, name, length, is_variable, value_type, value_format, value
                     FROM protocol_fields
                     WHERE protocol_id = ?1
                     ORDER BY field_order ASC"
                )?;

                let fields = field_stmt.query_map([&id], |row| {
                    let value_format: Option<String> = row.get(5)?;
                    Ok(ProtocolField {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        length: row.get(2)?,
                        is_variable: row.get::<_, i32>(3)? == 1,
                        value_type: row.get(4)?,
                        value_format: if value_format.is_some() && !value_format.as_ref().unwrap().is_empty() {
                            Some(value_format.unwrap())
                        } else {
                            None
                        },
                        value: row.get(6)?,
                        description: None,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

                Ok(Some(Protocol {
                    id,
                    name,
                    description,
                    fields,
                    created_at,
                    updated_at,
                }))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    })
    .map_err(|e| e.to_string())
}

/// Create a new protocol
#[tauri::command]
pub fn create_protocol(db_pool: State<DbPool>, request: CreateProtocolRequest) -> DbResult<Protocol> {
    db_pool.with(|db| {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Insert protocol
        let desc = request.description.as_deref().unwrap_or("").to_string();
        db.conn().execute(
            "INSERT INTO protocols (id, name, description, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            [&id, &request.name, &desc, &now, &now],
        )?;

        // Insert fields
        for (index, field) in request.fields.iter().enumerate() {
            let length_str = field.length.map(|l: i32| l.to_string()).unwrap_or_else(|| "0".to_string());
            let is_var = if field.is_variable { 1 } else { 0 };
            let order = index as i32;
            let value_fmt = field.value_format.as_deref().unwrap_or("");

            db.conn().execute(
                "INSERT INTO protocol_fields (id, protocol_id, name, length, is_variable, value_type, value_format, value, field_order)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    &field.id,
                    &id,
                    &field.name,
                    &length_str,
                    &is_var.to_string(),
                    &field.value_type,
                    value_fmt,
                    &field.value,
                    &order.to_string(),
                ],
            )?;
        }

        Ok(Protocol {
            id,
            name: request.name,
            description: request.description,
            fields: request.fields,
            created_at: now.clone(),
            updated_at: now,
        })
    })
    .map_err(|e| e.to_string())
}

/// Update an existing protocol
#[tauri::command]
pub fn update_protocol(db_pool: State<DbPool>, request: UpdateProtocolRequest) -> DbResult<Protocol> {
    db_pool.with(|db| {
        let now = Utc::now().to_rfc3339();

        // Update protocol
        let desc = request.description.as_deref().unwrap_or("").to_string();
        db.conn().execute(
            "UPDATE protocols SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            [&request.name, &desc, &now, &request.id],
        )?;

        // Delete existing fields
        db.conn().execute(
            "DELETE FROM protocol_fields WHERE protocol_id = ?1",
            [&request.id],
        )?;

        // Insert new fields
        for (index, field) in request.fields.iter().enumerate() {
            let length_str = field.length.map(|l: i32| l.to_string()).unwrap_or_else(|| "0".to_string());
            let is_var = if field.is_variable { 1 } else { 0 };
            let order = index as i32;
            let value_fmt = field.value_format.as_deref().unwrap_or("");

            db.conn().execute(
                "INSERT INTO protocol_fields (id, protocol_id, name, length, is_variable, value_type, value_format, value, field_order)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                [
                    &field.id,
                    &request.id,
                    &field.name,
                    &length_str,
                    &is_var.to_string(),
                    &field.value_type,
                    value_fmt,
                    &field.value,
                    &order.to_string(),
                ],
            )?;
        }

        Ok(Protocol {
            id: request.id,
            name: request.name,
            description: request.description,
            fields: request.fields,
            created_at: String::new(), // Will be populated if needed
            updated_at: now,
        })
    })
    .map_err(|e| e.to_string())
}

/// Delete a protocol
#[tauri::command]
pub fn delete_protocol(db_pool: State<DbPool>, id: String) -> DbResult<()> {
    db_pool.with(|db| {
        // Fields will be deleted automatically due to FOREIGN KEY ON DELETE CASCADE
        db.conn().execute("DELETE FROM protocols WHERE id = ?1", [&id])?;
        Ok(())
    })
    .map_err(|e| e.to_string())
}
