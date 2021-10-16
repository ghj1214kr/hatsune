// playback
export function getPlaying(state) {
  return state.playing;
}

export function getLoop(state) {
  return state.loop;
}

export function getShuffle(state) {
  return state.shuffle;
}

export function getPosition(state) {
  return state.position;
}

export function getSeekPosition(state) {
  return state.seekPosition;
}

export function getCoverArtData(state) {
  return state.coverArtData;
}

export function getPlayingPlaylistName(state) {
  return state.playingPlaylistName;
}

export function getPlayingList(state) {
  return state.playingList;
}

export function getPlayingTrackPath(state) {
  return state.playingList[state.playingIndexList[state.playingIndex]].path;
}

export function getPlayingTrack(state) {
  return state.playingList[state.playingIndexList[state.playingIndex]];
}

export function getBackToStart(state) {
  return state.backToStart;
}

export function getWithLyric(state) {
  return state.withLyric;
}

export function getInfoChanged(state) {
  return state.infoChanged;
}

// library
export function getLibraryLoaded(state) {
  return state.libraryLoaded;
}

export function getSelectedLibrary(state) {
  return state.selectedLibrary;
}

// playlist
export function getPlaylistLoaded(state) {
  return state.playlistLoaded;
}

export function getPlaylists(state) {
  return state.playlists;
}

export function getPlaylistsWithoutLibrary(state) {
  return state.playlists.filter((playlist) => playlist.name !== "library");
}

export function getSelectedPlaylistName(state) {
  return state.selectedPlaylistName;
}

export function getNextSelectedPlaylistName(state) {
  const index = state.playlists.findIndex(
    (x) => x.name === state.selectedPlaylistName
  );
  try {
    return state.playlists[index + 1].name;
  } catch (error) {
    return state.playlists[index - 1].name;
  }
}

export function getTrackListFromPlaylist(state) {
  return (playlistName) => {
    if (state.playlists.find((x) => x.name === playlistName) !== undefined) {
      return state.playlists.find((x) => x.name === playlistName).trackList;
    } else {
      return [];
    }
  };
}

export function getLoadingStatusFromPlaylist(state) {
  return (playlistName) =>
    state.playlists.find((x) => x.name === playlistName).loading;
}

// setting
export function getSettingDialog(state) {
  return state.settingDialog;
}

export function getLibraryReady(state) {
  return state.libraryReady;
}

export function getBackgroundColor(state) {
  return state.backgroundColor;
}

// trackProperties
export function getTrackPropertiesDialog(state) {
  return state.trackPropertiesDialog;
}

export function getTrackPropertiesDialogData(state) {
  return state.trackPropertiesDialogData;
}
