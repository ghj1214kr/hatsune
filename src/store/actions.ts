import { atom } from "jotai";
import {
  audioAtom,
  playingIndexAtom,
  playingIndexListAtom,
  playingListAtom,
  playlistsAtom,
  positionAtom,
  shuffleAtom,
} from "./atoms";

import { Playlist } from "../types";

import { shuffleIndexList } from "../utils";

export const setPlaylistsAtom = atom(
  null,
  (get, set, { name, uid, trackList }: Playlist) => {
    const playlists = get(playlistsAtom);
    const index = playlists.findIndex((playlist) => playlist.uid === uid);
    if (index === -1) {
      playlists.push({ name, uid, trackList });
    } else {
      playlists[index].trackList = trackList;
    }
    set(playlistsAtom, playlists);
  }
);

export const toPreviousTrackAtom = atom(null, (get, set) => {
  if (get(positionAtom).time > 3) {
    get(audioAtom).currentTime = 0;
    return;
  }
  const playingListLength = get(playingListAtom).length;
  if (playingListLength === 1) {
    get(audioAtom).currentTime = 0;
    return;
  }
  const playingIndex = get(playingIndexAtom);
  if (playingIndex <= 0) {
    const playingIndexList = get(playingIndexListAtom);
    if (get(shuffleAtom)) {
      const tempArray1 = playingIndexList.slice();
      const tempArray2 = [...Array(playingListLength).keys()].filter(
        (index) => index !== playingIndexList[0]
      );
      tempArray1.splice(-playingListLength + 1, playingListLength - 1);
      tempArray1.unshift(...shuffleIndexList(tempArray2));
      set(playingIndexListAtom, tempArray1);
      set(playingIndexAtom, playingListLength);
    } else {
      set(playingIndexAtom, playingIndexList.length - 1);
    }
  } else {
    set(playingIndexAtom, playingIndex - 1);
  }
});

export const toNextTrackAtom = atom(null, (get, set) => {
  const playingListLength = get(playingListAtom).length;
  if (playingListLength === 1) {
    const audio = get(audioAtom);
    audio.currentTime = 0;
    audio.play();
    return;
  }
  const playingIndexListLength = get(playingIndexListAtom).length;
  const playingIndex = get(playingIndexAtom);
  if (playingIndex >= playingIndexListLength - 1) {
    if (get(shuffleAtom)) {
      const playingIndexList = get(playingIndexListAtom);
      const tempArray1 = playingIndexList.slice();
      const tempArray2 = [...Array(playingListLength).keys()].filter(
        (index) => index !== playingIndexList[playingIndexListLength - 1]
      );
      tempArray1.splice(0, playingListLength - 1);
      tempArray1.push(...shuffleIndexList(tempArray2));
      set(playingIndexListAtom, tempArray1);
      set(playingIndexAtom, playingListLength);
    } else {
      set(playingIndexAtom, 0);
    }
  } else {
    set(playingIndexAtom, playingIndex + 1);
  }
});

// export const refreshTrackMetadataAtom = atom(null, (get, set, newMetadata: Metadata) => {
//   const playingTrack = get(playingTrackAtom)
//   // TODO: 정보를 별도의 atom으로 분리시켜야 함
//   playingTrack.title = newMetadata.title;
//   playingTrack.artist = newMetadata.artist;
//   playingTrack.album = newMetadata.album;
//   // this.commit("toggleInfoChanged");
//   for (const playlist of get(playlistsAtom)) {
//     const track = playlist.trackList.find(
//       (track) => track.path === newMetadata.path
//     );
//     if (track === undefined) {
//       continue;
//     }
//     track.title = newMetadata.title;
//     track.artist = newMetadata.artist;
//     track.album = newMetadata.album;
//   }
// });
