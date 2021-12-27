<template>
  <div style="width: 100vw; height: 100vh; overflow: hidden">
    <div
      :style="{
        background:
          'linear-gradient(' +
          backgroundColor.angle +
          'deg, ' +
          backgroundColor.startColor +
          ', ' +
          backgroundColor.endColor +
          ')',
      }"
      style="position: relative; width: 100vw; height: 100vh"
    >
      <q-img
        :src="coverArt"
        fit="cover"
        no-transition
        style="
          position: absolute;
          width: 100vw;
          height: 100vh;
          filter: blur(25px);
          transform: scale(1.1);
        "
      />
      <div
        v-if="coverArt !== ''"
        style="
          position: absolute;
          background-color: rgba(0, 0, 0, 0.3);
          width: 100vw;
          height: 100vh;
        "
      />
    </div>
    <div
      class="row window-height"
      style="position: relative; top: -100vh; padding: 0px"
    >
      <div class="col-4 q-pa-sm" style="height: 720px">
        <libraryTree />
        <lyric :lyricProp="lyric" :currentTimeProp="currentTime" />
      </div>
      <div class="col-4 q-py-sm" style="height: 720px">
        <coverArt :coverArtDataProp="coverArt" />
        <info />
        <seekBar :realPositionProp="audio.currentTime" />
        <control />
      </div>
      <div class="col-4 q-pa-sm column" style="height: 720px">
        <playlist class="col-11" />
        <div class="col-1 row" style="padding-top: 5px">
          <div class="col-4 row justify-evenly items-center">
            <q-btn
              tabindex="-2"
              flat
              round
              class="col-4"
              color="white"
              :icon="mute ? 'volume_off' : 'volume_up'"
              style="width: 42px; height: 42px"
              @click="muteToggle"
            />
            <div class="col-8">
              <vue-slider
                tabindex="-2"
                id="volume"
                class="col-8"
                v-model="volume"
                contained
                dragOnClick
                :duration="0.1"
                :useKeyboard="false"
                :max="100"
                @change="volumeChange"
              />
            </div>
          </div>
          <q-space class="q-electron-drag" />
          <div class="q-px-xs row justify-evenly items-center">
            <q-btn
              tabindex="-2"
              @click="settingDialogShow"
              flat
              round
              color="white"
              icon="settings"
            />
            <q-btn
              tabindex="-2"
              @click="minimize"
              flat
              round
              color="white"
              icon="remove"
            />
            <q-btn
              tabindex="-2"
              @click="close"
              flat
              round
              color="white"
              icon="close"
            />
          </div>
        </div>
      </div>
    </div>
    <setting />
    <trackProperties />
  </div>
</template>

<script>
import { format, useQuasar } from "quasar";
import { defineComponent, ref, computed, onMounted, watch } from "vue";
import { useStore } from "vuex";
import coverArt from "components/CoverArt";
import info from "components/Info";
import seekBar from "components/SeekBar";
import control from "components/Control";
import playlist from "components/Playlist";
import libraryTree from "components/LibraryTree";
import lyric from "components/Lyric";
import setting from "components/Setting";
import trackProperties from "components/TrackProperties";
import VueSlider from "vue-slider-component";
import "../css/slider.scss";
import { isEmpty } from "lodash";
import hotkeys from "hotkeys-js";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "IndexPage",
  components: {
    coverArt,
    info,
    seekBar,
    control,
    playlist,
    libraryTree,
    lyric,
    setting,
    trackProperties,
    VueSlider,
  },
  setup() {
    const store = useStore();
    const $q = useQuasar();
    const { t: $t } = useI18n();

    const audio = new Audio();
    audio.autoplay = true;

    audio.addEventListener("play", () => {
      store.commit("setPlaying", true);
    });
    audio.addEventListener("pause", () => {
      store.commit("setPlaying", false);
    });
    audio.addEventListener("ended", () => {
      if (!loop.value) {
        store.commit("toNextTrack");
      }
    });
    audio.addEventListener("timeupdate", () => {
      currentTime.value = audio.currentTime;
      const tempPosition = Math.floor(audio.currentTime);
      if (audio.duration && position.value !== tempPosition) {
        store.commit("setPosition", tempPosition);
      }
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      if (!changeTrackDelay.value) {
        store.commit("toPreviousTrack");
        changeTrackDelay.value = true;
        setTimeout(() => {
          changeTrackDelay.value = false;
        }, 100);
      }
    });
    navigator.mediaSession.setActionHandler("nexttrack", () => {
      if (!changeTrackDelay.value) {
        store.commit("toNextTrack");
        changeTrackDelay.value = true;
        setTimeout(() => {
          changeTrackDelay.value = false;
        }, 100);
      }
    });
    navigator.mediaSession.setActionHandler("stop", () => {
      store.commit("setSeekPosition", 0);
    });
    navigator.mediaSession.setActionHandler("seekto", (e) => {
      audio.currentTime = e.seekTime;
    });

    const playingTrack = computed(() => {
      return store.getters["getPlayingTrack"];
    });

    const playing = computed(() => store.getters["getPlaying"]);
    const loop = computed(() => store.getters["getLoop"]);

    const position = computed(() => store.getters["getPosition"]);
    const seekPosition = computed(() => store.getters["getSeekPosition"]);
    const volume = ref(0);
    const mutedVolume = ref(0);
    const mute = ref(false);
    const coverArt = ref("");
    const playingPlaylistName = computed(
      () => store.getters["getPlayingPlaylistName"]
    );

    const backToStart = computed(() => store.getters["getBackToStart"]);
    const changeTrackDelay = ref(false);

    const libraryLoaded = computed(() => store.getters["getLibraryLoaded"]);
    const playlistLoaded = computed(() => store.getters["getPlaylistLoaded"]);

    const first = ref(true);

    const backgroundColor = computed(() => store.getters["getBackgroundColor"]);

    const lyric = ref({});
    const currentTime = ref(0);

    const settingDialog = computed({
      get() {
        return store.getters["getSettingDialog"];
      },
      set(value) {
        store.commit("settingDialogShow", value);
      },
    });

    init();

    watch(playingTrack, (track) => {
      store.commit("setPosition", 0);

      if (track.duration === 0) {
        audio.src = "";
        coverArt.value = "";
        return;
      }
      if (first.value) {
        audio.volume = 0;
      }
      audio.src = `file-protocol://${track.path.replaceAll("\%", "%25")}`;

      try {
        audio
          .play()
          .then(() => {
            if (first.value) {
              audio.pause();
              audio.muted = mute.value;
              first.value = false;
              audio.volume = volume.value / 100;
              audio.currentTime = 0;
              store.commit("setPosition", 0);
            }

            window.metadataAPI
              .getMetadataWithCoverArt(track.path)
              .then((metadata) => {
                coverArt.value = metadata.coverArt;
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  artwork: [{ src: coverArt.value }],
                });
                if (Math.abs(track.mtime - metadata.mtime) > 5) {
                  metadata.coverArt = "";
                  store.commit("refreshTrackMetadataInPlaylist", metadata);
                  window.playlistAPI.refreshTrackMetadataInPlaylist(metadata);
                }
              });

            window.configAPI.setConfig(
              "playingPlaylistName",
              playingPlaylistName.value
            );
            window.configAPI.setConfig("playingPath", track.path);

            window.lyricAPI
              .getLyric(track.path, track.title, track.artist)
              .then((lyricData) => {
                lyric.value = lyricData;
                if (isEmpty(lyric.value)) {
                  store.commit("setWithLyric", false);
                } else {
                  store.commit("setWithLyric", true);
                }
              });
          })
          .catch((error) => {
            showError(track);
            return;
          });
      } catch (error) {
        showError(track);
        return;
      }
    });

    watch(playing, (playing) => {
      if (playingTrack.value.duration) {
        if (playing) {
          audio.play();
        } else {
          audio.pause();
        }
      }
    });

    watch(loop, (loop) => {
      audio.loop = loop;
    });

    watch(seekPosition, (seekPosition) => {
      audio.currentTime = seekPosition;
      store.commit("setPosition", seekPosition);
    });

    watch(backToStart, () => {
      audio.currentTime = 0;
      store.commit("setPosition", 0);
      first.value = false;
      store.commit("setPlaying", true);
    });

    watch([libraryLoaded, playlistLoaded], async (newValues) => {
      if (newValues[0] && newValues[1]) {
        let playlistName = "library";
        let index = -1;
        let tracks = [];
        let isLastPlayingTrackHidden = false;
        try {
          playlistName = await window.configAPI.getConfig(
            "playingPlaylistName"
          );
          if (playlistName === "library") {
            const selectedNodePath = await window.configAPI.getConfig(
              "selectedNodePath"
            );
            const playingNodePath = await window.configAPI.getConfig(
              "playingNodePath"
            );
            if (selectedNodePath === playingNodePath) {
              tracks = store.getters["getSelectedLibrary"].filter(
                (t) => !t.isAlbumHeader
              );
            } else {
              tracks = (
                await window.libraryAPI.getSelectedLibrary(playingNodePath)
              ).filter((t) => !t.isAlbumHeader);
              isLastPlayingTrackHidden = true;
            }
          } else {
            tracks = store.getters["getPlaylists"].find(
              (playlist) => playlist.name === playlistName
            ).trackList;
          }
          const path = await window.configAPI.getConfig("playingPath");
          index = tracks.findIndex((t) => t.path === path);
        } catch (error) {
        } finally {
          if (index !== -1) {
            store.commit("setPlayingList", {
              playlistName: playlistName,
              index: index,
              trackList: isLastPlayingTrackHidden ? tracks : [],
            });
          } else {
            first.value = false;
          }
        }

        const checkUpdateOnStartup = await window.configAPI.getConfig(
          "checkUpdateOnStartup"
        );

        if (checkUpdateOnStartup) {
          const updateInfo = await window.configAPI.updateCheck();

          if (updateInfo.available) {
            $q.notify({
              icon: "upgrade",
              type: "info",
              message: $t("updateAvailable", {
                latestVersion: updateInfo.latestVersion,
              }),
              timeout: 0,
              actions: [
                {
                  label: $t("openDownloadPage"),
                  color: "white",
                  handler: () => {
                    window.configAPI.openLatestReleasePage();
                  },
                },
                { label: $t("ok"), color: "white" },
              ],
            });
          }
        }

        window.windowAPI.loaded();
      }
    });

    onMounted(async () => {
      document
        .getElementById("volume")
        .addEventListener("wheel", volumeScroll, { passive: true });
    });

    async function init() {
      volume.value = await window.configAPI.getConfig("volume");
      mute.value = await window.configAPI.getConfig("mute");
      audio.volume = volume.value / 100;

      if (mute.value) {
        mutedVolume.value = volume.value;
        volume.value = 0;
      }

      const backgroundColor = await window.configAPI.getConfig(
        "backgroundColor"
      );

      store.commit("setBackgroundColor", backgroundColor);

      window.addEventListener("focusin", (event) => {
        if (event.target.tabIndex === -2) {
          event.target.blur();
        }
      });

      window.addEventListener("keydown", (event) => {
        if (event.key === "Tab") {
          event.preventDefault();
        }
      });

      hotkeys(
        "l,s,m,\,,.,space,enter,left,right,up,down",
        function (event, handler) {
          event.preventDefault();
          switch (handler.key) {
            case "l":
              store.commit("toggleLoop");
              window.configAPI.setConfig("loop", loop.value);
              break;
            case "s":
              store.commit("toggleShuffle");
              window.configAPI.setConfig(
                "shuffle",
                store.getters["getShuffle"]
              );
              break;
            case "m":
              muteToggle();
              break;
            case ",":
              if (!changeTrackDelay.value) {
                store.commit("toPreviousTrack");
                changeTrackDelay.value = true;
                setTimeout(() => {
                  changeTrackDelay.value = false;
                }, 100);
              }
              break;
            case ".":
              if (!changeTrackDelay.value) {
                store.commit("toNextTrack");
                changeTrackDelay.value = true;
                setTimeout(() => {
                  changeTrackDelay.value = false;
                }, 100);
              }
              break;
            case "space":
            case "enter":
              store.commit("togglePlaying");
              break;
            case "left":
              store.commit(
                "setSeekPosition",
                format.between(
                  audio.currentTime - 5,
                  0,
                  playingTrack.value.duration
                )
              );
              break;
            case "right":
              store.commit(
                "setSeekPosition",
                format.between(
                  audio.currentTime + 5,
                  0,
                  playingTrack.value.duration
                )
              );
              break;
            case "up":
              volumeScroll({ deltaY: -5 });
              break;
            case "down":
              volumeScroll({ deltaY: 5 });
              break;
          }
        }
      );
    }

    function muteToggle() {
      mute.value = !mute.value;
      audio.muted = mute.value;
      if (mute.value) {
        mutedVolume.value = volume.value;
        volume.value = 0;
      } else {
        volume.value = mutedVolume.value;
        mutedVolume.value = 0;
      }
      audio.volume = volume.value / 100;
      window.configAPI.setConfig("mute", mute.value);
    }

    function volumeChange(volume) {
      if (mute.value) {
        mute.value = false;
        audio.muted = mute.value;
        mutedVolume.value = 0;
      }
      audio.volume = volume / 100;
      window.configAPI.setConfig("volume", volume);
    }

    function volumeScroll(event) {
      if (event.deltaX) {
        return;
      } else if (mute.value && event.deltaY < 0) {
        mute.value = false;
        audio.muted = mute.value;
        volume.value = 0;
        mutedVolume.value = 0;
      } else {
        volume.value = format.between(
          volume.value + (event.deltaY > 0 ? -5 : 5),
          0,
          100
        );
        audio.volume = volume.value / 100;
        window.configAPI.setConfig("volume", volume.value);
      }
    }

    function showError(track) {
      $q.notify({
        type: "negative",
        message: $t("playbackError"),
        actions: [
          {
            label: $t("details"),
            color: "white",
            timeout: 0,
            handler: () => {
              $q.notify({
                type: "info",
                message: JSON.stringify(track),
                multiLine: true,
                timeout: 0,
                actions: [{ label: $t("ok"), color: "white" }],
              });
            },
          },
          { label: $t("ok"), color: "white" },
        ],
      });
    }

    function settingDialogShow() {
      store.commit("settingDialogShow", true);
    }

    function minimize() {
      window.windowAPI.minimize();
    }

    function close() {
      window.windowAPI.close();
    }

    return {
      audio,
      mute,
      volume,
      coverArt,
      backgroundColor,
      lyric,
      currentTime,
      settingDialog,
      settingDialogShow,
      muteToggle,
      volumeChange,
      minimize,
      close,
    };
  },
});
</script>

<style scoped>
.q-img {
  --q-transition-duration: 0s !important;
  --q-transition-easing: none !important;
}
</style>
