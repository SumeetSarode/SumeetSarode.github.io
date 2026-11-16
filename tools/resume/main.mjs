/**
 * `npm run resume`: builds public/resume/resume.pdf from the résumé in content/resume/.
 * The Portfolio Preview app does this by itself; this is for people who prefer a terminal.
 */
import { buildResume } from './build.mjs';

const status = await buildResume();
console.log(status.message);
process.exit(status.state === 'error' ? 1 : 0);
