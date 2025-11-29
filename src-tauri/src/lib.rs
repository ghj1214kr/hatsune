mod lyric;
mod sync_db;

use std::sync::{Arc, OnceLock};
use tauri::{async_runtime::spawn, Manager};
use tokio::sync::RwLock;

static SYNC_DB: OnceLock<Arc<RwLock<sync_db::SyncDb>>> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            // SyncDb 초기화
            tauri::async_runtime::block_on(async {
                let sync_db = sync_db::SyncDb::new()
                    .await
                    .expect("Failed to initialize SyncDb");
                SYNC_DB.set(Arc::new(RwLock::new(sync_db))).unwrap();
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            refresh_allow_directory,
            refresh_library,
            get_cover_art,
            get_library_paths,
            get_library,
            set_library,
            get_selected_library,
            get_playlists,
            get_raw_lyric_from_path
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        spawn(async move {
            match event {
                tauri::RunEvent::Exit => {
                    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
                    let sync_db = sync_db.write().await;
                    sync_db.close().await.expect("Failed to close sync_db");
                }
                _ => (),
            }
        });
    });
}

#[tauri::command]
async fn refresh_allow_directory(app_handle: tauri::AppHandle) -> Result<(), String> {
    let asset_protocol_scope = app_handle.asset_protocol_scope();
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_library_paths().iter().for_each(|path| {
        asset_protocol_scope
            .allow_directory(path, true)
            .expect(format!("Failed to allow directory: {}", path).as_str())
    });
    return Ok(());
}

#[tauri::command]
async fn refresh_library() -> Result<(), String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let mut sync_db = sync_db.write().await;
    sync_db.refresh_library().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_cover_art(path: String) -> Result<String, String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_cover_art(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_library_paths() -> Result<Vec<String>, String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    Ok(sync_db.get_library_paths())
}

#[tauri::command]
async fn get_library() -> Result<Vec<sync_db::LibraryTree>, String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db
        .build_library_tree()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_library(library_paths: Vec<String>) -> Result<(), String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let mut sync_db = sync_db.write().await;
    sync_db
        .set_library(library_paths)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_selected_library(path: String) -> Result<Vec<sync_db::Track>, String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db
        .get_selected_library(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_playlists() -> Result<Vec<sync_db::Playlist>, String> {
    let sync_db = SYNC_DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_playlists().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_raw_lyric_from_path(path: String) -> Result<String, String> {
    Ok(lyric::get_raw_lyric_from_path(&path)
        .await
        .unwrap_or_else(|_| String::new()))
}
