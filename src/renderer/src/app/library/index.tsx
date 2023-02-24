import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import RemoveIcon from "@mui/icons-material/Remove";
import SearchIcon from "@mui/icons-material/Search";
import TreeItem, { TreeItemContentProps, useTreeItem } from "@mui/lab/TreeItem";
import TreeView from "@mui/lab/TreeView";
import { Box, Divider, InputAdornment, Stack, styled, TextField, Typography } from "@mui/material";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { setPlayingListAtom } from "@/store/actions";
import {
  libraryLoadedAtom,
  modeAtom,
  selectedLibraryAtom,
  selectedPlaylistIdAtom,
} from "@/store/atoms";
import { Track } from "@/types";

import { Loading } from "../Loading";

type LibraryTree = {
  path: string;
  text: string;
  meta: string;
  children: LibraryTree[];
};

const libraryFilter = (library: LibraryTree[], text: string) => {
  const getNodes = (result: LibraryTree[], object: LibraryTree) => {
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

export const Library: React.FC<{
  collapsedLayout: boolean;
}> = (props) => {
  const setMode = useSetAtom(modeAtom);
  const setSelectedPlaylistId = useSetAtom(selectedPlaylistIdAtom);
  const [selectedLibrary, setSelectedLibrary] = useAtom(selectedLibraryAtom);
  const setPlayingList = useSetAtom(setPlayingListAtom);
  const [libraryLoaded, setLibraryLoaded] = useAtom(libraryLoadedAtom);

  const searchTextFieldRef = useRef<HTMLInputElement | null>(null);
  const searchString = useRef("");

  const [library, setLibrary] = useState<LibraryTree[]>([]);
  const [filteredLibrary, setFilteredLibrary] = useState<LibraryTree[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("");
  const clickedNodes = useRef<string[]>([]);

  useEffect(() => {
    window.libraryAPI.receiveLibrary("receiveLibrary", (library: LibraryTree[]) => {
      setLibrary(library);
    });

    (async () => {
      const library: LibraryTree[] = await window.libraryAPI.getLibrary();
      setLibrary(library);
      setLibraryLoaded(true);
      setExpandedNodes(await window.configAPI.getConfig("expandedNodes"));
      setSelectedNode(await window.configAPI.getConfig("selectedNodePath"));
    })();
  }, []);

  const renderTree = useCallback((nodes: LibraryTree[] | undefined) => {
    if (!nodes) {
      return null;
    }

    return nodes.map((node) => (
      <TreeItem
        key={node.path}
        nodeId={node.path}
        label={node.text}
        ContentComponent={CustomContent}
      >
        {node.children.length > 0 ? renderTree(node.children) : null}
      </TreeItem>
    ));
  }, []);

  return (
    <Stack
      direction={"column"}
      width={props.collapsedLayout ? "calc(50vw - 12px)" : "100%"}
      height={props.collapsedLayout ? "100%" : "auto"}
      position={"relative"}
    >
      {!libraryLoaded && <Loading />}
      <SearchTextField
        inputRef={searchTextFieldRef}
        color={"primary"}
        variant={"standard"}
        InputProps={{
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
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            searchString.current = searchTextFieldRef.current?.value ?? "";
            setFilteredLibrary(libraryFilter(library, searchString.current));
          }
        }}
      />
      <Divider />
      <Box
        overflow={"hidden"}
        sx={{
          "&:hover": {
            overflow: "overlay",
          },
        }}
      >
        <CustomTreeView
          defaultExpandIcon={<AddIcon />}
          defaultCollapseIcon={<RemoveIcon />}
          defaultEndIcon={<MusicNoteIcon />}
          disabledItemsFocusable={true}
          expanded={expandedNodes}
          selected={selectedNode}
          onNodeToggle={(_event, newNodes) => {
            const removedNode = expandedNodes.filter(
              (expandednode) => !newNodes.includes(expandednode)
            )[0];
            let newExpandedNodes: string[] = [];
            if (removedNode !== undefined) {
              newExpandedNodes = expandedNodes.filter(
                (expandedNode) => !expandedNode.includes(removedNode)
              );
            } else {
              newExpandedNodes = [
                newNodes[0],
                ...expandedNodes.filter((expandedNode) => newNodes[0].includes(expandedNode)),
              ];
            }
            newExpandedNodes = Array.from(new Set(newExpandedNodes));
            window.configAPI.setConfig("expandedNodes", newExpandedNodes);
            setExpandedNodes(newExpandedNodes);
          }}
          onNodeSelect={async (_event: React.SyntheticEvent, selectedNode: string) => {
            if (!clickedNodes.current.includes(selectedNode)) {
              clickedNodes.current = [selectedNode];
              setSelectedNode(selectedNode);
              setSelectedPlaylistId("library");
              setSelectedLibrary(await window.libraryAPI.getSelectedLibrary(selectedNode));
              setTimeout(() => {
                clickedNodes.current = clickedNodes.current.filter(
                  (clickedNode) => clickedNode !== selectedNode
                );
              }, 500);
              window.configAPI.setConfig("selectedNodePath", selectedNode);
            } else {
              setMode("local");
              setPlayingList({
                playlistId: "library",
                index: 0,
                trackList: selectedLibrary.filter((item) => !("isAlbumHeader" in item)) as Track[],
              });
              window.configAPI.setConfig("playingNodePath", selectedNode);
              clickedNodes.current = clickedNodes.current.filter(
                (clickedNode) => clickedNode !== selectedNode
              );
            }
          }}
        >
          {renderTree(searchString.current.length > 0 ? filteredLibrary : library)}
        </CustomTreeView>
      </Box>
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

const CustomTreeView = styled(TreeView)(({ theme }) => ({
  "& .MuiTreeItem-root": {
    color: theme.palette.primary.main,
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

const CustomContent = forwardRef(function CustomContent(props: TreeItemContentProps, ref) {
  const { classes, className, label, nodeId, icon: iconProp, expansionIcon, displayIcon } = props;

  const {
    disabled,
    expanded,
    selected,
    focused,
    handleExpansion,
    handleSelection,
    // preventSelection,
  } = useTreeItem(nodeId);

  const icon = iconProp || expansionIcon || displayIcon;

  // const handleMouseDown = (
  //   event: React.MouseEvent<HTMLDivElement, MouseEvent>
  // ) => {
  //   preventSelection(event);
  // };

  const handleExpansionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    handleExpansion(event);
  };

  const handleSelectionClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    handleSelection(event);
  };

  return (
    <div
      className={clsx(className, classes.root, {
        [classes.expanded]: expanded,
        [classes.selected]: selected,
        [classes.focused]: focused,
        [classes.disabled]: disabled,
      })}
      ref={ref as React.Ref<HTMLDivElement>}
      // onMouseDown={handleSelectionClick}
    >
      <div
        className={classes.iconContainer}
        onClick={displayIcon ? handleSelectionClick : handleExpansionClick}
      >
        {icon}
      </div>
      <Typography component="div" className={classes.label} onMouseDown={handleSelectionClick}>
        {label}
      </Typography>
    </div>
  );
});
