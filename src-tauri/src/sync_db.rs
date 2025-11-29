use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::path::{Path, MAIN_SEPARATOR, MAIN_SEPARATOR_STR};
use std::sync::mpsc::{channel, Receiver};
use std::sync::{Arc, RwLock};
use std::time::Duration;

use anyhow::Result;
use base64::{engine::general_purpose, Engine as _};
use glob::{glob_with, MatchOptions};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::read_from_path;
use lofty::tag::{Accessor, Tag, TagType};
use natord;
use notify::event::{CreateKind, EventKind, MetadataKind, ModifyKind, RemoveKind};
use notify::{ReadDirectoryChangesWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebouncedEvent, Debouncer, FileIdMap};
use serde::Serialize;
use sqlx::{query, sqlite::SqliteConnectOptions, Pool, Row, Sqlite, SqlitePool};
use walkdir::WalkDir;

const AUDIO_EXTENSIONS: &[&str] = &[
    "wav", "bwf", "raw", "aiff", "flac", "m4a", "pac", "tta", "wv", "ast", "aac", "mp2", "mp3",
    "mp4", "amr", "s3m", "3gp", "act", "au", "dct", "dss", "gsm", "m4p", "mmf", "mpc", "ogg",
    "oga", "opus", "ra", "sln", "vox",
];

const GLOB_OPTIONS: MatchOptions = MatchOptions {
    case_sensitive: false,
    require_literal_separator: false,
    require_literal_leading_dot: false,
};

#[derive(Serialize, Clone)]
pub struct LibraryTree {
    text: String,
    path: String,
    meta: String,
    children: Vec<LibraryTree>,
}

struct Metadata {
    title: String,
    artist: String,
    album: String,
    year: u32,
    track_number: u32,
    disk: u32,
    duration: u32,
    bitrate: u32,
}

#[derive(Serialize, Clone)]
pub struct Track {
    playlist_uid: String,
    path: String,
    mtime: i64,
    title: String,
    artist: String,
    album: String,
    year: u32,
    track_number: u32,
    disk: u32,
    duration: u32,
    bitrate: u32,
}

#[derive(Serialize)]
pub struct Playlist {
    name: String,
    uid: String,
    tracks: Vec<Track>,
}

#[derive(Debug)]
pub struct SyncDb {
    db_pool: Pool<Sqlite>,
    debouncer: Arc<RwLock<Debouncer<ReadDirectoryChangesWatcher, FileIdMap>>>,
    library_paths: HashSet<String>,
    modified_time_map: HashMap<String, i64>,
}

impl SyncDb {
    pub async fn new() -> Result<Self> {
        let db_pool = SqlitePool::connect_with(
            SqliteConnectOptions::new()
                .filename("database.db")
                .create_if_missing(true),
        )
        .await?;

        query(
            "CREATE TABLE IF NOT EXISTS library(
                id INTEGER PRIMARY KEY,
                path TEXT UNIQUE NOT NULL,
                mtime INTEGER,
                title TEXT,
                artist TEXT,
                album TEXT,
                year INTEGER,
                track INTEGER,
                disk INTEGER,
                duration INTEGER,
                bitrate INTEGER
            )",
        )
        .execute(&db_pool)
        .await?;

        query(
            "CREATE TABLE IF NOT EXISTS library_paths(
                id INTEGER PRIMARY KEY,
                path TEXT UNIQUE NOT NULL
            )",
        )
        .execute(&db_pool)
        .await?;

        query(
            "CREATE TABLE IF NOT EXISTS playlists(
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                uid TEXT UNIQUE NOT NULL
            )",
        )
        .execute(&db_pool)
        .await?;

        query(
            "CREATE TABLE IF NOT EXISTS tracks(
                id INTEGER PRIMARY KEY,
                playlist_uid TEXT NOT NULL,
                path TEXT NOT NULL,
                mtime INTEGER,
                title TEXT,
                artist TEXT,
                album TEXT,
                year INTEGER,
                track INTEGER,
                disk INTEGER,
                duration INTEGER,
                bitrate INTEGER,
                FOREIGN KEY(playlist_uid) REFERENCES playlists(uid)ON UPDATE CASCADE ON DELETE CASCADE
            )",
        )
        .execute(&db_pool)
        .await?;

        let library_paths = query("SELECT path FROM library_paths")
            .fetch_all(&db_pool)
            .await?
            .into_iter()
            .map(|row| row.get(0))
            .collect::<Vec<String>>();

        let (tx, rx) = channel();

        let debouncer_rwlock = Arc::new(RwLock::new(new_debouncer(
            Duration::from_secs(3),
            None,
            tx,
        )?));

        {
            let mut debouncer = debouncer_rwlock
                .write()
                .expect("ERROR: Failed to get debouncer");

            for folder_path in &library_paths {
                if let Err(e) = debouncer.watch(Path::new(folder_path), RecursiveMode::Recursive) {
                    eprintln!("ERROR: Failed to watch path: {}", e);
                }
            }
        }

        let db_pool_clone = db_pool.clone();

        tokio::spawn(async move {
            Self::read_event(db_pool_clone, rx).await;
        });

        Ok(Self {
            db_pool,
            debouncer: debouncer_rwlock,
            library_paths: library_paths.into_iter().collect(),
            modified_time_map: HashMap::new(),
        })
    }

    async fn read_event(
        db_pool: Pool<Sqlite>,
        rx: Receiver<Result<Vec<DebouncedEvent>, Vec<notify::Error>>>,
    ) {
        loop {
            let events = match rx.recv() {
                Ok(Ok(events)) => events,
                Ok(Err(errors)) => {
                    for error in errors {
                        eprintln!("ERROR: File system event error: {}", error);
                    }
                    continue;
                }
                Err(e) => {
                    eprintln!("ERROR: Failed to receive events: {}", e);
                    break;
                }
            };

            for debounced_event in events {
                match debounced_event.kind {
                    EventKind::Create(create_kind) => match create_kind {
                        CreateKind::File => {
                            let audio_file_paths =
                                Self::get_audio_file_paths_from_debounced_event(&debounced_event);

                            for audio_file_path in audio_file_paths {
                                let audio_file_path_str = match audio_file_path.to_str() {
                                    Some(path) => path,
                                    None => {
                                        eprintln!(
                                            "ERROR: Invalid UTF-8 path: {:?}",
                                            audio_file_path
                                        );
                                        continue;
                                    }
                                };

                                let modified_time = match Self::get_modified_time(audio_file_path) {
                                    Ok(time) => time,
                                    Err(e) => {
                                        eprintln!(
                                            "ERROR: Failed to get modified time for {:?}: {}",
                                            audio_file_path, e
                                        );
                                        continue;
                                    }
                                };

                                let metadata = match Self::get_metadata(audio_file_path) {
                                    Ok(metadata) => metadata,
                                    Err(e) => {
                                        eprintln!(
                                            "ERROR: Failed to get metadata for {:?}: {}",
                                            audio_file_path, e
                                        );
                                        continue;
                                    }
                                };

                                if let Err(e) = query("INSERT INTO library (path, mtime, title, artist, album, year, track, disk, duration, bitrate) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)")
                                    .bind(audio_file_path_str)
                                    .bind(modified_time)
                                    .bind(&metadata.title)
                                    .bind(&metadata.artist)
                                    .bind(&metadata.album)
                                    .bind(metadata.year)
                                    .bind(metadata.track_number)
                                    .bind(metadata.disk)
                                    .bind(metadata.duration)
                                    .bind(metadata.bitrate)
                                    .execute(&db_pool).await {
                                        eprintln!("ERROR: Failed to insert into library: {}", e);
                                    }
                            }
                        }
                        _ => {}
                    },
                    EventKind::Modify(modify_kind) => {
                        match modify_kind {
                            ModifyKind::Metadata(metadata_kind) => match metadata_kind {
                                MetadataKind::WriteTime => {
                                    let audio_file_paths =
                                        Self::get_audio_file_paths_from_debounced_event(
                                            &debounced_event,
                                        );

                                    for audio_file_path in audio_file_paths {
                                        let audio_file_path_str = match audio_file_path.to_str() {
                                            Some(path) => path,
                                            None => {
                                                eprintln!(
                                                    "ERROR: Invalid UTF-8 path: {:?}",
                                                    audio_file_path
                                                );
                                                continue;
                                            }
                                        };

                                        let modified_time = match Self::get_modified_time(
                                            audio_file_path,
                                        ) {
                                            Ok(time) => time,
                                            Err(e) => {
                                                eprintln!("ERROR: Failed to get modified time for {:?}: {}", audio_file_path, e);
                                                continue;
                                            }
                                        };

                                        let metadata = match Self::get_metadata(audio_file_path) {
                                            Ok(metadata) => metadata,
                                            Err(e) => {
                                                eprintln!(
                                                    "ERROR: Failed to get metadata for {:?}: {}",
                                                    audio_file_path, e
                                                );
                                                continue;
                                            }
                                        };

                                        if let Err(e) = query("UPDATE library SET mtime = ?1, title = ?2, artist = ?3, album = ?4, year = ?5, track = ?6, disk = ?7, duration = ?8, bitrate = ?9 WHERE path = ?10")
                                        .bind(modified_time)
                                        .bind(&metadata.title)
                                        .bind(&metadata.artist)
                                        .bind(&metadata.album)
                                        .bind(metadata.year)
                                        .bind(metadata.track_number)
                                        .bind(metadata.disk)
                                        .bind(metadata.duration)
                                        .bind(metadata.bitrate)
                                        .bind(audio_file_path_str)
                                        .execute(&db_pool).await {
                                            eprintln!("ERROR: Failed to update library: {}", e);
                                        }
                                    }
                                }
                                _ => {}
                            },
                            _ => {}
                        }
                    }
                    EventKind::Remove(remove_kind) => match remove_kind {
                        RemoveKind::File => {
                            let audio_file_paths =
                                Self::get_audio_file_paths_from_debounced_event(&debounced_event);

                            for audio_file_path in audio_file_paths {
                                let audio_file_path_str = match audio_file_path.to_str() {
                                    Some(path) => path,
                                    None => {
                                        eprintln!(
                                            "ERROR: Invalid UTF-8 path: {:?}",
                                            audio_file_path
                                        );
                                        continue;
                                    }
                                };

                                if let Err(e) = query("DELETE FROM library WHERE path = ?1")
                                    .bind(audio_file_path_str)
                                    .execute(&db_pool)
                                    .await
                                {
                                    eprintln!("ERROR: Failed to delete from library: {}", e);
                                }
                            }
                        }
                        RemoveKind::Folder => {
                            let folder_paths = debounced_event
                                .paths
                                .iter()
                                .map(|x| x.to_str().unwrap_or_default())
                                .collect::<Vec<&str>>();

                            for folder_path in folder_paths {
                                if let Err(e) = query("DELETE FROM library WHERE path LIKE ?1")
                                    .bind(format!("{}{}%", folder_path, MAIN_SEPARATOR))
                                    .execute(&db_pool)
                                    .await
                                {
                                    eprintln!("ERROR: Failed to delete folder from library: {}", e);
                                }
                            }
                        }
                        _ => {}
                    },
                    _ => {}
                }
            }
        }
    }

    fn get_audio_file_paths_from_debounced_event(debounced_event: &DebouncedEvent) -> Vec<&Path> {
        debounced_event
            .paths
            .iter()
            .map(|x| x.as_path())
            .filter(|x| Self::is_audio_file(x))
            .collect()
    }

    fn is_audio_file(file_path: &Path) -> bool {
        if !file_path.is_file() {
            return false;
        }

        if let Some(extension) = file_path.extension().and_then(|ext| ext.to_str()) {
            AUDIO_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
        } else {
            false
        }
    }

    fn get_metadata(file_path: &Path) -> Result<Metadata> {
        let tagged_file = read_from_path(file_path)?;

        let binding = Tag::new(TagType::Id3v2);
        let tag = match tagged_file.primary_tag() {
            Some(tag) => tag,
            None => tagged_file.first_tag().unwrap_or(&binding),
        };

        let properties = tagged_file.properties();

        let title = tag.title().as_deref().unwrap_or("").to_string();
        let artist = tag.artist().as_deref().unwrap_or("").to_string();
        let album = tag.album().as_deref().unwrap_or("").to_string();
        let year = tag.year().unwrap_or(0);
        let track_number = tag.track().unwrap_or(0);
        let disk = tag.disk().unwrap_or(0);
        let duration = (properties.duration().as_millis() as f64 / 1000.0).ceil() as u32;
        let bitrate = properties.audio_bitrate().unwrap_or(0);

        Ok(Metadata {
            title,
            artist,
            album,
            year,
            track_number,
            disk,
            duration,
            bitrate,
        })
    }

    fn sort_tree(node: &mut Vec<LibraryTree>) {
        node.sort_by(|a, b| {
            if a.children.is_empty() && !b.children.is_empty() {
                Ordering::Greater
            } else if !a.children.is_empty() && b.children.is_empty() {
                Ordering::Less
            } else {
                natord::compare(&a.text, &b.text)
            }
        });

        for child in node {
            if !child.children.is_empty() {
                Self::sort_tree(&mut child.children);
            }
        }
    }

    pub async fn build_library_tree(&self) -> Result<Vec<LibraryTree>> {
        let library = query("SELECT path, title, artist, album FROM library")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| (row.get(0), row.get(1), row.get(2), row.get(3)))
            .collect::<Vec<(String, String, String, String)>>();

        if library.is_empty() {
            return Ok(Vec::new());
        }

        let library_paths = query("SELECT path FROM library_paths")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| row.get(0))
            .collect::<Vec<String>>();

        let mut library_group_by_paths: HashMap<String, Vec<(String, String, String, String)>> =
            HashMap::new();

        for library_path in &library_paths {
            let filtered_tracks = library
                .iter()
                .filter(|(path, _, _, _)| path.starts_with(library_path))
                .cloned()
                .collect();
            library_group_by_paths.insert(library_path.clone(), filtered_tracks);
        }

        let mut library_result = Vec::new();

        for (_, library_tracks) in &library_group_by_paths {
            if library_tracks.is_empty() {
                continue;
            }

            let mut result = LibraryTree {
                text: String::new(),
                path: String::new(),
                meta: String::new(),
                children: Vec::new(),
            };

            for track in library_tracks {
                let mut current_level = &mut result;

                for path_part in Path::new(&track.0).iter() {
                    if path_part == "\\" {
                        continue;
                    }
                    let path_part_string = path_part.to_str().unwrap_or_default().to_string();
                    let temp_path = if current_level.path.is_empty() {
                        path_part_string.clone()
                    } else {
                        format!(
                            "{}{}{}",
                            current_level.path, MAIN_SEPARATOR, path_part_string
                        )
                    };

                    let existing_child_index = current_level
                        .children
                        .iter()
                        .position(|c| c.text == path_part_string);

                    if let Some(index) = existing_child_index {
                        current_level = &mut current_level.children[index];
                    } else {
                        let new_node = LibraryTree {
                            text: path_part_string.clone(),
                            path: temp_path,
                            meta: format!(
                                "{},{},{},{}",
                                track.1, track.2, track.3, path_part_string
                            ),
                            children: Vec::new(),
                        };

                        current_level.children.push(new_node);
                        current_level = current_level.children.last_mut().unwrap();
                    }
                }
            }

            while result.children[0].children.len() == 1 {
                result = result.children[0].clone();
            }

            Self::sort_tree(&mut result.children);

            library_result.extend(result.children);
        }

        Ok(library_result)
    }

    fn get_modified_time(file_path: &Path) -> Result<i64> {
        let metadata = file_path.metadata()?;
        let modified_time = metadata
            .modified()?
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs() as i64;
        Ok(modified_time)
    }

    fn refresh_modified_time_map(&mut self) -> Result<()> {
        self.modified_time_map.clear();

        for folder_path in &self.library_paths {
            for entry in WalkDir::new(folder_path).into_iter().filter_map(|e| e.ok()) {
                let file_path = entry.path();

                if !Self::is_audio_file(file_path) {
                    continue;
                }

                let modified_time = Self::get_modified_time(file_path)?;
                let file_path_str = file_path.to_str().unwrap_or_default();

                if file_path_str.is_empty() {
                    continue;
                }

                self.modified_time_map
                    .insert(file_path_str.to_string(), modified_time);
            }
        }

        Ok(())
    }

    pub async fn refresh_library(&mut self) -> Result<()> {
        self.refresh_modified_time_map()?;

        let library = query("SELECT path, mtime FROM library")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| (row.get(0), row.get(1)))
            .collect::<Vec<(String, i64)>>();

        for (path, _mtime) in library {
            if !self.modified_time_map.contains_key(&path) {
                if let Err(e) = query("DELETE FROM library WHERE path = ?1")
                    .bind(&path)
                    .execute(&self.db_pool)
                    .await
                {
                    eprintln!("ERROR: Failed to delete path from library: {}", e);
                }
            }
        }

        for (path, mtime) in &self.modified_time_map {
            let metadata = match Self::get_metadata(Path::new(path)) {
                Ok(metadata) => metadata,
                Err(e) => {
                    eprintln!("ERROR: Failed to get metadata for {}: {}", path, e);
                    continue;
                }
            };

            if let Err(e) = query("INSERT INTO library (path, mtime, title, artist, album, year, track, disk, duration, bitrate) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) ON CONFLICT(path) DO UPDATE SET mtime = ?2, title = ?3, artist = ?4, album = ?5, year = ?6, track = ?7, disk = ?8, duration = ?9, bitrate = ?10")
                .bind(path)
                .bind(mtime)
                .bind(&metadata.title)
                .bind(&metadata.artist)
                .bind(&metadata.album)
                .bind(metadata.year)
                .bind(metadata.track_number)
                .bind(metadata.disk)
                .bind(metadata.duration)
                .bind(metadata.bitrate)
                .execute(&self.db_pool)
                .await {
                    eprintln!("ERROR: Failed to upsert library entry: {}", e);
                }
        }

        Ok(())
    }

    pub async fn close(&self) -> Result<()> {
        self.db_pool.close().await;
        Ok(())
    }

    pub async fn set_library(&mut self, folder_paths: Vec<String>) -> Result<()> {
        let added_library_paths = folder_paths
            .iter()
            .filter(|x| !self.library_paths.contains(*x))
            .cloned()
            .collect::<Vec<String>>();

        let removed_library_paths = self
            .library_paths
            .iter()
            .filter(|x| !folder_paths.contains(*x))
            .cloned()
            .collect::<Vec<String>>();

        {
            let mut debouncer_lock = self
                .debouncer
                .write()
                .expect("ERROR: Failed to get debouncer");

            for folder_path in &removed_library_paths {
                if let Err(e) = debouncer_lock.unwatch(Path::new(folder_path)) {
                    eprintln!("ERROR: Failed to unwatch path: {}", e);
                }
            }

            for folder_path in &added_library_paths {
                if let Err(e) =
                    debouncer_lock.watch(Path::new(folder_path), RecursiveMode::Recursive)
                {
                    eprintln!("ERROR: Failed to watch path: {}", e);
                }
            }
        }

        for folder_path in &removed_library_paths {
            if let Err(e) = query("DELETE FROM library_paths WHERE path = ?1")
                .bind(folder_path)
                .execute(&self.db_pool)
                .await
            {
                eprintln!("ERROR: Failed to delete library path: {}", e);
            }
        }

        for folder_path in &added_library_paths {
            if let Err(e) = query("INSERT INTO library_paths (path) VALUES (?1)")
                .bind(folder_path)
                .execute(&self.db_pool)
                .await
            {
                eprintln!("ERROR: Failed to insert library path: {}", e);
            }
        }

        self.library_paths = folder_paths.into_iter().collect();

        self.refresh_library().await?;

        Ok(())
    }

    pub async fn get_selected_library(&self, mut path: String) -> Result<Vec<Track>> {
        if Path::new(&path).is_dir() {
            path.push(MAIN_SEPARATOR);
        }

        let selected_library: Vec<Track> = query("SELECT path, mtime, title, artist, album, year, track, disk, duration, bitrate FROM library WHERE path LIKE ?1 ORDER BY path ASC")
            .bind(format!("{}%", path))
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| Track {
                playlist_uid: "library".to_string(),
                path: row.get(0),
                mtime: row.get(1),
                title: row.get(2),
                artist: row.get(3),
                album: row.get(4),
                year: row.get(5),
                track_number: row.get(6),
                disk: row.get(7),
                duration: row.get(8),
                bitrate: row.get(9),
            })
            .collect();

        if selected_library.is_empty() {
            return Ok(Vec::new());
        }

        Ok(selected_library)
    }

    pub fn get_library_paths(&self) -> Vec<String> {
        self.library_paths.iter().cloned().collect()
    }

    pub fn get_cover_art(&self, path_string: String) -> Result<String> {
        let path = Path::new(&path_string);
        let tagged_file = Probe::open(path)?.read()?;

        let binding = Tag::new(TagType::Id3v2);
        let tag = match tagged_file.primary_tag() {
            Some(tag) => tag,
            None => tagged_file.first_tag().unwrap_or(&binding),
        };

        if let Some(picture) = tag.pictures().first() {
            let cover_art_data = picture.data();
            let cover_art_type = picture
                .mime_type()
                .unwrap_or(&lofty::picture::MimeType::Jpeg);
            let base64_data = general_purpose::STANDARD.encode(cover_art_data);
            let data_url = format!("data:{};base64,{}", cover_art_type, base64_data);

            return Ok(data_url);
        }

        let folder_path = match path.parent() {
            Some(folder_path) => folder_path,
            None => return Ok(String::new()),
        };

        let folder_path_str = match folder_path.to_str() {
            Some(s) => s,
            None => return Ok(String::new()),
        };

        let glob_string = format!("{}{}{}", folder_path_str, MAIN_SEPARATOR_STR, "cover.*");

        let mut cover_art_files = glob_with(&glob_string, GLOB_OPTIONS)?;

        if let Some(cover_art_file) = cover_art_files.next() {
            let cover_art_path = cover_art_file?;
            let cover_art_data = std::fs::read(&cover_art_path)?;
            let cover_art_type = mime_guess::from_path(cover_art_path)
                .first_or_octet_stream()
                .to_string();
            let base64_data = general_purpose::STANDARD.encode(&cover_art_data);
            let data_url = format!("data:{};base64,{}", cover_art_type, base64_data);

            return Ok(data_url);
        }

        Ok(String::new())
    }

    pub async fn get_playlists(&self) -> Result<Vec<Playlist>> {
        let mut playlists = query("SELECT name, uid FROM playlists")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| Playlist {
                name: row.get(0),
                uid: row.get(1),
                tracks: Vec::new(),
            })
            .collect::<Vec<Playlist>>();

        let mut tracks = query("SELECT playlist_uid, path, mtime, title, artist, album, year, track, disk, duration, bitrate FROM tracks")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| Track {
                playlist_uid: row.get(0),
                path: row.get(1),
                mtime: row.get(2),
                title: row.get(3),
                artist: row.get(4),
                album: row.get(5),
                year: row.get(6),
                track_number: row.get(7),
                disk: row.get(8),
                duration: row.get(9),
                bitrate: row.get(10),
            })
            .collect::<Vec<Track>>();

        while let Some(track) = tracks.pop() {
            if let Some(playlist) = playlists.iter_mut().find(|p| p.uid == track.playlist_uid) {
                playlist.tracks.push(track);
            }
        }

        Ok(playlists)
    }
}
