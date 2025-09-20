<template lang="pug">
  v-dialog(:modelValue="dialogStages" max-width="600" v-if="dialogStages")
    v-card
      v-card-title
        span(class="headline") Ошибка
      v-card-text
        p {{ dialogMsg }}
      v-card-actions
        v-btn(color="red" @click="closeDialog") Закрыть
</template>

<script>
export default {
  name: 'ErrorDialog',
  props: {
    dialogStages: {
      type: Boolean,
      required: true,
    },
    dialogMsg: {
      type: String,
      required: true,
    },
  },
  methods: {
    closeDialog() {
      this.$emit('update:dialogStages', false);
    },
  }
};
</script>