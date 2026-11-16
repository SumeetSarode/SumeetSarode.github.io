import { rename, writeFile } from 'node:fs/promises';

/** Write to a temp name, then rename, so a crash never leaves half a file. */
export async function writeFileAtomic(path, data) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, data);
  await rename(temp, path);
}
