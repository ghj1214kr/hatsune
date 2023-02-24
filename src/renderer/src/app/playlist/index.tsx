import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import MinimizeIcon from "@mui/icons-material/Minimize";
import SettingsIcon from "@mui/icons-material/Settings";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { Box, Button, Divider, Slider, SliderThumb, Stack, styled, Tab, Tabs } from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSnackbar } from "notistack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import { addYouTubePlaylistAtom, setPlayingListAtom } from "@/store/actions";
import {
  audioAtom,
  modeAtom,
  mutedAtom,
  playingAtom,
  playingPlaylistIdAtom,
  selectedLibraryAtom,
  selectedPlaylistIdAtom,
  volumeAtom,
  youtubePlaylistsAtom,
} from "@/store/atoms";
import { getPlayingTrackAtom, getSelectedPlaylistAtom } from "@/store/getters";
import { Track, YouTubePlaylist, YouTubeTrack } from "@/types";

import { Settings } from "../settings";
import { AddPlaylistDialog } from "./AddPlaylistDialog";
import { Header } from "./Header";
import { TrackItem } from "./TrackItem";
import { VideoItem } from "./VideoItem";

type Props = {
  collapsedLayout: boolean;
};

export const Playlist: React.FC<Props> = (props) => {
  // const { enqueueSnackbar } = useSnackbar();

  const [mode, setMode] = useAtom(modeAtom);
  const audio = useAtomValue(audioAtom);
  const setPlaying = useSetAtom(playingAtom);
  const selectedLibrary = useAtomValue(selectedLibraryAtom);
  const playingTrack = useAtomValue(getPlayingTrackAtom);
  const playingPlaylistId = useAtomValue(playingPlaylistIdAtom);
  const [selectedPlaylistId, setSelectedPlaylistId] = useAtom(selectedPlaylistIdAtom);
  const selectedPlaylist = useAtomValue(getSelectedPlaylistAtom);
  const setPlayingList = useSetAtom(setPlayingListAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [muted, setMuted] = useAtom(mutedAtom);

  const youtubePlaylists = useAtomValue(youtubePlaylistsAtom);
  const addYouTubePlaylist = useSetAtom(addYouTubePlaylistAtom);

  const [addPlaylistDialogOpen, setAddPlaylistDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const virtuoso = useRef<VirtuosoHandle>(null);

  useEffect(() => {
    virtuoso.current && virtuoso.current.scrollToIndex(0);
  }, [selectedLibrary]);

  return (
    <Stack
      direction={"column"}
      width={props.collapsedLayout ? "calc(50vw - 12px)" : "100%"}
      height={props.collapsedLayout ? "calc(50vh - 12px)" : "auto"}
      position={props.collapsedLayout ? "absolute" : "relative"}
      right={props.collapsedLayout ? "8px" : "auto"}
      bottom={props.collapsedLayout ? "8px" : "auto"}
      minWidth={0}
    >
      <Stack direction={"row"}>
        <CustomTabs
          value={selectedPlaylistId}
          onChange={(_event, value: string) => {
            setSelectedPlaylistId(value);
          }}
          variant={"scrollable"}
          scrollButtons={false}
          sx={{ flex: 1 }}
        >
          <CustomTab value={"library"} label={"라이브러리"} />
          {youtubePlaylists.map((playlist) => (
            <CustomTab key={playlist.id} value={playlist.id} label={playlist.name} wrapped />
          ))}
        </CustomTabs>
        <MenuButton
          onClick={() => {
            setAddPlaylistDialogOpen(true);
          }}
        >
          <AddIcon fontSize="small" />
        </MenuButton>
      </Stack>
      <Divider />
      {selectedPlaylist !== undefined ? (
        <CustomVirtuoso
          ref={virtuoso}
          style={{ overflow: "overlay" }}
          totalCount={selectedPlaylist.trackList.length}
          itemContent={(index) => {
            const item = selectedPlaylist.trackList[index];
            if ("isAlbumHeader" in item) {
              return (
                <React.Fragment>
                  <Header
                    key={item.key}
                    firstTrackPath={item.firstTrackPath}
                    title={item.title}
                    year={item.year}
                  />
                  <Divider />
                </React.Fragment>
              );
            } else {
              return (
                <React.Fragment>
                  <TrackItem
                    key={item.path}
                    number={item.track_no}
                    title={item.title}
                    artist={item.artist}
                    duration={item.duration}
                    isPlaying={mode === "local" && (playingTrack as Track).path === item.path}
                    onDoubleClick={() => {
                      if (
                        (playingTrack as Track).path === item.path &&
                        playingPlaylistId === selectedPlaylistId
                      ) {
                        audio.currentTime = 0;
                      } else {
                        setMode("local");
                        setPlayingList({
                          playlistId: selectedPlaylistId,
                          index:
                            index -
                            selectedLibrary
                              .slice(0, index)
                              .filter((item) => "isAlbumHeader" in item).length,
                          trackList: selectedLibrary.filter(
                            (item) => !("isAlbumHeader" in item)
                          ) as Track[],
                        });
                        if (selectedPlaylistId === "library") {
                          window.configAPI.setConfig("playingNodePath", item.path);
                        }
                      }
                      setPlaying(true);
                    }}
                  />
                  <Divider />
                </React.Fragment>
              );
            }
          }}
        />
      ) : (
        <Box flex={1} />
      )}
      <Divider />
      <Stack height={"56px"} direction={"row"}>
        <VolumeBox>
          <Stack
            className={"volume-slider-box"}
            width={"40px"}
            height={0}
            bottom={"40px"}
            padding={0}
            borderRadius={"4px 4px 0 0"}
            alignItems={"center"}
            position={"absolute"}
          >
            <Slider
              min={0}
              max={100}
              step={1}
              color={"secondary"}
              orientation={"vertical"}
              valueLabelDisplay={"auto"}
              components={{ Thumb: VolumeSliderThumb }}
              sx={{ visibility: "hidden" }}
              value={Math.round(volume * 100)}
              onChange={(_event, value) => {
                setVolume((value as number) / 100);
                muted && setMuted(false);
              }}
            />
          </Stack>
          <MenuButton className={"volume-button"} onClick={() => setMuted(!muted)}>
            {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </MenuButton>
        </VolumeBox>
        <Box flex={1} sx={{ WebkitAppRegion: "drag" }} />
        <Stack direction={"row"} padding={"8px"}>
          <MenuButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </MenuButton>
          <MenuButton onClick={() => window.windowAPI.minimize()}>
            <MinimizeIcon />
          </MenuButton>
          <MenuButton onClick={() => window.windowAPI.close()}>
            <CloseIcon />
          </MenuButton>
        </Stack>
      </Stack>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Stack>
  );
};

const CustomTabs = styled(Tabs)({
  minHeight: 0,
  "& .MuiButtonBase-root": {
    textTransform: "none",
    fontWeight: 200,
  },
});

const CustomTab = styled(Tab)({
  color: "#fff6",
  padding: "12px",
  minHeight: 0,
  minWidth: 0,
  maxWidth: "200px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  display: "block",
  flexDirection: "row",
});

const CustomVirtuoso = styled(Virtuoso)({
  overflow: "hidden!important",
  "&:hover": {
    overflow: "overlay!important",
  },
});

const VolumeBox = styled(Box)(({ theme }) => ({
  position: "relative",
  margin: "8px",
  borderRadius: "0 0 4px 4px",
  transition: "background-color 0.2s",
  "&:hover": {
    backgroundColor: "#ffff",
    "& .volume-slider-box": {
      height: "120px",
      padding: "16px 0 8px 0",
      backgroundColor: "#ffff",
    },
    "& .MuiSlider-root": {
      visibility: "visible",
    },
    "& .volume-button": {
      color: theme.palette.secondary.main,
    },
  },
  "& .volume-slider-box": {
    transition: "all 0.2s",
  },
  "& .volume-button": {
    transition: "color 0.2s",
  },
}));

const VolumeSliderThumb = styled(SliderThumb)({
  width: "12px",
  height: "12px",
  "&:hover": {
    boxShadow: "0px 0px 0px 4px #39c5bb20",
  },
  "&:active": {
    boxShadow: "0px 0px 0px 8px #39c5bb40",
  },
});

const MenuButton = styled(Button)({
  padding: "8px",
  minWidth: "40px",
});
