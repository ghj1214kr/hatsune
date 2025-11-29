import "overlayscrollbars/overlayscrollbars.css";

import { createTheme, styled } from "@mui/material";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

export const whiteTheme = createTheme({
  palette: {
    primary: {
      main: "#000",
    },
    secondary: {
      main: "#39c5bb",
    },
  },
  typography: {
    fontFamily: "Pretendard JP Variable",
  },
});

export const CustomOverlayScrollbars = styled(OverlayScrollbarsComponent)({
  flex: 1,
  "& .os-scrollbar": {
    padding: "0",
    "--os-size": "6px",
    "--os-track-bg": "none",
    "--os-handle-bg": "#fff4",
    "--os-handle-bg-hover": "#fff8",
    "--os-handle-bg-active": "#fff4",
    "--os-handle-border-radius": 0,
  },
});
