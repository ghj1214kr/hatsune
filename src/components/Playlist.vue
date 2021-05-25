<template>
  <div style="width: 410.66px; height: 645px">
    <q-tabs
      v-model="selectedPlaylistName"
      dense
      no-caps
      class="text-white"
      align="left"
      :breakpoint="0"
      narrow-indicator
    >
      <draggable
        v-model="playlists"
        itemKey="name"
        tag="p"
        :animation="100"
        @sort="reorder"
      >
        <template #item="{ element }">
          <q-tab
            :id="element.name"
            :name="element.name"
            :label="element.name === 'library' ? $t('library') : element.name"
            :key="element.name"
            @dragover.prevent
            @drop.prevent="dropOnTab"
            class="q-px-sm"
            :style="{
              'background-color':
                element.name === playingPlaylistName
                  ? 'rgba(255, 255, 255, .2)'
                  : 'rgba(255, 255, 255, .0)',
            }"
          >
            <q-menu
              v-if="element.name !== 'library'"
              touch-position
              context-menu
              style="width: 100px"
            >
              <q-list>
                <q-item
                  clickable
                  v-close-popup
                  @click="renamePlaylistDialogShow(element.name)"
                  dense
                  class="q-pa-sm"
                >
                  <q-item-section avatar class="q-pr-xs">
                    <q-icon name="drive_file_rename_outline" size="sm" />
                  </q-item-section>
                  <q-item-section>{{ $t("rename") }}</q-item-section>
                </q-item>
                <q-item
                  clickable
                  v-close-popup
                  @click="removePlaylistDialogShow(element.name)"
                  dense
                  class="q-pa-sm"
                >
                  <q-item-section avatar class="q-pr-xs">
                    <q-icon name="delete" size="sm" />
                  </q-item-section>
                  <q-item-section>{{ $t("remove") }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-tab>
        </template>
      </draggable>
      <q-btn flat icon="add" @click="addPlaylist" />
    </q-tabs>

    <q-separator />

    <q-tab-panels
      v-model="selectedPlaylistName"
      animated
      class="transparent"
      style="height: 605px"
    >
      <library-view name="library" />
      <tracklist
        v-for="playlist in playlists"
        :name="playlist.name"
        :key="playlist.name"
      />
    </q-tab-panels>
    <q-separator />
    <q-dialog v-model="renamePlaylistDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            {{
              $t("playlistRenameDialogTitle", {
                playlistNameToRename: playlistNameToRename,
              })
            }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            dense
            v-model="newPlaylistName"
            autofocus
            @keyup.enter="renamePlaylistDialogConfirm"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn icon="close" flat :label="$t('cancel')" v-close-popup />
          <q-btn
            icon="check"
            flat
            :label="$t('ok')"
            @click="renamePlaylistDialogConfirm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <q-dialog v-model="removePlaylistDialog">
      <q-card style="min-width: 350px">
        <q-card-section>
          <div class="text-h6">
            {{
              $t("playlistRemoveDialogTitle", {
                playlistNameToRemove: playlistNameToRemove,
              })
            }}
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat icon="close" :label="$t('cancel')" v-close-popup />
          <q-btn
            icon="check"
            flat
            :label="$t('ok')"
            v-close-popup
            @click="removePlaylistDialogConfirm"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import { useQuasar } from "quasar";
import { defineComponent, computed, ref } from "vue";
import { useStore } from "vuex";
import VueDraggableNext from "vuedraggable";
import TrackListComponent from "components/TrackList";
import LibraryViewComponent from "components/LibraryView";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "PlaylistComponent",
  components: {
    draggable: VueDraggableNext,
    tracklist: TrackListComponent,
    libraryView: LibraryViewComponent,
  },
  setup() {
    const $q = useQuasar();
    const store = useStore();
    const { t: $t } = useI18n();

    const playlists = computed({
      get() {
        return store.getters["getPlaylists"];
      },
      set(value) {
        store.commit("setPlaylists", value);
      },
    });

    const selectedPlaylistName = computed({
      get() {
        return store.getters["getSelectedPlaylistName"];
      },
      set(value) {
        window.configAPI.setConfig("selectedPlaylistName", value);
        store.commit("setSelectedPlaylistName", value);
      },
    });

    const playingPlaylistName = computed({
      get() {
        return store.getters["getPlayingPlaylistName"];
      },
      set(value) {
        store.commit("setPlayingPlaylistName", value);
      },
    });

    const renamePlaylistDialog = ref(false);
    const playlistNameToRename = ref("");
    const newPlaylistName = ref("");

    const removePlaylistDialog = ref(false);
    const playlistNameToRemove = ref("");

    async function addTracksToPlaylist(destPlaylistName, trackPaths) {
      const filteredTrackPaths = trackPaths.filter(
        (path) =>
          !store.getters["getTrackListFromPlaylist"](destPlaylistName)
            .map((track) => track.path)
            .includes(path)
      );

      const filteredTrackPathsWithPlaylist = filteredTrackPaths.map(
        (trackPath) => {
          return { playlist: destPlaylistName, path: trackPath };
        }
      );

      const trackListWithMetadata = await window.metadataAPI.getMetadata(
        filteredTrackPathsWithPlaylist
      );

      window.playlistAPI.addTracksToPlaylist(
        destPlaylistName,
        trackListWithMetadata
      );

      store.commit("addTracksToPlaylist", {
        playlistName: destPlaylistName,
        tracks: trackListWithMetadata,
      });
    }

    function reorder(event) {
      const { oldIndex, newIndex } = event;
      const dragPlaylistName = playlists.value[oldIndex].name;
      const targetPlaylistName = playlists.value[newIndex].name;
      window.playlistAPI.reorderPlaylists(dragPlaylistName, targetPlaylistName);
    }

    function renamePlaylistDialogShow(playlistName) {
      playlistNameToRename.value = playlistName;
      newPlaylistName.value = playlistName;
      renamePlaylistDialog.value = true;
    }

    function renamePlaylistDialogConfirm() {
      if (
        playlists.value.some(
          (playlist) => playlist.name === newPlaylistName.value
        ) &&
        playlistNameToRename.value !== newPlaylistName.value
      ) {
        $q.notify({
          type: "warning",
          message: $t("alreadyExistsPlaylistName"),
          timeout: 3000,
        });
        return;
      } else if (newPlaylistName.value === "") {
        $q.notify({
          type: "warning",
          message: $t("enterPlaylistName"),
          timeout: 3000,
        });
        return;
      }

      if (playlistNameToRename.value === playingPlaylistName.value) {
        playingPlaylistName.value = newPlaylistName.value;
      }

      if (playlistNameToRename.value === selectedPlaylistName.value) {
        selectedPlaylistName.value = newPlaylistName.value;
      }

      store.commit("renamePlaylist", {
        oldPlaylistName: playlistNameToRename.value,
        newPlaylistName: newPlaylistName.value,
      });

      window.playlistAPI.renamePlaylist(
        playlistNameToRename.value,
        newPlaylistName.value
      );

      playlistNameToRename.value = "";
      newPlaylistName.value = "";
      renamePlaylistDialog.value = false;
    }

    function removePlaylistDialogShow(playlistName) {
      playlistNameToRemove.value = playlistName;
      removePlaylistDialog.value = true;
    }

    async function removePlaylistDialogConfirm() {
      if (playlistNameToRemove.value === selectedPlaylistName.value) {
        const nextSelectedPlaylistName =
          store.getters["getNextSelectedPlaylistName"];
        await store.commit(
          // without await, error occurs because remove playlist is faster than playlist switching
          "setSelectedPlaylistName",
          nextSelectedPlaylistName
        );
      }

      store.commit("removePlaylist", playlistNameToRemove.value);
      window.playlistAPI.removePlaylist(playlistNameToRemove.value);

      playlistNameToRemove.value = "";
    }

    function addPlaylist() {
      let newPlaylistName = $t("newPlaylist");
      let index = 1;
      if (playlists.value.some((e) => e.name === newPlaylistName)) {
        while (
          playlists.value.some(
            (e) => e.name === newPlaylistName + " (" + index + ")"
          )
        ) {
          index++;
        }
        newPlaylistName += " (" + index + ")";
      }
      store.commit("addPlaylist", newPlaylistName);
      window.playlistAPI.addPlaylist(newPlaylistName);
      store.commit("setSelectedPlaylistName", newPlaylistName);
    }

    function dropOnTab(event) {
      const rawJSONData = event.dataTransfer.getData("json");
      if (rawJSONData.length === 0) {
        return;
      } else {
        const jsonData = JSON.parse(rawJSONData);
        const destPlaylistName = event.path[2].id;

        if (destPlaylistName === "library") {
          return;
        } else if (jsonData.dir) {
          window.fileAPI.getAllFilePaths(jsonData.path).then((filePaths) => {
            addTracksToPlaylist(destPlaylistName, filePaths);
          });
        } else {
          addTracksToPlaylist(destPlaylistName, [jsonData.path]);
        }
      }
    }

    async function init() {
      let allPlaylists = await window.playlistAPI.getAllPlaylists();

      allPlaylists = allPlaylists.map((playlist) => {
        return {
          name: playlist.name,
          trackList: [],
          loading: false,
        };
      });

      const allTrackListWithMetadata =
        await window.playlistAPI.getAllTrackList();

      const reducer = async (playlists, track) => {
        const tempPlaylists = await playlists;
        tempPlaylists
          .find((playlist) => playlist.name === track.playlist)
          .trackList.push(track);
        return tempPlaylists;
      };

      const playlists = await allTrackListWithMetadata.reduce(
        reducer,
        allPlaylists
      );

      store.commit("setPlaylists", playlists);

      const selectedPlaylistName = await window.configAPI.getConfig(
        "selectedPlaylistName"
      );

      store.commit("setSelectedPlaylistName", selectedPlaylistName);

      store.commit("setPlaylistLoaded");
    }

    init();

    return {
      playlists,
      selectedPlaylistName,
      playingPlaylistName,
      renamePlaylistDialog,
      removePlaylistDialog,
      playlistNameToRename,
      playlistNameToRemove,
      newPlaylistName,
      reorder,
      renamePlaylistDialogShow,
      renamePlaylistDialogConfirm,
      removePlaylistDialogShow,
      removePlaylistDialogConfirm,
      addPlaylist,
      dropOnTab,
    };
  },
});
</script>

<style scoped>
p {
  display: flex;
  margin-bottom: 0;
}
.q-tabs__content .q-btn {
  width: 36px;
}
.q-item__section--avatar {
  min-width: 0px;
}
.q-item__section--side {
  padding-right: 4px;
}
</style>
