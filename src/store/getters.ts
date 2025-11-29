import { atom } from "jotai";

import {
  playingIndexAtom,
  playingIndexListAtom,
  playingListAtom,
} from "./atoms";

export const getPlayingTrackAtom = atom((get) => {
  const playingTrack =
    get(playingListAtom)[get(playingIndexListAtom)[get(playingIndexAtom)]];
  if (!playingTrack) {
    return {
      path: "",
      title: "",
      artist: "",
      album: "",
      year: 0,
      track_number: 0,
      disk: 0,
      duration: 0,
      bitrate: 0,
    };
  }
  return playingTrack;
});
