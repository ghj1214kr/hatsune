<template>
  <q-img
    fit="contain"
    no-transition
    no-native-menu
    :ratio="1"
    :src="coverArtData"
  >
    <q-menu touch-position context-menu>
      <q-list dense>
        <q-item clickable v-close-popup @click="copyToClipboard">
          <q-item-section>{{ $t("copyImageToClipboard") }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-img>
</template>

<script>
import { defineComponent, computed } from "vue";

export default defineComponent({
  name: "CoverArtComponent",
  props: {
    coverArtDataProp: String,
  },
  setup(props) {
    const coverArtData = computed(() => props.coverArtDataProp);

    function copyToClipboard() {
      window.clipboardAPI.setImageToClipboard(coverArtData.value);
    }

    return {
      coverArtData,
      copyToClipboard,
    };
  },
});
</script>
