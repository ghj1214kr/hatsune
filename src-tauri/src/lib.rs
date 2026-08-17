mod db;

use std::sync::{Arc, OnceLock};

use tauri::{async_runtime::spawn, Emitter, Manager};
use tokio::sync::RwLock;

static DB: OnceLock<Arc<RwLock<db::Db>>> = OnceLock::new();
const LIBRARY_SCAN_PROGRESS_EVENT: &str = "library_scan_progress";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Db 초기화
            tauri::async_runtime::block_on(async {
                let database_path = app
                    .path()
                    .app_data_dir()
                    .expect("Failed to resolve app data directory")
                    .join("database.db");
                let db = db::Db::new(database_path)
                    .await
                    .expect("Failed to initialize Db");
                DB.set(Arc::new(RwLock::new(db))).unwrap();
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
            get_playlists
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    app.run(|_app_handle, event| {
        spawn(async move {
            match event {
                tauri::RunEvent::Exit => {
                    let db = DB.get().expect("SyncDb not initialized");
                    let db = db.write().await;
                    db.close().await.expect("Failed to close sync_db");
                }
                _ => (),
            }
        });
    });
}

#[tauri::command]
async fn refresh_allow_directory(app_handle: tauri::AppHandle) -> Result<(), String> {
    let asset_protocol_scope = app_handle.asset_protocol_scope();
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_library_paths().iter().for_each(|path| {
        asset_protocol_scope
            .allow_directory(path, true)
            .expect(format!("Failed to allow directory: {}", path).as_str())
    });
    return Ok(());
}

#[tauri::command]
async fn refresh_library(app_handle: tauri::AppHandle) -> Result<(), String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let mut sync_db = sync_db.write().await;
    let progress = library_scan_progress_callback(app_handle);
    sync_db
        .refresh_library(Some(progress))
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_cover_art(path: String) -> Result<String, String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_cover_art(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_library_paths() -> Result<Vec<String>, String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    Ok(sync_db.get_library_paths())
}

#[tauri::command]
async fn get_library() -> Result<Vec<db::LibraryTree>, String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db
        .build_library_tree()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn set_library(
    app_handle: tauri::AppHandle,
    library_paths: Vec<String>,
) -> Result<(), String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let mut sync_db = sync_db.write().await;
    let progress = library_scan_progress_callback(app_handle);
    sync_db
        .set_library(library_paths, Some(progress))
        .await
        .map_err(|e| e.to_string())
}

fn library_scan_progress_callback(app_handle: tauri::AppHandle) -> db::ProgressCallback {
    Arc::new(move |progress| {
        let _ = app_handle.emit(LIBRARY_SCAN_PROGRESS_EVENT, progress);
    })
}

#[tauri::command]
async fn get_selected_library(path: String) -> Result<Vec<db::Track>, String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db
        .get_selected_library(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_playlists() -> Result<Vec<db::Playlist>, String> {
    let sync_db = DB.get().expect("SyncDb not initialized");
    let sync_db = sync_db.read().await;
    sync_db.get_playlists().await.map_err(|e| e.to_string())
}
