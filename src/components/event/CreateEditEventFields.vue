<script lang="ts">
import { defineComponent, PropType, computed, ref } from "vue";
import { ApolloError } from "@apollo/client/errors";
import ClockIcon from "@/components/icons/ClockIcon.vue";
import ChannelIcon from "@/components/icons/ChannelIcon.vue";
import TextEditor from "@/components/comments/TextEditor.vue";
import FormRow from "@/components/FormRow.vue";
import Form from "@/components/Form.vue";
import LocationIcon from "@/components/icons/LocationIcon.vue";
import TextInput from "@/components/TextInput.vue";
import TagInput from "@/components/TagInput.vue";
import PencilIcon from "@/components/icons/PencilIcon.vue";
import ErrorMessage from "@/components/ErrorMessage.vue";
import CheckBox from "@/components/CheckBox.vue";
import LocationSearchBar from "@/components/LocationSearchBar.vue";
import ErrorBanner from "@/components/ErrorBanner.vue";
import LinkIcon from "@/components/icons/LinkIcon.vue";
import TagIcon from "@/components/icons/TagIcon.vue";
import TicketIcon from "@/components/icons/TicketIcon.vue";
import AnnotationIcon from "@/components/icons/AnnotationIcon.vue";
import HomeIcon from "@/components/icons/HomeIcon.vue";
import DatePicker from "vue3-datepicker";
import Select from "../Select.vue";
import { CreateEditEventFormValues } from "@/types/eventTypes";
import { checkUrl } from "@/utils/formValidation";
import RightArrowIcon from "@/components/icons/RightArrowIcon.vue";
import { DateTime, Interval } from "luxon";

export default defineComponent({
  setup(props) {

    // Time format options are in the Luxon documentation https://github.com/moment/luxon/blob/master/docs/formatting.md
    // TIME_SIMPLE yields the time in this format: 1:30 PM
    const timeFormat = DateTime.TIME_SIMPLE;

    return {
      // Date format options are in the date-fns documentation https://date-fns.org/v2.29.2/docs/format
      dateFormat: "MM/dd/yyyy",
      defaultStartTimeOption: {
        label: DateTime.fromISO(props.formValues.startTime).toLocaleString(timeFormat),
        value: props.formValues.startTime,
      },
      defaultEndTimeOption: {
        label: DateTime.fromISO(props.formValues.endTime).toLocaleString(timeFormat),
        value: props.formValues.endTime,
      },
      formTitle: props.editMode ? "Edit Event" : "Create Event",
      startTime: computed(() => {
        return new Date(props.formValues.startTime)
      }), // The value is stored as a Javascript Date object, but converted to a Luxon DateTime object for manipulation.
      startTimeDay: ref(new Date(props.formValues.startTime)), // Create separate values for the start day and time because they can be changed separately
      endTime: computed(() => {
        return new Date(props.formValues.endTime)
      }),
      endTimeDay: ref(new Date(props.formValues.endTime)),
      touched: false,
      timeFormat,
    };
  },
  props: {
    editMode: {
      type: Boolean,
      required: true,
    },
    createEventError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    formValues: {
      type: Object as PropType<CreateEditEventFormValues>,
      required: true,
    },
    getEventError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    updateEventError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    eventLoading: {
      type: Boolean,
      default: false,
    },
  },
  components: {
    AnnotationIcon,
    ChannelIcon,
    CheckBox,
    ClockIcon,
    DatePicker,
    ErrorBanner,
    ErrorMessage,
    HomeIcon,
    TailwindForm: Form,
    FormRow,
    LinkIcon,
    LocationIcon,
    LocationSearchBar,
    PencilIcon,
    RightArrowIcon,
    Dropdown: Select,
    TagIcon,
    TagInput,
    TextEditor,
    TextInput,
    TicketIcon,
  },
  computed: {
    datePickerErrorMessage() {
      if (this.startTime < new Date()) {
        return 'Are you sure you want the start time to be in the past?'
      }
      if (this.startTime >= this.endTime) {
        return 'The start time must be before the end time.'
      }
      return ''
    },
    duration() {
      return this.getDuration(this.startTime.toISOString(), this.endTime.toISOString())
    },
    startTimeOptions() {
      const options = [];
      const startTimeObj = DateTime.fromISO(this.startTime.toISOString());
      const beginningOfDay = startTimeObj.startOf("day");
      let currentOption = beginningOfDay;
      const MINUTES_IN_A_DAY = 1440;
      let i = 0;

      while (i < MINUTES_IN_A_DAY) {
        const optionAsISO = currentOption.toISO();
        options.push({
          label: currentOption.toLocaleString(this.timeFormat),
          value: optionAsISO,
        });
        currentOption = currentOption.plus({ minutes: 30 });
        i += 30;
      }
      return options;
    },
    endTimeOptions() {
      const options = []
      const startTimeObj = DateTime.fromISO(this.startTime.toISOString());
      let currentOption = startTimeObj
      const end = startTimeObj.plus({ days: 1 })

      while (currentOption < end) {
        const optionAsISO = currentOption.toISO()
        const duration = this.getDuration(this.startTime.toISOString(), optionAsISO)
        options.push({
          label: `${currentOption.toLocaleString(this.timeFormat)} ${duration ? `(${duration})` : ''}`,
          value: optionAsISO
        })
        currentOption = currentOption.plus({ minutes: 30 })
      }
      return options
    },
    needsChanges() {
      // We do these checks:
      // - Title is included
      // console.log("Debug changes required", {
      //   title: this.formValues.title,
      // });
      // let now = DateTime.now().toISO();
      const needsChanges = !(
        (
          this.formValues.selectedChannels.length > 0 &&
          this.formValues.title.length > 0 &&
          this.startTime < this.endTime
        )
        // && this.startTime > now &&
        // ((this.address.length > 0 &&
        //   this.placeId &&
        //   this.latitude &&
        //   this.longitude) ||
        //   this.urlIsValid)
      );
      return needsChanges;
    },
    changesRequiredMessage() {
      if (this.formValues.selectedChannels.length === 0) {
        return "At least one channel must be selected.";
      }
      if (!this.formValues.title) {
        return "A title is required.";
      }

      return "";
    },
    urlIsValid() {
      return checkUrl(this.formValues.virtualEventUrl);
    },
  },
  methods: {
    getDuration(startTime: string, endTime: string) {
      if (DateTime.fromISO(startTime) >= DateTime.fromISO(endTime)) {
        return ''
      }
      // Format time as "1h 30m"
      const obj = Interval
        .fromDateTimes(DateTime.fromISO(startTime), DateTime.fromISO(endTime))
        .toDuration()
        .shiftTo('hours', 'minutes')
        .toObject()

      if (!obj.hours) {
        return `${obj.minutes}m`
      }
      if (!obj.minutes) {
        return `${obj.hours}h`
      }
      return `${obj.hours}h ${obj.minutes}m`
    },
    toggleCostField() {
      if (this.formValues?.free) {
        this.$emit("updateFormValues", {
          cost: "This event is not free.",
          free: false,
        });
      } else {
        this.$emit("updateFormValues", {
          cost: "",
          free: true,
        });
      }
    },
    togglePrivateResidenceField() {
      this.$emit("updateFormValues", {
        isInPrivateResidence: !this.formValues.isInPrivateResidence,
      });
    },
    setSelectedChannels(event: any) {
      this.$emit("setSelectedChannels", event);
    },
    updateStartTime(time: Date) {
      // Sat Jan 01 2022 18:30:00 GMT-0700 (Mountain Standard Time)
      this.startTime = time.toISOString();
    },
    updateLocationInput(placeData: any) {
      try {
        this.placeId = placeData.place_id;
        this.latitude = placeData.geometry.location.lat();
        this.longitude = placeData.geometry.location.lat();
        this.address = placeData.formatted_address;
        this.locationName = placeData.name;
      } catch (e: any) {
        throw new Error(e);
      }
    },
    handleStartDateChange(event: any) {
      const startTimeISO = this.startTime.toISOString();
      const existingStartTimeObject = DateTime.fromISO(startTimeISO);
      const newStartTimeObject = DateTime.fromISO(
        event.toISOString()
      ).toObject();
      const { day, month, year } = newStartTimeObject;
      // Only change the day/month/year so that we still keep the hours and minutes set by the time picker.
      // Convert the date back to a Javascript date for compatibility with the calendar date picker.
      const newStartTime = existingStartTimeObject
        .set({ day, month, year })
        .toISO()
      this.$emit("updateFormValues", { startTime: newStartTime });
      this.touched = true
    },
    handleEndDateChange(event: any) {
      const endTimeISO = this.endTime.toISOString();
      const existingEndTimeObject = DateTime.fromISO(endTimeISO);
      const newEndTimeObject = DateTime.fromISO(event.toISOString()).toObject();
      const { day, month, year } = newEndTimeObject;
      const newEndTime = existingEndTimeObject
        .set({ day, month, year })
        .toISO();

      this.$emit("updateFormValues", { endTime: newEndTime });
      this.touched = true
    },
    handleStartTimeChange(event: any) {
      const startTimeISO = this.startTime.toISOString();
      const existingStartTimeObject = DateTime.fromISO(startTimeISO);
      const newStartTimeObject = DateTime.fromISO(event).toObject();
      const { hour, minute } = newStartTimeObject;
      const newStartTime = existingStartTimeObject
        .set({ hour, minute })
        .toJSDate();
      this.$emit("updateFormValues", { startTime: newStartTime.toISOString() });
      this.touched = true
    },
    handleEndTimeChange(event: any) {
      const endTimeISO = this.endTime.toISOString();
      const existingEndTimeObject = DateTime.fromISO(endTimeISO);
      const newEndTimeObject = DateTime.fromISO(event).toObject();
      const { hour, minute } = newEndTimeObject;
      const newEndTime = existingEndTimeObject.set({ hour, minute });
      this.$emit("updateFormValues", { endTime: newEndTime.toISO() });
      this.touched = true
    },
    handleUpdateLocation(event: any) {
      if (!event.place_id) {
        throw new Error('Could not find a Google place ID based on the form input.')
      }
      const { place_id, name, formatted_address, geometry: {
        location: {
          lat,
          lng
        }
      }
      } = event
      this.$emit('updateFormValues', {
        placeId: place_id,
        locationName: name,
        address: formatted_address,
        latitude: lat(),
        longitude: lng()
      })
    }
  },
});
</script>

<template>
  <div>
    <div v-if="eventLoading">Loading...</div>
    <div v-else-if="getEventError">
      <div v-for="(error, i) of getEventError?.graphQLErrors" :key="i">
        {{ error.message }}
      </div>
    </div>
    <TailwindForm class="pt-8" v-else-if="formValues" :form-title="formTitle" :needs-changes="needsChanges"
      @input="touched = true" @submit="$emit('submit')">
      <div class="pr-8">
        <FormRow>
          <template v-slot:icon>
            <VTooltip class="inline-flex">
              <PencilIcon class="inline-flex" :wide="true" /><span class="text-red-500">*</span>
              <template #popper> Title </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <TextInput :value="formValues.title" :full-width="true" :placeholder="'Add title'"
              @update="$emit('updateFormValues', { title: $event })" />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>
            <VTooltip class="inline-flex">
              <ChannelIcon class="float-right h-6 w-6" /><span class="text-red-500">*</span>
              <template #popper> Channels </template>
            </VTooltip>

          </template>
          <template v-slot:content>
            <TagInput :selected-channels="formValues.selectedChannels" :channel-mode="true" @setSelectedTags="
              $emit('updateFormValues', { selectedChannels: $event })
            " />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>


            <VTooltip class="inline-flex">
              <ClockIcon class="float-right h-6" />
              <template #popper> Date and Time </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <div class="sm:inline-block md:flex items-center md:space-x-2">
              <DatePicker class="
                  focus:ring-blue-500 focus:border-blue-500
                  mt-1
                  pt-2.5
                  pb-2.5
                  flex-1
                  block
                  min-w-0
                  rounded
                  sm:text-sm
                  border-gray-300
                " v-model="startTimeDay" :input-format="dateFormat" @update:modelValue="handleStartDateChange" />
              <Dropdown class="w-52" :options="startTimeOptions" :default-option="defaultStartTimeOption"
                @selected="handleStartTimeChange($event.value)" />
              <RightArrowIcon />
              <DatePicker class="
                  focus:ring-blue-500 focus:border-blue-500
                  mt-1
                  pt-2.5
                  pb-2.5
                  flex-1
                  block
                  min-w-0
                  rounded
                  sm:text-sm
                  border-gray-300
                " v-model="endTimeDay" :input-format="dateFormat" :lower-limit="startTime"
                @update:modelValue="handleEndDateChange" />
              <Dropdown class="w-52" :options="endTimeOptions" :default-option="defaultEndTimeOption"
                @selected="handleEndTimeChange($event.value)" />
              <div class="ml-2 mr-2">
                {{ duration }}
              </div>
            </div>
            <ErrorMessage :text="datePickerErrorMessage" />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <LinkIcon class="float-right" />
              <template #popper> Link to Virtual Event </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <TextInput :value="formValues.virtualEventUrl" :use-v-model="true" :full-width="true"
              :placeholder="'Add a virtual event URL'"
              @update="$emit('updateFormValues', { virtualEventUrl: $event })" />
            <ErrorMessage :text="
              touched &&
              formValues.virtualEventUrl &&
              formValues.virtualEventUrl.length > 0 &&
              !urlIsValid
                ? 'Must be a valid URL starting with https://'
                : ''
            " />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <LocationIcon :wide="true" class="float-right" />
              <template #popper> Location </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <LocationSearchBar :search-placeholder="'Add an address'" :full-width="true"
              :reference-point-address-name="`${formValues.locationName ? `${formValues.locationName}, `: ''}${formValues.address ? formValues.address : ''}`"
              @updateLocationInput="handleUpdateLocation" />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <AnnotationIcon class="float-right" />
              <template #popper> Details </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <TextEditor class="mb-3 h-56" :initial-value="formValues.description" :placeholder="'Add details'"
              @update="$emit('updateFormValues', { description: $event })" />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <TagIcon class="float-right h-6" />
              <template #popper> Tags </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <TagInput :selected-tags="formValues.selectedTags" @setSelectedTags="
              $emit('updateFormValues', { selectedTags: $event })
            " />
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <HomeIcon class="float-right" />
              <template #popper> Private Residence </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <CheckBox class="align-middle" :checked="formValues.isInPrivateResidence"
              @input="togglePrivateResidenceField" />
            <span class="ml-2 align-middle">This event is in a private residence</span>
          </template>
        </FormRow>
        <FormRow>
          <template v-slot:icon>

            <VTooltip class="inline-flex">
              <TicketIcon class="float-right" />
              <template #popper> Cost to Attend </template>
            </VTooltip>
          </template>
          <template v-slot:content>
            <CheckBox class="align-middle" :checked="formValues.free" @input="toggleCostField" />
            <span class="ml-2 align-middle">This event is free</span>
            <TextInput v-show="!formValues.free" :value="formValues.cost" :full-width="true"
              :placeholder="'Add cost details'" @update="$emit('updateFormValues', { cost: $event })" />
          </template>
        </FormRow>
      </div>
      <ErrorBanner v-if="needsChanges && touched" :text="changesRequiredMessage" />
      <ErrorBanner v-if="createEventError" :text="createEventError.message" />
      <ErrorBanner v-if="updateEventError" :text="updateEventError.message" />
    </TailwindForm>
  </div>
</template>
<style>

</style>
