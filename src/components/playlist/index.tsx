import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  Slider,
  SliderThumb,
  Stack,
  styled,
  Tab,
  Tabs,
} from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Virtuoso } from "react-virtuoso";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { v4 as uuidv4 } from "uuid";

import { Header } from "./Header";
import { TrackItem } from "./TrackItem";

import { AddPlaylistDialog } from "./AddPlaylistDialog";
import { Settings } from "../settings";

import {
  audioAtom,
  mutedAtom,
  pipAtom,
  playingAtom,
  playingListAtom,
  playingPlaylistUidAtom,
  playlistsAtom,
  selectedPlaylistAtom,
  selectedPlaylistUidAtom,
  volumeAtom,
} from "../../store/atoms";
import { setPlaylistsAtom } from "../../store/actions";
import { getPlayingTrackAtom } from "../../store/getters";

import AddIcon from "@mui/icons-material/Add";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import SettingsIcon from "@mui/icons-material/Settings";
import PictureInPictureIcon from "@mui/icons-material/PictureInPicture";
import MinimizeIcon from "@mui/icons-material/Minimize";
import CloseIcon from "@mui/icons-material/Close";
import { CustomOverlayScrollbars } from "../../utils/theme";

export const itemSize = "44px";
export const itemSizeIncludingDivider = "45px";

type Props = {
  collapsedLayout: boolean;
};

export const Playlist: React.FC<Props> = (props) => {
  // const { enqueueSnackbar } = useSnackbar();
  const [pip, setPip] = useAtom(pipAtom);

  const audio = useAtomValue(audioAtom);
  const setPlaying = useSetAtom(playingAtom);
  const playlists = useAtomValue(playlistsAtom);
  const setPlaylists = useSetAtom(setPlaylistsAtom);
  const selectedPlaylist = useAtomValue(selectedPlaylistAtom);
  const [selectedPlaylistUid, setSelectedPlaylistUid] = useAtom(
    selectedPlaylistUidAtom
  );
  const playingTrack = useAtomValue(getPlayingTrackAtom);
  const playingPlaylistUid = useAtomValue(playingPlaylistUidAtom);
  const setPlayingList = useSetAtom(playingListAtom);

  const [volume, setVolume] = useAtom(volumeAtom);
  const [muted, setMuted] = useAtom(mutedAtom);

  const volumeAdjusting = useRef(false);

  const [addPlaylistDialogOpen, setAddPlaylistDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const overlayScrollbarsRef =
    useRef<React.ElementRef<typeof OverlayScrollbarsComponent>>(null);

  const overlayScrollbarsElement = useMemo(
    () => overlayScrollbarsRef.current?.osInstance()?.elements().content,
    [overlayScrollbarsRef.current?.osInstance()]
  );

  useEffect(() => {
    overlayScrollbarsRef.current?.osInstance()?.elements().content?.scrollTo({
      top: 0,
    });
  }, [selectedPlaylist]);

  return (
    <Stack
      flex={1}
      direction={"column"}
      display={pip ? "none" : "flex"}
      width={props.collapsedLayout ? "calc(50vw - 12px)" : "100%"}
      height={props.collapsedLayout ? "calc(50vh - 12px)" : "auto"}
      position={props.collapsedLayout ? "absolute" : "relative"}
      right={props.collapsedLayout ? "8px" : "auto"}
      bottom={props.collapsedLayout ? "8px" : "auto"}
    >
      <Stack direction={"row"}>
        <CustomTabs
          value={selectedPlaylistUid}
          onChange={(_event, value: string) => {
            setSelectedPlaylistUid(value);
          }}
          variant={"scrollable"}
          scrollButtons={false}
          sx={{ flex: 1 }}
        >
          {playlists.map((playlist) => (
            <CustomTab
              key={playlist.uid}
              value={playlist.uid}
              label={playlist.name}
            />
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
      <CustomOverlayScrollbars
        ref={overlayScrollbarsRef}
        options={{
          scrollbars: {
            autoHide: "leave",
            autoHideDelay: 0,
          },
          overflow: {
            x: "hidden",
            y: "scroll",
          },
        }}
        defer
      >
        {selectedPlaylist && overlayScrollbarsElement ? (
          <Virtuoso
            overscan={{
              main: 5000,
              reverse: 5000,
            }}
            totalCount={selectedPlaylist.trackList.length}
            customScrollParent={overlayScrollbarsElement}
            itemContent={(index) => {
              const item = selectedPlaylist.trackList[index];
              return (
                <>
                  {item.track_number === 1 && (
                    <Header
                      key={item.path + item.album}
                      firstTrackPath={item.path}
                      title={item.album}
                      year={item.year !== 0 ? item.year : undefined}
                    />
                  )}
                  <TrackItem
                    key={item.path}
                    trackNumber={item.track_number}
                    title={item.title}
                    artist={item.artist}
                    duration={item.duration}
                    isPlaying={playingTrack.path === item.path}
                    onDoubleClick={() => {
                      if (
                        playingTrack.path === item.path &&
                        playingPlaylistUid === selectedPlaylistUid
                      ) {
                        audio.currentTime = 0;
                      } else {
                        setPlayingList(
                          selectedPlaylistUid,
                          selectedPlaylist.trackList,
                          index
                        );
                      }
                      setPlaying(true);
                    }}
                  />
                </>
              );
            }}
          />
        ) : (
          <Box flex={1} />
        )}
      </CustomOverlayScrollbars>
      <Divider />
      <Stack height={"56px"} direction={"row"}>
        <VolumeBox
          onWheel={(event) => {
            muted && setMuted(false);
            const clampedDelta = Math.max(Math.min(-event.deltaY, 0.05), -0.05);
            const newVolume = Math.max(
              Math.min(muted ? clampedDelta : volume + clampedDelta, 1),
              0
            );
            setVolume(newVolume);
          }}
        >
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
              slots={{ thumb: VolumeSliderThumb }}
              sx={{ visibility: "hidden" }}
              value={Math.round(volume * 100)}
              onChange={(_event, value) => {
                if (!volumeAdjusting.current) {
                  return;
                }
                setVolume((value as number) / 100);
                muted && setMuted(false);
              }}
              onMouseEnter={() => {
                volumeAdjusting.current = true;
              }}
              onMouseLeave={() => {
                volumeAdjusting.current = false;
              }}
            />
          </Stack>
          <MenuButton
            className={"volume-button"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </MenuButton>
        </VolumeBox>
        <Box data-tauri-drag-region flex={1} />
        <Stack direction={"row"} padding={"8px"}>
          <MenuButton onClick={() => setSettingsOpen(true)}>
            <SettingsIcon />
          </MenuButton>
          <MenuButton onClick={() => setPip(!pip)}>
            <PictureInPictureIcon />
          </MenuButton>
          <MenuButton onClick={() => getCurrentWindow().minimize()}>
            <MinimizeIcon />
          </MenuButton>
          <MenuButton onClick={() => getCurrentWindow().close()}>
            <CloseIcon />
          </MenuButton>
        </Stack>
      </Stack>
      <AddPlaylistDialog
        open={addPlaylistDialogOpen}
        onClose={() => setAddPlaylistDialogOpen(false)}
        onConfirm={(newPlaylistName) => {
          setAddPlaylistDialogOpen(false);
          const newPlaylist = {
            uid: uuidv4(),
            name: newPlaylistName,
            trackList: [],
          };
          setPlaylists(newPlaylist);
        }}
      />
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
