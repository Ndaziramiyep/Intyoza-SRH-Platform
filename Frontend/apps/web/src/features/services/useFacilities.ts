import { useEffect, useState } from 'react'
import { fetchFacilities, type FacilitiesResult } from '@intyoza/shared/services/api'

export function useFacilities() {
  const [result, setResult] = useState<FacilitiesResult | null>(null)

  useEffect(() => {
    let active = true
    fetchFacilities().then((r) => {
      if (active) setResult(r)
    })
    return () => {
      active = false
    }
  }, [])

  return { facilities: result?.facilities ?? [], isSample: result?.isSample ?? false, loading: result === null }
}
