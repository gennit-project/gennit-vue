<script lang="ts">
import { defineComponent, computed } from "vue";
import GoBack from "../GoBack.vue";
import Breadcrumbs from '@/components/nav/Breadcrumbs.vue';
import { useRoute } from "vue-router";

export default defineComponent({
  name: "FeedComponent",
  setup() {
    const route = useRoute();
    const feedId = computed(() => {
      return route.params.feedId;
    });
    let links = [
      {
        label: "Feeds",
        path: "feeds",
      },
      {
        label: `feeds/${feedId.value}`,
        path: `feeds/${feedId.value}`,
      },
    ];
    return {
      feedId,
      links,
    };
  },
  components: {
    Breadcrumbs,
    GoBack,
  },
});
</script>

<template>
  <div class="flex-1 px-10 font-bold">
    <Breadcrumbs :links="links" />
    <GoBack />
    <p class="text-md font-medium text-gray-800 truncate">
      <span>Title {{ feedId }}</span>
    </p>
    <p class="text-sm font-medium text-gray-800 truncate">Body</p>
  </div>
</template>