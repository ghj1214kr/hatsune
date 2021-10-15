<template>
  <q-dialog
    v-model="settingDialog"
    @hide="hideDialog"
    @before-show="beforeShowDialog"
  >
    <q-card style="width: 640px; height: 360px">
      <q-splitter :model-value="17.5" disable>
        <template v-slot:before>
          <q-tabs v-model="tab" vertical align="justify" style="height: 360px">
            <q-tab
              no-caps
              name="preferences"
              icon="tune"
              :label="$t('preferences')"
              style="height: 180px"
            />
            <q-tab
              no-caps
              name="information"
              icon="info"
              :label="$t('information')"
              style="height: 180px"
            />
          </q-tabs>
        </template>

        <template v-slot:after>
          <q-tab-panels
            v-model="tab"
            animated
            transition-prev="slide-down"
            transition-next="slide-up"
            style="height: 360px"
          >
            <q-tab-panel name="preferences">
              <q-card-section class="q-pa-sm">
                <q-card-section class="q-pa-sm">
                  <div class="text-h4">{{ $t("library") }}</div>
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <q-list separator>
                    <q-item
                      v-if="libraryPaths.length === 0"
                      dense
                      class="q-px-sm q-py-sm"
                    >
                      <q-item-section>{{
                        $t("addDirectoryToLibrary")
                      }}</q-item-section>
                    </q-item>
                    <draggable
                      v-else
                      v-model="libraryPaths"
                      :itemKey="returnSelf"
                      @sort="libraryChanged = true"
                    >
                      <template #item="{ element }">
                        <q-item dense class="q-px-sm">
                          <q-item-section>{{ element }}</q-item-section>
                          <q-btn
                            icon="delete"
                            flat
                            padding="xs"
                            @click="removePathFromLibrary(element)"
                          />
                        </q-item>
                      </template>
                    </draggable>
                  </q-list>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn
                    flat
                    icon="add"
                    :label="$t('add')"
                    @click="openDirectoryDialog"
                  />
                  <q-btn
                    flat
                    icon="check"
                    :label="$t('apply')"
                    @click="applyLibraryChange"
                  >
                    <q-badge v-if="libraryChanged" color="info" floating>
                      <q-icon
                        name="pending_actions"
                        size="0.75rem"
                        color="white"
                        class=""
                      />
                    </q-badge>
                  </q-btn>
                </q-card-actions>
                <q-inner-loading :showing="!libraryReady">
                  <q-spinner size="50px" color="dark" />
                </q-inner-loading>
              </q-card-section>

              <q-card-section class="q-pa-sm">
                <q-card-section class="q-pa-sm">
                  <div class="text-h4">{{ $t("language") }}</div>
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <q-select
                    class="q-px-md"
                    dense
                    v-model="lang"
                    :options="langOptions"
                    @update:model-value="changeLocale"
                  />
                </q-card-section>
              </q-card-section>

              <q-card-section
                class="text-white q-pa-sm"
                :style="{
                  background:
                    'linear-gradient(' +
                    backgroundColorAngle +
                    'deg, ' +
                    backgroundStartColor +
                    ', ' +
                    backgroundEndColor +
                    ')',
                }"
              >
                <q-card-section class="q-pa-sm">
                  <div class="text-h4">{{ $t("defaultBackgroundColor") }}</div>
                </q-card-section>
                <q-card-section class="q-pa-sm row no-wrap">
                  <q-input
                    color="white"
                    dark
                    v-model="backgroundColorAngle"
                    type="number"
                    :label="$t('angle')"
                    :rules="[
                      (val) => (val >= 0 && val <= 359) || $t('use0to359'),
                    ]"
                    min="0"
                    max="359"
                  />
                  <q-input
                    color="white"
                    dark
                    filled
                    v-model="backgroundStartColor"
                    format-model="hex"
                    :rules="['hexColor']"
                    :label="$t('startColor')"
                  >
                    <template v-slot:append>
                      <q-icon name="colorize" class="cursor-pointer">
                        <q-popup-proxy>
                          <q-color no-header v-model="backgroundStartColor" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                  <q-input
                    color="white"
                    dark
                    filled
                    v-model="backgroundEndColor"
                    format-model="hex"
                    :rules="['hexColor']"
                    :label="$t('endColor')"
                  >
                    <template v-slot:append>
                      <q-icon name="colorize" class="cursor-pointer">
                        <q-popup-proxy>
                          <q-color no-header v-model="backgroundEndColor" />
                        </q-popup-proxy>
                      </q-icon>
                    </template>
                  </q-input>
                </q-card-section>
                <q-card-actions align="right">
                  <q-btn
                    flat
                    icon="settings_backup_restore"
                    :label="$t('default')"
                    @click="setToDefaultColor"
                  />
                  <q-btn
                    flat
                    icon="check"
                    :label="$t('apply')"
                    @click="applyColorChange"
                  >
                    <q-badge v-if="libraryChanged" color="info" floating>
                      <q-icon
                        name="pending_actions"
                        size="0.75rem"
                        color="white"
                        class=""
                      />
                    </q-badge>
                  </q-btn>
                </q-card-actions>
              </q-card-section>

              <q-card-section class="q-pa-sm">
                <q-card-section class="q-pa-sm">
                  <div class="text-h4">{{ $t("update") }}</div>
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <q-item>
                    <q-item-section>
                      <q-item-label>{{
                        $t("checkUpdateOnStartup")
                      }}</q-item-label>
                    </q-item-section>
                    <q-item-section avatar>
                      <q-toggle
                        v-model="checkUpdateOnStartup"
                        @update:model-value="changeUpdateCheckOption"
                      />
                    </q-item-section>
                  </q-item>
                </q-card-section>
              </q-card-section>

              <q-card-section class="q-pa-sm">
                <q-card-section class="q-pa-sm">
                  <div class="text-h4">{{ $t("etc") }}</div>
                </q-card-section>
                <q-card-section class="q-pa-sm">
                  <q-btn
                    no-caps
                    flat
                    icon="code"
                    :label="$t('openDevTools')"
                    @click="openDevTools"
                  />
                </q-card-section>
              </q-card-section>
            </q-tab-panel>

            <q-tab-panel name="information">
              <q-card-section>
                <div class="column items-center">
                  <div class="col">
                    <h1
                      class="text-italic"
                      style="
                        transform: rotate(-14deg);
                        padding-top: 0px;
                        padding-right: 20px;
                        margin-bottom: 20px;
                      "
                    >
                      Hatsune
                    </h1>
                  </div>
                  <div class="col">
                    <h6 style="margin: 40px 0px 15px 0px">
                      {{ version }}
                    </h6>
                  </div>
                  <div class="col">
                    <q-btn
                      @click="openGithubPage"
                      no-caps
                      flat
                      label="github.com/ghj1214kr/hatsune"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-tab-panel>
          </q-tab-panels>
        </template>
      </q-splitter>
    </q-card>
  </q-dialog>
</template>

<script>
import { useQuasar } from "quasar";
import { defineComponent, computed, ref } from "vue";
import { useStore } from "vuex";
import { cloneDeep } from "lodash";
import VueDraggableNext from "vuedraggable";
import { useI18n } from "vue-i18n";

export default defineComponent({
  name: "SettingComponent",
  components: {
    draggable: VueDraggableNext,
  },
  setup() {
    const $q = useQuasar();
    const store = useStore();
    const { locale, t: $t } = useI18n();

    const lang = ref("");
    const langOptions = ref([
      { value: "en-US", label: "English" },
      { value: "ko-KR", label: "한국어" },
    ]);

    const settingDialog = computed({
      get() {
        return store.getters["getSettingDialog"];
      },
      set(value) {
        store.commit("settingDialogShow", value);
      },
    });

    const libraryReady = computed(() => store.getters["getLibraryReady"]);

    const tab = ref("preferences");
    const directoryInput = ref(null);
    const libraryPaths = ref([]);
    const libraryChanged = ref(false);
    const libraryApplied = ref(false);

    const backgroundColor = computed(
      () => store.getters["getBackgroundColor"]
    );

    const backgroundColorAngle = ref(0);
    const backgroundStartColor = ref("");
    const backgroundEndColor = ref("");

    const checkUpdateOnStartup = ref(false);

    const notify = ref(null);

    const version = ref("");

    window.libraryAPI.libraryReady("libraryReady", () => {
      setTimeout(() => {
        store.commit("setLibraryReady", true);
        try {
          notify.value({
            icon: "done",
            spinner: false,
            message: $t("libraryUpdateComplete"),
            timeout: 1000,
          });
        } catch (error) {}
      }, 1000);
    });

    window.fileAPI.receiveDirectoryPath(
      "addDirectoryToLibrary",
      (directoryPath) => {
        if (directoryPath === -1) {
          $q.notify({
            type: "warning",
            message: $t("alreadyRegisteredDirectory"),
            timeout: 3000,
            textColor: "white",
          });
        } else {
          libraryPaths.value.push(directoryPath);
          libraryChanged.value = true;
        }
      }
    );

    init();

    async function init() {
      const tempLang = await window.configAPI.getConfig("lang");
      locale.value = tempLang;
      lang.value = langOptions.value.find((l) => l.value === tempLang).label;
      version.value = await window.configAPI.getVersion();
      checkUpdateOnStartup.value = await window.configAPI.getConfig(
        "checkUpdateOnStartup"
      );
    }

    function hideDialog() {
      tab.value = "preferences";
    }

    function openDirectoryDialog() {
      window.fileAPI.openDirectoryDialog("addDirectoryToLibrary");
    }

    function removePathFromLibrary(path) {
      libraryPaths.value = libraryPaths.value.filter((p) => p !== path);
      libraryChanged.value = true;
    }

    async function beforeShowDialog() {
      libraryPaths.value = await window.libraryAPI.getLibraryPaths();
      libraryChanged.value = false;
      libraryApplied.value = false;
      backgroundColorAngle.value = backgroundColor.value.angle;
      backgroundStartColor.value = backgroundColor.value.startColor;
      backgroundEndColor.value = backgroundColor.value.endColor;
    }

    function applyLibraryChange() {
      if (libraryChanged.value) {
        store.commit("setLibraryReady", false);
        window.libraryAPI.setLibraryPaths(cloneDeep(libraryPaths.value));
        libraryChanged.value = false;
        libraryApplied.value = true;
        notify.value = $q.notify({
          type: "ongoing",
          spinner: true,
          message: $t("updatingLibrary"),
          timeout: 0,
        });
      } else {
        $q.notify({
          type: "info",
          message: $t("noChange"),
          timeout: 3000,
        });
      }
    }

    function returnSelf(value) {
      return value;
    }

    function changeLocale(lang) {
      locale.value = lang.value;
      window.configAPI.setConfig("lang", lang.value);
    }

    function setToDefaultColor() {
      backgroundColorAngle.value = 30;
      backgroundStartColor.value = "#c53988";
      backgroundEndColor.value = "#39c5bb";
    }

    function applyColorChange() {
      store.commit("setBackgroundColor", {
        angle: backgroundColorAngle.value,
        startColor: backgroundStartColor.value,
        endColor: backgroundEndColor.value,
      });
      window.configAPI.setConfig("backgroundColor", {
        angle: backgroundColorAngle.value,
        startColor: backgroundStartColor.value,
        endColor: backgroundEndColor.value,
      });
    }

    function changeUpdateCheckOption(value) {
      window.configAPI.setConfig("checkUpdateOnStartup", value);
    }

    function openDevTools() {
      window.configAPI.openDevTools();
    }

    function openGithubPage() {
      window.configAPI.openGithubPage();
    }

    return {
      lang,
      langOptions,
      settingDialog,
      libraryReady,
      tab,
      directoryInput,
      libraryPaths,
      libraryChanged,
      hideDialog,
      openDirectoryDialog,
      removePathFromLibrary,
      beforeShowDialog,
      applyLibraryChange,
      returnSelf,
      changeLocale,
      backgroundColorAngle,
      backgroundStartColor,
      backgroundEndColor,
      setToDefaultColor,
      applyColorChange,
      checkUpdateOnStartup,
      changeUpdateCheckOption,
      openDevTools,
      version,
      openGithubPage,
    };
  },
});
</script>
