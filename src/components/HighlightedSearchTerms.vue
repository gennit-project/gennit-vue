<script lang="ts">
import { defineComponent, computed } from "vue";
// Split on highlight term and divide term into parts, ignore case
// Used help from https://stackoverflow.com/questions/29652862/highlight-text-using-reactjs

export default defineComponent({
  setup(props) {

    const parts = computed(() => {
      let p = [props.text];
      if (props.searchInput) {
        p = props.text.split(new RegExp(`(${props.searchInput})`, "gi"));
      }
      return p
    })
   
    return {
      parts,
    };
  },
  props: {
    text: {
      type: String,
      default: '',
    },
    searchInput: {
      type: String,
      default: '',
    },
  },
  methods: {
    match(part: string, searchInput: string) {
      if (!part) {
        return false;
      }
      return part.toLowerCase() === searchInput.toLowerCase();
    },
  },
});
</script>
<template>
  <span :key="i" v-for="(part, i) in parts">
    <mark v-if="match(part, searchInput)">
      {{ part }}
    </mark>
    <span v-else>{{ part }}</span>
  </span>
</template>