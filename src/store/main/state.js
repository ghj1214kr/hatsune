export default function () {
  return {
    // playback
    playing: false,
    loop: false,
    shuffle: false,
    position: 0,
    seekPosition: 0,
    coverArtData: "",
    playingPlaylistName: "library",
    playingList: [
      {
        title: "",
        artist: "",
        album: "",
        duration: 0,
      },
    ],
    playingIndexList: [0],
    playingIndex: 0,
    backToStart: false,
    withLyric: false,
    infoChanged: false,

    // library
    libraryLoaded: false,
    selectedLibrary: [],

    // playlist
    playlistLoaded: false,
    playlists: [],
    selectedPlaylistName: "",

    // setting
    settingDialog: false,
    libraryReady: true,
  };
}
