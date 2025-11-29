import { Box, Divider, Stack, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import { lyricAtom, positionInMsAtom } from "../../store/atoms";
import { useCallback, useMemo } from "react";

type Props = {
  collapsedLayout: boolean;
};

export const Lyric: React.FC<Props> = (props: Props) => {
  const lyric = useAtomValue(lyricAtom);
  const positionInMs = useAtomValue(positionInMsAtom);

  const lyricInReverseOrder = useMemo(
    () => Array.from(lyric.entries()).reverse(),
    [lyric]
  );

  const getCurrentLine = useCallback(
    (lyricInReverseOrder: [number, string][], positionInMs: number) => {
      for (const [time, line] of lyricInReverseOrder) {
        if (time <= positionInMs) {
          return line.split("\n");
        }
      }
      return [];
    },
    [positionInMs]
  );

  return (
    <Stack
      height={
        lyric.size === 0 ? "0px" : props.collapsedLayout ? "10vw" : "10vh"
      }
      color={"#fff"}
      sx={{
        transition: "height 0.5s",
      }}
    >
      <Divider sx={{ marginBottom: 0.75 }} />
      {(() => {
        const currentLine = getCurrentLine(lyricInReverseOrder, positionInMs);
        return currentLine.length > 0 ? (
          <Stack flex={1} justifyContent={"center"}>
            {currentLine.map((line, index) => (
              <Typography
                key={index}
                fontSize={props.collapsedLayout ? "2vw" : "2vh"}
                textAlign={"center"}
                overflow={"hidden"}
                whiteSpace={"nowrap"}
                textOverflow={"ellipsis"}
              >
                {line}
              </Typography>
            ))}
          </Stack>
        ) : (
          <Box flex={1} />
        );
      })()}
    </Stack>
  );
};
