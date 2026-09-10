import { describe, expect, it } from 'vitest'
import { calculateMaritimePath } from './maritime-routing'

describe('maritime routing', () => {
  it('uses a sea network instead of a direct line across land', () => {
    const route = calculateMaritimePath([{ lat: 1.2644, lng: 103.82 }, { lat: 31.2653, lng: 32.3019 }])
    expect(route.length).toBeGreaterThan(20)
    expect(Math.min(...route.map((point) => point.lat))).toBeGreaterThan(-10)
    expect(Math.max(...route.map((point) => point.lat))).toBeLessThan(40)
  })
})