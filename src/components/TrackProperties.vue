<template>
  <q-dialog v-model="propertiesDialog" @hide="hideDialog">
    <q-card style="width: 640px; height: 360px">
      <q-card-section class="q-pb-xs">
        <h4 class="q-my-xs">{{ $t("trackProperties") }}</h4>
      </q-card-section>
      <q-card-section class="q-pt-xs">
        <q-list separator>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.title ?? $t('unknown'))"
          >
            <q-item-section>{{
              $t("title") + " : " + (trackProperties.title ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.artist ?? $t('unknown'))"
          >
            <q-item-section>{{
              $t("artist") + " : " + (trackProperties.artist ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="
              copyToClipboard(trackProperties.albumartist ?? $t('unknown'))
            "
          >
            <q-item-section>{{
              $t("albumartist") +
              " : " +
              (trackProperties.albumartist ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.album ?? $t('unknown'))"
          >
            <q-item-section>{{
              $t("album") + " : " + (trackProperties.album ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("track_no") +
              " : " +
              (trackProperties.track_no ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("disk_no") + " : " + (trackProperties.disk_no ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.genre ?? $t('unknown'))"
          >
            <q-item-section>{{
              $t("genre") + " : " + (trackProperties.genre ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.composer ?? $t('unknown'))"
          >
            <q-item-section>{{
              $t("composer") +
              " : " +
              (trackProperties.composer ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("duration") + " : " + timeStr(trackProperties.duration)
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("tagTypes") +
              " : " +
              (trackProperties.tagTypes ?? $t("unknown"))
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("lossless") +
              " : " +
              (trackProperties.lossless ? $t("yes") : $t("no"))
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("container") + " : " + trackProperties.container
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("codec") + " : " + trackProperties.codec
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("sampleRate") + " : " + trackProperties.sampleRate + "Hz"
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("bitrate") + " : " + trackProperties.bitrate + "kbps"
            }}</q-item-section>
          </q-item>
          <q-item class="q-pa-xs">
            <q-item-section>{{
              $t("codecProfile") + " : " + trackProperties.codecProfile
            }}</q-item-section>
          </q-item>
          <q-item
            class="q-pa-xs"
            clickable
            v-ripple
            @click="copyToClipboard(trackProperties.path)"
          >
            <q-item-section>{{
              $t("path") + " : " + trackProperties.path
            }}</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script>
import { useQuasar } from "quasar";
import { defineComponent, computed, ref } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "SettingComponent",
  setup() {
    const $q = useQuasar();
    const store = useStore();
    const { t: $t } = useI18n();

    const propertiesDialog = computed({
      get() {
        return store.getters["getTrackPropertiesDialog"];
      },
      set(value) {
        store.commit("setTrackPropertiesDialog", value);
      },
    });

    const trackProperties = computed(
      () => store.getters["getTrackPropertiesDialogData"]
    );

    function hideDialog() {
      store.commit("setTrackPropertiesDialogData", {});
    }

    function timeStr(time) {
      const roundedTime = Math.round(time);
      if (isNaN(roundedTime)) {
        return "0:00";
      } else {
        var min = Math.floor(roundedTime / 60) + ":";
        var sec = roundedTime % 60;
        if (sec < 10) {
          sec = "0" + sec;
        }
        return min + sec;
      }
    }

    function copyToClipboard(text) {
      window.clipboardAPI.setTextToClipboard(text);

      $q.notify({
        icon: "content_copy",
        type: "info",
        message: $t("copiedToClipboard"),
        timeout: 3000,
      });
    }

    return {
      propertiesDialog,
      trackProperties,
      hideDialog,
      timeStr,
      copyToClipboard,
    };
  },
});
</script>
