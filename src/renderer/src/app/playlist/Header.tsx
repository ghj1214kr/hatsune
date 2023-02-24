import { Box, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

type Props = {
  firstTrackPath: string;
  title: string;
  year: string;
};

export const Header: React.FC<Props> = (props) => {
  const [coverArt, setCoverArt] = useState("");

  useEffect(() => {
    window.metadataAPI
      .getMetadataWithCoverArt(props.firstTrackPath)
      .then(({ coverArt }: { coverArt: string }) => {
        setCoverArt(coverArt);
      });
  }, []);

  return (
    <Stack
      direction={"row"}
      height={"44px"}
      alignItems={"center"}
      justifyContent={"space-between"}
      color={"#fff"}
    >
      <Stack direction={"row"} alignItems={"center"} minWidth={0}>
        {coverArt.length > 0 ? (
          <img
            src={coverArt}
            width={"44px"}
            height={"44px"}
            css={{ objectFit: "contain", WebkitUserDrag: "none" }}
          />
        ) : (
          <Box width={"44px"} height={"44px"} />
        )}
        <Typography noWrap={true} paddingLeft={1} minWidth={0} fontSize={22}>
          {props.title}
        </Typography>
      </Stack>
      <Typography paddingX={1} fontSize={22}>
        {props.year}
      </Typography>
    </Stack>
  );
};
