import { ref } from 'vue'

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('primary')

export function useSnackbar() {
  function showSnackbar(text: string, color = 'primary') {
    snackbarText.value = text
    snackbarColor.value = color
    snackbar.value = true
  }

  return {
    snackbar,
    snackbarText,
    snackbarColor,
    showSnackbar,
  }
}
