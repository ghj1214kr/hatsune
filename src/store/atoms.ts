import { atom } from "jotai";
import { LogicalSize, getCurrentWindow } from "@tauri-apps/api/window";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

import { getPlayingTrackAtom } from "./getters";
import { shuffleIndexList } from "../utils";
import { LibraryTree, Playlist, PlaylistItem } from "../types";

export const store = await load("config.json", {
  defaults: {},
  autoSave: false,
});

await invoke("refresh_allow_directory");

const playlists = await invoke<Playlist[]>("get_playlists");
const selectedNode = (await store.get<string>("selectedLibraryNode")) || "";
const selectedLibrary =
  selectedNode.length > 0
    ? await invoke<PlaylistItem[]>("get_selected_library", {
        path: selectedNode,
      })
    : [];
const selectedPlaylistUid =
  (await store.get<string>("selectedPlaylistUid")) || "library";
const playingPlaylistUid =
  (await store.get<string>("playingPlaylistUid")) || "library";
const playingList =
  playingPlaylistUid === "library"
    ? selectedLibrary
    : await invoke<PlaylistItem[]>("get_playlist", {
        uid: playingPlaylistUid,
      });
let playingIndex = (await store.get<number>("playingIndex")) || 0;
const shuffle = (await store.get<boolean>("shuffle")) || false;

const playingIndexList = (() => {
  if (shuffle) {
    const indexList = [...Array(playingList.length).keys()].filter(
      (index) => index !== playingIndex
    );
    const firstIndex = playingIndex;
    const beforeIndexList = shuffleIndexList(indexList.slice());
    const afterIndexList = shuffleIndexList(indexList.slice());
    playingIndex = beforeIndexList.length;
    return [...beforeIndexList, firstIndex, ...afterIndexList];
  } else {
    return [...Array(playingList.length).keys()];
  }
})();

const basePipAtom = atom(false);
export const pipAtom = atom(
  (get) => get(basePipAtom),
  (_get, set, newPip: boolean) => {
    const appWindow = getCurrentWindow();
    appWindow.setMaximizable(!newPip);
    appWindow.setResizable(!newPip);
    appWindow.setAlwaysOnTop(newPip);
    if (newPip) {
      appWindow.setSize(new LogicalSize(300, 300));
      appWindow.center();
    } else {
      appWindow.setSize(new LogicalSize(1280, 720));
      appWindow.center();
    }
    set(basePipAtom, newPip);
  }
);

export const audioAtom = atom<HTMLAudioElement>(new Audio());

const basePlayingAtom = atom(false);
export const playingAtom = atom(
  (get) => get(basePlayingAtom),
  (get, set, newPlaying: boolean) => {
    const audio = get(audioAtom);
    const isSrcSet = audio.src.length > 0;
    newPlaying ? isSrcSet && audio.play() : audio.pause();
    isSrcSet && set(basePlayingAtom, newPlaying);
  }
);
const baseLoopAtom = atom((await store.get<boolean>("loop")) || false);
export const loopAtom = atom(
  (get) => get(baseLoopAtom),
  (_get, set, loop: boolean) => {
    set(baseLoopAtom, loop);
    store.set("loop", loop);
  }
);
export const baseShuffleAtom = atom(shuffle);
export const shuffleAtom = atom(
  (get) => get(baseShuffleAtom),
  (get, set, shuffle: boolean) => {
    set(baseShuffleAtom, shuffle);
    store.set("shuffle", shuffle);

    if (shuffle) {
      const tempIndexList = get(playingIndexListAtom).slice();
      const firstIndex = tempIndexList.splice(get(playingIndexAtom), 1);
      const beforeIndexList = shuffleIndexList(tempIndexList.slice());
      const afterIndexList = shuffleIndexList(tempIndexList.slice());
      const finalIndexList = [
        ...beforeIndexList,
        ...firstIndex,
        ...afterIndexList,
      ];
      set(playingIndexListAtom, finalIndexList);
      set(playingIndexAtom, tempIndexList.length);
    } else {
      const tempIndexList = [
        ...Array((get(playingIndexListAtom).length + 1) / 2).keys(),
      ];
      if (get(playingPlaylistUidAtom) === "library") {
        const realIndex = get(playingIndexListAtom)[get(playingIndexAtom)];
        set(playingIndexListAtom, tempIndexList);
        set(playingIndexAtom, realIndex);
      } else {
        const playingTrack = get(getPlayingTrackAtom);
        set(playingIndexListAtom, tempIndexList);
        const playingPlaylist = get(playingListAtom);
        set(
          playingIndexAtom,
          playingPlaylist.findIndex((track) => track.path === playingTrack.path)
        );
      }
    }
  }
);

const basePositionAtom = atom(0);
const baseSeekingAtom = atom(false);
export const positionAtom = atom(
  (get) => {
    return { time: get(basePositionAtom), seeking: get(baseSeekingAtom) };
  },
  (
    get,
    set,
    {
      newPosition,
      mode,
    }: { newPosition: number; mode: "timeupdate" | "seeking" | "seeked" }
  ) => {
    switch (mode) {
      case "timeupdate":
        get(baseSeekingAtom) || set(basePositionAtom, newPosition);
        break;
      case "seeking":
        set(baseSeekingAtom, true);
        set(basePositionAtom, newPosition);
        break;
      case "seeked":
        set(baseSeekingAtom, false);
        set(basePositionAtom, newPosition);
        get(audioAtom).currentTime = newPosition;
        break;
    }
  }
);
const mutedVolumeAtom = atom(0);
const baseVolumeAtom = atom((await store.get<number>("volume")) || 0.5);
export const volumeAtom = atom(
  (get) => get(baseVolumeAtom),
  (get, set, newVolume: number) => {
    get(audioAtom).volume = newVolume;
    set(baseVolumeAtom, newVolume);
    // store.set("volume", newVolume);
  }
);
const baseMutedAtom = atom((await store.get<boolean>("muted")) || false);
export const mutedAtom = atom(
  (get) => get(baseMutedAtom),
  (get, set, newMuted: boolean) => {
    if (newMuted) {
      set(mutedVolumeAtom, get(volumeAtom));
      set(volumeAtom, 0);
    } else {
      const mutedVolume = get(mutedVolumeAtom);
      mutedVolume > 0 && set(volumeAtom, mutedVolume);
    }
    get(audioAtom).muted = newMuted;
    set(baseMutedAtom, newMuted);
  }
);

export const coverArtAtom = atom("");

const basePlayingNodeAtom = atom(
  (await store.get<string>("playingNode")) || ""
);
export const playingNodeAtom = atom(
  (get) => get(basePlayingNodeAtom),
  (_get, set, playingNode: string) => {
    set(basePlayingNodeAtom, playingNode);
    store.set("playingNode", playingNode);
  }
);
const basePlayingPlaylistUidAtom = atom(playingPlaylistUid);
export const playingPlaylistUidAtom = atom(
  (get) => get(basePlayingPlaylistUidAtom),
  (_get, set, playingPlaylistUid: string) => {
    set(basePlayingPlaylistUidAtom, playingPlaylistUid);
    store.set("playingPlaylistUid", playingPlaylistUid);
  }
);

export const playingIndexListAtom = atom(playingIndexList);
export const basePlayingIndexAtom = atom(
  (() => {
    if (shuffle) {
      return playingIndexList.find((index) => index === playingIndex) || 0;
    } else {
      return playingIndex;
    }
  })()
);
export const playingIndexAtom = atom(
  (get) => get(basePlayingIndexAtom),
  (get, set, playingIndex: number) => {
    set(basePlayingIndexAtom, playingIndex);
    if (get(shuffleAtom)) {
      store.set("playingIndex", get(playingIndexListAtom)[playingIndex]);
    } else {
      store.set("playingIndex", playingIndex);
    }
  }
);

const basePlayingListAtom = atom<PlaylistItem[]>(playingList);
export const playingListAtom = atom(
  (get) => get(basePlayingListAtom),
  (
    get,
    set,
    playlistUid: string,
    playingList: PlaylistItem[],
    index: number
  ) => {
    set(basePlayingListAtom, playingList);
    set(playingPlaylistUidAtom, playlistUid);
    const indexList = [...Array(playingList.length).keys()];
    if (get(shuffleAtom)) {
      const firstIndex = indexList.splice(index, 1);
      const beforeIndexList = shuffleIndexList(indexList.slice());
      const afterIndexList = shuffleIndexList(indexList.slice());
      const finalIndexList = [
        ...beforeIndexList,
        ...firstIndex,
        ...afterIndexList,
      ];
      set(playingIndexListAtom, finalIndexList);
      set(playingIndexAtom, indexList.length);
    } else {
      set(playingIndexListAtom, indexList);
      set(playingIndexAtom, index);
    }
  }
);

export const withLyricAtom = atom(false);

export const libraryAtom = atom(await invoke<LibraryTree[]>("get_library"));
export const libraryLoadedAtom = atom(true);
const baseExpendedLibraryNodesAtom = atom(
  (await store.get<string[]>("expendedLibraryNodes")) || []
);
export const expendedLibraryNodesAtom = atom(
  (get) => get(baseExpendedLibraryNodesAtom),
  (_get, set, expendedLibraryNodes: string[]) => {
    set(baseExpendedLibraryNodesAtom, expendedLibraryNodes);
    store.set("expendedLibraryNodes", expendedLibraryNodes);
  }
);
const baseSelectedLibraryNodeAtom = atom(selectedNode);
export const selectedLibraryNodeAtom = atom(
  (get) => get(baseSelectedLibraryNodeAtom),
  (_get, set, selectedLibraryNode: string) => {
    set(baseSelectedLibraryNodeAtom, selectedLibraryNode);
    store.set("selectedLibraryNode", selectedLibraryNode);
  }
);

const baseSelectedPlaylistUidAtom = atom(selectedPlaylistUid);
export const selectedPlaylistUidAtom = atom(
  (get) => get(baseSelectedPlaylistUidAtom),
  (_get, set, selectedPlaylistUid: string) => {
    set(baseSelectedPlaylistUidAtom, selectedPlaylistUid);
    store.set("selectedPlaylistUid", selectedPlaylistUid);
  }
);

export const selectedPlaylistAtom = atom(
  (() => {
    if (selectedPlaylistUid === "library") {
      return {
        name: "라이브러리",
        uid: "library",
        trackList: selectedLibrary,
      };
    } else {
      return playlists.find((playlist) => playlist.uid === selectedPlaylistUid);
    }
  })()
);

export const playlistsAtom = atom<Playlist[]>([
  {
    name: "라이브러리",
    uid: "library",
    trackList: selectedLibrary,
  },
  ...playlists,
]);

export const positionInMsAtom = atom(0);
export const lyricAtom = atom<Map<number, string>>(new Map());

// export const backgroundColorAtom = atom({
//   angle: 0,
//   startColor: "#000000",
//   endColor: "#000000",
// });

// export const trackPropertiesDialogAtom = atom(false);
// export const trackPropertiesAtom = atom<TrackProperties>(undefined);
