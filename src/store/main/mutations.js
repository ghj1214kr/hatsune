import { range } from "lodash";

// playback
export function setPlaying(state, playing) {
  state.playing = playing;
}

export function togglePlaying(state) {
  state.playing = !state.playing;
}

export function setLoop(state, loop) {
  state.loop = loop;
}

export function toggleLoop(state) {
  state.loop = !state.loop;
}

export function setShuffle(state, shuffle) {
  state.shuffle = shuffle;
}

export function toggleShuffle(state) {
  state.shuffle = !state.shuffle;
  if (state.shuffle) {
    const tempIndexList = state.playingIndexList.slice();
    const firstIndex = tempIndexList.splice(state.playingIndex, 1);
    const beforeIndexList = shuffleIndexList(tempIndexList.slice());
    const afterIndexList = shuffleIndexList(tempIndexList.slice());
    const finalIndexList = [
      ...beforeIndexList,
      ...firstIndex,
      ...afterIndexList,
    ];
    state.playingIndexList = finalIndexList;
    state.playingIndex = tempIndexList.length;
  } else {
    const tempIndexList = [
      ...Array((state.playingIndexList.length + 1) / 2).keys(),
    ];
    if (state.playingPlaylistName === "library") {
      const realIndex = state.playingIndexList[state.playingIndex];
      state.playingIndexList = tempIndexList;
      state.playingIndex = realIndex;
    } else {
      const playingTrackPath =
        state.playingList[state.playingIndexList[state.playingIndex]].path;
      state.playingList = state.playlists.find(
        (playlist) => playlist.name === state.playingPlaylistName
      ).trackList;
      state.playingIndexList = tempIndexList;
      state.playingIndex = state.playingList.findIndex(
        (playlist) => playlist.path === playingTrackPath
      );
    }
  }
}

export function setPosition(state, position) {
  state.position = position;
}

export function setSeekPosition(state, seekPosition) {
  state.seekPosition = seekPosition;
}

export function setCoverArtData(state, coverArtData) {
  state.coverArtData = coverArtData;
}

export function setPlayingPlaylistName(state, playingPlaylistName) {
  state.playingPlaylistName = playingPlaylistName;
}

export function setPlayingList(state, { playlistName, index, trackList = [] }) {
  state.playingPlaylistName = playlistName;
  if (trackList.length === 0) {
    state.playingList =
      playlistName === "library"
        ? Object.freeze(
            state.selectedLibrary.filter((track) => !track.isAlbumHeader)
          )
        : state.playlists.find((playlist) => playlist.name === playlistName)
            .trackList;
  } else {
    state.playingList = trackList;
  }
  const indexList = [...Array(state.playingList.length).keys()];
  if (state.shuffle) {
    const firstIndex = indexList.splice(index, 1);
    const beforeIndexList = shuffleIndexList(indexList.slice());
    const afterIndexList = shuffleIndexList(indexList.slice());
    const finalIndexList = [
      ...beforeIndexList,
      ...firstIndex,
      ...afterIndexList,
    ];
    state.playingIndexList = finalIndexList;
    state.playingIndex = indexList.length;
  } else {
    state.playingIndexList = indexList;
    state.playingIndex = index;
  }
}

export function toPreviousTrack(state) {
  if (state.position > 3) {
    this.commit("toggleBackToStart");
  } else if (state.playingList.length === 1) {
    this.commit("toggleBackToStart");
  } else if (state.playingIndex <= 0) {
    if (state.shuffle) {
      const tempArray1 = state.playingIndexList.slice();
      const tempArray2 = [...Array(state.playingList.length).keys()].filter(
        (index) => index !== state.playingIndexList[0]
      );
      tempArray1.splice(
        -state.playingList.length + 1,
        state.playingList.length - 1
      );
      tempArray1.unshift(...shuffleIndexList(tempArray2));
      state.playingIndexList = tempArray1;
      state.playingIndex = state.playingList.length;
    } else {
      state.playingIndex = state.playingIndexList.length - 1;
    }
  } else {
    state.playingIndex--;
  }
}

export function toNextTrack(state) {
  if (state.playingList.length === 1) {
    this.commit("toggleBackToStart");
  } else if (state.playingIndex >= state.playingIndexList.length - 1) {
    if (state.shuffle) {
      const tempArray1 = state.playingIndexList.slice();
      const tempArray2 = [...Array(state.playingList.length).keys()].filter(
        (index) =>
          index !== state.playingIndexList[state.playingIndexList.length - 1]
      );
      tempArray1.splice(0, state.playingList.length - 1);
      tempArray1.push(...shuffleIndexList(tempArray2));
      state.playingIndexList = tempArray1;
      state.playingIndex = state.playingList.length;
    } else {
      state.playingIndex = 0;
    }
  } else {
    state.playingIndex++;
  }
}

export function toggleBackToStart(state) {
  state.backToStart = !state.backToStart;
}

export function setWithLyric(state, withLyric) {
  state.withLyric = withLyric;
}

export function reset(state) {
  state.playingPlaylistName = "library";
  state.playingList = [
    {
      title: "",
      artist: "",
      album: "",
      duration: 0,
    },
  ];
  state.playingIndexList = [0];
  state.playingIndex = 0;
}

function shuffleIndexList(indexList) {
  for (let i = indexList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexList[i], indexList[j]] = [indexList[j], indexList[i]];
  }
  return indexList;
}

// library
export function setLibraryLoaded(state) {
  state.libraryLoaded = true;
}

export function setSelectedLibrary(state, selectedLibrary) {
  state.selectedLibrary = Object.freeze(selectedLibrary);
}

// playlist
export function setPlaylistLoaded(state) {
  state.playlistLoaded = true;
}

export function setPlaylists(state, playlists) {
  state.playlists = playlists;
}

export function setSelectedPlaylistName(state, selectedPlaylistName) {
  state.selectedPlaylistName = selectedPlaylistName;
}

export function addTracksToPlaylist(state, { playlistName, tracks }) {
  const temp1 = state.playlists.find(
    (playlist) => playlist.name === playlistName
  );
  const temp2 = temp1.trackList.slice();
  temp2.push(...tracks);
  temp1.trackList = temp2;
  temp1.loading = false;
  if (state.playingPlaylistName === playlistName) {
    state.playingList.push(...tracks);
    if (state.shuffle) {
      const newIndexList = range(
        state.playingList.length - tracks.length,
        state.playingList.length
      );
      const temp3 = state.playingIndexList.slice();
      temp3.unshift(...shuffleIndexList(newIndexList.slice()));
      temp3.push(...shuffleIndexList(newIndexList.slice()));
      state.playingIndexList = temp3;
      state.playingIndex = state.playingIndex + tracks.length;
    } else {
      state.playingIndexList = [...Array(state.playingList.length).keys()];
    }
  }
}

export function removeTrackFromSelectedPlaylist(state, path) {
  const index = state.playlists
    .find((playlist) => playlist.name === state.selectedPlaylistName)
    .trackList.findIndex((track) => track.path === path);
  const temp1 = state.playlists.find(
    (playlist) => playlist.name === state.selectedPlaylistName
  );
  const temp2 = temp1.trackList.slice();
  temp2.splice(index, 1);
  temp1.trackList = temp2;

  if (state.playingPlaylistName === state.selectedPlaylistName) {
    const playingTrackPath =
      state.playingList[state.playingIndexList[state.playingIndex]].path;
    if (playingTrackPath === path) {
      this.commit("reset");
      return;
    } else if (state.shuffle) {
      const tempIndexList = state.playingIndexList.slice(0, state.playingIndex);
      const indexToRemove = state.playingList.findIndex(
        (track) => track.path === path
      );
      state.playingList = state.playingList.filter(
        (track) => track.path !== path
      );
      state.playingIndexList = state.playingIndexList
        .filter((index) => index !== indexToRemove)
        .map((index) => (index > indexToRemove ? index - 1 : index));
      state.playingIndex =
        state.playingIndex -
        tempIndexList.filter((index) => index === indexToRemove).length;
    } else {
      state.playingList = state.playingList.filter(
        (track) => track.path !== path
      );
      state.playingIndexList = [...Array(state.playingList.length).keys()];
      state.playingIndex = state.playingList.findIndex(
        (track) => track.path === playingTrackPath
      );
    }
  }
}

export function reorderTrack(state, { oldIndex, newIndex, playlistName }) {
  if (playlistName === state.playingPlaylistName && !state.shuffle) {
    const tempPlayingList = state.playingList.slice();
    tempPlayingList.splice(newIndex, 0, tempPlayingList.splice(oldIndex, 1)[0]);
    state.playingList = tempPlayingList;

    if (oldIndex === state.playingIndex) {
      // playing track itself is rearranged
      state.playingIndex = newIndex;
    } else if (
      oldIndex < state.playingIndex &&
      newIndex >= state.playingIndex
    ) {
      // track has moved to the back of playing track
      state.playingIndex--;
    } else if (
      oldIndex > state.playingIndex &&
      newIndex <= state.playingIndex
    ) {
      // track has moved to the front of playing track
      state.playingIndex++;
    }
  }

  const temp1 = state.playlists.find(
    (playlist) => playlist.name === state.selectedPlaylistName
  );
  const temp2 = temp1.trackList.slice();
  temp2.splice(newIndex, 0, temp2.splice(oldIndex, 1)[0]);
  temp1.trackList = temp2;
}

export function renamePlaylist(state, { oldPlaylistName, newPlaylistName }) {
  state.playlists.find((playlist) => playlist.name === oldPlaylistName).name =
    newPlaylistName;
}

export function removePlaylist(state, playlistName) {
  if (playlistName === state.playingPlaylistName) {
    this.commit("reset");
  }

  state.playlists = state.playlists.filter(
    (playlist) => playlist.name !== playlistName
  );
}

export function addPlaylist(state, playlistName) {
  state.playlists.push({ name: playlistName, trackList: [] });
}

export function setLoadingStatusToPlaylist(state, { playlistName, loading }) {
  state.playlists.find((playlist) => playlist.name === playlistName).loading =
    loading;
}

export function toggleInfoChanged(state) {
  state.infoChanged = !state.infoChanged;
}

export function refreshTrackMetadataInPlaylist(state, newMetadata) {
  const playingTrack = state.playingList[state.playingIndex];
  playingTrack.title = newMetadata.title;
  playingTrack.artist = newMetadata.artist;
  playingTrack.album = newMetadata.album;
  this.commit("toggleInfoChanged");
  for (const playlist of state.playlists) {
    const track = playlist.trackList.find(
      (track) => track.path === newMetadata.path
    );
    if (track === undefined) {
      continue;
    }
    track.title = newMetadata.title;
    track.artist = newMetadata.artist;
    track.album = newMetadata.album;
  }
}

// setting
export function settingDialogShow(state, show) {
  state.settingDialog = show;
}

export function setLibraryReady(state, ready) {
  state.libraryReady = ready;
}

export function setBackgroundColor(state, backgroundColor) {
  state.backgroundColor = backgroundColor;
}

// trackProperties
export function setTrackPropertiesDialog(state, show) {
  state.trackPropertiesDialog = show;
}

export function setTrackPropertiesDialogData(state, trackMetaData) {
  state.trackPropertiesDialogData = trackMetaData;
}
