<script lang="ts">
import { defineComponent, computed, ref } from "vue";
import { useRoute } from "vue-router";
import { useQuery, useResult } from "@vue/apollo-composable";
import { GET_DISCUSSION } from "@/graphQLData/discussion/queries";
import { ChannelData } from "@/types/channelTypes";
import Tag from "../buttons/Tag.vue";
import { relativeTime } from "../../dateTimeUtils";
import Comment from "../comments/Comment.vue";
import ConfirmDelete from "../ConfirmDelete.vue";

export default defineComponent({
  components: {
    Comment,
    ConfirmDelete,
    Tag,
  },
  setup() {
    const route = useRoute();
    const discussionId = computed(() => {
      return route.params.discussionId;
    });
    const channelId = computed(() => {
      return route.params.channelId;
    });

    const { result, loading } = useQuery(GET_DISCUSSION, { id: discussionId });

    const body = useResult(
      result,
      '',
      (data: any) => data.discussions[0]?.body || ""
    );
    const title = useResult(
      result,
      '',
      (data: any) => data.discussions[0]?.title || ""
    );
    const tags = useResult(
      result,
      [],
      (data: any) => data.discussions[0]?.Tags || []
    );
    const channelsExceptCurrent = useResult(result, [], (data: any) => {
      if (!data.discussions[0] || data.discussions[0].Channels.length < 2) {
        return [];
      }
      return (
        data.discussions[0]?.Channels.filter((channel: ChannelData) => {
          return channel.uniqueName !== channelId.value;
        }) || []
      );
    });
    const authorUsername = useResult(result, '', (data: any) => {
      return data.discussions[0]?.Author?.username || "[deleted]";
    });
    const createdAt = useResult(
      result,
      '',
      (data: any) => data.discussions[0]?.createdAt || ""
    );
    const updatedAt = useResult(
      result,
      '',
      (data: any) => data.discussions[0]?.updatedAt || ""
    );
    const confirmDeleteIsOpen = ref(false)

    return {
      authorUsername,
      body,
      channelsExceptCurrent,
      confirmDeleteIsOpen,
      createdAt,
      tags,
      title,
      channelId,
      discussionId,
      loading,
      relativeTime,
      result,
      updatedAt,
    };
  },
});
</script>

<template>
  <div class="container mx-auto">
    <div class="pb-5 border-b border-gray-200">
      <h1 class="text-2xl mt-8 leading-6 font-medium text-gray-900">
        {{ title || "[Deleted]" }}
      </h1>
      <div class="prose w-full text-xs mt-4">
        <router-link v-if="authorUsername" :to="`/u/${authorUsername}`">
          {{ `${authorUsername ? authorUsername : "[deleted]"}` }}
        </router-link>
        {{
          `${
            createdAt
              ? `opened this discussion ${relativeTime("" + createdAt)}`
              : ""
          }`
        }}
        <span v-if="updatedAt"> &#8226; </span>
        {{ updatedAt ? `Edited ${relativeTime("" + updatedAt)}` : "" }}
        <span>
          &#8226;
          <router-link
            :to="`/channels/${channelId}/discussions/d/${discussionId}/edit`"
            >Edit</router-link
          >
        </span>&#8226; 
        <span class="underline font-medium text-gray-900 cursor-pointer" @click="confirmDeleteIsOpen = true">Delete</span>
      </div>
    </div>

    <div v-if="loading">Loading...</div>

    <div class="grid md:grid-cols-12">
      <Comment
        v-if="body"
        :author-username="authorUsername"
        :created-at="createdAt || ''"
        :content="body"
      />

      <div class="md:col-span-3 mt-6">
        <div v-if="tags.length > 0">
          <h2
            class="
              text-md
              leading-6
              mb-2
              font-medium
              text-gray-700
              border-b border-gray-200
            "
          >
            Tags
          </h2>
          <Tag
            v-for="tag in tags"
            :tag="tag.text"
            :key="tag.text"
            :discussionId="discussionId"
          />
        </div>
        <div v-if="channelsExceptCurrent.length > 0" class="space-x-1">
          <h2
            class="
              text-md
              leading-6
              mb-2
              mt-6
              font-medium
              text-gray-700
              border-b border-gray-200
            "
          >
            Crossposted To
          </h2>
          <router-link
            v-for="channel in channelsExceptCurrent"
            :key="channel.uniqueName"
            :to="`/channels/${channel.uniqueName}/discussions/d/${discussionId}`"
          >
            {{ `${channel.uniqueName}` }}
          </router-link>
        </div>
      </div>
    </div>
    <ConfirmDelete
      :open="confirmDeleteIsOpen"
      @close="confirmDeleteIsOpen = false"
    />
  </div>
</template>