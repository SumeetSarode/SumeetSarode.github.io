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

## 2. Edit your content

Everything you'd want to change lives in one folder, **`content/`**, as plain text files. There is
one file per section, and each starts with a short guide that lists every field.

| To change…                                                                           | Edit this file                 |
| ------------------------------------------------------------------------------------ | ------------------------------ |
| Your name, title, email, links, the home-page headline and intro, "Signature work"   | `content/profile.yaml`         |
| Each page's title and intro line, home-page tile text, the closing "Let's talk" band | `content/pages.yaml`           |
| Jobs, bullet points, earlier roles, and the impact numbers                           | `content/experience.yaml`      |
| Capabilities: the stack's layers (top = today's focus) and the "Runs on" base        | `content/capabilities.yaml`    |
| Degrees                                                                              | `content/education.yaml`       |
| Certifications                                                                       | `content/certifications.yaml`  |
| Research papers                                                                      | `content/research.yaml`        |
| The short "Also on GitHub" list                                                      | `content/more-projects.yaml`   |
| A case study (see section 3)                                                         | `content/projects/<name>.yaml` |
| The résumé PDF (see section 4)                                                       | `content/resume/`              |
| The photo and its description for screen readers                                     | Photo Studio (section 1)       |

**How to edit a file**

1. Open it in any text editor.
2. To add something (a job, a certificate, a paper), **copy a whole existing entry**, paste it below,
   and change the words. Entries start with a dash (`-`).
3. Save. If Portfolio Preview is open (below), the page updates by itself a few seconds later.

**See your changes: Portfolio Preview**

You don't need a terminal for this either. **Double-click** `Portfolio Preview.app` (Mac) or
`Portfolio Preview.vbs` (Windows). Your browser opens with your site, built exactly as it will be
published, under a slim status bar.

- **Edit, save, look.** Every time you save a file in `content/`, change your résumé, or confirm a new
  photo in Photo Studio, the preview rebuilds and reloads by itself, staying on the page you were
  looking at.
- **Mistakes are explained, not fatal.** If a change breaks a rule, a red box names the file, the line,
  and what to fix, while the last version that worked stays on screen.
- **The status bar** also shows what happened to your résumé (with a link to open the PDF), and any
  problem the publish check would find. **Phone** and **Desktop** switch the preview's width.
- **Nothing is published.** It all happens on your computer, until you publish (section 7).
- Click **Quit** when you're done, or just close the tab: it stops by itself shortly after.

If your computer refuses to open it, the fixes are the same as for Photo Studio (section 1). In a
terminal, `npm run portfolio-preview` does the same and prints any problem. Logs are kept in
`~/Library/Logs/PortfolioPreview.log` (Mac) or `%TEMP%\PortfolioPreview.log` (Windows).

**Four things that trip people up**

- **Indentation matters.** Lines inside an entry line up under the first word after the dash. Use
  spaces, never the Tab key.
- **A colon followed by a space inside your text breaks the line**, as in `Note: this`. Write the text
  on the next line after `>-` (indented two more spaces), or put it in double quotes.
- **Dates are written as numbers:** a month is `2020-06`, a day is `2019-08-17`. Leave `end` out for
  something you're still doing, and the site shows "Present".
- **Links must start with `https://`.** Only add a certificate or paper link after opening it and
  checking that it shows the right thing. Never guess one.

**If you make a mistake, nothing breaks.** The site refuses to build and tells you the file, the line,
and what's wrong, for example:

```text
content/certifications.yaml needs fixing:
  - line 3, #1 › date: must be a month written like 2020-06
```

Fix that line and run it again. The old site stays up until a build passes.

Order doesn't matter in most files: the site sorts jobs, degrees, certificates and papers
newest-first by itself.

**Leaving things out**

Only your **name and email** in `profile.yaml` are required. Everything else is optional: if you have
no research papers, delete `research.yaml` (or leave it empty). That section's page, menu link and
home-page tile disappear, and the numbering closes up ("03 / Education" becomes the third section
there is). The Contact page always stays.

- Experience shows if you have jobs or capabilities. Projects shows if you have case studies or GitHub
  links. Education shows if you have degrees or certificates. Each page shows only the parts it has.
- `url` (where the site is published) is optional too. Without it, the site builds without a sitemap
  and without the link-preview tags that need a full address. Add it once you know the address.
- Your initials (the badge at the top left and the browser-tab icon) and the link-preview picture are
  made from your name and title when the site is built. There's nothing to update by hand.
- The photo isn't in `content/`. Change it in Photo Studio (section 1).

**House rules for the words** (the automatic checks enforce some of these):

- Only claim what you can prove. No numbers you haven't verified.
- Plain text for employer names. No logos.
- Never add a phone number or a work email address.
- Avoid filler like "passionate", "results-driven", "cutting-edge", and the verb "leverage".

## 3. Add a project

1. In `content/projects/`, copy an existing `.yaml` file and rename it (for example `my-new-project.yaml`).
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

The site offers a résumé PDF **without your phone number**. Put your résumé (Word or PDF; keep just
one) in `content/resume/`. The Portfolio Preview app rebuilds the PDF whenever that file changes and
shows what it did; without the app, run `npm run resume`.

- Your phone number is removed, then the finished PDF is checked again. If anything phone-like is
  left, or the file can't be checked (a scan, or a password-protected PDF), it isn't used, the site
  keeps the résumé it had, and you're told why.
- Your original is never changed, and git ignores everything in `content/resume/`, so it's never
  committed or published.
- Word files need **LibreOffice** (free) and give the cleanest result. PDFs work without it, but
  leave a small gap where the number was.
- The PDF's details (title and author) are set from your name; anything else Word stored in the file
  is removed.
- Emptying the folder takes the résumé off the site, along with its download buttons.

The result is `public/resume/resume.pdf` (visitors' downloads are still named after you). **Open it
and look at it** before publishing, since LibreOffice can draw fonts slightly differently from Word.

## 5. Check your changes before publishing

Look at your changes in Portfolio Preview (section 2). Then, before you publish, run the checks. GitHub runs them again, but it's faster to find problems here:

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
- **Your content** is plain text files in `content/`. Every file is checked against a set of rules when
  the site builds (`src/content-files/schemas.ts`, and `src/content.config.ts` for case studies), which
  is why mistakes produce clear messages instead of a broken page. The files in `src/data/` only load,
  check, and sort that content.
- **Design:** every color and size lives in `src/styles/tokens.css`. The light and dark themes share the
  same names with different values.
- **Tests:** `tests/unit` (fast checks of the logic and the content rules) and `tests/e2e` (real browsers).
- **Photo Studio** lives in `tools/photo-studio` and is never published as part of the site.
