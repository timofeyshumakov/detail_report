<template lang="pug">
    v-text-field(
      v-if="showInput"
      class="numbers-input"
      label="Введите количество дней"
      type="number"
      :modelValue="modelValue"
      :maxlength="maxlength"
      @input="onInput"
      :rules="validationRules"
      v-mask="'####'"
    )
      template(#prepend)
        v-btn(@click="decrement" icon)
          v-icon(icon="minus-circle" color="primary" class="button-icon")
      template(#append)
        v-btn(@click="increment" icon)
          v-icon(icon="plus-circle" color="primary" class="button-icon")
</template>
  
<script>
// type="email" указывается потому, что в type="number" не работает maxlength

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
  data() {
    return {
        value: this.modelValue,
        maxValue: this.maxValue,
    };
  },
  computed: {
    validationRules() {
      return [
        v => v >= 0 || 'Минимальное значение 0',
        v => v <= this.maxValue || 'Максимальное значение ' + this.maxValue,
        v => /^[0-9]*$/.test(v) || 'Допускаются только цифры',
      ];
    },
  },
  methods: {
    onInput(event) {
        if(event){
          this.value = event.target.value;
          let value = this.value + '';
          if(value.startsWith('0') && value.length > 1) {
              this.value = +value;
          }
        if(event.target.value > this.maxValue){
          event.target.setAttribute('maxlength', this.maxValue.toString().length);
          this.value = this.maxValue;
          event.target.value = this.maxValue;
        }
      }
        this.$emit('update:modelValue', this.value);
    },
    decrement() {
      if (this.value > 0) {
        this.value -= 1; // уменьшаем значение на 1
        this.onInput();
      }
    },
    increment(event) {
        if(this.value < this.maxValue){
            this.value = +this.value + 1;
        }else{
          this.value = this.maxValue;
        }
        this.onInput();
    },
  },
  mounted(){

  }
};
</script>

<style lang="sass" scoped>

  .v-btn--icon .v-btn__content
    transform: scale(1.25)

  .button-icon
    transform: scale(2) !important

</style>