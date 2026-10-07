import type { ShallowRef } from 'vue'

export type MinecraftNameLocaleSetting = MinecraftNameLocale | 'standard'

function isMinecraftNameLocale(value: string): value is MinecraftNameLocale {
  return value === 'en' || value === 'de'
}

function isMinecraftNameLocaleSetting(value: string): value is MinecraftNameLocaleSetting {
  return value === 'standard' || isMinecraftNameLocale(value)
}

function useStoredPreference<T extends string>(storageKey: string, defaultValue: T, isValidValue: (value: string) => value is T): ShallowRef<T> {
  const value = shallowRef(defaultValue) as ShallowRef<T>

  onMounted(() => {
    try {
      const storedValue = localStorage.getItem(storageKey)
      if (storedValue !== null && isValidValue(storedValue)) value.value = storedValue
    } catch {
      // localStorage unavailable (private browsing etc.) - stick with the default
    }
  })

  watch(value, (newValue) => {
    try {
      localStorage.setItem(storageKey, newValue)
    } catch {
      // ignore write failures, the in-memory preference still applies for this session
    }
  })

  return value
}

function resolveSetting(setting: MinecraftNameLocaleSetting, globalLocale: MinecraftNameLocale): MinecraftNameLocale {
  return setting === 'standard' ? globalLocale : setting
}

function createResolvedLocale(setting: ShallowRef<MinecraftNameLocaleSetting>, globalLocale: ShallowRef<MinecraftNameLocale>) {
  return computed(() => resolveSetting(setting.value, globalLocale.value))
}

function createMinecraftNameLocaleState() {
  const globalMinecraftNameLocale = useStoredPreference<MinecraftNameLocale>('cubo-minecraft-name-locale-global', 'en', isMinecraftNameLocale)
  const objectsMinecraftNameLocale = useStoredPreference<MinecraftNameLocaleSetting>('cubo-minecraft-name-locale-objects', 'standard', isMinecraftNameLocaleSetting)
  const statisticsMinecraftNameLocale = useStoredPreference<MinecraftNameLocaleSetting>('cubo-minecraft-name-locale-statistics', 'standard', isMinecraftNameLocaleSetting)
  const advancementsMinecraftNameLocale = useStoredPreference<MinecraftNameLocaleSetting>('cubo-minecraft-name-locale-advancements', 'standard', isMinecraftNameLocaleSetting)

  return {
    globalMinecraftNameLocale,
    objectsMinecraftNameLocale,
    statisticsMinecraftNameLocale,
    advancementsMinecraftNameLocale,
    resolvedObjectsLocale: createResolvedLocale(objectsMinecraftNameLocale, globalMinecraftNameLocale),
    resolvedStatisticsLocale: createResolvedLocale(statisticsMinecraftNameLocale, globalMinecraftNameLocale),
    resolvedAdvancementsLocale: createResolvedLocale(advancementsMinecraftNameLocale, globalMinecraftNameLocale)
  }
}

// created lazily from inside a component's setup() (via the first call below) instead of at module-evaluation
// time, since onMounted/watch inside useStoredPreference need an active component instance to attach to
let sharedMinecraftNameLocaleState: ReturnType<typeof createMinecraftNameLocaleState> | undefined

export function useMinecraftNameLocale() {
  sharedMinecraftNameLocaleState ??= createMinecraftNameLocaleState()
  return sharedMinecraftNameLocaleState
}
