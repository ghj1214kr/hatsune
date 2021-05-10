<template>
  <div style="height: 65px; display: flex">
    <div
      v-html="currentLyric"
      style="
        color: white;
        text-align: center;
        margin: auto;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      "
    />
  </div>
</template>

<script>
import { defineComponent, ref, computed, watch } from "vue";

export default defineComponent({
  name: "LyricComponent",
  props: {
    lyricProp: Object,
    currentTimeProp: Number,
  },
  setup(props) {
    const lyric = computed(() => props.lyricProp);
    const currentTime = computed(() => props.currentTimeProp);
    const lyricKeys = ref([]);
    const lyricIndex = ref(0);
    const currentLyric = ref("");

    watch(lyric, (lyric) => {
      if (lyric !== undefined) {
        lyricKeys.value = Object.keys(lyric).map(Number).reverse();
      } else {
        lyricKeys.value = [];
      }
      currentLyric.value = "";
    });

    watch(currentTime, (currentTime) => {
      if (lyric.value !== undefined) {
        const index = lyricKeys.value.find(
          (time) => time <= currentTime * 1000
        );
        if (lyricIndex.value !== index) {
          lyricIndex.value = index;
          if (lyric.value[index] !== undefined) {
            currentLyric.value = lyric.value[index].join("<br>");
          }
        }
      }
    });

    return {
      currentLyric,
    };
  },
});
</script>
