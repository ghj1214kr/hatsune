<template>
  <div class="full-width row justify-evenly">
    <q-btn
      class="button"
      size="30px"
      flat
      dense
      color="white"
      :icon="loop ? 'repeat_one_on' : 'repeat_one'"
      @click="toggleLoop"
    />
    <q-btn
      class="button"
      size="30px"
      flat
      dense
      color="white"
      icon="skip_previous"
      @click="toPreviousTrack"
    />
    <q-btn
      class="button"
      size="30px"
      flat
      dense
      color="white"
      :icon="playing ? 'pause' : 'play_arrow'"
      @click="togglePlaying"
    />
    <q-btn
      class="button"
      size="30px"
      flat
      dense
      color="white"
      icon="skip_next"
      @click="toNextTrack"
    />
    <q-btn
      class="button"
      size="30px"
      flat
      dense
      color="white"
      :icon="shuffle ? 'shuffle_on' : 'shuffle'"
      @click="toggleShuffle"
    />
  </div>
</template>

<script>
import { defineComponent, computed, ref } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  name: "ControlComponent",
  setup() {
    const store = useStore();

    const playing = computed(() => store.getters["getPlaying"]);
    const loop = computed(() => store.getters["getLoop"]);
    const shuffle = computed(() => store.getters["getShuffle"]);

    const changeTrackDelay = ref(false);

    init();

    async function init() {
      const loop = await window.configAPI.getConfig("loop");
      const shuffle = await window.configAPI.getConfig("shuffle");

      store.commit("setLoop", loop);
      store.commit("setShuffle", shuffle);
    }

    function togglePlaying() {
      store.commit("togglePlaying");
    }

    function toPreviousTrack() {
      if (!changeTrackDelay.value) {
        store.commit("toPreviousTrack");
        changeTrackDelay.value = true;
        setTimeout(() => {
          changeTrackDelay.value = false;
        }, 100);
      }
    }

    function toNextTrack() {
      if (!changeTrackDelay.value) {
        store.commit("toNextTrack");
        changeTrackDelay.value = true;
        setTimeout(() => {
          changeTrackDelay.value = false;
        }, 100);
      }
    }

    function toggleLoop() {
      store.commit("toggleLoop");
      window.configAPI.setConfig("loop", loop.value);
    }

    function toggleShuffle() {
      store.commit("toggleShuffle");
      window.configAPI.setConfig("shuffle", shuffle.value);
    }

    return {
      playing,
      loop,
      shuffle,
      togglePlaying,
      toPreviousTrack,
      toNextTrack,
      toggleLoop,
      toggleShuffle,
    };
  },
});
</script>
