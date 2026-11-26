/**
 * The version of the data contract.
 *
 * It lives in a module of its own because both ends of the library read it:
 * `createGalaxy()` stamps it into `meta.formatVersion`, and `validateGalaxy()`
 * compares a loaded galaxy against it. Kept in `create.ts`, it would make the
 * two modules import each other.
 */

/**
 * Version of the data contract. Bump it on every breaking change. A game can
 * compare it to `save.formatVersion` to detect that an old save no longer
 * matches the current shape — and {@link validateGalaxy} reports the mismatch
 * on its own.
 */
export const FORMAT_VERSION = 2
