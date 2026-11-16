/** Other public repositories. The content lives in content/more-projects.yaml. */
import type { z } from 'zod';
import { loadContent } from '../content-files/load';
import { moreProjectsFile } from '../content-files/schemas';

export type MoreProject = z.output<typeof moreProjectsFile>[number];

export const moreProjects: readonly MoreProject[] = loadContent(
  'more-projects.yaml',
  moreProjectsFile,
);
