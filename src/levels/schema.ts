import type { BuildZone, LevelSpec, ObjectSpec, TargetSpec, Vec3 } from './types'
import { PART_IDS } from '../parts/registry'

/**
 * Hand-rolled validation rather than a schema library.
 *
 * Levels are authored by hand and loaded at startup, so the job is to fail
 * loudly with a message that says which field of which level is wrong. A
 * dependency would add bundle weight to every player's download to do that.
 */

export class LevelValidationError extends Error {
  constructor(
    readonly issues: readonly string[],
    id: string,
  ) {
    super(`Level "${id}" is invalid:\n  ${issues.join('\n  ')}`)
    this.name = 'LevelValidationError'
  }
}

export function validateLevel(input: unknown): readonly string[] {
  const issues: string[] = []
  if (!isRecord(input)) return ['level must be an object']

  if (typeof input['id'] !== 'string' || input['id'] === '') issues.push('id must be a non-empty string')
  if (typeof input['name'] !== 'string' || input['name'] === '') issues.push('name must be a non-empty string')
  if (typeof input['killLineY'] !== 'number') issues.push('killLineY must be a number')
  if (typeof input['par'] !== 'number' || input['par'] < 0) issues.push('par must be a number >= 0')

  const launcher = input['launcher']
  if (!isRecord(launcher)) {
    issues.push('launcher must be an object')
  } else {
    if (!isVec3(launcher['position'])) issues.push('launcher.position must be [x, y, z]')
    if (typeof launcher['maxSpeed'] !== 'number' || launcher['maxSpeed'] <= 0) {
      issues.push('launcher.maxSpeed must be a positive number')
    }
  }

  checkArray(input['inventory'], 'inventory', issues, (entry, where) => {
    if (!isRecord(entry)) return [`${where} must be an object`]
    const problems: string[] = []
    if (typeof entry['part'] !== 'string' || !PART_IDS.includes(entry['part'] as never)) {
      problems.push(`${where}.part must be one of: ${PART_IDS.join(', ')}`)
    }
    if (!Number.isInteger(entry['count']) || (entry['count'] as number) < 1) {
      problems.push(`${where}.count must be an integer >= 1`)
    }
    return problems
  })

  checkArray(input['buildZones'], 'buildZones', issues, (zone, where) => {
    if (!isRecord(zone)) return [`${where} must be an object`]
    if (!isVec3(zone['min']) || !isVec3(zone['max'])) return [`${where} needs min and max as [x, y, z]`]
    const min = zone['min'] as Vec3
    const max = zone['max'] as Vec3
    return min.every((v, i) => v < (max[i] as number)) ? [] : [`${where}.min must be less than max on every axis`]
  })

  checkArray(input['terrain'], 'terrain', issues, objectIssues)
  checkArray(input['structures'], 'structures', issues, objectIssues)
  checkArray(input['targets'], 'targets', issues, (target, where) => {
    const problems = [...objectIssues(target, where)]
    if (isRecord(target)) {
      if (typeof target['health'] !== 'number' || (target['health'] as number) <= 0) {
        problems.push(`${where}.health must be a positive number`)
      }
      if (target['bonus'] !== undefined && typeof target['bonus'] !== 'boolean') {
        problems.push(`${where}.bonus must be a boolean when present`)
      }
    }
    return problems
  })

  // A level with no winnable target can never be completed, which is the kind
  // of mistake that is invisible until a player is stuck on it.
  const targets = input['targets']
  if (Array.isArray(targets) && targets.length > 0) {
    const winnable = targets.filter((t) => isRecord(t) && t['bonus'] !== true)
    if (winnable.length === 0) issues.push('targets must include at least one non-bonus target')
  }

  const solution = input['solution']
  if (solution !== undefined) {
    if (!isRecord(solution)) {
      issues.push('solution must be an object when present')
    } else {
      if (!isVec3(solution['aim'])) issues.push('solution.aim must be [x, y, z]')
      if (typeof solution['power'] !== 'number' || (solution['power'] as number) <= 0 || (solution['power'] as number) > 1) {
        issues.push('solution.power must be between 0 and 1')
      }
      checkArray(solution['placements'], 'solution.placements', issues, (entry, where) => {
        if (!isRecord(entry)) return [`${where} must be an object`]
        const problems: string[] = []
        if (typeof entry['part'] !== 'string') problems.push(`${where}.part must be a string`)
        if (!isVec3(entry['position'])) problems.push(`${where}.position must be [x, y, z]`)
        if (typeof entry['rotationZ'] !== 'number') problems.push(`${where}.rotationZ must be a number`)
        return problems
      })
    }
  }

  return issues
}

export function parseLevel(input: unknown): LevelSpec {
  const issues = validateLevel(input)
  if (issues.length > 0) {
    const id = isRecord(input) && typeof input['id'] === 'string' ? input['id'] : '<unknown>'
    throw new LevelValidationError(issues, id)
  }
  return input as unknown as LevelSpec
}

function objectIssues(value: unknown, where: string): string[] {
  if (!isRecord(value)) return [`${where} must be an object`]
  const problems: string[] = []
  if (!isVec3(value['position'])) problems.push(`${where}.position must be [x, y, z]`)
  if (value['look'] !== undefined && !['ground', 'stone', 'roof', 'crate'].includes(value['look'] as string)) {
    problems.push(`${where}.look must be ground, stone, roof or crate`)
  }
  problems.push(...shapeIssues(value['shape'], `${where}.shape`))
  return problems
}

function shapeIssues(shape: unknown, where: string): string[] {
  if (!isRecord(shape)) return [`${where} must be an object`]
  switch (shape['kind']) {
    case 'box':
      return isVec3(shape['half']) && (shape['half'] as Vec3).every((v) => v > 0)
        ? []
        : [`${where}.half must be three positive numbers`]
    case 'cylinder':
      return positive(shape['halfHeight']) && positive(shape['radius'])
        ? []
        : [`${where} needs positive halfHeight and radius`]
    case 'sphere':
      return positive(shape['radius']) ? [] : [`${where}.radius must be positive`]
    default:
      return [`${where}.kind must be box, cylinder or sphere`]
  }
}

function checkArray(
  value: unknown,
  name: string,
  issues: string[],
  check: (entry: unknown, where: string) => readonly string[],
): void {
  if (!Array.isArray(value)) {
    issues.push(`${name} must be an array`)
    return
  }
  value.forEach((entry, i) => issues.push(...check(entry, `${name}[${i}]`)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isVec3(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every((v) => typeof v === 'number' && Number.isFinite(v))
}

function positive(value: unknown): boolean {
  return typeof value === 'number' && value > 0
}

export type { LevelSpec, ObjectSpec, TargetSpec, BuildZone }
