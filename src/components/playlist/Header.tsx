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
        },
      );
  }, []);

  return (
    <Stack
      direction={"column"}
      sx={{
        height: itemSizeIncludingDivider,
      }}
    >
      <Stack
        direction={"row"}
        sx={{
          height: itemSize,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack
          direction={"row"}
          sx={{
            minWidth: 0,
            alignItems: "center",
          }}
        >
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
            sx={{
              paddingLeft: 1,
              color: "#fff",
              fontSize: 22,
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {props.title}
          </Typography>
        </Stack>
        <Typography
          sx={{
            paddingX: 1,
            color: "#fff",
            fontSize: 22,
          }}
        >
          {props.year}
        </Typography>
      </Stack>
      <Divider />
    </Stack>
  );
};
