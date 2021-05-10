<template>
  <div id="seekBar" class="full-width" style="#aa6666; height: 55px;">
    <div class="row q-mx-xs" style="height: 35px">
      <div class="col time text-italic" style="text-align: left">
        {{ positionStr }}
      </div>
      <div class="col time text-italic" style="text-align: center">
        {{ durationStr }}
      </div>
      <div
        class="col time text-italic"
        style="text-align: right; padding-right: 5px"
      >
        {{ remainingStr }}
      </div>
    </div>
    <div class="q-px-sm">
      <vue-slider
        v-model="position"
        contained
        dragOnClick
        :duration="0.1"
        :useKeyboard="false"
        :tooltip-formatter="timeStr"
        lazy
        :max="duration"
        @change="seek"
      />
    </div>
  </div>
</template>

<script>
import { format } from "quasar";
import { defineComponent, ref, computed, onMounted } from "vue";
import { useStore } from "vuex";
import VueSlider from "vue-slider-component";
import "../css/slider.scss";

export default defineComponent({
  name: "SeekBarComponent",
  components: {
    VueSlider,
  },
  props: {
    realPositionProp: Number,
  },
  setup(props) {
    const store = useStore();

    const duration = computed(() => store.getters["getPlayingTrack"].duration);
    const position = computed({
      get() {
        return store.getters["getPosition"];
      },
      set(value) {
        store.commit("setPosition", value);
      },
    });

    const realPosition = computed(() => props.realPositionProp);

    const durationStr = computed(() => timeStr(duration.value));
    const positionStr = computed(() => timeStr(position.value));
    const remainingStr = computed(
      () => "-" + timeStr(duration.value - position.value)
    );

    onMounted(() => {
      document
        .getElementById("seekBar")
        .addEventListener("wheel", seekScroll, { passive: true });
    });

    function seekScroll(event) {
      if (event.deltaX) {
        return;
      }
      const tempPosition = format.between(
        realPosition.value + (event.deltaY > 0 ? -1 : 1),
        0,
        duration.value
      );
      store.commit("setSeekPosition", tempPosition);
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

    function seek(position) {
      if (store.getters["getPlayingTrack"].duration > 0) {
        store.commit("setSeekPosition", position);
      }
    }

    return {
      position,
      duration,
      durationStr,
      positionStr,
      remainingStr,
      timeStr,
      seek,
    };
  },
});
</script>

<style>
.time {
  color: white;
  font-size: 20px;
}
</style>
