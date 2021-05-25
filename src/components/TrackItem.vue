<template>
  <div>
    <q-item
      class="q-px-none q-py-xs text-white"
      dense
      :draggable="true"
      @dragstart="setDragAndDropData"
      @dblclick="startPlay"
      clickable
      v-ripple
      :style="{
        'background-color': isThisPlaying
          ? 'rgba(255, 255, 255, .2)'
          : 'rgba(255, 255, 255, .0)',
      }"
    >
      <q-item-section
        v-if="playlistName === 'library'"
        avatar
        style="padding: 0px; width: 30px"
      >
        <q-item-label class="text-subtitle1" style="margin: auto">
          {{ track.track_no }}
        </q-item-label>
      </q-item-section>
      <q-item-section
        :class="{ 'q-pl-sm': playlistName !== 'library' }"
        :style="{ 'max-width': playlistName === 'library' ? '346px' : '376px' }"
      >
        <q-item-label
          style="
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            height: 18px;
          "
          >{{ track.title }}
        </q-item-label>
        <q-item-label
          caption
          style="
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            width: 340px;
            height: 16px;
            color: white;
          "
          >{{ track.artist }}
        </q-item-label>
      </q-item-section>
      <q-item-section side class="durationClass">
        <q-item-label
          class="text-white q-pr-sm"
          style="
            width: 34px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          "
          >{{ durationStr(track.duration) }}</q-item-label
        >
      </q-item-section>
      <q-menu touch-position context-menu>
        <q-list>
          <q-item
            class="q-px-sm q-py-none"
            clickable
            v-close-popup
            @click="openPathInDirectory(track.path)"
            style="min-height: 40px;"
          >
            <q-item-section avatar>
              <q-icon name="folder_open" />
            </q-item-section>
            <q-item-section>{{ $t("viewInFileExplorer") }}</q-item-section>
          </q-item>
          <q-item
            class="q-px-sm q-py-none"
            v-if="playlistName !== 'library'"
            clickable
            v-close-popup
            @click="removeTrackFromPlaylist(track.path)"
            style="min-height: 40px;"
          >
            <q-item-section avatar>
              <q-icon name="delete" />
            </q-item-section>
            <q-item-section>{{ $t("remove") }}</q-item-section>
          </q-item>
          <q-item
            class="q-px-sm q-py-none"
            clickable
            v-close-popup
            @click="showTrackPropertiesDialog(track.path)"
            style="min-height: 40px;"
          >
            <q-item-section avatar>
              <q-icon name="info" />
            </q-item-section>
            <q-item-section>{{ $t("properties") }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>
    <q-separator />
  </div>
</template>

<script>
import { defineComponent, ref, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  name: "TrackItemComponent",
  components: {},
  props: {
    trackProp: Object,
    indexProp: Number,
    playlistNameProp: String,
  },
  setup(props) {
    const store = useStore();

    const track = ref(props.trackProp);
    const index = ref(props.indexProp);
    const playlistName = ref(props.playlistNameProp);
    const playingPlaylistName = computed(
      () => store.getters["getPlayingPlaylistName"]
    );
    const playingTrackPath = computed(
      () => store.getters["getPlayingTrackPath"]
    );
    const isThisPlaying = computed(
      () =>
        playingPlaylistName.value === playlistName.value &&
        playingTrackPath.value === track.value.path
    );

    function durationStr(duration) {
      var min = Math.floor(duration / 60) + ":";
      var sec = Math.round(duration) % 60;
      if (sec < 10) {
        sec = "0" + sec;
      }
      return min + sec;
    }

    function openPathInDirectory(path) {
      window.fileAPI.openPathInDirectory(path);
    }

    function removeTrackFromPlaylist(path) {
      store.commit("removeTrackFromSelectedPlaylist", path);
      window.playlistAPI.removeTrackFromPlaylist(
        store.getters["getSelectedPlaylistName"],
        path
      );
    }

    async function showTrackPropertiesDialog(path) {
      const metadata = await window.metadataAPI.getMetadataForProperties(path);
      store.commit("setTrackPropertiesDialogData", metadata);
      store.commit("setTrackPropertiesDialog", true);
    }

    function setDragAndDropData(event) {
      event.dataTransfer.setData(
        "json",
        JSON.stringify({
          path: track.value.path,
          dir: false,
          playlist: track.value.playlist,
        })
      );
    }

    function startPlay() {
      if (
        store.getters["getPlayingTrack"].path === track.value.path &&
        store.getters["getPlayingPlaylistName"] ===
          store.getters["getSelectedPlaylistName"]
      ) {
        store.commit("toggleBackToStart");
        store.commit("setPlaying", true);
      } else {
        store.commit("setPlayingList", {
          playlistName: store.getters["getSelectedPlaylistName"],
          index: index.value,
        });
      }
    }

    return {
      track,
      playlistName,
      isThisPlaying,
      durationStr,
      openPathInDirectory,
      removeTrackFromPlaylist,
      showTrackPropertiesDialog,
      setDragAndDropData,
      startPlay,
    };
  },
});
</script>

<style scoped>
.q-item__section--avatar {
  min-width: 0px;
  padding-right: 8px;
}
.durationClass {
  padding-left: 0px;
}
</style>
