<template>
  <div style="height: 45px">
    <q-item
      class="q-pr-sm q-pl-none q-py-none text-white"
      style="width: 410px; height: 44px; min-height: 44px"
    >
      <q-item-section
        avatar
        class="q-mr-sm"
        style="width: 44px; min-width: 44px"
      >
        <q-img
          fit="contain"
          no-native-menu
          style="width: 44px; height: 44px"
          :src="coverArt"
        />
      </q-item-section>
      <q-item-section>
        <q-item-label
          style="
            height: 30px;
            font-size: 20px;
            margin-top: 3px;
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
          "
        >
          {{ album.title }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-item-label
          class="text-white"
          style="font-size: 20px; margin-bottom: 2px"
        >
          {{ album.year }}
        </q-item-label>
      </q-item-section>
      <q-menu touch-position context-menu>
        <q-list dense>
          <q-item
            clickable
            v-close-popup
            @click="openPathInDirectory(album.path)"
          >
            <q-item-section>{{ $t("viewInFileExplorer") }}</q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-item>
    <q-separator />
  </div>
</template>

<script>
import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "AlbumHeaderComponent",
  components: {},
  props: {
    albumProp: Object,
  },
  setup(props) {
    const album = ref(props.albumProp);
    const coverArt = ref("");

    window.metadataAPI
      .getMetadataWithCoverArt(album.value.firstTrackPath)
      .then((metadata) => {
        coverArt.value = metadata.coverArt;
      });

    function openPathInDirectory(path) {
      window.fileAPI.openPathInDirectory(path);
    }

    return {
      album,
      coverArt,
      openPathInDirectory,
    };
  },
});
</script>
