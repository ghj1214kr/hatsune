import { useEffect, useState } from "react";
import { Avatar, Divider, Stack, Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api/core";
import { itemSize, itemSizeIncludingDivider } from ".";

type Props = {
  firstTrackPath?: string;
  title: string;
  year?: number;
};

export const Header: React.FC<Props> = (props: Props) => {
  const [coverArt, setCoverArt] = useState("");

  useEffect(() => {
    props.firstTrackPath &&
      invoke<string>("get_cover_art", { path: props.firstTrackPath }).then(
        (coverArt) => {
          if (coverArt) {
            setCoverArt(coverArt);
          }
        }
      );
  }, []);

  return (
    <Stack direction={"column"} height={itemSizeIncludingDivider}>
      <Stack
        direction={"row"}
        height={itemSize}
        alignItems={"center"}
        justifyContent={"space-between"}
        color={"#fff"}
      >
        <Stack minWidth={0} direction={"row"} alignItems={"center"}>
          <Avatar
            src={coverArt}
            variant="square"
            sx={{
              backgroundColor: "transparent",
              "& img": {
                objectFit: "contain",
              },
            }}
          >
            {""}
          </Avatar>
          <Typography
            paddingLeft={1}
            fontSize={22}
            overflow={"hidden"}
            whiteSpace={"nowrap"}
            textOverflow={"ellipsis"}
          >
            {props.title}
          </Typography>
        </Stack>
        <Typography paddingX={1} fontSize={22}>
          {props.year}
        </Typography>
      </Stack>
      <Divider />
    </Stack>
  );
};
