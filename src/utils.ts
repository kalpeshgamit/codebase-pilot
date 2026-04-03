/**
 * Normalize a path to POSIX format (forward slashes).
 * Used for config paths stored in agents.json and displayed to users.
 * Filesystem operations should still use path.join().
 */
export function toPosix(p: string): string {
  return p.split('\\').join('/');
}
