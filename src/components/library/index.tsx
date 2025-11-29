import { useRef, useState } from "react";
import {
  Divider,
  InputAdornment,
  Stack,
  styled,
  TextField,
} from "@mui/material";
import { RichTreeView } from "@mui/x-tree-view/RichTreeView";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
// import { Lyrix, ActionsHandle } from "lyr-ix";
import { invoke } from "@tauri-apps/api/core";

import {
  expendedLibraryNodesAtom,
  libraryAtom,
  libraryLoadedAtom,
  pipAtom,
  playingListAtom,
  playingNodeAtom,
  selectedLibraryNodeAtom,
  selectedPlaylistAtom,
  selectedPlaylistUidAtom,
} from "../../store/atoms";
import { LibraryTree, PlaylistItem } from "../../types";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { setPlaylistsAtom } from "../../store/actions";
import { Loading } from "../Loading";
import { CustomOverlayScrollbars } from "../../utils/theme";
import { Lyric } from "./lyric";

const libraryFilter = (library: LibraryTree[], text: string): LibraryTree[] => {
  const getNodes = (
    result: LibraryTree[],
    object: LibraryTree
  ): LibraryTree[] => {
    if (object.meta.toLowerCase().includes(text.toLowerCase())) {
      result.push(object);
      return result;
    }
    if (Array.isArray(object.children)) {
      const children = object.children.reduce(getNodes, []);
      if (children.length > 0) {
        result.push({ ...object, children });
      }
    }
    return result;
  };

  return library.reduce(getNodes, []);
};

type Props = {
  collapsedLayout: boolean;
};

export const Library: React.FC<Props> = (props: Props) => {
  const pip = useAtomValue(pipAtom);

  const setPlaylists = useSetAtom(setPlaylistsAtom);
  const setSelectedPlaylistUid = useSetAtom(selectedPlaylistUidAtom);
  const setSelectedPlaylist = useSetAtom(selectedPlaylistAtom);
  const setPlayingList = useSetAtom(playingListAtom);
  const setPlayingNode = useSetAtom(playingNodeAtom);
  const libraryLoaded = useAtomValue(libraryLoadedAtom);

  const searchTextFieldRef = useRef<HTMLInputElement | null>(null);
  const searchString = useRef("");

  const library = useAtomValue(libraryAtom);
  const [filteredLibrary, setFilteredLibrary] = useState<LibraryTree[]>([]);
  const [expendedLibraryNodes, setExpendedLibraryNodes] = useAtom(
    expendedLibraryNodesAtom
  );
  const [selectedLibraryNode, setSelectedLibraryNode] = useAtom(
    selectedLibraryNodeAtom
  );
  // const clickedNodes = useRef<string[]>([]);

  const convertToTreeItems = (nodes: LibraryTree[]): any[] => {
    return nodes.map((node) => ({
      id: node.path,
      label: node.text,
      children:
        node.children.length > 0
          ? convertToTreeItems(node.children)
          : undefined,
    }));
  };

  return (
    <Stack
      flex={1}
      direction={"column"}
      minWidth={0}
      width={props.collapsedLayout ? "calc(50vw - 12px)" : "100%"}
      height={props.collapsedLayout ? "100%" : "auto"}
      position={"relative"}
      display={pip ? "none" : "flex"}
    >
      {!libraryLoaded && <Loading />}
      <SearchTextField
        inputRef={searchTextFieldRef}
        color={"primary"}
        variant={"standard"}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position={"start"}>
                <SearchIcon fontSize={"small"} color={"primary"} />
              </InputAdornment>
            ),
            endAdornment: (
              <ClearInputAdornment position={"end"}>
                <ClearIcon fontSize={"small"} color={"primary"} />
              </ClearInputAdornment>
            ),
          },
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            searchString.current = searchTextFieldRef.current?.value ?? "";
            setFilteredLibrary(libraryFilter(library, searchString.current));
          }
        }}
      />
      <Divider />
      <CustomOverlayScrollbars
        options={{
          scrollbars: {
            autoHide: "leave",
            autoHideDelay: 0,
          },
          overflow: {
            x: "hidden",
            y: "scroll",
          },
        }}
        defer
      >
        <CustomRichTreeView
          slots={{
            expandIcon: AddIcon,
            collapseIcon: RemoveIcon,
            endIcon: MusicNoteIcon,
          }}
          items={convertToTreeItems(
            searchString.current.length > 0 ? filteredLibrary : library
          )}
          slotProps={{
            item: {
              onDoubleClick: async (event) => {
                event.stopPropagation();
                setPlayingNode(selectedLibraryNode);
                setPlayingList(
                  "library",
                  await invoke("get_selected_library", {
                    path: selectedLibraryNode,
                  }),
                  0
                );
                // clickedNodes.current = clickedNodes.current.filter(
                //   (clickedNode) => clickedNode !== selectedLibraryNode
                // );
              },
            },
          }}
          expandedItems={expendedLibraryNodes}
          selectedItems={selectedLibraryNode}
          expansionTrigger={"iconContainer"}
          onExpandedItemsChange={(
            _event: React.SyntheticEvent | null,
            nodeIds: string[]
          ) => {
            const removedNode = expendedLibraryNodes.filter(
              (expandednode) => !nodeIds.includes(expandednode)
            )[0];
            let newExpandedNodes: string[] = [];
            if (removedNode !== undefined) {
              newExpandedNodes = expendedLibraryNodes.filter(
                (expandedNode) => !expandedNode.includes(removedNode)
              );
            } else {
              newExpandedNodes = [
                nodeIds[0],
                ...expendedLibraryNodes.filter((expandedNode) =>
                  nodeIds[0].includes(expandedNode)
                ),
              ];
            }
            newExpandedNodes = Array.from(new Set(newExpandedNodes));
            setExpendedLibraryNodes(newExpandedNodes);
          }}
          onSelectedItemsChange={async (
            _event: React.SyntheticEvent | null,
            itemId: string | string[] | null
          ) => {
            if (!itemId || Array.isArray(itemId)) {
              return;
            }
            // if (!clickedNodes.current.includes(itemId)) {
            // clickedNodes.current = [itemId];
            setSelectedLibraryNode(itemId);
            setSelectedPlaylistUid("library");
            const playlist = {
              name: "라이브러리",
              uid: "library",
              trackList: await invoke<PlaylistItem[]>("get_selected_library", {
                path: itemId,
              }),
            };
            setPlaylists(playlist);
            setSelectedPlaylist(playlist);
            // setTimeout(() => {
            //   clickedNodes.current = clickedNodes.current.filter(
            //     (clickedNode) => clickedNode !== itemId
            //   );
            // }, 500);
            // } else {
            // setPlayingNode(itemId);
            // setPlayingList(
            //   "library",
            //   await invoke("get_selected_library", {
            //     path: itemId,
            //   }),
            //   0
            // );
            // clickedNodes.current = clickedNodes.current.filter(
            //   (clickedNode) => clickedNode !== itemId
            // );
            // }
          }}
        />
      </CustomOverlayScrollbars>
      <Lyric collapsedLayout={props.collapsedLayout} />
    </Stack>
  );
};

const SearchTextField = styled(TextField)(({ theme }) => ({
  padding: "6px",
  caretColor: theme.palette.primary.main,
  "& .MuiInputBase-input": {
    fontSize: "14px",
    color: theme.palette.primary.main,
  },
  "& .MuiInputBase-root:before": {
    display: "none",
  },
  "& .MuiInputBase-root:after": {
    display: "none",
  },
}));

const ClearInputAdornment = styled(InputAdornment)(() => ({
  cursor: "pointer",
}));

const CustomRichTreeView = styled(RichTreeView)(({ theme }) => ({
  "& .MuiTreeItem-root": {
    color: theme.palette.primary.main,
    paddingLeft: "8px",
  },
  "& .MuiTreeItem-content": {
    padding: 0,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.05)",
    },
    "&.Mui-focused": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    "&.Mui-selected": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
  },
  "& .MuiTreeItem-content .MuiTreeItem-iconContainer": {
    margin: 0,
    width: "24px",
    height: "24px",
    flexDirection: "column",
    alignItems: "center",
  },
  "& .MuiTreeItem-content .MuiTreeItem-label": {
    paddingTop: "2px",
    paddingBottom: "2px",
    fontSize: "14px",
    paddingLeft: 0,
  },
}));
