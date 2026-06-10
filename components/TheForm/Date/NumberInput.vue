<template lang="pug">
    v-text-field(
      v-if="showInput"
      class="numbers-input"
      label="Количество дней"
      type="number"
      :model-value="value"
      variant="outlined"
      density="compact"
      single-line
      hide-details
      @update:model-value="onValueChange"
    )
      template(#prepend-inner)
        v-btn(
          icon
          variant="text"
          size="small"
          aria-label="Уменьшить"
          @click="decrement"
        )
          v-icon(icon="mdi-minus" color="primary")
      template(#append-inner)
        v-btn(
          icon
          variant="text"
          size="small"
          aria-label="Увеличить"
          @click="increment"
        )
          v-icon(icon="mdi-plus" color="primary")
</template>

<script>
export default {
  props: {
    showInput: {
      type: Boolean,
      required: true,
    },
    modelValue: {
      type: Number,
      default: 0,
    },
    maxValue: {
      type: Number,
      default: 9999,
    },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      value: Number(this.modelValue) || 0,
      maxValue: this.maxValue,
    };
  },
  watch: {
    modelValue(newValue) {
      this.value = Number(newValue) || 0;
    },
  },
  methods: {
    onValueChange(nextValue) {
      let value = Number(nextValue);
      if (Number.isNaN(value) || value < 0) value = 0;
      if (value > this.maxValue) value = this.maxValue;
      this.value = value;
      this.$emit('update:modelValue', value);
    },
    decrement() {
      if (this.value > 0) {
        this.onValueChange(this.value - 1);
      }
    },
    increment() {
      if (this.value < this.maxValue) {
        this.onValueChange(this.value + 1);
      }
    },
  },
};
</script>

<style lang="sass" scoped>
.numbers-input
  max-width: 280px
</style>