<template>
  <EisenhowerMatrix />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import EisenhowerMatrix from '@/components/EisenhowerMatrix.vue'

export default defineComponent({
  name: 'App',
  components: { EisenhowerMatrix }
})
</script>

<style>
:root {
  --bg: #f3f7f6;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: radial-gradient(
    1200px 800px at 50% -10%,
    #ffffff 0%,
    var(--bg) 60%
  );
  min-height: 100vh;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #16323a;
}
</style>
