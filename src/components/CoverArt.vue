<template>
  <q-img
    fit="contain"
    no-transition
    no-native-menu
    :ratio="1"
    :src="coverArtData"
  >
    <q-menu v-if="coverArtData.length > 0" touch-position context-menu>
      <q-list dense>
        <q-item clickable v-close-popup @click="copyToClipboard">
          <q-item-section>{{ $t("copyImageToClipboard") }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-img>
</template>

<script>
import { useQuasar } from "quasar";
import { defineComponent, computed } from "vue";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "CoverArtComponent",
  props: {
    coverArtDataProp: String,
  },
  setup(props) {
    const $q = useQuasar();
    const { t: $t } = useI18n();

    const coverArtData = computed(() => props.coverArtDataProp);

    function copyToClipboard() {
      if (coverArtData.value.length > 0) {
        window.clipboardAPI.setImageToClipboard(coverArtData.value);

        $q.notify({
          icon: "content_copy",
          type: "info",
          message: $t("copiedToClipboard"),
          timeout: 3000,
        });
      }
    }

    return {
      coverArtData,
      copyToClipboard,
    };
  },
});
</script>
