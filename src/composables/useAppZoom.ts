import { computed, ref } from 'vue';

const DEFAULT_ZOOM = 100;
const MIN_ZOOM = 80;
const MAX_ZOOM = 300;
const STEP = 10;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function createAppZoomState() {
  const zoom = ref(DEFAULT_ZOOM);

  const zoomStyle = computed(() => ({
    zoom: zoom.value / 100,
  }));

  function zoomIn() {
    zoom.value = clampZoom(zoom.value + STEP);
  }

  function zoomOut() {
    zoom.value = clampZoom(zoom.value - STEP);
  }

  return {
    zoom,
    zoomStyle,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    step: STEP,
    zoomIn,
    zoomOut,
  };
}

let appZoomState: ReturnType<typeof createAppZoomState> | null = null;

export function useAppZoom() {
  if (!appZoomState) {
    appZoomState = createAppZoomState();
  }

  return appZoomState;
}
