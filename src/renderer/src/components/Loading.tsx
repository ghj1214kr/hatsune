import { Box, CircularProgress } from "@mui/material";

export const Loading: React.FC = () => {
  return (
    <Box
      position={"absolute"}
      width={"100%"}
      height={"100%"}
      bgcolor={"rgba(0,0,0,0.5)"}
      display={"flex"}
      justifyContent={"center"}
      alignItems={"center"}
      zIndex={1}
    >
      <CircularProgress />
    </Box>
  );
};
