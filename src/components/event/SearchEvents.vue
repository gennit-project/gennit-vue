<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { gql } from "@apollo/client/core";
import { useQuery } from "@vue/apollo-composable";
import EventList from "./EventList.vue";
import { router } from "@/router";
import { useDisplay } from 'vuetify'
import { useRoute } from "vue-router";
import { DateTime } from "luxon";
import {
  createDefaultSelectedWeeklyHourRanges,
  createDefaultSelectedHourRanges,
  createDefaultSelectedWeekdays,
  timeShortcutValues,
} from "@/components/event/eventSearchOptions";
import { chronologicalOrder, reverseChronologicalOrder } from "./filterStrings";
import {
  hourRangesObject,
  MilesOrKm,
} from "@/components/event/eventSearchOptions";
import {
  SearchEventValues,
  SetEventTimeRangeOptions,
} from "@/types/eventTypes";
import EventFilterBar from "./EventFilterBar.vue";
import ErrorBanner from "../ErrorBanner.vue";
import MapView from "./MapView.vue";
import LocationFilterTypes from "./locationFilterTypes";
import EventPreview from "./EventPreview.vue";
import CreateButton from "../CreateButton.vue";
import { Switch, SwitchGroup, SwitchLabel } from "@headlessui/vue";
import TwoSeparatelyScrollingPanes from "../TwoSeparatelyScrollingPanes.vue";

export default defineComponent({
  name: "SearchEvents",
  components: {
    ErrorBanner,
    EventFilterBar,
    EventList,
    EventPreview,
    CreateButton,
    MapView,
    TailwindSwitch: Switch,
    SwitchGroup,
    SwitchLabel,
    TwoSeparatelyScrollingPanes
},
  setup() {
    const route = useRoute();

    const channelId = computed(() => {
      if (typeof route.params.channelId === "string") {
        return route.params.channelId;
      }
      return "";
    });
    const now = DateTime.now();

    const createEventPath = channelId.value
      ? `/channels/c/${channelId.value}/events/create`
      : "/events/create";

    const searchInput = ref("");

    const selectedTags = ref([]);

    const getDefaultSelectedChannels = () => {
      if (channelId.value) {
        return [channelId.value];
      }
      return [];
    };
    const showOnlyFreeEvents = ref(false);

    const getDefaultFilterValues = () => {
      const defaultStartDateObj = now.startOf("day");

      const defaultEndDateRangeObj = defaultStartDateObj.plus({ years: 2 });
      const defaultStartDateISO = defaultStartDateObj.toISO();
      const defaultEndDateRangeISO = defaultEndDateRangeObj.toISO();

      let res: SearchEventValues = {
        beginningOfDateRangeISO: defaultStartDateISO,
        startOfDateRangeISO: defaultEndDateRangeISO,
        endOfDateRangeISO: defaultEndDateRangeISO,
        resultsOrder: chronologicalOrder,
        radius: 500,
        distanceUnit: MilesOrKm.KM,
        referencePoint: {
          // Default map center is Tempe Public Library
          lat: 33.39131450000001,
          lng: -111.9280626,
        },
        referencePointAddress: "3500 S Rural Rd, Tempe, AZ 85282, USA",
        referencePointName: "Tempe Public Library",
        referencePointPlaceId: "ChIJR35tTZ8IK4cR2D0p0AxOqbg",
        searchInput: searchInput.value,
        selectedWeekdays: createDefaultSelectedWeekdays(),
        selectedHourRanges: createDefaultSelectedHourRanges(),
        selectedLocationFilter: channelId.value
          ? LocationFilterTypes.NONE
          : LocationFilterTypes.WITHIN_RADIUS,
        selectedWeeklyHourRanges: createDefaultSelectedWeeklyHourRanges(),
        selectedChannels: getDefaultSelectedChannels(),
        selectedTags: selectedTags.value,
        showOnlyFreeEvents: showOnlyFreeEvents.value,
      };
      if (!channelId.value) {
        res.showCanceledEvents = false;
      }
      return res;
    };

    const filterValues = ref(getDefaultFilterValues());
    const resultsOrder = computed(() => {
      // Keep track of results order separately so that query
      // will be refetched when it changes. Otherwise the query
      // would only be refetched when a value inside the eventWhere
      // object is changed.
      return filterValues.value.resultsOrder;
    });

    const showMap = ref(route.query.view === "map");

    const flattenedTimeFilters = computed(() => {
      let flattenedTimeFilters = [];
      for (let dayNumber in filterValues.value.selectedWeeklyHourRanges) {
        const selectedSlotsInDay =
          filterValues.value.selectedWeeklyHourRanges[dayNumber];

        for (let timeSlot in selectedSlotsInDay) {
          const slotIsSelected = selectedSlotsInDay[timeSlot];

          if (slotIsSelected) {
            const min = hourRangesObject[timeSlot].min;
            const max = hourRangesObject[timeSlot].max;

            for (let hour = min; hour < max; hour++) {
              flattenedTimeFilters.push({
                AND: [
                  {
                    startTimeHourOfDay: hour,
                  },
                  {
                    startTimeDayOfWeek: dayNumber,
                  },
                ],
              });
            }
          }
        }
      }
      return flattenedTimeFilters;
    });

    const timeSlotFiltersActive = computed(() => {
      return flattenedTimeFilters.value.length > 0;
    });

    const eventWhere = computed(() => {
      let conditions = [];

      // Free event filter
      if (showOnlyFreeEvents.value) {
        conditions.push({ free: true });
      }

      // Text filter
      if (filterValues.value.searchInput) {
        conditions.push({
          OR: [
            {
              title_MATCHES: `(?i).*${filterValues.value.searchInput}.*`,
            },
            {
              description_MATCHES: `(?i).*${filterValues.value.searchInput}.*`,
            },
          ],
        });
      }

      // Location filter
      switch (filterValues.value.selectedLocationFilter) {
        case LocationFilterTypes.NONE:
          if (showMap.value) {
            conditions.push({ location_NOT: null });
          }
          break;
        case LocationFilterTypes.ONLY_WITH_ADDRESS:
          // Filter by events that have a location
          // with coordinates
          conditions.push({ location_NOT: null });
          break;

        case LocationFilterTypes.ONLY_VIRTUAL:
          // Filter by events that have a virtual event URL
          if (showMap.value) {
            // If map view is shown, only include
            // events with both a physical location
            // and a virtual event url
            conditions.push({ location_NOT: null });
          }
          conditions.push({ virtualEventUrl_NOT: null });
          break;

        case LocationFilterTypes.WITHIN_RADIUS:
          if (
            filterValues.value.radius &&
            filterValues.value.referencePoint &&
            filterValues.value.referencePointAddress
          ) {
            // Filter for events within a radius of a reference point
            conditions.push({
              location_LTE: {
                point: {
                  latitude: filterValues.value.referencePoint.lat,
                  longitude: filterValues.value.referencePoint.lng,
                },
                distance: filterValues.value.radius * 1000,
              },
            });
          }
      }

      // Tag filter
      if (filterValues.value.selectedTags.length > 0) {
        let matchTags = filterValues.value.selectedTags.reduce(
          (prev: any, curr: any) => {
            return prev.concat({ text_MATCHES: `(?i)${curr}` });
          },
          []
        );
        conditions.push({
          Tags: {
            OR: matchTags,
          },
        });
      }

      // Channel filter
      if (filterValues.value.selectedChannels.length > 0) {
        let matchChannels = filterValues.value.selectedChannels.reduce(
          // Technically a selected channel could be an array
          // of strings, but we expect it to always be a string.
          (prev: any, curr: any) => {
            return prev.concat({ uniqueName_MATCHES: `(?i)${curr}` });
          },
          []
        );
        conditions.push({
          Channels: {
            OR: matchChannels,
          },
        });
      }

      // Weekly time filter

      // The selected weekly time windows are in the
      // piece of state called selectedWeeklyHourRanges.
      // That data structure is an object where the keys
      // are weekdays and the values are objects where the
      // key is the time slot and the value is a boolean.

      // But to create a GraphQL query filter out of that,
      // this function flattens the structure.

      if (flattenedTimeFilters.value.length > 0) {
        conditions.push({
          OR: flattenedTimeFilters.value,
        });
      }

      return {
        AND: (conditions = [
          ...conditions,
          { canceled: filterValues.value.showCanceledEvents },
          {
            ChannelsAggregate: {
              count_GT: 0,
            },
          },
          {
            startTime_GT: `${filterValues.value.beginningOfDateRangeISO}`,
          },
          {
            startTime_LT: `${filterValues.value.endOfDateRangeISO}`,
          },
        ]),
      };
    }); // End of EventWhere computed property

    let eventQueryString = gql`
      query getEvents(
        $where: EventWhere
        $resultsOrder: [EventSort!]
        $offset: Int
        $limit: Int
      ) {
        eventsAggregate(where: $where) {
          count
        }
        events(
          where: $where
          options: { sort: $resultsOrder, offset: $offset, limit: $limit }
        ) {
          id
          Channels {
            uniqueName
          }
          title
          description
          startTime
          endTime
          locationName
          address
          virtualEventUrl
          startTimeDayOfWeek
          canceled
          location {
            latitude
            longitude
          }
          cost
          Poster {
            username
          }
          Tags {
            text
          }
          CommentSections {
            id
            CommentsAggregate {
              count
            }
            OriginalPost {
              __typename
              ... on Discussion {
                id
                title
              }
              ... on Event {
                id
                title
              }
            }
            Channel {
              uniqueName
            }
          }
        }
      }
    `;

    const {
      error: eventError,
      result: eventResult,
      loading: eventLoading,
      refetch: refetchEvents,
      onResult: onGetEventResult,
      fetchMore,
    } = useQuery(eventQueryString, {
      limit: 25,
      offset: 0,
      where: eventWhere,
      resultsOrder: resultsOrder
    }, {
      fetchPolicy: 'network-only', // If it is not network only, the list
      // will not update when an event time changes in a way that affects
      // which search results it should be returned in.
    });

    const reachedEndOfResults = ref(false);

    const loadMore = () => {
      fetchMore({
        variables: {
          offset: eventResult.value.events.length,
        },
        updateQuery: (previousResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) return previousResult;

          return {
            ...previousResult,
            events: [...previousResult.events, ...fetchMoreResult.events],
          };
        },
      });
    };

    const sendToPreview = (eventId: string, eventLocationId: string) => {
      if (eventId) {
        if (!channelId.value) {
          router.push({
            name: "SitewideSearchEventPreview",
            params: {
              eventId,
            },
            hash: `#${eventLocationId ? eventLocationId : ''}`
          });
        } else {
          router.push({
            name: "SearchEventPreview",
            params: {
              eventId,
            },
            hash: `#${eventLocationId ? eventLocationId : ''}`
          });
        }
      }
    };

    onGetEventResult((value) => {
      // If the preview pane is blank, fill it with the details
      // of the first result, if there is one.
      if (!value.data || value.data.events.length === 0) {
        return;
      }
      const defaultSelectedEvent = value.data.events[0];

      sendToPreview(defaultSelectedEvent.id, '');
    });

    const previewIsOpen = ref(false);

    const { smAndDown } = useDisplay();

    return {
      channelId,
      createEventPath,
      eventError,
      eventLoading,
      eventQueryString,
      eventResult,
      eventWhere, // Return for debugging in dev tools
      filterValues,
      loadMore,
      now,
      placeData: null,
      previewIsOpen,
      reachedEndOfResults,
      refetchEvents,
      route,
      router,
      sendToPreview,
      showMap,
      smAndDown,
      timeSlotFiltersActive,
    };
  },
  data() {
    return {
      MI_KM_RATIO: 1.609,
    };
  },
  created() {
    if (
      !this.eventId &&
      this.eventResult &&
      this.eventResult.events &&
      this.eventResult.events.length > 0
    ) {
      this.sendToPreview(this.eventResult.events[0].id);
    }
  },
  methods: {
    updateLocationInput(placeData: any) {
      try {
        this.filterValues.referencePoint.lat =
          placeData.geometry.location.lat();
        this.filterValues.referencePoint.lng =
          placeData.geometry.location.lng();
        this.filterValues.referencePointAddress = placeData.formatted_address;
        this.filterValues.referencePointName = placeData.name;
      } catch (e: any) {
        throw new Error(e);
      }
    },
    setSelectedChannels(e: any) {
      this.filterValues.selectedChannels = e;
    },
    setSelectedTags(e: any) {
      this.filterValues.selectedTags = e;
    },
    filterByTag(tag: string) {
      const alreadySelected = this.filterValues.selectedTags.includes(tag);

      if (alreadySelected) {
        this.filterValues.selectedTags = this.filterValues.selectedTags.filter(
          (t: string) => t !== tag
        );
      } else {
        this.filterValues.selectedTags.push(tag);
      }
    },
    filterByChannel(channel: string) {
      const alreadySelected = this.filterValues.selectedChannels.includes(
        channel
      );

      if (alreadySelected) {
        this.filterValues.selectedChannels = this.filterValues.selectedChannels.filter(
          (c: string) => c !== channel
        );
      } else {
        this.filterValues.selectedChannels.push(channel);
      }
    },
    handleTimeFilterShortcutClick(event: SetEventTimeRangeOptions) {
      const { beginningOfDateRangeISO, endOfDateRangeISO } = event;
      this.filterValues.beginningOfDateRangeISO = beginningOfDateRangeISO;
      this.filterValues.endOfDateRangeISO = endOfDateRangeISO;

      if (event.value === timeShortcutValues.PAST_EVENTS) {
        this.filterValues.resultsOrder = reverseChronologicalOrder;
      } else {
        this.filterValues.resultsOrder = chronologicalOrder;
      }
    },
    updateSearchInput(input: string) {
      this.filterValues.searchInput = input;
    },
    updateEventTypeFilter(input: string) {
      this.filterValues.selectedLocationFilter = input;
    },
    updateSelectedDistance(distance: number) {
      if (this.filterValues.distanceUnit === "km") {
        this.filterValues.radius = distance;
      } else if (this.filterValues.distanceUnit === "mi") {
        // For filtering purposes, convert the distance in miles to the same distance
        // in kilometers because the backend measures distance in kilometers
        this.filterValues.radius = distance * this.MI_KM_RATIO;
      }
    },
    updateSelectedDistanceUnit(unit: string) {
      if (unit === MilesOrKm.KM) {
        // Convert mi to km
        this.filterValues.radius = Math.round(
          this.filterValues.radius / this.MI_KM_RATIO
        );
      }
      if (unit === MilesOrKm.MI) {
        // Convert km to mi
        this.filterValues.radius = Math.round(
          this.filterValues.radius * this.MI_KM_RATIO
        );
      }
      this.filterValues.distanceUnit = unit;
    },
    toggleShowMap(e: boolean) {
      this.showMap = e;

      if (this.showMap) {
        this.closePreview();
      }
      // const pathName = this.channelId
      //   ? "SearchEventsInChannel"
      //   : "SearchEvents";

      router.push({
        path: this.$route.path,
        // hash: `#${this.eventResult && this.eventResult.events[0].id}`,
        query: {
          // search: this.filterValues.searchInput,
          // channel: this.filterValues.selectedChannels,
          // tag: this.filterValues.selectedTags,
          view: e ? 'map' : "list",
        },
      })
      if (!e) {
        this.sendToPreview(this.eventResult && this.eventResult.events[0].id, '')
      }
    },
    updateRouterQueryParams(e: any) {
      router.push(e);
    },
    updateTimeSlots(e: any) {
      this.filterValues.selectedWeeklyHourRanges = e;
    },
    resetTimeSlots() {
      this.filterValues.selectedHourRanges =
        createDefaultSelectedWeeklyHourRanges();
      this.filterValues.selectedWeekdays = createDefaultSelectedWeekdays();
      this.filterValues.selectedWeeklyHourRanges =
        createDefaultSelectedWeeklyHourRanges();
    },
    openPreview() {
      if (this.smAndDown) {
        this.previewIsOpen = true;
      }
    },
    closePreview() {
      this.previewIsOpen = false;
    },
  },
});
</script>
<template>
  <div class="bg-white" :class="showMap ? 'fixed' : ''">
    <div class="float-right mx-4 lg:mr-12 mt-2">
          <div v-if="!channelId" class="flex justify-center">
            <SwitchGroup as="div" class="flex items-center">
              <TailwindSwitch v-model="showMap" :class="[
                showMap ? 'bg-blue-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              ]" @update:model-value="toggleShowMap">
                <span aria-hidden="true" :class="[
                  showMap ? 'translate-x-5' : 'translate-x-0',
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                ]" />
              </TailwindSwitch>
              <SwitchLabel as="span" class="ml-3">
                <span class="text-sm font-medium text-gray-900">Show Map</span>
              </SwitchLabel>
            </SwitchGroup>
            <CreateButton class="align-middle ml-2" :to="createEventPath" :label="'Create Event'" />
          </div>
        </div>
    <EventFilterBar 
      class="mt-2"
      :channel-id="channelId" :result-count="eventResult ? eventResult.eventsAggregate?.count : 0"
      :filter-values="filterValues" :loaded-event-count="eventResult ? eventResult.events.length : 0"
      :time-slot-filters-active="timeSlotFiltersActive" :create-event-path="createEventPath"
      @updateSelectedDistance="updateSelectedDistance" @updateSelectedDistanceUnit="updateSelectedDistanceUnit"
      @updateLocationInput="updateLocationInput" @setSelectedChannels="setSelectedChannels"
      @setSelectedTags="setSelectedTags" @handleTimeFilterShortcutClick="handleTimeFilterShortcutClick"
      @updateSearchInput="updateSearchInput" @updateEventTypeFilter="updateEventTypeFilter"
      @updateTimeSlots="updateTimeSlots" @resetTimeSlots="resetTimeSlots" @toggleShowMap="toggleShowMap" />
    <div class="mx-4 lg:mx-12" v-if="eventLoading">Loading...</div>
    <ErrorBanner class="mx-4 lg:mx-12" v-else-if="eventError" :text="eventError.message" />
    <TwoSeparatelyScrollingPanes v-else-if="!showMap && eventResult && eventResult.events" >
      <template v-slot:leftpane>
        <div class="rounded max-w-5xl">
          <EventList
            id="listView"
            :class="[!channelId ? '' : '']"
            class="relative"
            :result-count="eventResult ? eventResult.eventsAggregate?.count : 0"
            :events="eventResult.events"
            :channel-id="channelId"
            :search-input="filterValues.searchInput"
            :selected-tags="filterValues.selectedTags"
            :selected-channels="filterValues.selectedChannels"
            :show-map="showMap"
            @filterByTag="filterByTag" 
            @filterByChannel="filterByChannel"
            @loadMore="loadMore"
            @openPreview="openPreview"
          />
          <EventPreview
            v-if="smAndDown"
            :isOpen="previewIsOpen"
            @closePreview="closePreview"
          />
        </div>
      </template>
      <template v-slot:rightpane>
        <div v-if="!showMap && eventResult?.events?.length > 0">
          <router-view></router-view>
        </div>
      </template>
    </TwoSeparatelyScrollingPanes>
    <MapView 
      v-else 
      :channel-id="channelId" 
      :events="eventResult.events" 
      :result-count="eventResult.eventsAggregate.count"
      :search-input="filterValues.searchInput" 
      :selected-tags="filterValues.selectedTags"
      :selected-channels="filterValues.selectedChannels" 
      @filterByTag="filterByTag" 
      @filterByChannel="filterByChannel"
      @loadMore="loadMore" 
      @sendToPreview="sendToPreview" 
    />
  </div>
</template>

<style>
.gray {
  color: gray;
}
</style>
