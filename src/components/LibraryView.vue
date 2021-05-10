<template>
  <div class="q-pa-none">
    <q-virtual-scroll
      ref="virtualScrollRef"
      class="scrollbar"
      style="max-height: 100%"
      :items="selectedLibrary"
      :virtual-scroll-item-size="45"
    >
      <template v-slot="{ item, index }">
        <albumHeader
          v-if="item.isAlbumHeader"
          :key="item.key"
          :albumProp="item"
        />
        <trackItem
          v-else
          :key="item.path + index"
          :trackProp="item"
          :indexProp="getRealIndex(index)"
          playlistNameProp="library"
        />
      </template>
    </q-virtual-scroll>
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from "vue";
import { useStore } from "vuex";
import AlbumHeaderComponent from "components/AlbumHeader";
import TrackItemComponent from "components/TrackItem";

export default defineComponent({
  name: "LibraryViewComponent",
  components: {
    albumHeader: AlbumHeaderComponent,
    trackItem: TrackItemComponent,
  },
  setup() {
    const store = useStore();

    const virtualScrollRef = ref(null);

    const selectedLibrary = computed(() => store.getters["getSelectedLibrary"]);

    watch(selectedLibrary, () => {
      virtualScrollRef.value.refresh(0);
    });

    function getRealIndex(index) {
      return (
        index -
        selectedLibrary.value.slice(0, index).filter((e) => e.isAlbumHeader)
          .length
      );
    }

    return {
      virtualScrollRef,
      selectedLibrary,
      getRealIndex,
    };
  },
});
</script>
