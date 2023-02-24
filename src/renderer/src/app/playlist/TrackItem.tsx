import { Button, Stack, Typography } from "@mui/material";
import { durationToTime } from "@renderer/utils";

type Props = {
  number?: number;
  title: string;
  artist: string;
  duration: number;
  isPlaying: boolean;
  onDoubleClick: () => void;
};

export const TrackItem: React.FC<Props> = (props) => {
  return (
    <Button
      sx={{
        padding: 0,
        width: "100%",
        height: "44px",
        flexShrink: 0,
        textTransform: "none",
        textAlign: "left",
        borderRadius: 0,
        backgroundColor: props.isPlaying ? "rgba(255, 255, 255, 0.2)" : "none",
      }}
      onDoubleClick={props.onDoubleClick}
    >
      {props.number && (
        <Typography textAlign={"center"} fontSize={"18px"} width={"32px"}>
          {props.number}
        </Typography>
      )}
      <Stack flex={1} direction={"column"} marginLeft={props.number ? 0 : 1} minWidth={0}>
        <Typography noWrap={true} height={"22px"} minWidth={0}>
          {props.title}
        </Typography>
        <Typography noWrap={true} fontSize={12} minWidth={0}>
          {props.artist}
        </Typography>
      </Stack>
      <Typography paddingX={1}>{durationToTime(props.duration).string}</Typography>
    </Button>
  );
};
