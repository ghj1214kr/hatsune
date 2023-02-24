import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Badge,
  Button,
  CircularProgress,
  Dialog,
  Stack,
  styled,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { useAtom } from "jotai";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";

import { libraryLoadedAtom } from "@/store/atoms";
import { whiteTheme } from "@/utils/theme";

import { Loading } from "../Loading";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const Settings: React.FC<Props> = (props) => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const [libraryLoaded, setLibraryLoaded] = useAtom(libraryLoadedAtom);

  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);
  const [libraryChanged, setLibraryChanged] = useState(false);

  useEffect(() => {
    window.libraryAPI.getLibraryPaths().then((paths: string[]) => {
      setLibraryPaths(paths);
    });

    setLibraryChanged(false);
    // backgroundColorAngle.value = backgroundColor.value.angle;
    // backgroundStartColor.value = backgroundColor.value.startColor;
    // backgroundEndColor.value = backgroundColor.value.endColor;

    window.libraryAPI.libraryReady("libraryReady", () => {
      setTimeout(() => {
        setLibraryLoaded(true);
        closeSnackbar("libraryLoading");
        enqueueSnackbar("라이브러리 갱신 완료", { variant: "success" });
      }, 1000);
    });

    window.fileAPI.receiveDirectoryPath("addDirectoryToLibrary", (directoryPath: string) => {
      if (directoryPath.length === 0) {
        enqueueSnackbar("이미 등록된 디렉토리입니다.", {
          variant: "warning",
        });
      } else {
        setLibraryPaths((prevLibraryPaths) => [...prevLibraryPaths, directoryPath]);
        setLibraryChanged(true);
      }
    });
  }, []);

  const removeLibraryPath = useCallback((path: string) => {
    setLibraryPaths((prevLibraryPaths) => prevLibraryPaths.filter((p) => p !== path));
    setLibraryChanged(true);
  }, []);

  const applyLibraryChange = useCallback(() => {
    if (libraryChanged) {
      setLibraryLoaded(false);
      window.libraryAPI.setLibraryPaths(libraryPaths);
      setLibraryChanged(false);
      enqueueSnackbar(
        <Stack direction={"row"} alignItems={"center"}>
          <CircularProgress size={20} sx={{ marginRight: "8px" }} />
          라이브러리 갱신중...
        </Stack>,
        { persist: true, key: "libraryLoading" }
      );
    } else {
      enqueueSnackbar("변경된 내용이 없습니다.", { variant: "info" });
    }
  }, [libraryChanged]);

  return (
    <ThemeProvider theme={whiteTheme}>
      <Dialog fullWidth={true} open={props.open} onClose={props.onClose}>
        <Stack direction={"column"}>
          <Stack
            direction={"column"}
            height={360}
            padding={"20px 30px"}
            spacing={2}
            position={"relative"}
          >
            {!libraryLoaded && <Loading />}
            <Typography fontSize={"40px"}>라이브러리</Typography>
            {libraryPaths.length > 0 ? (
              libraryPaths.map((path) => (
                <Stack
                  key={path}
                  direction={"row"}
                  alignItems={"center"}
                  justifyContent={"space-between"}
                >
                  <Typography fontSize={"16px"}>{path}</Typography>
                  <DeleteButton onClick={() => removeLibraryPath(path)}>
                    <DeleteIcon fontSize={"small"} />
                  </DeleteButton>
                </Stack>
              ))
            ) : (
              <Typography>라이브러리에 디렉토리를 추가하세요.</Typography>
            )}
            <Stack direction={"row"} alignItems={"center"} justifyContent={"end"} spacing={1}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => window.fileAPI.openDirectoryDialog("addDirectoryToLibrary")}
              >
                추가
              </Button>

              <Button startIcon={<CheckIcon />} onClick={applyLibraryChange}>
                <Badge color="secondary" variant="dot" invisible={!libraryChanged}>
                  적용
                </Badge>
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Dialog>
    </ThemeProvider>
  );
};

const DeleteButton = styled(Button)({
  padding: "4px",
  minWidth: "0px",
  width: "24px",
  height: "24px",
});
