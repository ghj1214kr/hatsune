import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Slider,
  SliderThumb,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import _Marquee from "react-fast-marquee";

const Marquee = ((_Marquee as any).default ?? _Marquee) as typeof _Marquee;

import {
  coverArtAtom,
  loopAtom,
  pipAtom,
  playingAtom,
  positionAtom,
  shuffleAtom,
} from "../../store/atoms";
import { toNextTrackAtom, toPreviousTrackAtom } from "../../store/actions";
import { getPlayingTrackAtom } from "../../store/getters";

import ShuffleIcon from "@mui/icons-material/Shuffle";
import ShuffleOnIcon from "@mui/icons-material/ShuffleOn";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import RepeatOneOnIcon from "@mui/icons-material/RepeatOneOn";
import { durationArray } from "../../utils";

const baseTextProperties = {
  color: "#fff",
  align: "center",
  fontWeight: 200,
  fontStyle: "italic",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  zIndex: 0,
};

type Props = {
  collapsedLayout: boolean;
};

export const Control: React.FC<Props> = (props: Props) => {
  const [pip, setPip] = useAtom(pipAtom);

  const coverArt = useAtomValue(coverArtAtom);
  const playingTrack = useAtomValue(getPlayingTrackAtom);
  const [playing, setPlaying] = useAtom(playingAtom);
  const [position, setPosition] = useAtom(positionAtom);
  const toPreviousTrack = useSetAtom(toPreviousTrackAtom);
  const toNextTrack = useSetAtom(toNextTrackAtom);
  const [loop, setLoop] = useAtom(loopAtom);
  const [shuffle, setShuffle] = useAtom(shuffleAtom);

  const textScrollSpeed = useMemo(() => {
    return pip ? 30 : 50;
  }, [pip]);

  const infoBoxRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const artistRef = useRef<HTMLDivElement>(null);
  const albumRef = useRef<HTMLDivElement>(null);

  const [titleMarquee, setTitleMarquee] = useState(false);
  const [artistMarquee, setArtistDuration] = useState(false);
  const [albumMarquee, setAlbumMarquee] = useState(false);

  const handleResize = useCallback(() => {
    if (infoBoxRef.current) {
      const infoBoxRefWidth = infoBoxRef.current.getBoundingClientRect().width;
      if (titleRef.current) {
        setTitleMarquee(
          infoBoxRefWidth - 10 < titleRef.current.getBoundingClientRect().width
            ? true
            : false,
        );
      }
      if (artistRef.current) {
        setArtistDuration(
          infoBoxRefWidth - 10 < artistRef.current.getBoundingClientRect().width
            ? true
            : false,
        );
      }
      if (albumRef.current) {
        setAlbumMarquee(
          infoBoxRefWidth - 10 < albumRef.current.getBoundingClientRect().width
            ? true
            : false,
        );
      }
    }
  }, [infoBoxRef, titleRef, artistRef, albumRef, pip]);

  useEffect(() => {
    handleResize();
  }, [playingTrack]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const buttonSize = useMemo(() => {
    return { fontSize: pip ? "36px" : "min(8vh, 6vw)" };
  }, [pip]);

  return (
    <Stack
      direction={"column"}
      sx={{
        order: props.collapsedLayout ? 1 : 2,
        width: pip
          ? "100%"
          : props.collapsedLayout
            ? "calc(100vw - 12px)"
            : "auto",
        height: pip
          ? "100%"
          : props.collapsedLayout
            ? "calc(50vh - 12px)"
            : "auto",
        position: "relative",
        justifyContent: "space-between",
        aspectRatio: props.collapsedLayout ? "auto" : "11/18",
        overflow: "hidden",
      }}
    >
      <Stack direction={props.collapsedLayout ? "row" : "column"}>
        <Avatar
          onDoubleClick={() => {
            if (pip) {
              setPip(!pip);
            }
          }}
          data-tauri-drag-region={true}
          // position={props.collapsedLayout ? "absolute" : "relative"}
          // height={props.collapsedLayout ? "100%" : "60vh"}
          src={coverArt}
          variant="square"
          sx={{
            position: props.collapsedLayout ? "absolute" : "relative",
            aspectRatio: "1",
            width: "100%",
            height: props.collapsedLayout ? "100%" : "auto",
            marginBottom: props.collapsedLayout ? "0" : "0.5vh",
            backgroundColor: props.collapsedLayout ? "#0004" : "transparent",
            "& img": {
              objectFit: props.collapsedLayout ? "cover" : "contain",
              WebkitUserDrag: "none",
              zIndex: -1,
            },
          }}
        >
          {""}
        </Avatar>
        <Stack
          ref={infoBoxRef}
          direction={"column"}
          sx={{
            width: "100%",
            alignItems: "center",
            justifyContent: "space-evenly",
            overflow: "hidden",
          }}
        >
          {titleMarquee ? (
            <Marquee speed={textScrollSpeed}>
              <InfoText
                ref={titleRef}
                sx={{ fontSize: pip ? "32px" : "min(7vh, 6vw)" }}
              >
                {playingTrack.title + " / "}
              </InfoText>
            </Marquee>
          ) : (
            <InfoText
              ref={titleRef}
              sx={{ fontSize: pip ? "32px" : "min(7vh, 6vw)" }}
            >
              {playingTrack.title}
            </InfoText>
          )}
          {artistMarquee ? (
            <Marquee speed={textScrollSpeed}>
              <InfoText
                ref={artistRef}
                sx={{ fontSize: pip ? "18px" : "min(4vh, 3.5vw)" }}
              >
                {playingTrack.artist + " / "}
              </InfoText>
            </Marquee>
          ) : (
            <InfoText
              ref={artistRef}
              sx={{ fontSize: pip ? "18px" : "min(4vh, 3.5vw)" }}
            >
              {playingTrack.artist}
            </InfoText>
          )}
          {"album" in playingTrack &&
            (albumMarquee ? (
              <Marquee speed={textScrollSpeed}>
                <InfoText
                  ref={albumRef}
                  sx={{ fontSize: pip ? "18px" : "min(4vh, 3.5vw)" }}
                >
                  {playingTrack.album + " / "}
                </InfoText>
              </Marquee>
            ) : (
              <InfoText
                ref={albumRef}
                sx={{ fontSize: pip ? "18px" : "min(4vh, 3.5vw)" }}
              >
                {playingTrack.album}
              </InfoText>
            ))}
        </Stack>
      </Stack>
      <Stack
        direction={"column"}
        spacing={pip ? "8px" : props.collapsedLayout ? 2 : "calc(4vh - 16px)"}
        sx={{
          position: "absolute",
          bottom: 0,
          width: "100%",
          WebkitAppRegion: "no-drag",
        }}
      >
        <Stack
          direction={"column"}
          spacing={pip ? "8px" : props.collapsedLayout ? 2 : "calc(4vh - 16px)"}
          onWheel={(event) => {
            if (event.deltaY < 0) {
              setPosition({
                newPosition: position.time + 1,
                mode: "seeked",
              });
            } else if (event.deltaY > 0) {
              setPosition({
                newPosition: position.time - 1,
                mode: "seeked",
              });
            }
          }}
        >
          <Stack
            direction={"row"}
            sx={{
              paddingX: "max(1vh, 8px)",
              justifyContent: "space-between",
            }}
          >
            {(() => {
              const positionArray = durationArray(position.time);
              const totalDurationArray = durationArray(playingTrack.duration);
              const remainingDurationArray = durationArray(
                playingTrack.duration - position.time,
              );

              return (
                <>
                  <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
                    {positionArray[0]}
                    <ColonText
                      sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}
                    >
                      :
                    </ColonText>
                    {positionArray[1]}
                  </TimeText>
                  <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
                    {totalDurationArray[0]}
                    <ColonText
                      sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}
                    >
                      :
                    </ColonText>
                    {totalDurationArray[1]}
                  </TimeText>
                  <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
                    -{remainingDurationArray[0]}
                    <ColonText
                      sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}
                    >
                      :
                    </ColonText>
                    {remainingDurationArray[1]}
                  </TimeText>
                </>
              );
            })()}
          </Stack>
          <Box
            sx={{
              height: pip ? "8px" : 0,
              paddingX: "1vh",
            }}
          >
            <CustomSlider
              min={0}
              max={playingTrack.duration || 0}
              value={position.time}
              slots={{ thumb: CustomSliderThumb }}
              onChange={(_event, value) => {
                setPosition({ newPosition: value as number, mode: "seeking" });
              }}
              onChangeCommitted={(_event, value) => {
                setPosition({ newPosition: value as number, mode: "seeked" });
              }}
              sx={{ height: pip ? "4px" : "0.5vh" }}
            />
          </Box>
        </Stack>
        <Stack
          direction={"row"}
          sx={{
            paddingX: "1vh",
            paddingBottom: "1vh",
            justifyContent: "space-between",
          }}
        >
          <ControlButton onClick={() => setShuffle(!shuffle)}>
            {shuffle ? (
              <ShuffleOnIcon sx={buttonSize} />
            ) : (
              <ShuffleIcon sx={buttonSize} />
            )}
          </ControlButton>
          <ControlButton onClick={toPreviousTrack}>
            <SkipPreviousIcon sx={buttonSize} />
          </ControlButton>
          <ControlButton
            onClick={() => {
              if (playing) {
                setPlaying(false);
              } else {
                setPlaying(true);
              }
            }}
          >
            {playing ? (
              <PauseIcon sx={buttonSize} />
            ) : (
              <PlayArrowIcon sx={buttonSize} />
            )}
          </ControlButton>
          <ControlButton onClick={toNextTrack}>
            <SkipNextIcon sx={buttonSize} />
          </ControlButton>
          <ControlButton onClick={() => setLoop(!loop)}>
            {loop ? (
              <RepeatOneOnIcon sx={buttonSize} />
            ) : (
              <RepeatOneIcon sx={buttonSize} />
            )}
          </ControlButton>
        </Stack>
      </Stack>
    </Stack>
  );
};

const InfoText = styled(Typography)(
  Object.assign({}, baseTextProperties, {
    width: "fit-content",
    whiteSpace: "pre",
  }) as unknown as TemplateStringsArray,
);

const TimeText = styled(Typography)(
  Object.assign({}, baseTextProperties, {
    letterSpacing: "-0.05em",
    fontVariantNumeric: "tabular-nums",
  }) as unknown as TemplateStringsArray,
);

const ColonText = styled("span")(
  Object.assign({}, baseTextProperties, {
    letterSpacing: "-0.05em",
    fontVariantNumeric: "normal",
    fontFeatureSettings: "'ss03'",
  }) as unknown as TemplateStringsArray,
);

const CustomSlider = styled(Slider)({
  top: "-1.5vh",
  padding: "1.5vh 0",
  alignSelf: "center",
});

const CustomSliderThumb = styled(SliderThumb)({
  width: "min(2vh, 2vw)",
  height: "min(2vh, 2vw)",
  "&:hover": {
    boxShadow: "0px 0px 0px 0.75vh rgba(255, 255, 255, 0.16)",
  },
  "&:active": {
    boxShadow: "0px 0px 0px 1.25vh rgba(255, 255, 255, 0.32)",
  },
});

const ControlButton = styled(Button)({
  padding: "8px",
  minWidth: 0,
});
