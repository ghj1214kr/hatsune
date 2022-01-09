<template>
  <div style="overflow: hidden; height: 150px; transform: translate(0, -5px)">
    <div
      class="q-mx-auto text-italic"
      style="color: white; font-size: 50px; width: fit-content; height: 66px"
    >
      <vue3-marquee v-if="titleOverflow" :duration="titleDuration">
        {{ title }}
      </vue3-marquee>
      <div v-else>
        {{ title }}
      </div>
    </div>
    <div
      class="q-mx-auto text-italic"
      style="color: white; font-size: 30px; width: fit-content; height: 42px"
    >
      <vue3-marquee v-if="artistOverflow" :duration="artistDuration">
        {{ artist }}
      </vue3-marquee>
      <div v-else>
        {{ artist }}
      </div>
    </div>
    <div
      class="q-mx-auto text-italic"
      style="color: white; font-size: 30px; width: fit-content; height: 42px"
    >
      <vue3-marquee v-if="albumOverflow" :duration="albumDuration">
        {{ album }}
      </vue3-marquee>
      <div v-else>
        {{ album }}
      </div>
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
import Vue3Marquee from "vue3-marquee";

export default defineComponent({
  name: "InfoComponent",
  components: {
    Vue3Marquee,
  },
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

    const titleDuration = ref(false);
    const artistDuration = ref(false);
    const albumDuration = ref(false);

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
      // special character (U+200B) is added to the end of the three values below.
      if (titleOverflow.value) {
        title.value = track.title + " / ​";
      }
      if (artistOverflow.value) {
        artist.value = track.artist + " / ​";
      }
      if (albumOverflow.value) {
        album.value = track.album + " / ​";
      }
      titleDuration.value = titleWidth / 50;
      artistDuration.value = artistWidth / 50;
      albumDuration.value = albumWidth / 50;
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
      titleOverflow,
      artistOverflow,
      albumOverflow,
      titleDuration,
      artistDuration,
      albumDuration,
      copyToClipboard,
    };
  },
});
</script>
