<script setup lang="ts">
import { de } from '@nuxt/ui/locale'

const { serverName } = useRuntimeConfig().public

useHead({
  htmlAttrs: { lang: 'de' },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/branding/favicon' }
  ]
})

useSeoMeta({
  title: serverName,
  description: `Teilnehmer-Portal von ${serverName}`
})

const navigationItems = [
  { label: 'Teilnehmer', to: '/' },
  { label: 'Rangliste', to: '/ranking' },
  { label: 'Statistiken', to: '/statistiken' }
]
</script>

<template>
  <UApp :locale="de">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="focus-visible:outline-3 outline-primary/25 rounded-md p-1 -ms-1 flex items-center gap-2 font-semibold"
        >
          <AppLogo class="w-auto h-6 shrink-0" />
          {{ serverName }}
        </NuxtLink>
      </template>

      <UNavigationMenu :items="navigationItems" />

      <template #right>
        <RaidPicker />
        <AppSettingsMenu />
      </template>

      <template #body>
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
          class="-mx-2.5"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          {{ serverName }} · © {{ new Date().getFullYear() }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
