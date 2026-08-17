import { Button, Divider, Stack, Typography } from "@mui/material";
import { durationStr } from "../../utils";
import { itemSize, itemSizeIncludingDivider } from ".";

type Props = {
  trackNumber: number;
  title: string;
  artist: string;
  duration: number;
  isPlaying: boolean;
  onDoubleClick: () => void;
};

export const TrackItem: React.FC<Props> = (props: Props) => {
  return (
    <Button
      sx={{
        padding: 0,
        width: "100%",
        height: itemSizeIncludingDivider,
        flexShrink: 0,
        textTransform: "none",
        textAlign: "left",
        borderRadius: 0,
        backgroundColor: props.isPlaying ? "rgba(255, 255, 255, 0.2)" : "none",
        ":hover": {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
      }}
      onDoubleClick={props.onDoubleClick}
    >
      <Stack
        direction={"column"}
        sx={{
          width: "100%",
        }}
      >
        <Stack
          direction={"row"}
          sx={{
            height: itemSize,
            alignItems: "center",
          }}
        >
          {props.trackNumber > 0 && (
            <Typography
              align={"center"}
              sx={{
                fontSize: "18px",
                width: "32px",
              }}
            >
              {props.trackNumber}
            </Typography>
          )}
          <Stack
            direction={"column"}
            sx={{
              flex: 1,
              marginLeft: props.trackNumber ? 0 : 1,
              minWidth: 0,
            }}
          >
            <Typography
              noWrap={true}
              sx={{
                height: "22px",
                minWidth: 0,
              }}
            >
              {props.title}
            </Typography>
            <Typography
              noWrap={true}
              sx={{
                fontSize: "12px",
                minWidth: 0,
              }}
            >
              {props.artist}
            </Typography>
          </Stack>
          <Typography
            sx={{
              paddingX: 1,
            }}
          >
            {durationStr(props.duration)}
          </Typography>
        </Stack>
        <Divider />
      </Stack>
    </Button>
  );
};
