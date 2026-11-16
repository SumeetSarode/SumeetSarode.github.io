# LinkedIn import

Put your LinkedIn data download here (the `.zip` exactly as LinkedIn sent it), then open **Portfolio
Preview**. A "LinkedIn import" box shows what could be added to your site. Nothing is saved until you
tick items and click **Add selected**.

**How to get the download:** on LinkedIn, open Settings → Data privacy → **Get a copy of your data**
and choose **"Download larger data archive"** (the first option). LinkedIn emails you when it's ready,
which can take up to a day. The smaller "Profile" option only has your headline, address and birth
date, so it can't be used for jobs, degrees or certificates.

- **Only five files are read:** Profile (the headline only), Positions, Education, Certifications and
  Publications. Everything else in a download (contacts, phone numbers, address, birth date, messages)
  is never opened.
- **It only adds.** Anything you've already written is never changed or removed: differences show up
  as notes for you to look at.
- **Before each save, a backup** of the file is kept in `content/linkedin/backup/`.
- **Everything in this folder stays on your computer:** git ignores it. The larger archive holds a lot
  of personal data, so delete the download when you're done with it.
- Things LinkedIn can't fill in (research papers need a summary written by you, certificate links need
  checking) are listed as notes, not added.
