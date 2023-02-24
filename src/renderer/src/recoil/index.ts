import { atom, atomFamily, DefaultValue, selector } from "recoil";

import { Playlist, Track } from "./types";

export const audioAtom = atom({
  key: "audio",
  default: new Audio(),
});

const basePlayingAtom = atom({
  key: "basePlaying",
  default: false,
});

export const playingSelector = selector({
  key: "playing",
  get: ({ get }) => {
    return get(basePlayingAtom);
  },
  set: ({ get, set, reset }, newValue) => {
    if (newValue instanceof DefaultValue) {
      reset(basePlayingAtom);
      return;
    }
    const audio = get(audioAtom);
    const playAudio = newValue && audio.src.length > 0;
    playAudio ? audio.play() : audio.pause();
    set(basePlayingAtom, playAudio);
  },
});

export const shuffleAtom = atom({
  key: "shuffle",
  default: false,
});

const baseRepeatAtom = atom({
  key: "baseRepeat",
  default: false,
});

export const repeatSelector = selector({
  key: "repeat",
  get: ({ get }) => {
    return get(baseRepeatAtom);
  },
  set: ({ get, set, reset }, newValue) => {
    if (newValue instanceof DefaultValue) {
      reset(baseRepeatAtom);
      return;
    }
    get(audioAtom).loop = newValue;
    set(baseRepeatAtom, newValue);
  },
});

const basePositionAtom = atom({
  key: "basePosition",
  default: 0,
});

const baseSeekingAtom = atom({
  key: "baseSekking",
  default: false,
});

export const positionSelector = selector({
  key: "position",
  get: ({ get }) => {
    return { position: get(basePositionAtom), seeking: get(baseSeekingAtom) };
  },
  set: ({ get, set, reset }, newValue) => {
    if (newValue instanceof DefaultValue) {
      reset(basePositionAtom);
      reset(baseSeekingAtom);
      return;
    }
    const { position, seeking } = newValue;
    if (!seeking && get(baseSeekingAtom)) {
      get(audioAtom).currentTime = position;
    }
    set(basePositionAtom, position);
    set(baseSeekingAtom, seeking);
  },
});

const mutedVolumeAtom = atom({
  key: "mutedVolume",
  default: 0,
});

const baseVolumeAtom = atom({
  key: "baseVolume",
  default: 0,
});

export const volumeSelector = selector({
  key: "volume",
  get: ({ get }) => {
    return get(baseVolumeAtom);
  },
  set: ({ get, set, reset }, newValue) => {
    if (newValue instanceof DefaultValue) {
      reset(baseVolumeAtom);
      return;
    }
    get(audioAtom).volume = newValue;
    set(baseVolumeAtom, newValue);
  },
});

const baseMutedAtom = atom({
  key: "baseMuted",
  default: false,
});

export const mutedSelector = selector({
  key: "muted",
  get: ({ get }) => {
    return get(baseMutedAtom);
  },
  set: ({ get, set, reset }, newValue) => {
    if (newValue instanceof DefaultValue) {
      reset(baseMutedAtom);
      return;
    }
    if (newValue) {
      set(mutedVolumeAtom, get(volumeSelector));
      set(volumeSelector, 0);
    } else {
      const mutedVolume = get(mutedVolumeAtom);
      mutedVolume > 0 && set(volumeSelector, mutedVolume);
    }
    get(audioAtom).muted = newValue;
    set(baseMutedAtom, newValue);
  },
});

export const playlistAtom = atomFamily<Playlist, string>({
  key: "playlist",
  default: (id) => ({
    loading: false,
    name: "untitled",
    id,
    trackList: [],
  }),
});

export const currentPlaylistAtom = atom<Track[]>({
  key: "currentPlaylist",
  default: [],
});

export const currentTrackAtom = selector<Track>({
  key: "currentTrack",
  get: ({ get }) => {
    const playlist = get(playlistAtom("current"));
    return playlist.trackList[playlist.trackList.length - 1] as Track;
  },
});

export const playingPlaylistIdAtom = atom({
  key: "playingPlaylistId",
  default: "library",
});

export const playingIndexListAtom = atom<number[]>({
  key: "playingIndexList",
  default: [],
});

export const playingIndexAtom = atom({
  key: "playingIndex",
  default: 0,
});

export const playingTrackAtom = selector<Track>({
  key: "playingTrack",
  get: ({ get }) => {
    const playlist = get(currentPlaylistAtom);
    const index = get(playingIndexAtom);
    return playlist[index];
  },
});

export const coverArtAtom = atom({
  key: "coverArt",
  default: "",
});

export const pipAtom = atom({
  key: "pip",
  default: false,
});
