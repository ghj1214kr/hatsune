use std::cmp::Ordering;
use std::collections::{HashMap, HashSet};
use std::fs::Metadata as FsMetadata;
use std::path::{MAIN_SEPARATOR, MAIN_SEPARATOR_STR, Path, PathBuf};
use std::sync::mpsc::{Receiver, channel};
use std::sync::{Arc, RwLock};
use std::time::Duration;

use anyhow::Result;
use base64::{Engine as _, engine::general_purpose};
use glob::{MatchOptions, glob_with};
use lofty::config::{ParseOptions, ParsingMode};
use lofty::file::{AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use lofty::tag::{Accessor, Tag, TagType};
use notify::event::{CreateKind, EventKind, MetadataKind, ModifyKind, RemoveKind};
use notify::{ReadDirectoryChangesWatcher, RecursiveMode};
use notify_debouncer_full::{DebouncedEvent, Debouncer, FileIdMap, new_debouncer};
use serde::Serialize;
use sqlx::{
    Pool, Row, Sqlite, SqlitePool, query,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqliteSynchronous},
};
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

const CREATE_LIBRARY_TABLE: &str = "CREATE TABLE IF NOT EXISTS library(
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
)";

const CREATE_LIBRARY_PATHS_TABLE: &str = "CREATE TABLE IF NOT EXISTS library_paths(
    id INTEGER PRIMARY KEY,
    path TEXT UNIQUE NOT NULL
)";

const CREATE_PLAYLISTS_TABLE: &str = "CREATE TABLE IF NOT EXISTS playlists(
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    uid TEXT UNIQUE NOT NULL
)";

const CREATE_TRACKS_TABLE: &str = "CREATE TABLE IF NOT EXISTS tracks(
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
    FOREIGN KEY(playlist_uid) REFERENCES playlists(uid) ON UPDATE CASCADE ON DELETE CASCADE
)";

const CREATE_TRACKS_PLAYLIST_UID_INDEX: &str =
    "CREATE INDEX IF NOT EXISTS idx_tracks_playlist_uid ON tracks(playlist_uid)";

const CREATE_TRACKS_PLAYLIST_UID_PATH_INDEX: &str =
    "CREATE INDEX IF NOT EXISTS idx_tracks_playlist_uid_path ON tracks(playlist_uid, path)";

const UPSERT_LIBRARY_SQL: &str = "INSERT INTO library
    (path, mtime, title, artist, album, year, track, disk, duration, bitrate)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
    ON CONFLICT(path) DO UPDATE SET
        mtime = ?2,
        title = ?3,
        artist = ?4,
        album = ?5,
        year = ?6,
        track = ?7,
        disk = ?8,
        duration = ?9,
        bitrate = ?10";

type WatchDebouncer = Debouncer<ReadDirectoryChangesWatcher, FileIdMap>;
type DebouncedEventReceiver = Receiver<Result<Vec<DebouncedEvent>, Vec<notify::Error>>>;
pub type ProgressCallback = Arc<dyn Fn(LibraryScanProgress) + Send + Sync + 'static>;

#[derive(Serialize, Clone)]
pub struct LibraryScanProgress {
    phase: String,
    current: u64,
    total: Option<u64>,
    message: String,
    path: Option<String>,
}

impl LibraryScanProgress {
    fn new(
        phase: impl Into<String>,
        current: u64,
        total: Option<u64>,
        message: impl Into<String>,
        path: Option<String>,
    ) -> Self {
        Self {
            phase: phase.into(),
            current,
            total,
            message: message.into(),
            path,
        }
    }
}

#[derive(Serialize, Clone)]
pub struct LibraryTree {
    text: String,
    path: String,
    meta: String,
    children: Vec<LibraryTree>,
}

#[derive(Clone)]
struct Metadata {
    title: String,
    artist: String,
    album: String,
    year: u16,
    track_number: u32,
    disk: u32,
    duration: u32,
    bitrate: u32,
}

struct LibraryEntry {
    path: String,
    modified_time: i64,
    metadata: Metadata,
}

#[derive(Clone)]
struct LibraryRow {
    path: String,
    title: String,
    artist: String,
    album: String,
}

struct LibraryTreeNode {
    text: String,
    path: String,
    meta: String,
    children: Vec<LibraryTreeNode>,
    child_index_by_text: HashMap<String, usize>,
}

impl LibraryTreeNode {
    fn root() -> Self {
        Self {
            text: String::new(),
            path: String::new(),
            meta: String::new(),
            children: Vec::new(),
            child_index_by_text: HashMap::new(),
        }
    }

    fn new(text: String, path: String, meta: String) -> Self {
        Self {
            text,
            path,
            meta,
            children: Vec::new(),
            child_index_by_text: HashMap::new(),
        }
    }

    fn into_library_tree(self) -> LibraryTree {
        LibraryTree {
            text: self.text,
            path: self.path,
            meta: self.meta,
            children: self
                .children
                .into_iter()
                .map(LibraryTreeNode::into_library_tree)
                .collect(),
        }
    }
}

#[derive(Serialize, Clone)]
pub struct Track {
    playlist_uid: String,
    path: String,
    mtime: i64,
    title: String,
    artist: String,
    album: String,
    year: u16,
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

#[derive(Debug, Clone)]
struct CoverArtCacheEntry {
    modified_time: i64,
    data_url: String,
}

#[derive(Debug)]
pub struct Db {
    db_pool: Pool<Sqlite>,
    debouncer: Arc<RwLock<WatchDebouncer>>,
    library_paths: HashSet<String>,
    modified_time_map: HashMap<String, i64>,
    cover_art_cache: RwLock<HashMap<String, CoverArtCacheEntry>>,
}

impl Db {
    pub async fn new(database_path: PathBuf) -> Result<Self> {
        Self::prepare_database_path(&database_path)?;

        let db_pool = SqlitePool::connect_with(
            SqliteConnectOptions::new()
                .filename(&database_path)
                .create_if_missing(true)
                .foreign_keys(true)
                .journal_mode(SqliteJournalMode::Wal)
                .synchronous(SqliteSynchronous::Normal)
                .busy_timeout(Duration::from_secs(5)),
        )
        .await?;

        Self::init_schema(&db_pool).await?;

        let library_paths = Self::load_library_paths(&db_pool).await?;
        let (tx, rx) = channel();
        let debouncer = Arc::new(RwLock::new(new_debouncer(
            Duration::from_secs(3),
            None,
            tx,
        )?));

        Self::watch_library_paths(&debouncer, &library_paths);

        let db_pool_clone = db_pool.clone();
        tokio::spawn(async move {
            Self::read_event(db_pool_clone, rx).await;
        });

        Ok(Self {
            db_pool,
            debouncer,
            library_paths: library_paths.into_iter().collect(),
            modified_time_map: HashMap::new(),
            cover_art_cache: RwLock::new(HashMap::new()),
        })
    }

    fn prepare_database_path(database_path: &Path) -> Result<()> {
        if let Some(parent) = database_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        Ok(())
    }

    async fn init_schema(db_pool: &Pool<Sqlite>) -> Result<()> {
        for statement in [
            CREATE_LIBRARY_TABLE,
            CREATE_LIBRARY_PATHS_TABLE,
            CREATE_PLAYLISTS_TABLE,
            CREATE_TRACKS_TABLE,
            CREATE_TRACKS_PLAYLIST_UID_INDEX,
            CREATE_TRACKS_PLAYLIST_UID_PATH_INDEX,
        ] {
            query(statement).execute(db_pool).await?;
        }

        Ok(())
    }

    async fn load_library_paths(db_pool: &Pool<Sqlite>) -> Result<Vec<String>> {
        Ok(query("SELECT path FROM library_paths ORDER BY path ASC")
            .fetch_all(db_pool)
            .await?
            .into_iter()
            .map(|row| row.get(0))
            .collect())
    }

    fn watch_library_paths(debouncer: &Arc<RwLock<WatchDebouncer>>, library_paths: &[String]) {
        let mut debouncer = debouncer
            .write()
            .expect("ERROR: Failed to get debouncer lock");

        for folder_path in library_paths {
            if let Err(e) = debouncer.watch(Path::new(folder_path), RecursiveMode::Recursive) {
                eprintln!("ERROR: Failed to watch path {}: {}", folder_path, e);
            }
        }
    }

    async fn read_event(db_pool: Pool<Sqlite>, rx: DebouncedEventReceiver) {
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

            for event in events {
                Self::handle_event(&db_pool, &event).await;
            }
        }
    }

    async fn handle_event(db_pool: &Pool<Sqlite>, event: &DebouncedEvent) {
        match &event.kind {
            EventKind::Create(CreateKind::File) => {
                Self::upsert_event_audio_files(db_pool, event).await;
            }
            EventKind::Modify(ModifyKind::Metadata(MetadataKind::WriteTime)) => {
                Self::upsert_event_audio_files(db_pool, event).await;
            }
            EventKind::Remove(RemoveKind::File) => {
                Self::delete_event_audio_files(db_pool, event).await;
            }
            EventKind::Remove(RemoveKind::Folder) => {
                Self::delete_event_folders(db_pool, event).await;
            }
            _ => {}
        }
    }

    async fn upsert_event_audio_files(db_pool: &Pool<Sqlite>, event: &DebouncedEvent) {
        for audio_file_path in Self::audio_file_paths_from_event(event, true) {
            if let Err(e) = Self::upsert_library_file(db_pool, audio_file_path).await {
                eprintln!(
                    "ERROR: Failed to upsert library entry {:?}: {}",
                    audio_file_path, e
                );
            }
        }
    }

    async fn delete_event_audio_files(db_pool: &Pool<Sqlite>, event: &DebouncedEvent) {
        for audio_file_path in Self::audio_file_paths_from_event(event, false) {
            let Some(path) = audio_file_path.to_str() else {
                eprintln!("ERROR: Invalid UTF-8 path: {:?}", audio_file_path);
                continue;
            };

            if let Err(e) = query("DELETE FROM library WHERE path = ?1")
                .bind(path)
                .execute(db_pool)
                .await
            {
                eprintln!("ERROR: Failed to delete from library: {}", e);
            }
        }
    }

    async fn delete_event_folders(db_pool: &Pool<Sqlite>, event: &DebouncedEvent) {
        for folder_path in event.paths.iter().filter_map(|path| path.to_str()) {
            if let Err(e) = Self::delete_library_folder(db_pool, folder_path).await {
                eprintln!("ERROR: Failed to delete folder from library: {}", e);
            }
        }
    }

    fn audio_file_paths_from_event(
        event: &DebouncedEvent,
        require_existing_file: bool,
    ) -> impl Iterator<Item = &Path> {
        event
            .paths
            .iter()
            .map(|path| path.as_path())
            .filter(move |path| {
                (!require_existing_file || path.is_file()) && Self::has_audio_extension(path)
            })
    }

    fn has_audio_extension(file_path: &Path) -> bool {
        file_path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| {
                AUDIO_EXTENSIONS
                    .iter()
                    .any(|audio_extension| extension.eq_ignore_ascii_case(audio_extension))
            })
            .unwrap_or(false)
    }

    fn get_metadata(file_path: &Path) -> Result<Metadata> {
        let tagged_file = Probe::open(file_path)?
            .options(Self::metadata_parse_options())
            .read()?;
        let empty_tag = Tag::new(TagType::Id3v2);
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag())
            .unwrap_or(&empty_tag);
        let properties = tagged_file.properties();

        Ok(Metadata {
            title: tag.title().as_deref().unwrap_or("").to_string(),
            artist: tag.artist().as_deref().unwrap_or("").to_string(),
            album: tag.album().as_deref().unwrap_or("").to_string(),
            year: tag.date().map(|date| date.year).unwrap_or_default(),
            track_number: tag.track().unwrap_or(0),
            disk: tag.disk().unwrap_or(0),
            duration: properties
                .duration()
                .as_secs()
                .saturating_add(u64::from(properties.duration().subsec_nanos() > 0))
                as u32,
            bitrate: properties.audio_bitrate().unwrap_or(0),
        })
    }

    fn metadata_parse_options() -> ParseOptions {
        ParseOptions::new()
            .parsing_mode(ParsingMode::Relaxed)
            .read_cover_art(false)
    }

    fn cover_art_parse_options() -> ParseOptions {
        ParseOptions::new().parsing_mode(ParsingMode::Relaxed)
    }

    fn sort_tree(node: &mut [LibraryTree]) {
        node.sort_by(
            |a, b| match (a.children.is_empty(), b.children.is_empty()) {
                (true, false) => Ordering::Greater,
                (false, true) => Ordering::Less,
                _ => natord::compare_ignore_case(&a.text, &b.text),
            },
        );

        for child in node {
            if !child.children.is_empty() {
                Self::sort_tree(&mut child.children);
            }
        }
    }

    pub async fn build_library_tree(&self) -> Result<Vec<LibraryTree>> {
        let library = query("SELECT path, title, artist, album FROM library ORDER BY path ASC")
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| LibraryRow {
                path: row.get(0),
                title: row.get(1),
                artist: row.get(2),
                album: row.get(3),
            })
            .collect::<Vec<_>>();

        if library.is_empty() {
            return Ok(Vec::new());
        }

        let library_paths = Self::load_library_paths(&self.db_pool).await?;
        let mut result = Vec::new();

        for library_path in &library_paths {
            let tracks = library
                .iter()
                .filter(|track| track.path.starts_with(library_path));

            if let Some(mut tree) = Self::build_tree_for_tracks(tracks) {
                Self::collapse_single_child_root(&mut tree);
                Self::sort_tree(&mut tree.children);
                result.extend(tree.children);
            }
        }

        Ok(result)
    }

    fn build_tree_for_tracks<'a, I>(tracks: I) -> Option<LibraryTree>
    where
        I: IntoIterator<Item = &'a LibraryRow>,
    {
        let mut root = LibraryTreeNode::root();
        let mut has_tracks = false;

        for track in tracks {
            has_tracks = true;
            Self::insert_track_into_tree(&mut root, track);
        }

        has_tracks.then(|| root.into_library_tree())
    }

    fn insert_track_into_tree(root: &mut LibraryTreeNode, track: &LibraryRow) {
        let mut current = root;

        for path_part in Path::new(&track.path).iter() {
            if path_part == MAIN_SEPARATOR_STR {
                continue;
            }

            let path_part = path_part.to_str().unwrap_or_default().to_string();
            let child_path = if current.path.is_empty() {
                path_part.clone()
            } else {
                format!("{}{}{}", current.path, MAIN_SEPARATOR, path_part)
            };
            let child_index = if let Some(child_index) = current.child_index_by_text.get(&path_part)
            {
                *child_index
            } else {
                let child_index = current.children.len();
                current
                    .child_index_by_text
                    .insert(path_part.clone(), child_index);
                current.children.push(LibraryTreeNode::new(
                    path_part.clone(),
                    child_path,
                    format!(
                        "{},{},{},{}",
                        track.title, track.artist, track.album, path_part
                    ),
                ));
                child_index
            };

            current = &mut current.children[child_index];
        }
    }

    fn collapse_single_child_root(tree: &mut LibraryTree) {
        while tree.children.len() == 1 && tree.children[0].children.len() == 1 {
            *tree = tree.children[0].clone();
        }
    }

    fn get_modified_time(file_path: &Path) -> Result<i64> {
        Self::modified_time_from_metadata(&file_path.metadata()?)
    }

    fn emit_progress(progress: Option<&ProgressCallback>, payload: LibraryScanProgress) {
        if let Some(progress) = progress {
            progress(payload);
        }
    }

    fn modified_time_from_metadata(metadata: &FsMetadata) -> Result<i64> {
        Ok(metadata
            .modified()?
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs() as i64)
    }

    async fn collect_modified_time_map(
        folder_paths: Vec<String>,
        progress: Option<ProgressCallback>,
    ) -> Result<HashMap<String, i64>> {
        tokio::task::spawn_blocking(move || {
            Self::collect_modified_time_map_sync(&folder_paths, progress.as_ref())
        })
        .await?
    }

    fn collect_modified_time_map_sync(
        folder_paths: &[String],
        progress: Option<&ProgressCallback>,
    ) -> Result<HashMap<String, i64>> {
        let mut modified_time_map = HashMap::new();
        Self::emit_progress(
            progress,
            LibraryScanProgress::new("scanning", 0, None, "라이브러리 파일을 찾는 중...", None),
        );

        for folder_path in folder_paths {
            for entry in WalkDir::new(folder_path)
                .into_iter()
                .filter_map(|entry| entry.ok())
            {
                let file_path = entry.path();

                if !entry.file_type().is_file() || !Self::has_audio_extension(file_path) {
                    continue;
                }

                let Some(file_path) = file_path.to_str() else {
                    continue;
                };

                modified_time_map.insert(
                    file_path.to_string(),
                    Self::modified_time_from_metadata(&entry.metadata()?)?,
                );

                let current = modified_time_map.len() as u64;
                if current == 1 || current % 100 == 0 {
                    Self::emit_progress(
                        progress,
                        LibraryScanProgress::new(
                            "scanning",
                            current,
                            None,
                            format!("오디오 파일 {}개를 찾았습니다.", current),
                            Some(file_path.to_string()),
                        ),
                    );
                }
            }
        }

        Self::emit_progress(
            progress,
            LibraryScanProgress::new(
                "scanning",
                modified_time_map.len() as u64,
                Some(modified_time_map.len() as u64),
                format!("오디오 파일 {}개를 찾았습니다.", modified_time_map.len()),
                None,
            ),
        );

        Ok(modified_time_map)
    }

    async fn upsert_library_file(db_pool: &Pool<Sqlite>, path: &Path) -> Result<()> {
        let path = path
            .to_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid UTF-8 path: {:?}", path))?
            .to_string();
        let entry = Self::load_library_entry(path).await?;

        Self::upsert_library_entry(db_pool, &entry.path, entry.modified_time, &entry.metadata).await
    }

    async fn upsert_library_entry(
        db_pool: &Pool<Sqlite>,
        path: &str,
        modified_time: i64,
        metadata: &Metadata,
    ) -> Result<()> {
        query(UPSERT_LIBRARY_SQL)
            .bind(path)
            .bind(modified_time)
            .bind(&metadata.title)
            .bind(&metadata.artist)
            .bind(&metadata.album)
            .bind(metadata.year)
            .bind(metadata.track_number)
            .bind(metadata.disk)
            .bind(metadata.duration)
            .bind(metadata.bitrate)
            .execute(db_pool)
            .await?;

        Ok(())
    }

    async fn upsert_library_entries(
        db_pool: &Pool<Sqlite>,
        modified_time_map: &HashMap<String, i64>,
        progress: Option<ProgressCallback>,
    ) -> Result<()> {
        if modified_time_map.is_empty() {
            Self::emit_progress(
                progress.as_ref(),
                LibraryScanProgress::new("metadata", 0, Some(0), "변경된 파일이 없습니다.", None),
            );
            return Ok(());
        }

        let entries = Self::load_library_entries(modified_time_map, progress.clone()).await?;
        let mut transaction = db_pool.begin().await?;
        let total = entries.len() as u64;

        for (index, entry) in entries.into_iter().enumerate() {
            if let Err(e) = query(UPSERT_LIBRARY_SQL)
                .bind(&entry.path)
                .bind(entry.modified_time)
                .bind(&entry.metadata.title)
                .bind(&entry.metadata.artist)
                .bind(&entry.metadata.album)
                .bind(entry.metadata.year)
                .bind(entry.metadata.track_number)
                .bind(entry.metadata.disk)
                .bind(entry.metadata.duration)
                .bind(entry.metadata.bitrate)
                .execute(&mut *transaction)
                .await
            {
                eprintln!(
                    "ERROR: Failed to upsert library entry {}: {}",
                    entry.path, e
                );
            }

            let current = index as u64 + 1;
            if current == total || current == 1 || current % 50 == 0 {
                Self::emit_progress(
                    progress.as_ref(),
                    LibraryScanProgress::new(
                        "database",
                        current,
                        Some(total),
                        format!("라이브러리 DB 반영 중... {}/{}", current, total),
                        Some(entry.path),
                    ),
                );
            }
        }

        transaction.commit().await?;
        Ok(())
    }

    async fn load_library_entry(path: String) -> Result<LibraryEntry> {
        tokio::task::spawn_blocking(move || {
            let path_ref = Path::new(&path);
            let modified_time = Self::get_modified_time(path_ref)?;
            let metadata = Self::get_metadata(path_ref)?;

            Ok(LibraryEntry {
                path,
                modified_time,
                metadata,
            })
        })
        .await?
    }

    async fn load_library_entries(
        modified_time_map: &HashMap<String, i64>,
        progress: Option<ProgressCallback>,
    ) -> Result<Vec<LibraryEntry>> {
        let files = modified_time_map
            .iter()
            .map(|(path, modified_time)| (path.clone(), *modified_time))
            .collect::<Vec<_>>();

        tokio::task::spawn_blocking(move || {
            let mut entries = Vec::with_capacity(files.len());
            let total = files.len() as u64;

            Self::emit_progress(
                progress.as_ref(),
                LibraryScanProgress::new(
                    "metadata",
                    0,
                    Some(total),
                    format!("변경된 파일 {}개의 메타데이터를 읽는 중...", total),
                    None,
                ),
            );

            for (index, (path, modified_time)) in files.into_iter().enumerate() {
                let metadata = match Self::get_metadata(Path::new(&path)) {
                    Ok(metadata) => metadata,
                    Err(e) => {
                        eprintln!("ERROR: Failed to get metadata for {}: {}", path, e);
                        continue;
                    }
                };
                let current = index as u64 + 1;

                entries.push(LibraryEntry {
                    path,
                    modified_time,
                    metadata,
                });

                if current == total || current == 1 || current % 25 == 0 {
                    Self::emit_progress(
                        progress.as_ref(),
                        LibraryScanProgress::new(
                            "metadata",
                            current,
                            Some(total),
                            format!("메타데이터 읽는 중... {}/{}", current, total),
                            entries.last().map(|entry| entry.path.clone()),
                        ),
                    );
                }
            }

            Ok(entries)
        })
        .await?
    }

    async fn delete_library_folder(db_pool: &Pool<Sqlite>, folder_path: &str) -> Result<()> {
        query("DELETE FROM library WHERE path = ?1 OR path LIKE ?2")
            .bind(folder_path)
            .bind(format!("{}{}%", folder_path, MAIN_SEPARATOR))
            .execute(db_pool)
            .await?;

        Ok(())
    }

    pub async fn refresh_library(&mut self, progress: Option<ProgressCallback>) -> Result<()> {
        Self::emit_progress(
            progress.as_ref(),
            LibraryScanProgress::new("started", 0, None, "라이브러리 갱신을 시작합니다.", None),
        );
        self.modified_time_map = Self::collect_modified_time_map(
            self.library_paths.iter().cloned().collect(),
            progress.clone(),
        )
        .await?;

        let stored_modified_time_map = Self::load_library_modified_time_map(&self.db_pool).await?;
        let stale_paths = stored_modified_time_map
            .keys()
            .filter(|path| !self.modified_time_map.contains_key(*path))
            .cloned()
            .collect::<Vec<_>>();
        let changed_modified_time_map = self
            .modified_time_map
            .iter()
            .filter(|(path, modified_time)| {
                stored_modified_time_map.get(*path) != Some(*modified_time)
            })
            .map(|(path, modified_time)| (path.clone(), *modified_time))
            .collect::<HashMap<_, _>>();

        Self::delete_library_files(&self.db_pool, &stale_paths, progress.clone()).await?;
        Self::upsert_library_entries(&self.db_pool, &changed_modified_time_map, progress.clone())
            .await?;
        Self::emit_progress(
            progress.as_ref(),
            LibraryScanProgress::new("completed", 1, Some(1), "라이브러리 갱신 완료", None),
        );
        Ok(())
    }

    async fn load_library_modified_time_map(
        db_pool: &Pool<Sqlite>,
    ) -> Result<HashMap<String, i64>> {
        Ok(query("SELECT path, mtime FROM library")
            .fetch_all(db_pool)
            .await?
            .into_iter()
            .map(|row| (row.get(0), row.get(1)))
            .collect())
    }

    async fn delete_library_files(
        db_pool: &Pool<Sqlite>,
        paths: &[String],
        progress: Option<ProgressCallback>,
    ) -> Result<()> {
        if paths.is_empty() {
            return Ok(());
        }

        let mut transaction = db_pool.begin().await?;
        let total = paths.len() as u64;

        for (index, path) in paths.iter().enumerate() {
            if let Err(e) = query("DELETE FROM library WHERE path = ?1")
                .bind(path)
                .execute(&mut *transaction)
                .await
            {
                eprintln!("ERROR: Failed to delete path from library: {}", e);
            }

            let current = index as u64 + 1;
            if current == total || current == 1 || current % 50 == 0 {
                Self::emit_progress(
                    progress.as_ref(),
                    LibraryScanProgress::new(
                        "database",
                        current,
                        Some(total),
                        format!("삭제된 파일 정리 중... {}/{}", current, total),
                        Some(path.clone()),
                    ),
                );
            }
        }

        transaction.commit().await?;
        Ok(())
    }

    pub async fn close(&self) -> Result<()> {
        self.db_pool.close().await;
        Ok(())
    }

    pub async fn set_library(
        &mut self,
        folder_paths: Vec<String>,
        progress: Option<ProgressCallback>,
    ) -> Result<()> {
        Self::emit_progress(
            progress.as_ref(),
            LibraryScanProgress::new("started", 0, None, "라이브러리 변경을 적용합니다.", None),
        );
        let new_library_paths = folder_paths.iter().cloned().collect::<HashSet<_>>();
        let added_library_paths = new_library_paths
            .difference(&self.library_paths)
            .cloned()
            .collect::<Vec<_>>();
        let removed_library_paths = self
            .library_paths
            .difference(&new_library_paths)
            .cloned()
            .collect::<Vec<_>>();

        if added_library_paths.is_empty() && removed_library_paths.is_empty() {
            Self::emit_progress(
                progress.as_ref(),
                LibraryScanProgress::new("completed", 1, Some(1), "변경된 내용이 없습니다.", None),
            );
            return Ok(());
        }

        self.update_watched_paths(&added_library_paths, &removed_library_paths);
        self.remove_library_paths(&removed_library_paths).await;
        self.add_library_paths(&added_library_paths).await;

        self.library_paths = new_library_paths;

        let added_modified_time_map =
            Self::collect_modified_time_map(added_library_paths.clone(), progress.clone()).await?;
        Self::upsert_library_entries(&self.db_pool, &added_modified_time_map, progress.clone())
            .await?;
        Self::emit_progress(
            progress.as_ref(),
            LibraryScanProgress::new("completed", 1, Some(1), "라이브러리 갱신 완료", None),
        );
        Ok(())
    }

    fn update_watched_paths(&self, added_paths: &[String], removed_paths: &[String]) {
        let mut debouncer = self
            .debouncer
            .write()
            .expect("ERROR: Failed to get debouncer lock");

        for folder_path in removed_paths {
            if let Err(e) = debouncer.unwatch(Path::new(folder_path)) {
                eprintln!("ERROR: Failed to unwatch path {}: {}", folder_path, e);
            }
        }

        for folder_path in added_paths {
            if let Err(e) = debouncer.watch(Path::new(folder_path), RecursiveMode::Recursive) {
                eprintln!("ERROR: Failed to watch path {}: {}", folder_path, e);
            }
        }
    }

    async fn remove_library_paths(&self, folder_paths: &[String]) {
        for folder_path in folder_paths {
            if let Err(e) = Self::delete_library_folder(&self.db_pool, folder_path).await {
                eprintln!("ERROR: Failed to delete library entries: {}", e);
            }

            if let Err(e) = query("DELETE FROM library_paths WHERE path = ?1")
                .bind(folder_path)
                .execute(&self.db_pool)
                .await
            {
                eprintln!("ERROR: Failed to delete library path: {}", e);
            }
        }
    }

    async fn add_library_paths(&self, folder_paths: &[String]) {
        for folder_path in folder_paths {
            if let Err(e) = query("INSERT INTO library_paths (path) VALUES (?1)")
                .bind(folder_path)
                .execute(&self.db_pool)
                .await
            {
                eprintln!("ERROR: Failed to insert library path: {}", e);
            }
        }
    }

    pub async fn get_selected_library(&self, mut path: String) -> Result<Vec<Track>> {
        if Path::new(&path).is_dir() {
            path.push(MAIN_SEPARATOR);
        }

        Ok(query(
            "SELECT path, mtime, title, artist, album, year, track, disk, duration, bitrate
            FROM library
            WHERE path LIKE ?1
            ORDER BY path ASC",
        )
        .bind(format!("{}%", path))
        .fetch_all(&self.db_pool)
        .await?
        .into_iter()
        .map(|row| Self::track_from_row(row, "library"))
        .collect())
    }

    pub fn get_library_paths(&self) -> Vec<String> {
        let mut library_paths = self.library_paths.iter().cloned().collect::<Vec<_>>();
        library_paths.sort();
        library_paths
    }

    pub fn get_cover_art(&self, path_string: String) -> Result<String> {
        let path = Path::new(&path_string);
        let modified_time = Self::cover_art_cache_stamp(path)?;

        if let Some(cached) = self
            .cover_art_cache
            .read()
            .expect("ERROR: Failed to get cover art cache lock")
            .get(&path_string)
        {
            if cached.modified_time == modified_time {
                return Ok(cached.data_url.clone());
            }
        }

        let tagged_file = Probe::open(path)?
            .options(Self::cover_art_parse_options())
            .read()?;
        let empty_tag = Tag::new(TagType::Id3v2);
        let tag = tagged_file
            .primary_tag()
            .or_else(|| tagged_file.first_tag())
            .unwrap_or(&empty_tag);

        let data_url = if let Some(picture) = tag.pictures().first() {
            let cover_art_type = picture
                .mime_type()
                .unwrap_or(&lofty::picture::MimeType::Jpeg);
            Self::data_url(cover_art_type.to_string(), picture.data())
        } else {
            Self::get_folder_cover_art(path)?
        };

        self.cover_art_cache
            .write()
            .expect("ERROR: Failed to get cover art cache lock")
            .insert(
                path_string,
                CoverArtCacheEntry {
                    modified_time,
                    data_url: data_url.clone(),
                },
            );

        Ok(data_url)
    }

    fn cover_art_cache_stamp(path: &Path) -> Result<i64> {
        let track_modified_time = Self::get_modified_time(path)?;
        let folder_cover_modified_time = Self::find_folder_cover_path(path)?
            .as_deref()
            .and_then(|path| Self::get_modified_time(path).ok())
            .unwrap_or(0);

        Ok(track_modified_time.max(folder_cover_modified_time))
    }

    fn get_folder_cover_art(path: &Path) -> Result<String> {
        let Some(cover_art_path) = Self::find_folder_cover_path(path)? else {
            return Ok(String::new());
        };

        let cover_art_data = std::fs::read(&cover_art_path)?;
        let cover_art_type = mime_guess::from_path(cover_art_path)
            .first_or_octet_stream()
            .to_string();

        Ok(Self::data_url(cover_art_type, &cover_art_data))
    }

    fn find_folder_cover_path(path: &Path) -> Result<Option<std::path::PathBuf>> {
        let Some(folder_path) = path.parent().and_then(|path| path.to_str()) else {
            return Ok(None);
        };

        let glob_string = format!("{}{}{}", folder_path, MAIN_SEPARATOR_STR, "cover.*");
        let mut cover_art_files = glob_with(&glob_string, GLOB_OPTIONS)?;

        Ok(cover_art_files.next().transpose()?)
    }

    fn data_url(mime_type: String, data: &[u8]) -> String {
        format!(
            "data:{};base64,{}",
            mime_type,
            general_purpose::STANDARD.encode(data)
        )
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
            .collect::<Vec<_>>();
        let playlist_index_by_uid = playlists
            .iter()
            .enumerate()
            .map(|(index, playlist)| (playlist.uid.clone(), index))
            .collect::<HashMap<_, _>>();

        for track in query(
            "SELECT playlist_uid, path, mtime, title, artist, album, year, track, disk, duration, bitrate
            FROM tracks
            ORDER BY playlist_uid ASC, path ASC",
        )
            .fetch_all(&self.db_pool)
            .await?
            .into_iter()
            .map(|row| Self::track_from_row(row, ""))
        {
            if let Some(index) = playlist_index_by_uid.get(&track.playlist_uid) {
                playlists[*index].tracks.push(track);
            }
        }

        Ok(playlists)
    }

    fn track_from_row(row: sqlx::sqlite::SqliteRow, fallback_playlist_uid: &str) -> Track {
        let mut offset = 0;
        let playlist_uid = if fallback_playlist_uid.is_empty() {
            offset = 1;
            row.get(0)
        } else {
            fallback_playlist_uid.to_string()
        };

        Track {
            playlist_uid,
            path: row.get(offset),
            mtime: row.get(offset + 1),
            title: row.get(offset + 2),
            artist: row.get(offset + 3),
            album: row.get(offset + 4),
            year: row.get(offset + 5),
            track_number: row.get(offset + 6),
            disk: row.get(offset + 7),
            duration: row.get(offset + 8),
            bitrate: row.get(offset + 9),
        }
    }
}
