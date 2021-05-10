import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("windowAPI", {
  minimize() {
    ipcRenderer.send("minimize");
  },
  close() {
    ipcRenderer.send("close");
  },
});

contextBridge.exposeInMainWorld("playlistAPI", {
  async getAllPlaylists() {
    return ipcRenderer.invoke("getAllPlaylists");
  },
  async getAllTrackList() {
    return ipcRenderer.invoke("getAllTrackList");
  },
  renamePlaylist(oldPlaylistName, newPlaylistName) {
    ipcRenderer.send("renamePlaylist", oldPlaylistName, newPlaylistName);
  },
  addPlaylist(playlistName) {
    ipcRenderer.send("addPlaylist", playlistName);
  },
  removePlaylist(playlistName) {
    ipcRenderer.send("removePlaylist", playlistName);
  },
  addTracksToPlaylist(playlistName, trackListWithMetadata) {
    ipcRenderer.send(
      "addTracksToPlaylist",
      playlistName,
      trackListWithMetadata
    );
  },
  removeTrackFromPlaylist(playlistName, path) {
    ipcRenderer.send("removeTrackFromPlaylist", playlistName, path);
  },
  reorderPlaylists(dragPlaylistName, targetPlaylistName) {
    ipcRenderer.send("reorderPlaylists", dragPlaylistName, targetPlaylistName);
  },
  reorderTrackList(playlistName, dragTrack, targetTrack) {
    ipcRenderer.send("reorderTrackList", playlistName, dragTrack, targetTrack);
  },
  refreshTrackMetadataInPlaylist(metadata) {
    ipcRenderer.send("refreshTrackMetadataInPlaylist", metadata);
  },
});

contextBridge.exposeInMainWorld("metadataAPI", {
  async getMetadata(trackPaths) {
    return ipcRenderer.invoke("getMetadata", trackPaths);
  },
  async getMetadataWithCoverArt(trackPath) {
    return ipcRenderer.invoke("getMetadataWithCoverArt", trackPath);
  },
});

contextBridge.exposeInMainWorld("fileAPI", {
  async getAllFilePaths(folderPath) {
    return ipcRenderer.invoke("getAllFilePaths", folderPath);
  },
  openDirectoryDialog(channel) {
    ipcRenderer.send("openDirectoryDialog", channel);
  },
  receiveDirectoryPath(channel, func) {
    ipcRenderer.on(channel, (event, directoryPath) => {
      func(directoryPath);
    });
  },
  openPathInDirectory(path) {
    ipcRenderer.send("openPathInDirectory", path);
  },
});

contextBridge.exposeInMainWorld("libraryAPI", {
  async getLibraryPaths() {
    return ipcRenderer.invoke("getLibraryPaths");
  },
  setLibraryPaths(paths) {
    ipcRenderer.send("setLibraryPaths", paths);
  },
  async getLibrary() {
    return ipcRenderer.invoke("getLibrary");
  },
  receiveLibrary(channel, func) {
    ipcRenderer.on(channel, (event, library) => {
      func(library);
    });
  },
  libraryReady(channel, func) {
    ipcRenderer.on(channel, (event) => {
      func();
    });
  },
  async getSelectedLibrary(selectedLibraryPath) {
    return ipcRenderer.invoke("getSelectedLibrary", selectedLibraryPath);
  },
});

contextBridge.exposeInMainWorld("configAPI", {
  async getConfig(name) {
    return ipcRenderer.invoke("getConfig", name);
  },
  setConfig(name, value) {
    ipcRenderer.send("setConfig", name, value);
  },
  openDevTools() {
    ipcRenderer.send("openDevTools");
  },
});

contextBridge.exposeInMainWorld("clipboardAPI", {
  setTextToClipboard(text) {
    ipcRenderer.send("setTextToClipboard", text);
  },
  setImageToClipboard(image) {
    ipcRenderer.send("setImageToClipboard", image);
  },
});

contextBridge.exposeInMainWorld("lyricAPI", {
  async getLyric(path, title, artist) {
    return ipcRenderer.invoke("getLyric", path, title, artist);
  },
});
