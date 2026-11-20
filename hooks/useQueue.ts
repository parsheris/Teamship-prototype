"use client"

import { useSyncExternalStore } from "react"

import {
  getQueueSnapshot,
  getServerQueueSnapshot,
  subscribeToQueue,
} from "@/lib/offlineStore"
import type { QueuedComplaint } from "@/lib/types"

export function useQueue(): QueuedComplaint[] {
  return useSyncExternalStore(subscribeToQueue, getQueueSnapshot, getServerQueueSnapshot)
}
