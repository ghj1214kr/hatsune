import { store } from "quasar/wrappers";
import { createStore } from "vuex";

import main from "./main";

export default store(function () {
  const Store = createStore({
    modules: {
      main,
    },

    // enable strict mode (adds overhead!)
    // for dev mode and --debug builds only
    strict: process.env.DEBUGGING,
  });

  return Store;
});
