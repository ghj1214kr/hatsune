import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ThemeProvider,
} from "@mui/material";
// import { useSnackbar } from "notistack";

import { whiteTheme } from "../../utils/theme";
import { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
};

export const AddPlaylistDialog: React.FC<Props> = (props: Props) => {
  // const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const [playlistName, setPlaylistName] = useState("");

  return (
    <ThemeProvider theme={whiteTheme}>
      <Dialog fullWidth open={props.open} onClose={props.onClose}>
        <DialogTitle>플레이리스트 추가</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="플레이리스트 이름"
            fullWidth
            variant="standard"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                props.onConfirm(playlistName);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>취소</Button>
          <Button onClick={() => props.onConfirm(playlistName)}>추가</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};
