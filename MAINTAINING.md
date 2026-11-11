# Maintaining this site

This is a plain-language guide for the site's owner. You don't need to be a web developer to do any of
this.

**The big picture.** The site is a set of files in this folder. When you push a change to the `main`
branch on GitHub, GitHub runs every automatic check. If they all pass, it publishes the site. If any
check fails, nothing is published and the old site stays up.

---

## 1. Change your photo

You don't need a terminal for this.

1. **Double-click the Photo Studio app** in this folder:
   - **Mac:** `Photo Studio.app`
   - **Windows:** `Photo Studio.vbs`

   Your browser opens with the editor. (The first time, it spends about a minute setting itself up.)

2. **Choose a photo.** JPEG, PNG, WebP, and iPhone HEIC photos all work.
3. **Frame it.** Drag to move, zoom, and rotate. The brightness, contrast, saturation, and black-and-white
   controls are optional. The previews are the exact shape your website uses, shown on a light and a dark
   background.
4. **Write the description.** The "Alt text (read aloud by screen readers)" box is what blind and
   low-vision visitors hear instead of seeing the photo. Describe what's in the picture in a sentence.
5. Click **Review photo**, look at it, then click **Confirm and update photo**. "Back to editing" or the
   Escape key changes nothing.
6. Click **Quit Photo Studio** when you're done. (The app also stops by itself shortly after you close
   the tab.)

**Confirming only replaces the photo on your own computer.** Nothing is public until you publish
(section 7).

Your original photo is never changed and is never added to the site. While the editor is open it keeps
temporary working copies in `tools/photo-studio/.tmp`, and deletes them when it closes. The finished
picture has all hidden data (location, camera, and so on) removed.

**The page decides the photo's shape; Photo Studio follows it.** The shape (today a tall 4:5 portrait,
saved at 960 x 1200 pixels) lives in one file, `src/config/photo-frame.json`. The website and Photo
Studio both read it, so if you ever redesign the frame, change those numbers and the editor, its
previews, and the saved picture all follow. Nothing else needs touching.

**If your computer refuses to open the app**

- **Mac says it can't be opened:** right-click `Photo Studio.app`, choose **Open**, then **Open** again.
- **Windows shows a blue "protected your PC" box:** click **More info**, then **Run anyway**.
- **"Needs Node.js":** install the **LTS** version from [nodejs.org](https://nodejs.org), then try again.
- **Still stuck:** open a terminal in this folder and run `npm run photo`. It prints what's wrong. A log
  of each run is kept in `~/Library/Logs/PhotoStudio.log` (Mac) or `%TEMP%\PhotoStudio.log` (Windows).

## 2. Edit text

| To change…                                                                                         | Edit this file                                        |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Your name, title, email, links, the intro under your name, the social-sharing description          | `src/config/site.ts`                                  |
| Jobs, bullet points, earlier roles, and the impact numbers                                         | `content/experience.yaml`                             |
| Capabilities: the stack's layers (top = today's focus), one-line summaries, and the "Runs on" base | `src/data/skills.ts`                                  |
| Research papers                                                                                    | `content/research.yaml`                               |
| Degrees                                                                                            | `content/education.yaml`                              |
| Certifications (the guide at the top of the file lists every field)                                | `content/certifications.yaml`                         |
| The short "More on GitHub" list                                                                    | `src/data/more-projects.ts`                           |
| The photo's description for screen readers                                                         | `src/config/profile-photo.json` (or use Photo Studio) |
| A case study                                                                                       | `src/content/projects/<name>.yaml`                    |

Open a file in any text editor, change the words between the quotes, and save. Don't change the
punctuation around them.

**House rules for the words** (the automatic checks enforce some of these):

- Only claim what you can prove. No numbers you haven't verified.
- Plain text for employer names. No logos.
- Never add a phone number or a work email address.
- Avoid filler like "passionate", "results-driven", "cutting-edge", and the verb "leverage".

## 3. Add a project

1. In `src/content/projects/`, copy an existing `.yaml` file and rename it (for example `my-new-project.yaml`).
2. Change the words in it. Each part of the file is one part of the page:
   - `emblem`: the project's picture. `main` is a big symbol for what it is, `badge` is a small one for what
     makes it special, and `tone` is its colour (`indigo`, `violet`, or `cyan`). The allowed symbol names are
     listed in `src/lib/icon-names.ts`.
   - `challenge`: the problem, as one big sentence plus a few lines.
   - `how`: the explanation, a list if you want one, and `flow`, the boxes of the diagram (each with a symbol).
   - `highlights`: exactly three things worth knowing, each with a symbol, a punchy name (never "Decision 1"),
     and a one-line summary.
   - `limits`: what the project is not, and which numbers you are not claiming.

   Tip: put `**double stars**` around words to make them bold, and `` `backticks` `` around code.

3. Set `order` to where it should appear (`1` is first).
4. Run `npm run build`. If you left something out or a line is too long, the error tells you exactly which
   field to fix. It also appears on the Projects page automatically.

Research papers (`content/research.yaml`) get an `emblem` the same way: a big symbol, a small badge, and a colour.
Copy the one from an existing paper and change the names.

To use a symbol that is not in the list yet, add its name to `src/lib/icon-names.ts` and import it in
`src/lib/icons.ts` (copy the pattern there). Browse the free symbols at lucide.dev.

Set `checkedOn` to today's date after you compare the page with the project's repository. The page shows
that date to visitors.

## 4. Update the résumé PDF

The site offers a résumé PDF **without your phone number**. To rebuild it after changing your Word résumé:

```bash
npm run resume -- "/path/to/your resume.docx"
```

This needs **Python 3** and **LibreOffice** (both free). It works on a copy, so your original is never
touched. It removes the phone number, refuses to continue if any phone-like number remains, and writes
`public/resume/sumeet-sarode-resume.pdf`. **Open the PDF and look at it** before publishing, since
LibreOffice can draw fonts slightly differently from Word.

## 5. Check your changes before publishing

```bash
npm run dev        # opens a live preview of the site on your computer
```

Then, before you publish, run the checks. GitHub runs them again, but it's faster to find problems here:

```bash
npm test                 # the unit tests
npm run check            # types
npm run lint             # code style
npm run format:write     # tidies formatting automatically
npm run build            # builds the real site into dist/
npm run check:dist       # scans the built site for anything that must never be public
```

The browser tests (`npm run test:e2e`) open real browsers and check accessibility, small screens, and
keyboard use. Run `npx playwright install` once first.

## 6. What must never be published

The automatic checks stop most of these, but you are the last line of defense:

- Your **phone number** (anywhere, including inside images or PDFs).
- Your **original iPhone photo** (`.heic`) or any photo with location data.
- **Anything about your employer's internal work**: project names, systems, screenshots, numbers beyond
  your résumé wording. Employer names are plain text only.
- **Passwords, tokens, or API keys**, in any file.

## 7. Publish

```bash
git status                      # see what changed
git add -A
git commit -m "Describe what you changed"
git push
```

- The **first** time, GitHub asks for a username and a password. Use your GitHub username and paste a
  **personal access token** as the password. **Never put a token in a file or in the repository's web
  address.** Your computer's keychain remembers it after that.
- Watch progress on the repository's **Actions** tab. A green check means the site is live within a minute
  or two. A red cross means a check failed: click it to read why. The live site doesn't change until the
  checks pass.
- **One-time setup:** on GitHub, open the repository's **Settings → Pages** and set **Source** to
  **GitHub Actions**.

## 8. Looking after it over time

- **Links:** every few months, click through the outside links (GitHub, LinkedIn, the journal paper link).
  A broken link on a portfolio looks careless.
- **Case studies:** when a project's repository changes (new test counts, new features), update the
  page and its `checkedOn` date.
- **Updates:** about twice a year, run `npm update`, then the checks in section 5. If something fails
  after an update, undo it with `git checkout package.json package-lock.json` and ask for help.

## 9. How it's built (for the curious)

- **Astro**: builds plain HTML pages. The site ships no JavaScript files, only a few lines that remember
  light or dark mode.
- **Case studies** are Markdown files with a checked set of fields at the top (`src/content.config.ts`).
- **Design:** every color and size lives in `src/styles/tokens.css`. The light and dark themes share the
  same names with different values.
- **Tests:** `tests/unit` (fast checks of the logic and the content rules) and `tests/e2e` (real browsers).
- **Photo Studio** lives in `tools/photo-studio` and is never published as part of the site.
