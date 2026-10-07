<script setup lang="ts">
const {
  globalMinecraftNameLocale,
  objectsMinecraftNameLocale,
  statisticsMinecraftNameLocale,
  advancementsMinecraftNameLocale
} = useMinecraftNameLocale()

const globalLocaleItems = [
  { label: 'Englisch', value: 'en' },
  { label: 'Deutsch', value: 'de' }
]

const perTypeLocaleItems = [
  { label: 'Standard', value: 'standard' },
  ...globalLocaleItems
]
</script>

<template>
  <UPopover>
    <UButton
      icon="i-lucide-settings"
      color="neutral"
      variant="ghost"
      aria-label="Einstellungen"
    />

    <template #content>
      <div class="w-72 space-y-4 p-4">
        <div class="space-y-2">
          <p class="text-xs font-medium text-muted">
            Darstellung
          </p>
          <UColorModeSelect class="w-full" />
        </div>

        <USeparator />

        <div class="space-y-3">
          <p class="text-xs font-medium text-muted">
            Minecraft-Namen
          </p>

          <div class="space-y-1">
            <label class="text-xs text-muted">Standard-Sprache</label>
            <USelect
              v-model="globalMinecraftNameLocale"
              :items="globalLocaleItems"
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs text-muted">Items &amp; Entities</label>
            <USelect
              v-model="objectsMinecraftNameLocale"
              :items="perTypeLocaleItems"
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs text-muted">Statistiken</label>
            <USelect
              v-model="statisticsMinecraftNameLocale"
              :items="perTypeLocaleItems"
              class="w-full"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs text-muted">Advancements</label>
            <USelect
              v-model="advancementsMinecraftNameLocale"
              :items="perTypeLocaleItems"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
