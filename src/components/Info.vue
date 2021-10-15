<template>
  <div style="overflow: hidden; height: 150px; transform: translate(0, -5px)">
    <div
      ref="titleRef"
      :class="titleOverflow ? 'title' : ''"
      class="q-mx-auto text-italic text-no-wrap"
      style="color: white; font-size: 50px; width: fit-content; height: 66px"
    >
      {{ title }}
    </div>
    <div
      ref="artistRef"
      :class="artistOverflow ? 'artist' : ''"
      class="q-mx-auto text-italic text-no-wrap"
      style="color: white; font-size: 30px; width: fit-content; height: 42px"
    >
      {{ artist }}
    </div>
    <div
      ref="albumRef"
      :class="albumOverflow ? 'album' : ''"
      class="q-mx-auto text-italic text-no-wrap"
      style="color: white; font-size: 30px; width: fit-content; height: 40px"
    >
      {{ album }}
    </div>
    <q-menu touch-position context-menu>
      <q-list dense>
        <q-item clickable v-close-popup @click="copyToClipboard">
          <q-item-section>{{ $t("copyInfoToClipboard") }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script>
import { useQuasar } from "quasar";
import { defineComponent, ref, computed, watch } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "InfoComponent",
  setup() {
    const store = useStore();
    const $q = useQuasar();
    const { t: $t } = useI18n();

    const track = computed(() => store.getters["getPlayingTrack"]);
    const infoChanged = computed(() => store.getters["getInfoChanged"]);

    watch(track, (track) => {
      infoSet(track);
    });

    watch(infoChanged, () => {
      infoSet(track.value);
    });

    const title = ref("");
    const artist = ref("");
    const album = ref("");

    const titleOverflow = ref(false);
    const artistOverflow = ref(false);
    const albumOverflow = ref(false);

    const titleRef = ref(null);
    const artistRef = ref(null);
    const albumRef = ref(null);

    function infoSet(track) {
      title.value = track.title;
      artist.value = track.artist;
      album.value = track.album;
      overflowCheck(track);
    }

    function overflowCheck(track) {
      const titleWidth = textWidthCalc(track.title, 50);
      const artistWidth = textWidthCalc(track.artist, 30);
      const albumWidth = textWidthCalc(track.album, 30);
      titleOverflow.value = titleWidth > 410;
      artistOverflow.value = artistWidth > 410;
      albumOverflow.value = albumWidth > 410;
      if (titleOverflow.value) {
        title.value = track.title + " / " + track.title + " / ";
      }
      if (artistOverflow.value) {
        artist.value = track.artist + " / " + track.artist + " / ";
      }
      if (albumOverflow.value) {
        album.value = track.album + " / " + track.album + " / ";
      }
      titleRef.value.style.animationDuration = titleWidth / 50 + "s";
      artistRef.value.style.animationDuration = artistWidth / 50 + "s";
      albumRef.value.style.animationDuration = albumWidth / 50 + "s";
    }

    function textWidthCalc(text, fontSize) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = fontSize + "px NotoSansCJKkr-Light";
      return context.measureText(text).width;
    }

    function copyToClipboard() {
      window.clipboardAPI.setTextToClipboard(
        [track.value.title, track.value.artist, track.value.album].join(" ")
      );

      $q.notify({
        icon: "content_copy",
        type: "info",
        message: $t("copiedToClipboard"),
        timeout: 3000,
      });
    }

    return {
      track,
      title,
      artist,
      album,
      titleRef,
      artistRef,
      albumRef,
      titleOverflow,
      artistOverflow,
      albumOverflow,
      copyToClipboard,
    };
  },
});
</script>

<style scoped>
.title {
  animation: marquee_title linear infinite;
}

@keyframes marquee_title {
  0% {
    transform: translate(0%, 0);
  }
  100% {
    transform: translate(-50.4%, 0);
  }
}

.artist {
  animation: marquee_artist linear infinite;
}

@keyframes marquee_artist {
  0% {
    transform: translate(0%, 0);
  }
  100% {
    transform: translate(-50.3%, 0);
  }
}

.album {
  animation: marquee_album linear infinite;
}

@keyframes marquee_album {
  0% {
    transform: translate(0%, 0);
  }
  100% {
    transform: translate(-50.3%, 0);
  }
}
</style>
