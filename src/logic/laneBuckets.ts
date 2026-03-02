/**
 * Lane-based spatial bucketing for collision detection optimization.
 *
 * The game has exactly 4 lanes (indices 0-3). Almost every collision check
 * starts with `entity.lane === other.lane`. By pre-grouping entities into
 * lane buckets once per tick, we reduce collision checks from O(S*C) to
 * approximately O(S*C/4).
 */

/** A record mapping lane indices 0-3 to arrays of entities in that lane. */
export type LaneBuckets<T> = Record<number, T[]>;

/**
 * Builds lane buckets from an array of entities that have a `lane` property.
 * Entities are grouped by their integer lane value (0-3).
 */
export const buildLaneBuckets = <T extends { lane: number }>(
  entities: T[]
): LaneBuckets<T> => {
  const buckets: LaneBuckets<T> = { 0: [], 1: [], 2: [], 3: [] };
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const lane = entity.lane;
    if (buckets[lane]) {
      buckets[lane].push(entity);
    } else {
      // Fallback for unexpected lane values (shouldn't happen in practice)
      buckets[lane] = [entity];
    }
  }
  return buckets;
};

/**
 * Returns all entities in a specific lane from pre-built buckets.
 * Returns an empty array if the lane has no entities.
 */
export const getEntitiesInLane = <T>(
  buckets: LaneBuckets<T>,
  lane: number
): T[] => {
  return buckets[lane] || [];
};

/**
 * Returns all entities in lanes adjacent to the given (possibly fractional) lane,
 * within the specified tolerance. Used for Nyan sweep and boss collisions where
 * the entity lane is fractional (e.g., 1.5).
 *
 * For example, with lane=1.5 and tolerance=0.8:
 *   - Lane 0: |0 - 1.5| = 1.5 > 0.8 => not included
 *   - Lane 1: |1 - 1.5| = 0.5 < 0.8 => included
 *   - Lane 2: |2 - 1.5| = 0.5 < 0.8 => included
 *   - Lane 3: |3 - 1.5| = 1.5 > 0.8 => not included
 */
export const getEntitiesInAdjacentLanes = <T extends { lane: number }>(
  buckets: LaneBuckets<T>,
  lane: number,
  tolerance: number
): T[] => {
  const result: T[] = [];
  for (let l = 0; l <= 3; l++) {
    if (Math.abs(l - lane) < tolerance) {
      const laneBucket = buckets[l];
      if (laneBucket) {
        for (let i = 0; i < laneBucket.length; i++) {
          result.push(laneBucket[i]);
        }
      }
    }
  }
  return result;
};
