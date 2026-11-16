# LinkedIn import

Put your LinkedIn data download here (the `.zip` exactly as LinkedIn sent it), then open **Portfolio
Preview**. A "LinkedIn import" box shows what could be added to your site. Nothing is saved until you
tick items and click **Add selected**.

**How to get the download:** on LinkedIn, open Settings → Data privacy → **Get a copy of your data**.
Choose **"Want something in particular?"** and tick only **Profile**. LinkedIn emails you when it's
ready (usually within minutes, sometimes up to a day).

- **Only five files are read:** Profile (the headline only), Positions, Education, Certifications and
  Publications. Everything else in a download (contacts, phone numbers, address, birth date, messages)
  is never opened.
- **It only adds.** Anything you've already written is never changed or removed: differences show up
  as notes for you to look at.
- **Before each save, a backup** of the file is kept in `content/linkedin/backup/`.
- **Everything in this folder stays on your computer:** git ignores it. Delete the download when you're
  done with it.
- Things LinkedIn can't fill in (research papers need a summary written by you, certificate links need
  checking) are listed as notes, not added.
