import {
  app,
  BrowserWindow,
  nativeTheme,
  ipcMain,
  dialog,
  shell,
  clipboard,
  nativeImage,
} from "electron";
import path from "path";
import * as musicMetadata from "music-metadata";
import audioExtensions from "audio-extensions";
import mime from "mime-types";
import fg from "fast-glob";
import normalize from "normalize-path";
import Database from "better-sqlite3";
import SyncMusicDb from "sync-music-db-bs3";
import Store from "electron-store";
import fs from "fs";
import semver from "semver";
import { Octokit } from "@octokit/rest";

try {
  if (
    process.platform === "win32" &&
    nativeTheme.shouldUseDarkColors === true
  ) {
    fs.unlinkSync(path.join(app.getPath("userData"), "DevTools Extensions"));
  }
} catch (_) {}

const audioExtensionsString = audioExtensions.join("|");

const store = new Store({
  defaults: {
    lang: "en-US",
    checkUpdateOnStartup: true,
    backgroundColor: {
      angle: 30,
      startColor: "#c53988",
      endColor: "#39c5bb",
    },
    loop: false,
    shuffle: false,
    volume: 50,
    mute: false,
    selectedNode: [],
    expandedNode: [],
    selectedNodePath: "",
    selectedPlaylistName: "library",
    playingNodePath: "",
    playingPlaylistName: "library",
    playingPath: "",
  },
  clearInvalidConfig: true,
});

const config = {};

const collator = new Intl.Collator("ja", {
  numeric: true,
  sensitivity: "base",
});

const octokit = new Octokit({
  userAgent: "ghj1214kr/hatsune v" + app.getVersion(),
});

let splashWindow;
let mainWindow;
let database;
let syncMusicDb;
let libraryPaths;
let dbRefreshTimer;
let libraryPathChanged = false;

init();

async function init() {
  switch (process.platform) {
    case "darwin": {
      const tempPath = path.join(
        process.env.HOME,
        "Library",
        "Application Support",
        "Hatsune",
        "database.db"
      );
      database = new Database(tempPath);
      break;
    }
    case "win32": {
      database = new Database("database.db");
      break;
    }
  }

  database
    .prepare(
      "CREATE TABLE IF NOT EXISTS playlists(id INTEGER NOT NULL UNIQUE," +
        "name TEXT NOT NULL UNIQUE,PRIMARY KEY(id))"
    )
    .run();

  database
    .prepare(
      "CREATE TABLE IF NOT EXISTS trackList(id INTEGER NOT NULL UNIQUE," +
        "playlist TEXT NOT NULL,path TEXT NOT NULL,mtime INTEGER NOT NULL,title TEXT NOT NULL," +
        "artist TEXT,album TEXT,duration INTEGER NOT NULL,UNIQUE(id,playlist,path)," +
        "FOREIGN KEY(playlist)REFERENCES playlists(name)ON UPDATE CASCADE ON DELETE CASCADE,PRIMARY KEY(id))"
    )
    .run();

  if (database.prepare("SELECT * FROM playlists").all().length === 0) {
    database.prepare("INSERT INTO playlists VALUES(1,'library')").run();
  }

  database
    .prepare(
      "CREATE TABLE IF NOT EXISTS libraryPaths(id INTEGER NOT NULL UNIQUE," +
        "path TEXT NOT NULL UNIQUE, PRIMARY KEY(id))"
    )
    .run();

  libraryPaths = database
    .prepare("SELECT path FROM libraryPaths")
    .all()
    .map((obj) => obj.path);
  syncMusicDb = new SyncMusicDb({
    db: database,
    dirs: libraryPaths,
  });

  await syncMusicDb.createTable();

  syncMusicDb
    .on("ready", () => {
      if (libraryPathChanged) {
        mainWindow.webContents.send("receiveLibrary", getLibrary());
      }
      mainWindow.webContents.send("libraryReady");
    })
    .on("add", (track) => {
      libraryPathChanged = false;
      clearTimeout(dbRefreshTimer);
      dbRefreshTimer = setTimeout(() => {
        mainWindow.webContents.send("receiveLibrary", getLibrary());
      }, 1000);
    })
    .on("update", (track) => {
      libraryPathChanged = false;
      clearTimeout(dbRefreshTimer);
      dbRefreshTimer = setTimeout(() => {
        mainWindow.webContents.send("receiveLibrary", getLibrary());
      }, 1000);
    })
    .on("remove", (path) => {
      libraryPathChanged = false;
      clearTimeout(dbRefreshTimer);
      dbRefreshTimer = setTimeout(() => {
        mainWindow.webContents.send("receiveLibrary", getLibrary());
      }, 1000);
    })
    .on("error", (err) => console.error(err))
    .refresh();
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 300,
    useContentSize: true,
    frame: false,
    resizable: false,
    transparent: true,
  });

  splashWindow.loadFile("splash.svg");

  splashWindow.on("close", () => {
    if (!mainWindow.isVisible()) {
      app.quit();
    }
  });
}

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    frame: false,
    resizable: false,
    show: process.env.DEBUGGING ? true : false,
    webPreferences: {
      spellcheck: false,
      contextIsolation: true,
      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD),
    },
  });

  mainWindow.loadURL(process.env.APP_URL);

  mainWindow.webContents.session.protocol.registerFileProtocol(
    "file-protocol",
    (request, callback) => {
      const url = request.url.replace("file-protocol://", "");
      callback(decodeURI(url));
    }
  );

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    store.set(config);
    mainWindow = null;
  });
}

app.on("ready", () => {
  if (!process.env.DEBUGGING) {
    createSplash();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.on("loaded", () => {
  setTimeout(() => {
    mainWindow.show();
    if (splashWindow !== undefined) {
      splashWindow.destroy();
    }
  }, 3000);
});

ipcMain.on("minimize", () => {
  mainWindow.minimize();
});

ipcMain.on("close", () => {
  mainWindow.close(); // not working on dev
});

function getMetadata(track) {
  return new Promise((resolve) => {
    musicMetadata
      .parseFile(track.path, { duration: true, skipCovers: true })
      .then((metadata) => {
        const trackObject = {
          title: metadata.common.title ?? path.basename(track.path),
          artist: metadata.common.artists?.join(","),
          album: metadata.common.album,
          duration: Math.round(metadata.format.duration),
          path: track.path,
          mtime: fs.statSync(track.path).mtime.getTime(),
          playlist: track.playlist,
        };
        resolve(trackObject);
      });
  });
}

ipcMain.handle("getMetadata", (event, tracks) => {
  const metadataArray = Promise.all(
    tracks.map((track) => {
      return getMetadata(track);
    })
  );
  return metadataArray;
});

ipcMain.handle("getMetadataWithCoverArt", async (event, trackPath) => {
  try {
    const metadata = await musicMetadata.parseFile(trackPath);
    const trackObject = {
      title: metadata.common.title ?? path.basename(trackPath),
      artist: metadata.common.artists?.join(","),
      album: metadata.common.album,
      duration: Math.round(metadata.format.duration),
      path: trackPath,
      mtime: fs.statSync(trackPath).mtime.getTime(),
    };
    if (metadata.common.picture) {
      const coverArtData = `data:${
        metadata.common.picture[0].format
      };base64,${metadata.common.picture[0].data.toString("base64")}`;
      trackObject.coverArt = coverArtData;
      return trackObject;
    } else {
      const files = await fg("cover.*", {
        cwd: normalize(path.dirname(trackPath)),
        absolute: true,
        caseSensitiveMatch: false,
      });

      if (files.length !== 0 && mime.lookup(files[0]).includes("image")) {
        const contents = fs.readFileSync(files[0], { encoding: "base64" });

        trackObject.coverArt = `data:${mime.lookup(
          files[0]
        )};base64,${contents}`;

        return trackObject;
      } else {
        trackObject.coverArt = "";
        return trackObject;
      }
    }
  } catch (error) {
    return {};
  }
});

ipcMain.handle("getMetadataForProperties", async (event, trackPath) => {
  const metadata = await musicMetadata.parseFile(trackPath, {
    duration: true,
    skipCovers: true,
  });
  const trackObject = {
    title: metadata.common.title,
    artist: metadata.common.artists?.join(","),
    albumartist: metadata.common.albumartist,
    album: metadata.common.album,
    year: metadata.common.year,
    track_no: metadata.common.track.no,
    disk_no: metadata.common.disk.no,
    genre: metadata.common.genre,
    composer: metadata.common.composer,
    duration: Math.round(metadata.format.duration),
    tagTypes: metadata.format.tagTypes?.join(","),
    lossless: metadata.format.lossless,
    container: metadata.format.container,
    codec: metadata.format.codec,
    sampleRate: metadata.format.sampleRate,
    bitrate: Math.round(metadata.format.bitrate / 1000),
    codecProfile: metadata.format.codecProfile,
    path: trackPath,
  };
  return trackObject;
});

ipcMain.handle("getAllPlaylists", () => {
  return database.prepare("SELECT name FROM playlists").all();
});

ipcMain.handle("getAllTrackList", () => {
  return database
    .prepare(
      "SELECT playlist,path,mtime,title,artist,album,duration FROM trackList"
    )
    .all();
});

ipcMain.on("addPlaylist", (event, playlistName) => {
  database.prepare("INSERT INTO playlists VALUES(NULL,?)").run(playlistName);
});

ipcMain.on("removePlaylist", (event, playlistName) => {
  database.prepare("DELETE FROM playlists WHERE name=?").run(playlistName);
});

ipcMain.on("renamePlaylist", (event, oldPlaylistName, newPlaylistName) => {
  database
    .prepare("UPDATE playlists SET name=? WHERE name=?")
    .run(newPlaylistName, oldPlaylistName);
});

ipcMain.on("addTracksToPlaylist", (event, playlistName, tracks) => {
  const stmt = database.prepare(
    "INSERT INTO trackList VALUES(NULL,?,?,?,?,?,?,?)"
  );
  const insert = database.transaction((tracks) => {
    for (const track of tracks)
      stmt.run(
        playlistName,
        track.path,
        track.mtime,
        track.title ?? path.basename(track.path),
        track.artist,
        track.album,
        track.duration
      );
  });
  insert(tracks);
});

ipcMain.on(
  "reorderPlaylists",
  (event, dragPlaylistName, targetPlaylistName) => {
    const oldIndex = database
      .prepare("SELECT id FROM playlists WHERE name=?")
      .get(dragPlaylistName).id;
    const newIndex = database
      .prepare("SELECT id FROM playlists WHERE name=?")
      .get(targetPlaylistName).id;
    database.prepare("UPDATE playlists SET id=0 WHERE id=?").run(oldIndex);
    database
      .prepare(
        "UPDATE playlists SET id = CASE WHEN @newIndex<@oldIndex THEN -(id+1) " +
          "WHEN @newIndex>@oldIndex THEN -(id-1) END WHERE id BETWEEN " +
          "MIN(@oldIndex,@newIndex) AND MAX(@oldIndex,@newIndex)"
      )
      .run({
        oldIndex: oldIndex,
        newIndex: newIndex,
      });
    database.prepare("UPDATE playlists SET id=-id WHERE id<0").run();
    database.prepare("UPDATE playlists SET id=? WHERE id=0").run(newIndex);
  }
);

ipcMain.on("removeTrackFromPlaylist", (event, playlistName, path) => {
  database
    .prepare("DELETE FROM trackList WHERE path=? AND playlist=?")
    .run(path, playlistName);
});

ipcMain.on(
  "reorderTrackList",
  (event, playlistName, dragTrack, targetTrack) => {
    const oldIndex = database
      .prepare("SELECT id FROM trackList WHERE playlist=? AND path=?")
      .get(playlistName, dragTrack.path).id;
    let newIndex;
    if (targetTrack !== undefined) {
      newIndex = database
        .prepare("SELECT id FROM trackList WHERE playlist=? AND path=?")
        .get(playlistName, targetTrack.path).id;
    } else {
      // reached the end through virtual scrolling
      newIndex = database
        .prepare(
          "SELECT id FROM trackList WHERE playlist=? AND id=(SELECT MAX(id) FROM trackList)"
        )
        .get(playlistName).id;
    }
    database
      .prepare("DELETE FROM trackList WHERE path=? AND playlist=?")
      .run(dragTrack.path, playlistName);
    database
      .prepare(
        "UPDATE trackList SET id = CASE WHEN @newIndex<@oldIndex THEN -(id+1) " +
          "WHEN @newIndex>@oldIndex THEN -(id-1) END WHERE id BETWEEN " +
          "MIN(@oldIndex,@newIndex) AND MAX(@oldIndex,@newIndex)"
      )
      .run({
        oldIndex: oldIndex,
        newIndex: newIndex,
      });
    database.prepare("UPDATE trackList SET id = -id WHERE id < 0").run();
    database
      .prepare(
        "INSERT INTO trackList VALUES(@id,@playlist,@path,@mtime,@title," +
          "@artist,@album,@duration)"
      )
      .run({
        id: newIndex,
        playlist: playlistName,
        path: dragTrack.path,
        mtime: dragTrack.mtime,
        title: dragTrack.title,
        artist: dragTrack.artist,
        album: dragTrack.album,
        duration: dragTrack.duration,
      });
  }
);

ipcMain.on("refreshTrackMetadataInPlaylist", (event, metadata) => {
  database
    .prepare(
      "UPDATE trackList SET mtime=@mtime,title=@title,artist=@artist," +
        "album=@album WHERE path=@path"
    )
    .run({
      mtime: metadata.mtime,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      path: metadata.path,
    });
});

ipcMain.handle("getAllFilePaths", async (event, directoryPath) => {
  const files = await fg("**/*.+(" + audioExtensionsString + ")", {
    cwd: normalize(directoryPath),
    absolute: true,
    caseSensitiveMatch: false,
  });

  return files.map((p) => p.replaceAll("/", path.sep));
});

ipcMain.on("openDirectoryDialog", (event, channel) => {
  dialog
    .showOpenDialog(mainWindow, { properties: ["openDirectory"] })
    .then((result) => {
      if (!result.canceled) {
        const directoryPath = result.filePaths[0];
        if (
          database
            .prepare("SELECT * FROM libraryPaths WHERE path=?")
            .all(directoryPath).length > 0
        ) {
          mainWindow.webContents.send(channel, -1);
          return;
        }
        mainWindow.webContents.send(channel, directoryPath);
      }
    })
    .catch((err) => {
      dialog.showErrorBox("Error", err.toString());
    });
});

ipcMain.handle("getLibraryPaths", () => {
  return database
    .prepare("SELECT path FROM libraryPaths")
    .all()
    .map((obj) => obj.path);
});

ipcMain.on("setLibraryPaths", (event, paths) => {
  const libraryPathsToAdd = paths.filter((p) => !libraryPaths.includes(p));
  const libraryPathsToRemove = libraryPaths.filter((p) => !paths.includes(p));

  database.prepare("DELETE FROM libraryPaths").run();
  const addStmt = database.prepare("INSERT INTO libraryPaths VALUES(NULL,?)");
  const add = database.transaction((directoryPaths) => {
    for (const directoryPath of directoryPaths) {
      addStmt.run(directoryPath);
    }
  });
  add(paths);

  libraryPaths = paths;

  syncMusicDb.addDirs(libraryPathsToAdd);
  syncMusicDb.removeDirs(libraryPathsToRemove);

  if (libraryPaths.length !== 0) {
    syncMusicDb.refresh();
    libraryPathChanged = true;
  } else {
    mainWindow.webContents.send("receiveLibrary", []);
    mainWindow.webContents.send("libraryReady");
  }
});

function sortTree(node) {
  node.sort((a, b) => {
    if (a.children.length > 0 && b.children.length === 0) {
      return -1;
    } else if (a.children.length === 0 && b.children.length > 0) {
      return 1;
    } else {
      return collator.compare(a.text.toLowerCase(), b.text.toLowerCase());
    }
  });
  node.forEach((node) => {
    if (node.children.length > 0) {
      sortTree(node.children);
    }
  });
}

function getLibrary() {
  const library = database
    .prepare("SELECT path, title, artist, album FROM library")
    .all();

  if (library.length === 0) {
    return [];
  }

  const libraryPaths = database
    .prepare("SELECT path FROM libraryPaths")
    .all()
    .map((obj) => obj.path);

  const libraryGroupByPaths = {};

  // classify path of libraries according to library list
  for (const libraryPath of libraryPaths) {
    libraryGroupByPaths[path.basename(libraryPath)] = library.filter((x) =>
      x.path.includes(libraryPath)
    );
  }

  const libraryResult = [];

  for (const libraryName in libraryGroupByPaths) {
    // skip if there is no music in the registered library path
    if (libraryGroupByPaths[libraryName].length === 0) {
      continue;
    }

    const result = [];
    const level = { result };

    // organize the path into a tree
    libraryGroupByPaths[libraryName].forEach((track) => {
      track.path.split(path.sep).reduce((r, text) => {
        if (!r[text]) {
          const tempPath =
            (r.path === undefined ? "" : r.path + path.sep) + text;
          r[text] = {
            result: [],
            path: tempPath,
            meta: [tempPath, track.title, track.artist, track.album].join(","),
          };
          r.result.push({
            text,
            path: tempPath,
            meta: [tempPath, track.title, track.artist, track.album].join(","),
            children: r[text].result,
          });
        }

        return r[text];
      }, level);
    });

    // remove unnecessary parent directories
    let temp = result[0];
    while (temp.children[0].children.length === 1) {
      temp = temp.children[0];
    }

    sortTree(temp.children);

    libraryResult.push(...temp.children);
  }

  return libraryResult;
}

ipcMain.handle("getLibrary", () => {
  return getLibrary();
});

ipcMain.on("openPathInDirectory", (event, targetPath) => {
  shell.showItemInFolder(targetPath.replaceAll("/", path.sep));
});

ipcMain.handle("getSelectedLibrary", (event, selectedLibraryPath) => {
  const stmt = database.prepare(
    "SELECT path,mtime,title,artist,album,year,duration,track_no " +
      "FROM library WHERE path LIKE :searchTerm ORDER BY path ASC"
  );
  let selectedLibrary = stmt.all({
    searchTerm: `${selectedLibraryPath + path.sep}%`,
  });

  if (selectedLibrary.length === 0) {
    selectedLibrary = stmt.all({ searchTerm: `${selectedLibraryPath}%` });
  }

  if (selectedLibrary.length === 0) {
    return [];
  }

  selectedLibrary.sort((a, b) => {
    return collator.compare(a.path.toLowerCase(), b.path.toLowerCase());
  });

  const maxIndex = selectedLibrary.length - 1;
  let pathAndAlbum =
    path.dirname(selectedLibrary[maxIndex].path) +
    selectedLibrary[maxIndex].album;

  // insert album header at the beginning of the album
  for (let index = selectedLibrary.length - 1; index >= 0; index--) {
    const currentPathAndAlbum =
      path.dirname(selectedLibrary[index].path) + selectedLibrary[index].album;
    if (pathAndAlbum !== currentPathAndAlbum) {
      spliceAlbumHeader(selectedLibrary, index + 1);
      pathAndAlbum = currentPathAndAlbum;
      if (index === 0) {
        spliceAlbumHeader(selectedLibrary, 0);
      }
    } else if (index === 0) {
      spliceAlbumHeader(selectedLibrary, 0);
    }
  }

  return selectedLibrary;
});

function spliceAlbumHeader(library, index) {
  const trackObject = library[index];
  if (trackObject !== null && trackObject.album !== null) {
    library.splice(index, 0, {
      key: path.dirname(trackObject.path) + trackObject.title,
      isAlbumHeader: true,
      path: path.dirname(trackObject.path),
      title: trackObject.album,
      year: trackObject.year,
      firstTrackPath: trackObject.path,
    });
  }
}

ipcMain.on("setTextToClipboard", (event, text) => {
  clipboard.writeText(text);
});

ipcMain.on("setImageToClipboard", (event, image) => {
  clipboard.writeImage(nativeImage.createFromDataURL(image));
});

ipcMain.handle("getConfig", (event, name) => {
  return store.get(name);
});

ipcMain.on("setConfig", (event, name, value) => {
  config[name] = value;
});

ipcMain.on("openDevTools", () => {
  mainWindow.webContents.openDevTools();
});

ipcMain.handle("getVersion", () => {
  return app.getVersion();
});

ipcMain.on("openGithubPage", () => {
  shell.openExternal("https://github.com/ghj1214kr/hatsune");
});

ipcMain.handle("updateCheck", async () => {
  try {
    const res = await octokit.rest.repos.getLatestRelease({
      owner: "ghj1214kr",
      repo: "hatsune",
    });
    return {
      available: semver.gt(res.data.tag_name, app.getVersion()),
      latestVersion: res.data.tag_name,
    };
  } catch (error) {
    return { available: false, latestVersion: app.getVersion() };
  }
});

ipcMain.on("openLatestReleasePage", () => {
  shell.openExternal("https://github.com/ghj1214kr/hatsune/releases/latest");
});

ipcMain.handle("getLyric", async (event, path, title, artist) => {
  return {};
});
