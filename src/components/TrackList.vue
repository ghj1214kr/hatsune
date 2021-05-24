<template>
  <div class="q-pa-none" @dragover.prevent.stop @drop="handleDrop">
    <q-virtual-scroll
      class="scrollbar"
      ref="vsElement"
      style="max-height: 100%"
      :items="trackList"
      :virtual-scroll-item-size="45"
      @virtual-scroll="scrolling"
    >
      <template v-slot="{ item, index }">
        <trackItem
          :key="index + item.path"
          :trackProp="item"
          :indexProp="index"
          :playlistNameProp="playlistName"
        />
      </template>
    </q-virtual-scroll>
    <q-inner-loading :showing="loadingShow" dark>
      <q-spinner size="75px" color="white" />
    </q-inner-loading>
  </div>
</template>

<script>
import { defineComponent, computed, ref, onMounted, watch } from "vue";
import { useStore } from "vuex";
import isAudio from "@kikopalomares/is-audio";
import TrackItemComponent from "components/TrackItem";
import Sortable from "sortablejs";
import { cloneDeep } from "lodash";

export default defineComponent({
  name: "TrackListComponent",
  components: {
    trackItem: TrackItemComponent,
  },
  setup() {
    const store = useStore();

    const playlistName = computed(
      () => store.getters["getSelectedPlaylistName"]
    );

    const trackList = computed(() =>
      store.getters["getTrackListFromPlaylist"](playlistName.value)
    );

    const loadingShow = ref(false);

    if (store.getters["getLoadingStatusFromPlaylist"](playlistName.value)) {
      loadingShow.value = true;
    }

    const scrollPosition = ref(0);
    const dragElementOldIndex = ref(0);
    const vsElement = ref(null);

    watch(trackList, () => {
      store.commit("setLoadingStatusToPlaylist", {
        playlistName: playlistName.value,
        loading: false,
      });
      loadingShow.value = false;
    });

    onMounted(() => {
      const vsListElement = vsElement.value.$el.childNodes[1];

      Sortable.create(vsListElement, {
        animation: 100,
        revertOnSpill: true,
        onStart: (event) => {
          dragElementOldIndex.value = scrollPosition.value + event.oldIndex;
        },
        onSort: (event) => {
          let { newIndex } = event;
          const oldIndex = dragElementOldIndex.value;
          const newIndex2 = scrollPosition.value + newIndex;
          const targetTrack = cloneDeep(trackList.value[newIndex2]);
          const dragTrack = cloneDeep(trackList.value[oldIndex]);

          if (oldIndex === newIndex2) {
            return;
          }

          event.item.remove();

          store.commit("reorderTrack", {
            oldIndex,
            newIndex: newIndex2,
            playlistName: playlistName.value,
          });

          window.playlistAPI.reorderTrackList(
            playlistName.value,
            dragTrack,
            targetTrack
          );
        },
      });
    });

    async function addTracksToCurrentPlaylist(trackPaths) {
      const filteredTrackPaths = trackPaths.filter(
        (path) => !trackList.value.map((track) => track.path).includes(path)
      );

      const filteredTrackPathsWithPlaylist = filteredTrackPaths.map(
        (trackPath) => {
          return { playlist: playlistName.value, path: trackPath };
        }
      );

      const trackListWithMetadata = await window.metadataAPI.getMetadata(
        filteredTrackPathsWithPlaylist
      );

      window.playlistAPI.addTracksToPlaylist(
        playlistName.value,
        trackListWithMetadata
      );

      store.commit("addTracksToPlaylist", {
        playlistName: playlistName.value,
        tracks: trackListWithMetadata,
      });
    }

    async function handleDrop(event) {
      const files = event.dataTransfer.files;
      const items = event.dataTransfer.items;
      const rawJSONData = event.dataTransfer.getData("json");

      const length = files.length;

      if (length > 0) {
        loadingStart();

        // after call await, DataTransfer is not persistent https://stackoverflow.com/a/59249292
        const queue = [];

        const trackPaths = [];
        for (var i = 0; i < length; i++) {
          if (items[i].webkitGetAsEntry().isFile) {
            if (isAudio(files[i].path)) {
              trackPaths.push(files[i].path);
            }
          } else {
            queue.push(
              window.fileAPI
                .getAllFilePaths(files[i].path)
                .then((filePaths) => {
                  trackPaths.push(...filePaths);
                })
            );
          }
        }

        await Promise.all(queue);

        addTracksToCurrentPlaylist(trackPaths);
      } else if (rawJSONData.length > 0) {
        const jsonData = JSON.parse(rawJSONData);

        if (jsonData.playlist === playlistName.value) {
          return;
        }

        loadingStart();

        if (jsonData.dir) {
          window.fileAPI.getAllFilePaths(jsonData.path).then((filePaths) => {
            addTracksToCurrentPlaylist(filePaths);
          });
        } else {
          addTracksToCurrentPlaylist([jsonData.path]);
        }
      }
    }

    function loadingStart() {
      store.commit("setLoadingStatusToPlaylist", {
        playlistName: playlistName.value,
        loading: true,
      });

      setTimeout(() => {
        if (
          store.getters["getLoadingStatusFromPlaylist"](playlistName.value) ===
          true
        ) {
          loadingShow.value = true;
        }
      }, 100);
    }

    function scrolling({ from }) {
      scrollPosition.value = from;
    }

    return {
      loadingShow,
      playlistName,
      trackList,
      vsElement,
      addTracksToCurrentPlaylist,
      handleDrop,
      scrolling,
    };
  },
});
</script>
