import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  ThemeProvider,
} from "@mui/material";
import { whiteTheme } from "@renderer/utils/theme";
import { useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
};

export const AddPlaylistDialog: React.FC<Props> = (props) => {
  // const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const url = useRef("");

  return (
    <ThemeProvider theme={whiteTheme}>
      <Dialog fullWidth open={props.open} onClose={props.onClose}>
        <DialogTitle>플레이리스트 추가</DialogTitle>
        <DialogContent>
          {/* <DialogContentText>
            유튜브 플레이리스트 URL을 입력해주세요.
          </DialogContentText> */}
          <TextField
            autoFocus
            label="유튜브 플레이리스트 URL"
            fullWidth
            variant="standard"
            onChange={(e) => {
              url.current = e.target.value;
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>취소</Button>
          <Button onClick={() => props.onConfirm(url.current)}>추가</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};
