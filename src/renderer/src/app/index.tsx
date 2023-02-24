import { ThemeProvider } from "@emotion/react";
import { Box, CssBaseline, GlobalStyles, Stack, styled, useMediaQuery } from "@mui/material";
import { pipAtom } from "@renderer/recoil";
import { mainTheme } from "@renderer/utils/theme";
import { SnackbarProvider } from "notistack";
import { Fragment } from "react";
import { useRecoilValue } from "recoil";

import { Control } from "./control";
import { Library } from "./library";
import { Playlist } from "./playlist";

export const App = () => {
  const collapsedLayout = useMediaQuery("(max-aspect-ratio: 3/2)");

  const pip = useRecoilValue(pipAtom);

  return (
    <Fragment>
      <CssBaseline />
      <GlobalStyles
        styles={(_theme) => ({
          body: {
            userSelect: "none",
            backgroundColor: "#000",
            fontFeatureSettings: '"ss01", "ss05"',
          },
          "& ::-webkit-scrollbar": {
            width: "6px",
          },
          "& ::-webkit-scrollbar-track": {
            display: "none",
          },
          "& ::-webkit-scrollbar-thumb": {
            background: "#fff4",
          },
        })}
      />
      <ThemeProvider theme={mainTheme}>
        <StyledSnackbarProvider
          anchorOrigin={{ horizontal: "center", vertical: "top" }}
          autoHideDuration={3000}
          preventDuplicate={true}
        >
          <Box position={"relative"} overflow={"hidden"}>
            {/* {coverArt.length > 0 && (
              <img
                src={coverArt}
                css={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  WebkitUserDrag: 'none'
                }}
              />
            )} */}
            <Stack
              width={"100vw"}
              height={"100vh"}
              flex={1}
              direction={"row"}
              flexWrap={collapsedLayout ? "wrap" : "nowrap"}
              padding={1}
              spacing={1}
              bgcolor={"rgba(0, 0, 0, 0.3)"}
              sx={{
                backdropFilter: "blur(25px)",
              }}
            >
              {!pip && <Library collapsedLayout={collapsedLayout} />}
              <Control collapsedLayout={collapsedLayout} />
              {!pip && <Playlist collapsedLayout={collapsedLayout} />}
            </Stack>
          </Box>
        </StyledSnackbarProvider>
      </ThemeProvider>
    </Fragment>
  );
};

const StyledSnackbarProvider = styled(SnackbarProvider)(({ theme }) => ({
  "&.SnackbarItem-variantInfo": {
    backgroundColor: theme.palette.secondary.main,
  },
}));
