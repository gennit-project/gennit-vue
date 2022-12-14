<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  useQuery,
  useMutation,
  provideApolloClient,
} from "@vue/apollo-composable";
import { TagData } from "@/types/tagTypes";
import { GET_CHANNEL } from "@/graphQLData/channel/queries";
import { UPDATE_CHANNEL } from "@/graphQLData/channel/mutations";
import { apolloClient } from "@/main";
import { CreateEditChannelFormValues } from "@/types/channelTypes";
import CreateEditChannelFields from "./CreateEditChannelFields.vue";

export default defineComponent({
  name: "EditChannel",
  components: {
    CreateEditChannelFields,
  },
  apollo: {},
  setup() {
    provideApolloClient(apolloClient);
    const route = useRoute();
    const router = useRouter();

    const channelId: string | string[] = route.params.channelId;

    const {
      error: getChannelError,
      result: getChannelResult,
      onResult: onGetChannelResult,
      loading: getChannelLoading,
    } = useQuery(GET_CHANNEL, {
      uniqueName: channelId,
    });

    const channel = computed(() => {
      if (getChannelLoading.value || getChannelError.value) {
        return null;
      }
      return getChannelResult.value.channels[0];
    });

    const existingTags = computed(() => {
      if (
        !getChannelLoading.value ||
        !getChannelError.value ||
        !getChannelResult.value.channels ||
        !getChannelResult.value.channels[0].Tags
      ) {
        return [];
      }
      return channel.value.Tags.map((tag: TagData) => {
        return tag.text;
      });
    });

    const getDefaultChannelValues = () => {
      if (channel.value) {
        return {
          uniqueName: channel.value.uniqueName,
          description: channel.value.description,
          selectedTags: channel.value.Tags.map((tag: TagData) => {
            return tag.text;
          }),
          username: 'cluse'
        };
      }

      return {
        uniqueName: "",
        description: "",
        selectedTags: [],
        username: "",
      };
    };

    const formValues = ref<CreateEditChannelFormValues>(
      getDefaultChannelValues()
    );

    onGetChannelResult((value) => {
      const channel = value.data.channels[0];

      formValues.value = {
        uniqueName: channel.uniqueName,
        description: channel.description,
        selectedTags: channel.Tags.map((tag: TagData) => {
          return tag.text;
        }),
        username: channel.Admins[0]?.username || "",
      };
    });

    const channelUpdateInput = computed(() => {
      const tagConnections = formValues.value.selectedTags.map(
        (tag: string) => {
          return {
            onCreate: {
              node: {
                text: tag,
              },
            },
            where: {
              node: {
                text: tag,
              },
            },
          };
        }
      );

      const tagDisconnections = existingTags.value
        .filter((tag: string) => {
          return !formValues.value.selectedTags.includes(tag);
        })
        .map((tag: string) => {
          return {
            where: {
              node: {
                text: tag,
              },
            },
          };
        });

      return {
        description: formValues.value.description,
        Tags: {
          connectOrCreate: tagConnections,
          disconnect: tagDisconnections,
        },
        Admins: {
          connect: {
            where: {
              node: {
                username: "cluse",
              },
            },
          },
        },
      };
    });

    const {
      mutate: updateChannel,
      error: updateChannelError,
      onDone,
    } = useMutation(UPDATE_CHANNEL, () => ({
      variables: {
        where: {
          uniqueName: channelId,
        },
        update: channelUpdateInput.value,
      },
    }));

    onDone((response: any) => {
      const channelId = response.data.updateChannels.channels[0].uniqueName;

      router.push({
        name: "Channel",
        params: {
          channelId: channelId,
        },
      });
    });

    return {
      channelId,
      existingTags,
      formValues,
      getChannelError,
      getChannelLoading,
      getChannelResult,
      router,
      updateChannelError,
      updateChannel,
    };
  },
  methods: {
    async submit() {
      this.updateChannel();
    },
    updateFormValues(data: CreateEditChannelFormValues) {
      // Update all form values at once because it makes cleaner
      // code than passing each form individual value as a prop
      // or writing separate methods to update each value.
      const existingValues = this.formValues;
      this.formValues = {
        ...existingValues,
        ...data,
      };
    },
  },
});
</script>
<template>
  <CreateEditChannelFields
    :edit-mode="true"
    :channel-loading="getChannelLoading"
    :get-channel-error="getChannelError"
    :update-channel-error="updateChannelError"
    :form-values="formValues"
    @submit="submit"
    @updateFormValues="updateFormValues"
  />
</template>

<style>
</style>