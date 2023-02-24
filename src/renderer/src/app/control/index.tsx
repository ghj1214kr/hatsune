import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RepeatOneIcon from "@mui/icons-material/RepeatOne";
import RepeatOneOnIcon from "@mui/icons-material/RepeatOneOn";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import ShuffleOnIcon from "@mui/icons-material/ShuffleOn";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import {
  Box,
  Button,
  Slider,
  SliderThumb,
  Stack,
  styled,
  Typography,
  TypographyProps,
} from "@mui/material";
import { coverArtAtom, pipAtom } from "@renderer/recoil";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

const defaultTextProperties: TypographyProps = {
  color: "#fff",
  textAlign: "center",
  fontWeight: 200,
  fontStyle: "italic",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const textScrollSpeed = 30;

export const Control: React.FC<{ collapsedLayout: boolean }> = (props) => {
  const [pip, setPip] = useRecoilState(pipAtom);

  const coverArt = useRecoilValue(coverArtAtom);
  const playingTrack = useAtomValue(getPlayingTrackAtom);
  const [playing, setPlaying] = useRecoilState(playingAtom);
  const [position, setPosition] = useAtom(positionAtom);
  const toPreviousTrack = useSetAtom(toPreviousTrackAtom);
  const toNextTrack = useSetAtom(toNextTrackAtom);
  const [loop, setLoop] = useAtom(loopAtom);
  const shuffle = useAtom(shuffleAtom);
  const setShuffle = useSetAtom(setShuffleAtom);

  const infoBoxRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLDivElement>(null);
  const artistRef = useRef<HTMLDivElement>(null);
  const albumRef = useRef<HTMLDivElement>(null);

  const [titleDuration, setTitleDuration] = useState("0s");
  const [artistDuration, setArtistDuration] = useState("0s");
  const [albumDuration, setAlbumDuration] = useState("0s");

  const handleResize = useCallback(() => {
    if (infoBoxRef.current) {
      const infoBoxRefWidth = infoBoxRef.current.getBoundingClientRect().width;
      if (titleRef.current) {
        setTitleDuration(
          infoBoxRefWidth - 10 < titleRef.current.getBoundingClientRect().width
            ? `${infoBoxRefWidth / textScrollSpeed}s`
            : "0s"
        );
      }
      if (artistRef.current) {
        setArtistDuration(
          infoBoxRefWidth - 10 < artistRef.current.getBoundingClientRect().width
            ? `${infoBoxRefWidth / textScrollSpeed}s`
            : "0s"
        );
      }
      if (albumRef.current) {
        setAlbumDuration(
          infoBoxRefWidth - 10 < albumRef.current.getBoundingClientRect().width
            ? `${infoBoxRefWidth / textScrollSpeed}s`
            : "0s"
        );
      }
    }
  }, [infoBoxRef, titleRef, artistRef, albumRef]);

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
      position={"relative"}
      sx={{
        aspectRatio: props.collapsedLayout ? "auto" : "11/18",
      }}
      direction={"column"}
      justifyContent={"space-between"}
      width={pip ? "100%" : props.collapsedLayout ? "calc(50vw - 12px)" : "auto"}
      height={pip ? "100%" : props.collapsedLayout ? "calc(50vh - 12px)" : "auto"}
    >
      <Stack direction={props.collapsedLayout ? "row" : "column"}>
        <Box
          onDoubleClick={() => {
            window.windowAPI.setPip(!pip);
            setPip(!pip);
          }}
          display={"flex"}
          alignItems={"center"}
          justifyContent={"center"}
          position={props.collapsedLayout ? "absolute" : "relative"}
          marginBottom={props.collapsedLayout ? "0" : "0.5vh"}
          width={"100%"}
          height={props.collapsedLayout ? "100%" : "60vh"}
          sx={{ aspectRatio: "1", WebkitAppRegion: "drag" }}
        >
          {coverArt.length > 0 && (
            <img
              src={coverArt}
              width={"100%"}
              height={"100%"}
              css={{
                objectFit: props.collapsedLayout ? "cover" : "contain",
                WebkitUserDrag: "none",
              }}
            />
          )}
          {coverArt.length > 0 && props.collapsedLayout && (
            <Box
              position={"absolute"}
              top={0}
              width={"100%"}
              height={"100%"}
              bgcolor={"rgba(0,0,0,0.3)"}
            />
          )}
        </Box>
        <Stack
          ref={infoBoxRef}
          direction={"column"}
          justifyContent={"space-evenly"}
          width={"100%"}
          sx={{ overflowX: "hidden" }}
        >
          <Marquee
            sx={{
              animationDuration: titleDuration,
            }}
          >
            <InfoText ref={titleRef} fontSize={pip ? "32px" : "min(7vh, 6vw)"}>
              {playingTrack.title}
            </InfoText>
          </Marquee>
          <Marquee sx={{ animationDuration: artistDuration }}>
            <InfoText ref={artistRef} fontSize={pip ? "18px" : "min(4vh, 3.5vw)"}>
              {playingTrack.artist}
            </InfoText>
          </Marquee>
          {"album" in playingTrack && (
            <Marquee sx={{ animationDuration: albumDuration }}>
              <InfoText ref={albumRef} fontSize={pip ? "18px" : "min(4vh, 3.5vw)"}>
                {playingTrack.album}
              </InfoText>
            </Marquee>
          )}
        </Stack>
      </Stack>
      <Stack
        position={"absolute"}
        bottom={0}
        width={"100%"}
        direction={"column"}
        spacing={pip ? "8px" : props.collapsedLayout ? 2 : "calc(4vh - 16px)"}
        sx={{ WebkitAppRegion: "no-drag" }}
      >
        <Stack paddingX={"1vh"} direction={"row"} justifyContent={"space-between"}>
          <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
            {utils.durationArray(position.time)[0]}
            <ColonText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>:</ColonText>
            {utils.durationArray(position.time)[1]}
          </TimeText>
          <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
            {utils.durationArray(playingTrack.duration)[0]}
            <ColonText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>:</ColonText>
            {utils.durationArray(playingTrack.duration)[1]}
          </TimeText>
          <TimeText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>
            -{utils.durationArray(playingTrack.duration - position.time)[0]}
            <ColonText sx={{ fontSize: pip ? "18px" : "min(3vh, 3vw)" }}>:</ColonText>
            {utils.durationArray(playingTrack.duration - position.time)[1]}
          </TimeText>
        </Stack>
        <Box height={pip ? "8px" : 0} paddingX={"1vh"}>
          <CustomSlider
            min={0}
            max={playingTrack.duration}
            value={position.time}
            components={{ Thumb: CustomSliderThumb }}
            onChange={(_event, value) => {
              setPosition({ newPosition: value as number, mode: "seeking" });
            }}
            onChangeCommitted={(_event, value) => {
              setPosition({ newPosition: value as number, mode: "seeked" });
            }}
            sx={{ height: pip ? "4px" : "0.5vh" }}
          />
        </Box>
        <Stack
          paddingX={"1vh"}
          paddingBottom={"1vh"}
          direction={"row"}
          justifyContent={"space-between"}
        >
          <ControlButton onClick={() => setShuffle(!shuffle)}>
            {shuffle ? <ShuffleOnIcon sx={buttonSize} /> : <ShuffleIcon sx={buttonSize} />}
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
            {playing ? <PauseIcon sx={buttonSize} /> : <PlayArrowIcon sx={buttonSize} />}
          </ControlButton>
          <ControlButton onClick={toNextTrack}>
            <SkipNextIcon sx={buttonSize} />
          </ControlButton>
          <ControlButton onClick={() => setLoop(!loop)}>
            {loop ? <RepeatOneOnIcon sx={buttonSize} /> : <RepeatOneIcon sx={buttonSize} />}
          </ControlButton>
        </Stack>
      </Stack>
    </Stack>
  );
};

const Marquee = styled("div")({
  display: "flex",
  justifyContent: "center",
  willChange: "transform",
  animation: `slide 0s linear infinite`,
  "@keyframes slide": {
    "0%": {
      transform: "translateX(100%)",
    },
    "100%": {
      transform: "translateX(-100%)",
    },
  },
});

const InfoText = styled(Typography)({
  ...(defaultTextProperties as object),
  width: "fit-content",
});

const TimeText = styled(Typography)({
  ...(defaultTextProperties as object),
  letterSpacing: "-0.05em",
  fontVariantNumeric: "tabular-nums",
});

const ColonText = styled("span")({
  ...(defaultTextProperties as object),
  letterSpacing: "-0.05em",
  fontVariantNumeric: "normal",
  fontFeatureSettings: '"ss03"',
});

const CustomSlider = styled(Slider)({
  top: "-1.5vh",
  padding: "1.5vh 0",
  alignSelf: "center",
});

const CustomSliderThumb = styled(SliderThumb)({
  width: "2vh",
  height: "2vh",
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
