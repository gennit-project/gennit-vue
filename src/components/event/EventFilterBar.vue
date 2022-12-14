<script lang="ts">
import { defineComponent, computed, PropType, ref } from "vue";
import LocationSearchBar from "@/components/LocationSearchBar.vue";
import TagPicker from "@/components/TagPicker.vue";
import ChannelPicker from "@/components/ChannelPicker.vue";
import FilterChip from "@/components/FilterChip.vue";
import ChannelIcon from "@/components/icons/ChannelIcon.vue";
import TagIcon from "@/components/icons/TagIcon.vue";
import { getTagLabel, getChannelLabel } from "@/components/utils";
import { DateTime } from "luxon";
import Tag from "@/components/Tag.vue";
import SelectMenu from "../Select.vue";
import SearchBar from "../SearchBar.vue";
import { SearchEventValues, DistanceUnit } from "@/types/eventTypes";
import {
  distanceOptionsForKilometers,
  distanceOptionsForMiles,
  MilesOrKm,
  timeFilterShortcuts,
  timeShortcutValues,
  distanceUnitOptions,
  eventFilterTypeShortcuts,
} from "@/components/event/eventSearchOptions";
import LocationFilterTypes from "./locationFilterTypes";
import WeeklyTimePicker from "@/components/event/WeeklyTimePicker.vue";
import ClockIcon from "@/components/icons/ClockIcon.vue";
import Modal from "../Modal.vue";
import RefreshIcon from "@/components/icons/RefreshIcon.vue";
import FilterIcon from "@/components/icons/FilterIcon.vue";
import CreateButton from "../CreateButton.vue";
import { Switch, SwitchGroup, SwitchLabel } from "@headlessui/vue";

export default defineComponent({
  components: {
    ChannelIcon,
    ChannelPicker,
    ClockIcon,
    CreateButton,
    FilterChip,
    FilterIcon,
    LocationSearchBar,
    Modal,
    SearchBar,
    SelectMenu,
    TailwindSwitch: Switch,
    SwitchGroup,
    SwitchLabel,
    Tag,
    TagIcon,
    TagPicker,
    WeeklyTimePicker,
    RefreshIcon,
  },
  props: {
    channelId: {
      type: String,
      default: "",
    },
    createEventPath: {
      type: String,
      required: true,
    },
    showMap: {
      type: Boolean,
      default: false,
    },
    filterValues: {
      type: Object as PropType<SearchEventValues>,
      required: true,
    },
    loadedEventCount: {
      type: Number,
      default: 0,
    },
    resultCount: {
      type: Number,
      default: 0,
    },
    timeSlotFiltersActive: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    const defaultFilterLabels = {
      channels: "Channels",
      tags: "Tags",
    };
    const channelLabel = computed(() => {
      return getChannelLabel(props.filterValues.selectedChannels);
    });

    const tagLabel = computed(() => {
      return getTagLabel(props.filterValues.selectedTags);
    });

    const activeDateShortcut = ref(timeShortcutValues.NONE)

    const titleCase = (str: string) => {
      if (!str) {
        return "";
      }
      return str
        .split("_")
        .filter(x => x.length > 0)
        .map((x) => (x.charAt(0).toUpperCase() + x.slice(1).toLowerCase()))
        .join(" ");
    };

    const moreFiltersLabel = computed(() => {
      const labels = [];
      const locationFilter = props.filterValues.selectedLocationFilter
      const timeShortcut = activeDateShortcut.value;
      if (locationFilter !== LocationFilterTypes.NONE) {

        if (locationFilter === LocationFilterTypes.ONLY_VIRTUAL) {
          labels.push("Online events")
        }

        if (locationFilter === LocationFilterTypes.ONLY_WITH_ADDRESS || locationFilter === LocationFilterTypes.WITHIN_RADIUS) {
          labels.push("In-person events")
        }
      }
      if (timeShortcut !== timeShortcutValues.NONE) {
        labels.push(titleCase(timeShortcut))
      }

      if (labels.length === 0) {
        return "More filters"
      }

      if (labels.length === 1) {
        return labels[0]
      }

      return labels.join(", ");
    });

    const selectedDistanceUnit = ref(props.filterValues.distanceUnit);

    const currentDistanceIndex = distanceOptionsForKilometers.findIndex(
      (val: DistanceUnit) => {
        return props.filterValues.radius === val.value;
      }
    );
    const defaultMileSelection = ref(distanceOptionsForMiles[currentDistanceIndex]);
    const defaultKilometerSelection = ref(distanceOptionsForKilometers[currentDistanceIndex]);

    return {
      activeDateShortcut,
      activeEventFilterTypeShortcut: ref(
        props.filterValues.selectedLocationFilter
      ),
      channelLabel,
      defaultFilterLabels,
      defaultKilometerSelection,
      defaultMileSelection,
      distanceOptionsForKilometers,
      distanceOptionsForMiles,
      distanceUnitOptions,
      eventFilterTypeShortcuts,
      LocationFilterTypes,
      MilesOrKm,
      moreFiltersLabel,
      selectedDistanceUnit,
      showMapCopy: ref(props.showMap),
      showTimeSlotPicker: ref(false),
      tagLabel,
      timeFilterShortcuts,
      timeShortcutValues,
    };
  },
  methods: {
    updateRouterParams() {
      this.$emit("updateRouterParams", {
        path: "/events",
        query: {
          search: this.filterValues.searchInput,
          channel: this.filterValues.selectedChannels,
          tag: this.filterValues.selectedTags,
        },
      });
    },
    updateTimeSlots(e: any) {
      this.$emit("updateTimeSlots", e);
    },
    resetTimeSlots() {
      this.$emit("resetTimeSlots");
    },
    handleTimeFilterShortcutClick(shortcut: any) {
      if (shortcut.value === this.activeDateShortcut) {
        // If the filter is currently selected, clear it.
        this.activeDateShortcut = this.timeFilterShortcuts.NONE;
        this.$emit("handleTimeFilterShortcutClick", {
          beginningOfDateRangeISO: DateTime.now().startOf("day").toISO(),
          endOfDateRangeISO: DateTime.now().plus({ years: 2 }).toISO(),
          value: shortcut.value,
        });
      } else {
        // If the filter is not selected, select it.
        this.activeDateShortcut = shortcut.value;
        this.$emit("handleTimeFilterShortcutClick", {
          beginningOfDateRangeISO: shortcut.beginningOfDateRangeISO,
          endOfDateRangeISO: shortcut.endOfDateRangeISO,
          value: shortcut.value,
        });
      }
    },
    updateLocationInput(e: any) {
      this.$emit("updateLocationInput", e);
    },
    updateSearchInput(e: any) {
      this.$emit("updateSearchInput", e);
    },
    updateSelectedDistance(distanceOption: DistanceUnit) {
      this.$emit("updateSelectedDistance", distanceOption.value);

      if (distanceOption.value === 0) {
        // If the radius is 0, don't use a radius when filtering events,
        // but the results should still be limited to events with in-person
        // locations.
        this.$emit(
          "updateEventTypeFilter",
          LocationFilterTypes.ONLY_WITH_ADDRESS
        );
      }
    },
    updateSelectedDistanceUnit(unitOption: DistanceUnit) {
      if (
        unitOption.value !== MilesOrKm.MI &&
        unitOption.value !== MilesOrKm.KM
      ) {
        throw new Error("Unit must be in miles or kilometers.");
      }

      if (
        this.selectedDistanceUnit === MilesOrKm.MI &&
        unitOption.value === MilesOrKm.KM
      ) {
        // Switch from miles to kilometers
        const currentDistanceIndex = distanceOptionsForMiles.findIndex(
          (val: DistanceUnit) => {
            return this.filterValues.radius === val.value;
          }
        );
        this.$emit(
          "updateSelectedDistance",
          distanceOptionsForKilometers[currentDistanceIndex].value
        );
        this.defaultKilometerSelection =
          distanceOptionsForKilometers[currentDistanceIndex];
      }

      if (
        this.selectedDistanceUnit === MilesOrKm.KM &&
        unitOption.value === MilesOrKm.MI
      ) {
        // Switch from kilometers to miles
        const currentDistanceIndex = distanceOptionsForKilometers.findIndex(
          (val: DistanceUnit) => {
            return this.filterValues.radius === val.value;
          }
        );
        this.$emit(
          "updateSelectedDistance",
          distanceOptionsForMiles[currentDistanceIndex].value
        );
        this.defaultMileSelection =
          distanceOptionsForMiles[currentDistanceIndex];
      }

      this.selectedDistanceUnit = unitOption.value;
    },
    toggleTimeSlotPicker() {
      this.showTimeSlotPicker = !this.showTimeSlotPicker;
    },
    updateEventTypeFilter(e: any) {
      if (e.locationFilterType === LocationFilterTypes.ONLY_VIRTUAL) {
        if (
          this.activeEventFilterTypeShortcut ===
          LocationFilterTypes.ONLY_VIRTUAL
        ) {
          // If the online-only filter was already selected, clear it.
          this.$emit("updateEventTypeFilter", LocationFilterTypes.NONE);
          this.activeEventFilterTypeShortcut = LocationFilterTypes.NONE;
        } else {
          this.$emit("updateEventTypeFilter", LocationFilterTypes.ONLY_VIRTUAL);
          this.activeEventFilterTypeShortcut = LocationFilterTypes.ONLY_VIRTUAL;
        }
      }
      if (e.locationFilterType === LocationFilterTypes.ONLY_WITH_ADDRESS) {
        if (
          this.activeEventFilterTypeShortcut ===
          LocationFilterTypes.ONLY_WITH_ADDRESS ||
          this.activeEventFilterTypeShortcut ===
          LocationFilterTypes.WITHIN_RADIUS
        ) {
          // If an in-person filter is already selected, clear it.
          this.$emit("updateEventTypeFilter", LocationFilterTypes.NONE);
          this.activeEventFilterTypeShortcut = LocationFilterTypes.NONE;
        } else {
          // There are two filter types for in-person events - ONLY_WITH_ADDRESS,
          // which filters for events that have a physical address, and WITHIN_RADIUS,
          // which filters for events whose physical address is within a certain
          // radius of a reference point address.

          // Affects the values in the query sent to the back end
          if (this.filterValues.radius !== 0) {
            // If a radius is set, assume WITHIN_RADIUS should be used. Otherwise,
            // assume ONLY_WITH_ADDRESS should be used.

            this.$emit(
              "updateEventTypeFilter",
              LocationFilterTypes.WITHIN_RADIUS
            );
          } else {
            this.$emit(
              "updateEventTypeFilter",
              LocationFilterTypes.ONLY_WITH_ADDRESS
            );
          }

          // Affects only this local component, to keep track of which
          // shortcut button should be marked as active
          this.activeEventFilterTypeShortcut =
            LocationFilterTypes.ONLY_WITH_ADDRESS;
        }
      }
    },
  },
});
</script>
<template>
  <div class="px-4 lg:px-12 border-b-2">
    <div>
      <div v-if="
        filterValues.selectedLocationFilter ===
        LocationFilterTypes.ONLY_VIRTUAL
      "
           class="items-center space-x-2 flex flex-wrap">
        Showing {{ loadedEventCount }} online of {{ resultCount }} results
      </div>
      <div v-else-if="
        filterValues.selectedLocationFilter === LocationFilterTypes.NONE
      ">
        Showing {{ loadedEventCount }} of {{ resultCount }} results
      </div>
      <div v-else
           class="items-center space-x-2 flex flex-wrap">
        <div class="inline-block">
          Showing {{ loadedEventCount }} of {{ resultCount }} results within
        </div>
        <SelectMenu v-if="selectedDistanceUnit === MilesOrKm.KM"
                    class="ml-2 w-36 inline-block"
                    :options="distanceOptionsForKilometers"
                    :default-option="defaultKilometerSelection"
                    @selected="updateSelectedDistance" />
        <SelectMenu v-if="selectedDistanceUnit === MilesOrKm.MI"
                    class="ml-2 w-36 inline-block"
                    :options="distanceOptionsForMiles"
                    :default-option="defaultMileSelection"
                    @selected="updateSelectedDistance" />
        <SelectMenu class="mr-4 w-18"
                    :options="distanceUnitOptions"
                    :default-option="{
          label: filterValues.distanceUnit,
          value: filterValues.distanceUnit,
        }"
                    @selected="updateSelectedDistanceUnit" />
        <div class="inline-block">of</div>
        <LocationSearchBar class="flex flex-wrap"
                           :search-placeholder="filterValues.referencePointAddress"
                           :reference-point-address-name="filterValues.referencePointName"
                           @updateLocationInput="updateLocationInput" />
      </div>
    </div>
    <div class="items-center space-x-2 mb-1">
      <FilterChip class="align-middle"
                  v-if="!channelId"
                  :label="channelLabel"
                  :highlighted="channelLabel !== defaultFilterLabels.channels">
        <template v-slot:icon>
          <ChannelIcon class="-ml-0.5 w-4 h-4 mr-2" />
        </template>
        <template v-slot:content>
          <ChannelPicker :selected-channels="filterValues.selectedChannels"
                         @setSelectedChannels="$emit('setSelectedChannels', $event)" />
        </template>
      </FilterChip>
      <FilterChip class="align-middle"
                  :label="tagLabel"
                  :highlighted="tagLabel !== defaultFilterLabels.tags">
        <template v-slot:icon>
          <TagIcon class="-ml-0.5 w-4 h-4 mr-2" />
        </template>
        <template v-slot:content>
          <TagPicker :selected-tags="filterValues.selectedTags"
                     @setSelectedTags="$emit('setSelectedTags', $event)" />
        </template>
      </FilterChip>
      <button @click="toggleTimeSlotPicker"
              :class="[
        'align-middle',
        timeSlotFiltersActive ? 'ring-1 ring-blue-500 border-blue-500' : '',
      ]"
              class="
          inline-flex
          max-height-4
          pl-2.5
          pr-3.5
          py-1
          border
          text-xs
          font-medium
          rounded-md
          text-gray-700
          bg-white
          hover:bg-gray-200
          focus:ring-1 focus:ring-blue-500 focus:border-blue-500
        ">
        <ClockIcon class="-ml-0.5 w-4 h-4 mr-2"
                   aria-hidden="true" />

        Time Slots
      </button>
      <Modal :title="'Select Weekly Time Slots'"
             :show="showTimeSlotPicker"
             @close="toggleTimeSlotPicker">
        <template v-slot:icon>
          <ClockIcon class="h-6 w-6 text-green-600"
                     aria-hidden="true" />
        </template>
        <template v-slot:secondaryButton>
          <button type="button"
                  class="
              w-full
              inline-flex
              justify-center
              rounded-md
              border border-gray-300
              shadow-sm
              px-4
              py-2
              bg-white
              text-base
              font-medium
              text-gray-700
              hover:bg-gray-50
              focus:outline-none
              focus:ring-2
              focus:ring-offset-2
              focus:ring-indigo-500
              sm:mt-0 sm:col-start-1 sm:text-sm
            "
                  @click="resetTimeSlots">
            <RefreshIcon class="h-5" />
            Reset
          </button>
        </template>
        <template v-slot:content>
          <WeeklyTimePicker class="py-2 px-8"
                            :selected-weekdays="filterValues.selectedWeekdays"
                            :selected-hour-ranges="filterValues.selectedHourRanges"
                            :selected-weekly-hour-ranges="filterValues.selectedWeeklyHourRanges"
                            @updateTimeSlots="updateTimeSlots" />
        </template>
      </Modal>
      <FilterChip v-if="channelId"
                  class="align-middle"
                  :label="moreFiltersLabel"
                  :highlighted="activeEventFilterTypeShortcut !== timeShortcutValues.NONE || filterValues.selectedLocationFilter !== LocationFilterTypes.NONE">
        <template v-slot:icon>
          <FilterIcon class="-ml-0.5 w-4 h-4 mr-2" />
        </template>
        <template v-slot:content>
          <div class="flex flex-wrap tagpicker">
            <Tag class="my-1 align-middle"
                 v-for="shortcut in timeFilterShortcuts"
                 :key="shortcut.label"
                 :tag="shortcut.label"
                 :active="shortcut.value === activeDateShortcut"
                 :hide-icon="true"
                 @click="handleTimeFilterShortcutClick(shortcut)" />
            <Tag class="my-1 align-middle"
                 v-for="shortcut in eventFilterTypeShortcuts"
                 :key="shortcut.label"
                 :tag="shortcut.label"
                 :hide-icon="true"
                 :active="
                   shortcut.locationFilterType === activeEventFilterTypeShortcut ||
                   (shortcut.locationFilterType ===
                     LocationFilterTypes.ONLY_WITH_ADDRESS &&
                     filterValues.selectedLocationFilter ===
                     LocationFilterTypes.WITHIN_RADIUS)
                 "
                 @click="updateEventTypeFilter(shortcut)" />
          </div>
        </template>
      </FilterChip>
      <SearchBar class="inline-flex align-middle"
                 :search-placeholder="'Search text'"
                 :small="true"
                 @updateSearchInput="updateSearchInput" />
      <div v-if="channelId"
           class="float-right flex">
        <SwitchGroup as="div"
                     class="flex items-center">
          <TailwindSwitch v-model="showMapCopy"
                          :class="[
            showMapCopy ? 'bg-blue-600' : 'bg-gray-200',
            'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          ]"
                          @update:model-value="$emit('toggleShowMap', showMapCopy)">
            <span aria-hidden="true"
                  :class="[
              showMap ? 'translate-x-5' : 'translate-x-0',
              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            ]" />
          </TailwindSwitch>
          <SwitchLabel as="span"
                       class="ml-3">
            <span class="text-sm font-medium text-gray-900">Show Map</span>
          </SwitchLabel>
        </SwitchGroup>
        <CreateButton class="align-middle ml-2"
                      :to="createEventPath"
                      :label="'Create Event'" />
      </div>
    </div>
    <div v-if="!channelId"
         class="flex flex-wrap">
      <Tag class="my-1 align-middle"
           v-for="shortcut in timeFilterShortcuts"
           :key="shortcut.label"
           :tag="shortcut.label"
           :active="shortcut.value === activeDateShortcut"
           :hide-icon="true"
           @click="handleTimeFilterShortcutClick(shortcut)" />
      <Tag class="my-1 align-middle"
           v-for="shortcut in eventFilterTypeShortcuts"
           :key="shortcut.label"
           :tag="shortcut.label"
           :hide-icon="true"
           :active="
             shortcut.locationFilterType === activeEventFilterTypeShortcut ||
             (shortcut.locationFilterType ===
               LocationFilterTypes.ONLY_WITH_ADDRESS &&
               filterValues.selectedLocationFilter ===
               LocationFilterTypes.WITHIN_RADIUS)
           "
           @click="updateEventTypeFilter(shortcut)" />
    </div>

  </div>
</template>
<style>
.tagpicker {
  display: flex;
  flex-wrap: wrap;
  padding: 10px;
  max-width: 600px;
}
</style>