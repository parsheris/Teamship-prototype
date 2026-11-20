"use client"

import { useSyncExternalStore } from "react"

import {
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  subscribeToSettings,
} from "@/lib/offlineStore"
import type { KioskSettings } from "@/lib/types"

export function useKioskSettings(): KioskSettings {
  return useSyncExternalStore(
    subscribeToSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  )
}
