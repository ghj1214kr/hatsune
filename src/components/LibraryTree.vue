<template>
  <div>
    <q-input
      color="white"
      dense
      dark
      clearable
      borderless
      v-model="filter"
      class="q-px-xs"
      :input-style="{ height: '36px' }"
      style="height: 36px"
      @keypress.enter="search(filter)"
      @clear="searchClear"
    >
      <template v-slot:prepend>
        <q-icon name="search" />
      </template>
    </q-input>
    <q-separator />
    <he-tree
      class="scrollbar"
      id="library"
      ref="treeRef"
      :indent="15"
      :value="libraryNode"
      v-slot="{ node, path, tree }"
      style="color: white; width: 410.6px"
    >
      <q-icon
        class="foldButton"
        v-if="node.children.length > 0"
        size="21px"
        :name="node.$folded ? 'add' : 'remove'"
        @click="toggleFold(tree, node, path)"
      />
      <div
        :draggable="true"
        v-bind:class="{ selectedNode: node.selected }"
        class="nodeText"
        @click="click(node, path)"
        @dragstart="setDragAndDropData($event, node)"
      >
        {{ node.text }}
      </div>
    </he-tree>
    <q-separator id="separator" class="q-mb-sm" />
    <q-inner-loading
      class="q-ma-sm"
      :showing="!libraryReady"
      dark
      style="width: 410.66px; height: 703px"
    >
      <q-spinner size="75px" color="white" />
    </q-inner-loading>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch, onMounted } from "vue";
import { useStore } from "vuex";
import { Tree, Fold, foldAll, walkTreeData } from "he-tree-vue";

export default defineComponent({
  name: "LibraryTreeComponent",
  components: {
    heTree: Tree.mixPlugins([Fold]),
  },
  setup() {
    const store = useStore();

    const treeRef = ref(null);
    const libraryReady = computed(() => store.getters["getLibraryReady"]);
    const libraryNode = ref([]);
    const clickedNode = ref({});
    const filter = ref("");
    const withLyric = computed(() => store.getters["getWithLyric"]);

    init();

    watch(libraryNode, (libraryNode) => {
      foldAll(libraryNode);
    });

    watch(withLyric, (withLyric) => {
      const libraryEl = document.getElementById("library");
      const separatorEl = document.getElementById("separator");
      if (withLyric) {
        libraryEl.style.height = "590px";
        separatorEl.style.opacity = 1;
      } else {
        libraryEl.style.height = "665px";
        separatorEl.style.opacity = 0;
      }
    });

    onMounted(async () => {
      const libraryEl = document.getElementById("library");
      const separatorEl = document.getElementById("separator");
      libraryEl.style.height = "665px";
      separatorEl.style.opacity = 0;

      const expandedNode = await window.configAPI.getConfig("expandedNode");

      for (const { node } of treeRef.value.iteratePath(expandedNode)) {
        node.$folded = false;
      }

      const selectedNode = await window.configAPI.getConfig("selectedNode");

      const node = treeRef.value.getNodeByPath(selectedNode);

      if (node !== undefined) {
        node.selected = true;
      }
    });

    window.libraryAPI.receiveLibrary("receiveLibrary", (library) => {
      libraryNode.value = library;
    });

    async function init() {
      libraryNode.value = await window.libraryAPI.getLibrary();
      foldAll(libraryNode.value);

      const selectedNodePath = await window.configAPI.getConfig(
        "selectedNodePath"
      );

      if (selectedNodePath !== "") {
        store.commit(
          "setSelectedLibrary",
          await window.libraryAPI.getSelectedLibrary(selectedNodePath)
        );
      }

      store.commit("setLibraryLoaded");
    }

    function toggleFold(tree, node, path) {
      if (!node.$folded) {
        tree.toggleFold(node, path);
        walkTreeData(node, (node) => {
          node.$folded = true;
        });
        window.configAPI.setConfig("expandedNode", path.splice(-1, 1));
      } else {
        foldAll(libraryNode.value);
        for (const { node } of treeRef.value.iteratePath(path)) {
          node.$folded = false;
        }
        window.configAPI.setConfig("expandedNode", path);
      }
    }

    async function click(node, path) {
      if (clickedNode.value[node.path] !== true) {
        // single click
        clickedNode.value = {};
        clickedNode.value[node.path] = true;

        store.commit("setSelectedPlaylistName", "library");
        store.commit(
          "setSelectedLibrary",
          await window.libraryAPI.getSelectedLibrary(node.path)
        );

        walkTreeData(libraryNode.value, (node) => {
          node.selected = false;
        });

        node.selected = true;

        setTimeout(() => {
          delete clickedNode.value[node.path];
        }, 500);

        window.configAPI.setConfig("selectedNode", path);
        window.configAPI.setConfig("selectedNodePath", node.path);
      } else {
        // double click
        store.commit("setPlayingList", {
          playlistName: "library",
          index: 0,
        });
        delete clickedNode.value[node.path];
      }
    }

    function search(input) {
      if (input.length === 0) {
        walkTreeData(libraryNode.value, (node) => {
          node.$hidden = false;
        });
        return;
      }

      const pathsToChildrenDisplay = [];
      const pathsToParentDisplay = [];

      walkTreeData(libraryNode.value, (node) => {
        node.$hidden = true;
      });
      walkTreeData(libraryNode.value, (node, index, parent, path) => {
        if (node.meta.toLowerCase().indexOf(input.toLowerCase()) > -1) {
          node.$hidden = false;
          pathsToChildrenDisplay.push(path);
          pathsToParentDisplay.push(path);
        }
      });
      for (const path of pathsToChildrenDisplay) {
        walkTreeData(treeRef.value.getNodeByPath(path), (node) => {
          node.$hidden = false;
        });
      }
      for (const tempPath of pathsToParentDisplay) {
        for (const { node } of treeRef.value.iteratePath(tempPath)) {
          node.$hidden = false;
        }
      }
    }

    function searchClear() {
      search("");
    }

    function setDragAndDropData(event, node) {
      event.dataTransfer.setData(
        "json",
        JSON.stringify({ path: node.path, dir: node.children.length > 0 })
      );
    }

    return {
      treeRef,
      libraryReady,
      libraryNode,
      filter,
      toggleFold,
      click,
      search,
      searchClear,
      setDragAndDropData,
    };
  },
});
</script>

<style>
.q-field__prepend {
  height: 36px !important;
}
#library {
  transition: height 0.5s;
}
#separator {
  transition: opacity 0.5s;
}
.tree-node {
  height: 26px;
  display: flex;
  align-items: center;
}
.foldButton {
  width: 26px;
  height: 26px;
}
.he-tree--hidden {
  display: none;
}
.nodeText {
  width: 100%;
  padding: 2px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.selectedNode {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
