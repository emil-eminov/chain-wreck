import { describe, expect, it } from 'vitest'
import { IllegalTransitionError, canTransition, transition } from '../../src/core/state'

describe('phase state machine', () => {
  it('allows the happy path through a level', () => {
    let phase = transition('SURVEY', 'BUILD')
    phase = transition(phase, 'AIM')
    phase = transition(phase, 'SIMULATE')
    phase = transition(phase, 'RESULT')
    expect(phase).toBe('RESULT')
  })

  it('lets a retry return to BUILD so the placement survives', () => {
    expect(canTransition('RESULT', 'BUILD')).toBe(true)
  })

  it('lets the player cancel an aim without firing', () => {
    expect(canTransition('AIM', 'BUILD')).toBe(true)
  })

  it('refuses to fire twice in one attempt', () => {
    expect(canTransition('SIMULATE', 'AIM')).toBe(false)
    expect(canTransition('SIMULATE', 'SIMULATE')).toBe(false)
  })

  it('refuses to edit the build mid-flight', () => {
    expect(canTransition('SIMULATE', 'BUILD')).toBe(false)
  })

  it('throws on an illegal transition rather than silently allowing it', () => {
    expect(() => transition('SURVEY', 'SIMULATE')).toThrow(IllegalTransitionError)
  })
})
