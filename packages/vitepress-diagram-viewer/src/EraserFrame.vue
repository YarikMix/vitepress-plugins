<script setup lang="ts">
import DiagramFrame from './DiagramFrame.vue';
import type { DiagramSize } from './diagram-scale.ts';

defineProps<{ title: string; src: string; size: DiagramSize | null; pngSrc?: string }>();
</script>

<template>
  <DiagramFrame :title="title" :size="size" data-diagram-kind="eraser">
    <template v-if="size">
      <iframe :src="src" :width="size.width" :height="size.height" loading="lazy" sandbox="" :title="`Схема ${title}`"></iframe>
      <div class="diagram__shield" aria-hidden="true"></div>
    </template>
    <template #status><slot name="status" /></template>
    <template #footer>
      <slot name="footer"><a :href="src" target="_self">HTML</a><template v-if="pngSrc"> · <a :href="pngSrc" target="_self">PNG</a></template></slot>
    </template>
  </DiagramFrame>
</template>
