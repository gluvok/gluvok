/**
 * @file components/combobox/use-entity-options.ts
 * @description Hook to fetch list records for a given entity slug and format them into combobox options.
 */

import * as React from "react"
import axios from "axios"
import { ENTITY_EXTRACTORS, type Entity } from "@/lib/utils/entity-extractors"
import { fetchEntityList } from "@/lib/services"
import { SystemSlug, ApiRoutes } from "@/lib/constants/enums"

/**
 * useEntityOptions Hook
 * Performs API request depending on the entity type, pulls rows,
 * extracts display attributes using custom mappings, and manages loading state.
 */
export function useEntityOptions(
  entitySlug: string,
  contextSlug?: string,
  fieldKey?: string,
  currentValue?: string
) {
  const [options, setOptions] = React.useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let active = true
    async function load() {
      try {
        setLoading(true)
        let rawList: Entity[] = []
        switch (entitySlug) {
          case SystemSlug.USERS: {
            const res = await axios.get<{ data: Entity[] }>(ApiRoutes.USERS)
            rawList = res.data.data || []
            break
          }
          default:
            rawList = await fetchEntityList(entitySlug)
            break
        }

        if (!active) return

        const extractor = ENTITY_EXTRACTORS[entitySlug]
        if (!extractor) {
          setOptions([])
          return
        }

        const opts = rawList.map((item) => {
          const { id, name } = extractor(item)
          if (entitySlug === SystemSlug.USERS) {
            return {
              value: id,
              label: name || id,
            }
          }
          const displayId = id.length > 8 ? `${id.substring(0, 8)}...` : id
          return {
            value: id,
            label: name === id ? name : name ? `${name} (ID: ${displayId})` : id,
          }
        })
        setOptions(opts)
      } catch (err) {
        console.error("Failed to load options for", entitySlug, err)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [entitySlug, contextSlug, fieldKey, currentValue])

  return { options, loading }
}
