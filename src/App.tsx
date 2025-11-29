import React, { useCallback, useEffect, useRef } from "react";
import {
  Box,
  createTheme,
  CssBaseline,
  GlobalStyles,
  Stack,
  styled,
  ThemeProvider,
  useMediaQuery,
} from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useAtomCallback } from "jotai/utils";
import { SnackbarProvider } from "notistack";

import { invoke, convertFileSrc } from "@tauri-apps/api/core";

import "pretendard-jp/dist/web/variable/pretendardvariable-jp.css";

import { Control } from "./components/control";
import { Playlist } from "./components/playlist";
import { Library } from "./components/library";

import {
  audioAtom,
  coverArtAtom,
  loopAtom,
  playingAtom,
  positionAtom,
  pipAtom,
  store,
  volumeAtom,
  mutedAtom,
  // lyricAtom,
  positionInMsAtom,
} from "./store/atoms";
import { getPlayingTrackAtom } from "./store/getters";
import { toNextTrackAtom, toPreviousTrackAtom } from "./store/actions";
// import { lyricParser } from "./utils";

const theme = createTheme({
  palette: {
    primary: {
      main: "#fff",
    },
    secondary: {
      main: "#39c5bb",
    },
  },
  typography: {
    fontFamily: "Pretendard JP Variable",
    fontWeightRegular: 200,
  },
});

const App: React.FC = () => {
  const pip = useAtomValue(pipAtom);

  const audio = useAtomValue(audioAtom);
  const setPlaying = useSetAtom(playingAtom);
  const getLoop = useAtomCallback(useCallback((get) => get(loopAtom), []));
  const setPosition = useSetAtom(positionAtom);
  const volume = useAtomValue(volumeAtom);
  const muted = useAtomValue(mutedAtom);
  const playingTrack = useAtomValue(getPlayingTrackAtom);
  const playingTrackDuration = useAtomCallback(
    (get) => get(getPlayingTrackAtom).duration
  );
  const toPreviousTrack = useSetAtom(toPreviousTrackAtom);
  const toNextTrack = useSetAtom(toNextTrackAtom);
  const [coverArt, setCoverArt] = useAtom(coverArtAtom);
  const setPositionInMs = useSetAtom(positionInMsAtom);
  // const setLyric = useSetAtom(lyricAtom);
  // const refreshTrackMetadata = useSetAtom(refreshTrackMetadataAtom);
  // const selectedLibrary = useAtomValue(selectedLibraryAtom);
  // const playlist = useAtomValue(playlistsAtom);
  // const [libraryLoaded, setLibraryLoaded] = useAtom(libraryLoadedAtom);
  // const [playlistLoaded, setPlaylistLoaded] = useAtom(playlistLoadedAtom);

  const isFirstRender = useRef(true);
  const changeTrackDelay = useRef(false);

  const collapsedLayout = useMediaQuery("(max-aspect-ratio: 3/2)");

  useEffect(() => {
    audio.volume = volume;
    audio.onplay = (): void => {
      setPlaying(true);
    };
    audio.onpause = (): void => {
      audio.src && setPlaying(false);
    };
    audio.onended = (): void => {
      if (getLoop()) {
        audio.currentTime = 0;
        audio.play();
      } else {
        toNextTrack();
      }
    };
    audio.ontimeupdate = (): void => {
      setPosition({
        newPosition: Math.min(
          Math.round(audio.currentTime),
          playingTrackDuration()
        ),
        mode: "timeupdate",
      });
      setPositionInMs(audio.currentTime);
    };
    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (!changeTrackDelay.current) {
        toPreviousTrack();
        changeTrackDelay.current = true;
        setTimeout(() => {
          changeTrackDelay.current = false;
        }, 100);
      }
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (!changeTrackDelay.current) {
        toNextTrack();
        changeTrackDelay.current = true;
        setTimeout(() => {
          changeTrackDelay.current = false;
        }, 100);
      }
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      setPlaying(false);
      audio.currentTime = 0;
    });
    navigator.mediaSession.setActionHandler("seekto", (event) => {
      audio.currentTime = event.seekTime ?? 0;
    });

    document.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    // window.addEventListener("keydown", (event) => {
    //   if (event.key === "Tab") {
    //     event.preventDefault();
    //   }
    // });
    //
    // hotkeys(
    //   "l,s,m,\,,.,space,enter,left,right,up,down",
    //   function (event, handler) {
    //     event.preventDefault();
    //     switch (handler.key) {
    //       case "l":
    //         store.commit("toggleLoop");
    //         window.config.setConfig("loop", loop.value);
    //         break;
    //       case "s":
    //         store.commit("toggleShuffle");
    //         window.config.setConfig(
    //           "shuffle",
    //           store.getters["getShuffle"]
    //         );
    //         break;
    //       case "m":
    //         muteToggle();
    //         break;
    //       case ",":
    //         if (!changeTrackDelay.value) {
    //           store.commit("toPreviousTrack");
    //           changeTrackDelay.value = true;
    //           setTimeout(() => {
    //             changeTrackDelay.value = false;
    //           }, 100);
    //         }
    //         break;
    //       case ".":
    //         if (!changeTrackDelay.value) {
    //           store.commit("toNextTrack");
    //           changeTrackDelay.value = true;
    //           setTimeout(() => {
    //             changeTrackDelay.value = false;
    //           }, 100);
    //         }
    //         break;
    //       case "space":
    //       case "enter":
    //         store.commit("togglePlaying");
    //         break;
    //       case "left":
    //         store.commit(
    //           "setSeekPosition",
    //           format.between(
    //             audio.currentTime - 5,
    //             0,
    //             playingTrack.value.duration
    //           )
    //         );
    //         break;
    //       case "right":
    //         store.commit(
    //           "setSeekPosition",
    //           format.between(
    //             audio.currentTime + 5,
    //             0,
    //             playingTrack.value.duration
    //           )
    //         );
    //         break;
    //       case "up":
    //         volumeScroll({ deltaY: -5 });
    //         break;
    //       case "down":
    //         volumeScroll({ deltaY: 5 });
    //         break;
    //     }
    //   }
    // );

    (async () => {
      await invoke("refresh_library");
    })();

    return () => {
      store.save();
    };
  }, []);

  useEffect(() => {
    audio.src = convertFileSrc(playingTrack.path);

    try {
      audio
        .play()
        .then(() => {
          if (isFirstRender.current) {
            audio.pause();
            audio.muted = muted;
            audio.volume = volume;
            audio.currentTime = 0;
            setPosition({ newPosition: 0, mode: "seeked" });
            isFirstRender.current = false;
          }

          invoke<string>("get_cover_art", { path: playingTrack.path }).then(
            (coverArt: string) => {
              setCoverArt(coverArt);
            }
          );

          // invoke<string>("get_raw_lyric_from_path", {
          //   path: playingTrack.path,
          // }).then((rawLyric: string) => {
          //   setLyric(lyricParser(rawLyric));
          // });
        })
        .catch((error) => {
          // showError(track);
          console.error(error);
          return;
        });
    } catch (error) {
      // showError(playingTrack);
      console.log(error);
      return;
    }
  }, [playingTrack]);

  return (
    <React.Fragment>
      <CssBaseline />
      <GlobalStyles
        styles={() => ({
          body: {
            userSelect: "none",
            backgroundColor: "transparent",
            fontFeatureSettings: "'ss01', 'ss05'",
          },
        })}
      />
      <ThemeProvider theme={theme}>
        <StyledSnackbarProvider
          anchorOrigin={{ horizontal: "center", vertical: "top" }}
          autoHideDuration={3000}
          preventDuplicate={true}
        >
          <Box position={"relative"} overflow={"hidden"}>
            {coverArt.length > 0 && (
              <img
                src={coverArt}
                css={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  position: "absolute",
                  // WebkitUserDrag: "none",
                }}
              />
            )}
            <Stack
              width={"100vw"}
              height={"100vh"}
              flex={1}
              direction={"row"}
              flexWrap={collapsedLayout ? "wrap" : "nowrap"}
              padding={pip ? 0 : 1}
              spacing={pip ? 0 : 1}
              sx={{
                backdropFilter: "blur(25px)",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
              }}
            >
              <Library collapsedLayout={collapsedLayout} />
              <Control collapsedLayout={collapsedLayout} />
              <Playlist collapsedLayout={collapsedLayout} />
            </Stack>
          </Box>
        </StyledSnackbarProvider>
      </ThemeProvider>
    </React.Fragment>
  );
};

const StyledSnackbarProvider = styled(SnackbarProvider)(({ theme }) => ({
  "&.SnackbarItem-variantInfo": {
    backgroundColor: theme.palette.secondary.main,
  },
}));

export default App;
