import { useCallback, useEffect, useState } from "react";
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
import { closeSnackbar, useSnackbar } from "notistack";
import { useAtom, useSetAtom } from "jotai";
import { open } from "@tauri-apps/plugin-dialog";
import { homeDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";

import { libraryAtom, libraryLoadedAtom } from "../../store/atoms";

import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CloseIcon from "@mui/icons-material/Close";

import { whiteTheme } from "../../utils/theme";
import { LibraryTree } from "../../types";
import { getVersion } from "@tauri-apps/api/app";
// import { LibraryTree } from "../../types";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const Settings: React.FC<Props> = (props: Props) => {
  const {
    enqueueSnackbar,
    // closeSnackbar
  } = useSnackbar();

  const [libraryLoaded, setLibraryLoaded] = useAtom(libraryLoadedAtom);
  const setLibrary = useSetAtom(libraryAtom);

  const [libraryPaths, setLibraryPaths] = useState<string[]>([]);
  const [libraryChanged, setLibraryChanged] = useState(false);
  const [verison, setVersion] = useState("");

  useEffect(() => {
    invoke<string[]>("get_library_paths").then((libraryPaths) => {
      setLibraryPaths(libraryPaths);
    });

    setLibraryChanged(false);
    // backgroundColorAngle.value = backgroundColor.value.angle;
    // backgroundStartColor.value = backgroundColor.value.startColor;
    // backgroundEndColor.value = backgroundColor.value.endColor;

    (async () => {
      setVersion(await getVersion());
    })();
  }, []);

  const removeLibraryPath = useCallback((path: string) => {
    setLibraryPaths((prevLibraryPaths) =>
      prevLibraryPaths.filter((p) => p !== path)
    );
    setLibraryChanged(true);
  }, []);

  const applyLibraryChange = useCallback(() => {
    if (libraryChanged) {
      setLibraryLoaded(false);
      invoke("set_library", { libraryPaths }).then(async () => {
        const library = await invoke<LibraryTree[]>("get_library");
        await invoke("refresh_allow_directory");
        setLibrary(library);
        setTimeout(() => {
          setLibraryLoaded(true);
          closeSnackbar("libraryLoading");
          enqueueSnackbar("라이브러리 갱신 완료", { variant: "success" });
        }, 1000);
      });
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
            spacing={5}
            position={"relative"}
          >
            <Stack direction={"column"}>
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
                    <DeleteButton
                      disabled={!libraryLoaded}
                      onClick={() => removeLibraryPath(path)}
                    >
                      <DeleteIcon fontSize={"small"} />
                    </DeleteButton>
                  </Stack>
                ))
              ) : (
                <Typography>라이브러리에 디렉토리를 추가하세요.</Typography>
              )}
              <Stack
                direction={"row"}
                alignItems={"center"}
                justifyContent={"end"}
                spacing={1}
              >
                <Button
                  disabled={!libraryLoaded}
                  startIcon={<AddIcon />}
                  onClick={async () => {
                    const homeDirPath = await homeDir();
                    const selectedDirectoryPaths = await open({
                      directory: true,
                      multiple: true,
                      defaultPath: homeDirPath,
                    });
                    if (!selectedDirectoryPaths) return;
                    if (Array.isArray(selectedDirectoryPaths)) {
                      setLibraryPaths((prevLibraryPaths) => [
                        ...prevLibraryPaths,
                        ...selectedDirectoryPaths,
                      ]);
                    } else {
                      setLibraryPaths((prevLibraryPaths) => [
                        ...prevLibraryPaths,
                        selectedDirectoryPaths,
                      ]);
                    }
                    setLibraryChanged(true);
                  }}
                >
                  추가
                </Button>

                <Button
                  disabled={!libraryLoaded}
                  startIcon={<CheckIcon />}
                  onClick={applyLibraryChange}
                >
                  <Badge
                    color="secondary"
                    variant="dot"
                    invisible={!libraryChanged}
                  >
                    적용
                  </Badge>
                </Button>
              </Stack>
            </Stack>
            <Stack
              direction={"column"}
              alignItems={"center"}
              justifyContent={"center"}
              spacing={-3}
            >
              <Typography
                fontSize={"60px"}
                fontStyle={"italic"}
                css={{
                  letterSpacing: "-3px",
                  fontWeight: "bold",
                  rotate: "-14deg",
                }}
              >
                FirstSound
              </Typography>
              <Typography
                fontSize={"20px"}
                fontStyle={"italic"}
                css={{
                  letterSpacing: "-2px",
                  fontWeight: "bold",
                  rotate: "-14deg",
                }}
              >
                {verison}
              </Typography>
            </Stack>
          </Stack>
          <Stack
            direction={"row"}
            padding={"20px 30px"}
            alignItems={"center"}
            justifyContent={"space-between"}
            spacing={2}
          >
            <Stack direction={"row"} alignItems={"center"} spacing={1}>
              <Button
                autoCapitalize="none"
                endIcon={<OpenInNewIcon />}
                css={{
                  minWidth: "40px",
                }}
              >
                Github
              </Button>
            </Stack>
            <Button startIcon={<CloseIcon />} onClick={props.onClose}>
              닫기
            </Button>
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
