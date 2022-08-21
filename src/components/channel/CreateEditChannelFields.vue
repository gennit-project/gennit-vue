<script lang="ts">
import { defineComponent, PropType } from "vue";
import { ApolloError } from "@apollo/client/errors";
import AnnotationIcon from "@/components/icons/AnnotationIcon.vue";
import Form from "../forms/Form.vue";
import TagIcon from "../icons/TagIcon.vue";
import TagInput from "../forms/TagInput.vue";
import TextInput from "../forms/TextInput.vue";
import PencilIcon from "../icons/PencilIcon.vue";
import FormRow from "../forms/FormRow.vue";
import TextEditor from "../forms/TextEditor.vue";
import { CreateEditChannelFormValues } from "@/types/channelTypes";

export default defineComponent({
  components: {
    AnnotationIcon,
    TagIcon,
    TextInput,
    FormRow,
    TailwindForm: Form,
    TextEditor,
    TagInput,
    PencilIcon,
  },
  name: "CreateEditChannelFields",
  props: {
    editMode: {
      type: Boolean,
      required: true,
    },
    createChannelError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    formValues: {
      type: Object as PropType<CreateEditChannelFormValues>,
      required: false,
    },
    getChannelError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    updateChannelError: {
      type: Object as PropType<ApolloError | null>,
      default: () => {
        return null;
      },
    },
    channelLoading: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    return {
      touched: false,
    };
  },
  computed: {
    needsChanges() {
      // We do these checks:
      // - UniqueName is included
      const needsChanges =
        !this.formValues.uniqueName 
      return needsChanges;
    },
  },
});
</script>
<template>
  <div>
    <div v-if="channelLoading">Loading...</div>
    <div v-else-if="getChannelError">
      <div v-for="(error, i) of getChannelError?.graphQLErrors" :key="i">
        {{ error.message }}
      </div>
    </div>
    <TailwindForm
      v-else-if="formValues"
      :form-title="editMode ? 'Edit Channel' : 'Create Channel'"
      :needs-changes="needsChanges"
      @input="touched = true"
      @submit="$emit('submit')"
    >
      <div class="space-y-8 divide-y divide-gray-200 sm:space-y-5">
        <div class="mt-6 sm:mt-5 space-y-4 sm:space-y-5">
          <FormRow>
            <template v-slot:icon>
              <PencilIcon class="float-right" />
            </template>
            <template v-slot:content>
              <TextInput
                :disabled="editMode"
                :value="formValues.uniqueName"
                :placeholder="'Add unique name'"
                :full-width="true"
                @update="$emit('updateFormValues', { uniqueName: $event })"
              />
            </template>
          </FormRow>
          <FormRow>
            <template v-slot:icon>
              <TagIcon class="float-right" />
            </template>
            <template v-slot:content>
              <TagInput
                :selected-tags="formValues?.selectedTags"
                @setSelectedTags="
                  $emit('updateFormValues', { selectedTags: $event })
                "
              />
            </template>
          </FormRow>
          <FormRow>
            <template v-slot:icon>
              <AnnotationIcon class="float-right" />
            </template>
            <template v-slot:content>
              <TextEditor
                class="mb-3"
                :initial-value="formValues.description || ''"
                :placeholder="'Add description'"
                @update="$emit('updateFormValues', { description: $event })"
              />
            </template>
          </FormRow>
        </div>
      </div>
    </TailwindForm>

    <div v-for="(error, i) of getChannelError?.graphQLErrors" :key="i">
      {{ error.message }}
    </div>
  </div>
</template>