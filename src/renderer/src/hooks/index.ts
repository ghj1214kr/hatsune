import {
  currentPlaylistAtom,
  playingIndexAtom,
  playingIndexListAtom,
  playingPlaylistIdAtom,
  playingTrackAtom,
  shuffleAtom,
} from "@renderer/recoil";
import _ from "lodash-es";
import { useRecoilCallback } from "recoil";

export const usePlayback = () => {
  const setShuffle = useRecoilCallback(({ set, snapshot }) => (shuffle: boolean) => {
    set(shuffleAtom, shuffle);

    if (shuffle) {
      const tempIndexList = snapshot.getLoadable(playingIndexListAtom).getValue().slice();
      const firstIndex = tempIndexList.splice(snapshot.getLoadable(playingIndexAtom).getValue(), 1);
      const beforeIndexList = _.shuffle(tempIndexList.slice());
      const afterIndexList = _.shuffle(tempIndexList.slice());
      const finalIndexList = [...beforeIndexList, ...firstIndex, ...afterIndexList];
      set(playingIndexListAtom, finalIndexList);
      set(playingIndexAtom, tempIndexList.length);
    } else {
      const playingIndexList = snapshot.getLoadable(playingIndexListAtom).getValue();
      const tempIndexList = [...Array((playingIndexList.length + 1) / 2).keys()];
      if (snapshot.getLoadable(playingPlaylistIdAtom).getValue() === "library") {
        const realIndex = playingIndexList[snapshot.getLoadable(playingIndexAtom).getValue()];
        set(playingIndexListAtom, tempIndexList);
        set(playingIndexAtom, realIndex);
      } else {
        const playingTrack = snapshot.getLoadable(playingTrackAtom).getValue();
        set(playingIndexListAtom, tempIndexList);
        set(
          playingIndexAtom,
          snapshot
            .getLoadable(currentPlaylistAtom)
            .getValue()
            .findIndex((track) => track.path === playingTrack.path)
        );
      }
    }
  });

  return { setShuffle };
};
