import { createTheme } from "@mui/material";

export const mainTheme = createTheme({
  palette: {
    primary: {
      main: "#fff",
    },
    secondary: {
      main: "#39c5bb",
    },
  },
  typography: {
    fontFamily: "Pretendard JP Variable",
    fontWeightRegular: 200,
  },
});

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
    fontWeightRegular: 200,
  },
});
