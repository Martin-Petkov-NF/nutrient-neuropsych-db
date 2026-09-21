# Nutrients and neuropsychiatric symptoms

An open, checked collection of the research on how nutrient deficiencies affect mood, memory, cognition and pain, and on how medications affect nutrient levels.

Two things live here. A **reference table** for clinicians, and a **citation database** that anyone can add to. Everything is traceable to a source, and every source has been checked to exist and to say what we claim it says.

You do not need to know anything about GitHub to use this or to contribute.

---

## Start here

### 📋 [The reference table](docs/nutrient-table.md)

**This is the main thing.** For each nutrient that can produce neuropsychiatric symptoms, it sets out how common the deficiency actually is, what symptoms are attributed to it, which tests detect it, what raises the risk, and how good the evidence is for each of those claims.

It covers vitamin B12, folate, vitamin D, iron, thiamine, vitamin B6, niacin, magnesium, zinc and omega-3. It also says which nutrients were considered and left out, and why, because a well-sourced exclusion saves as much time as an inclusion.

Every prevalence figure states the blood test it came from and the cutoff used, because those two things change the answer more than the population does.

### 🔎 [Browse the citations](docs/browse.md)

The citations themselves, grouped by nutrient, with a plain-English sentence on each saying what the paper found. This view wraps to fit a screen, so it reads on a phone.

To sort, filter or search instead, open [the data file](data/citations.csv). GitHub shows it as a sortable table with a search box. It is wide, because it carries every field.

### ✍️ [Add a citation, or tell us something is wrong](../../issues/new/choose)

A web form with dropdowns. Nothing to install, no coding, no command line. Pick the form that fits and someone takes it from there.

---

## How to contribute

Three forms, and you cannot pick the wrong one.

| Form | Use it when |
|---|---|
| **[Add a citation](../../issues/new?template=add-citation.yml)** | You have found a paper that belongs here |
| **[Suggest a correction](../../issues/new?template=suggest-a-correction.yml)** | Something already here looks wrong, out of date, or overstated |
| **[Ask a question](../../issues/new?template=ask-a-question.yml)** | Anything else, including "which form do I want?" |

**Corrections are the most valuable thing you can send.** Most of what is here exists because someone traced a widely repeated figure back to its source and found it did not say what everyone thought. If you think we have done the same thing, please say so. You do not need to be certain.

### What happens after you submit

1. You fill in the form. That is your whole job.
2. **Within about a minute, automatic checks run and reply to you.** They confirm the paper exists, that it has not been retracted, that it is not already here, and that the details are right. The details are taken from the PubMed record rather than from what you typed, so you cannot get them wrong.
3. **If everything passes, the entry is added immediately** and marked *not yet read*.
4. Your issue stays open and is assigned to a reviewer. They read the paper, grade the evidence, mark it verified, and close the issue.

If a check fails you get told exactly what is wrong, in the issue, straight away. Edit the issue and the checks run again. Nothing sits in a queue waiting for someone to tell you there was a typo.

**What "not yet read" means.** The machine has confirmed the paper is real and correctly described in the mechanical sense. It has not read the paper, so it cannot know whether your one-sentence summary matches what the paper found. That is the one judgement a person still makes, and it is the whole reason this collection is worth anything.

---

## The documents

The table did not appear from nowhere. These are the working papers behind it, and every citation in them links to the record it came from.

| Document | What it is, and why you might open it |
|---|---|
| **[The reference table](docs/nutrient-table.md)** | The main review, nutrient by nutrient. Start here if you want the answer to "does this deficiency cause psychiatric symptoms, and how would I know?" |
| **[Corrections](docs/corrections.md)** | Thirteen widely circulated figures traced back to their sources. Most do not survive. **If you read only one thing here, read this one.** |
| **[Medications and absorption](docs/drugs-and-absorption.md)** | Which drugs really affect nutrient levels, and which are folklore. Covers acid blockers, metformin, antibiotics, GLP-1 drugs, diuretics, low stomach acid, and whether vitamin patches work |
| **[Methods](docs/methods.md)** | The standard of proof everything above was held to, written before the research rather than after it |
| **[References](docs/references.md)** | Every source cited anywhere here, with a link to each record |
| **[Browse](docs/browse.md)** | The citation entries as a readable list, grouped by nutrient. Generated from the data, so it is never out of step with it |

### Three findings, to show what this is for

**The folate figure is wrong in a way that matters.** The often-quoted "20% of US adults" is women aged 12 to 49, measured against a threshold for birth-defect risk that has no established connection to mental health. Actual folate deficiency has been under 1% of the population since fortification.

**The standard list of "most common deficiencies" traces to the supplement industry.** The magnesium, vitamin E, zinc and copper figures all come from one paper whose lead author's printed affiliation is the industry's trade association, and it measures what people eat rather than what is in their blood.

**The vitamin D figure everyone quotes is a laboratory artifact.** The familiar 41.6% was measured using a method the national survey abandoned in 2006. On current methods it is about 22%.

---

## Three rules that make this different from a reading list

**Every entry can be checked by someone else.** An entry with no PubMed ID and no DOI cannot be added. This is enforced automatically rather than by anyone remembering.

**Studies that found nothing are collected on purpose.** Each entry records whether the paper supports a claim, fails to support it, is mixed, or found no effect. A collection containing only supportive papers cannot be used to decide anything.

**How much people eat and what is in their blood are never treated as the same thing.** A population eating less than a recommended amount is not a population with a measured deficiency. Most of the confusion in this whole subject comes from merging those two ideas, so the database keeps them in separate fields.

## What counts as a source

Peer-reviewed journals, national health surveys, and government health agencies.

Not accepted: video platforms, supplement sellers, laboratories that sell the test being discussed, and general wellness sites. Summary sites can be used to find a primary paper but are never cited as the source.

Where a study's funder or author has a commercial interest in the result, the entry says so. That is not a reason to exclude it. It is a reason to label it.

## This is not medical advice

It is a bibliography. It reports what published research says. It does not tell anyone what to take, what to test for, or what to do about a result. See [DISCLAIMER.md](DISCLAIMER.md).

## Using this elsewhere

The data is released under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). You may reproduce it, adapt it and build on it, including in a course or a published guide, as long as you credit it. You do not need to ask.

Two requests that the license does not require. Keep the evidence-grade column if you reproduce entries, because it carries the honesty and it is the first thing that gets cut for space. And if you change any content, describe it as adapted rather than reproduced.

The validation script is MIT licensed.

---

## For maintainers

Everything below this line is for whoever is running the repository. Contributors can stop reading here.

### Running the checks locally

```bash
node scripts/validate.mjs data/citations.csv
```

```bash
node scripts/build-browse.mjs
```

Add `--offline` to the first one to skip the PubMed lookups. Needs Node 20 or newer, no dependencies to install.

The second regenerates the reading view from the data. Run it after any change to the data, or CI will fail with `--check`. Never edit `docs/browse.md` by hand.

The same script runs automatically on every proposed change, and it rejects an entry that has no identifier, uses a value outside the allowed list, duplicates an existing source, or carries a PubMed ID that does not resolve against the live record.

### The fields

Twenty-three, documented in [CONTRIBUTING.md](CONTRIBUTING.md). The three that do the most work:

- `headline_phrase`, one sentence in the contributor's own words saying what the paper found. It is the first thing a reader sees.
- `direction`, whether the paper supports, does not support, or is neutral on the claim.
- `evidence_grade`, set by a reviewer rather than by the contributor.

### Automatic intake

`scripts/intake.mjs` turns a submitted citation issue into rows. It rejects a submission that has no identifier, an identifier that does not resolve, **a retracted paper**, a duplicate, a value outside the vocabulary, or a publication type that is commentary rather than evidence. It flags, without rejecting, a study design that disagrees with PubMed's classification, an animal-only study, and a headline that is just the paper title copied.

Everything it accepts lands as `unreviewed`. It never sets an evidence grade, because that needs someone to read the paper.

Test it against a saved issue body:

```bash
node scripts/intake.mjs --body-file issue.md --dry-run
```

**To switch intake from opening a pull request to committing directly**, add a repository secret named `INTAKE_TOKEN` holding a personal access token with `repo` scope, belonging to an account with admin on this repository. The workflow detects it and changes mode on its own. Nothing else needs changing.

Settings, Secrets and variables, Actions, New repository secret. Name it `INTAKE_TOKEN`.

Without that secret the workflow still runs every check and opens a ready-to-merge pull request instead, which is one click. GitHub does not allow the Actions bot to bypass branch protection on a personal repository, only in an organization, so a token is the only route to a genuine auto-merge here.

### The review queue

Accepted entries land as `unreviewed`, and two things make sure someone actually reads them.

The submitting issue is **not closed**. It is labeled `not yet read`, assigned to whoever is named in `CODEOWNERS`, and stays open as the work item. Assignment is what sends the notification. In direct-commit mode there is no pull request, so `CODEOWNERS` never fires on its own and this assignment is the only signal a reviewer gets.

A second workflow keeps one standing **[Review queue](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22review+queue%22)** issue listing every unread entry. It runs weekly, on any change to the data, and on demand. It opens the issue when work arrives, updates it in place, and closes it when the queue empties.

```bash
node scripts/review-queue.mjs            # the list
node scripts/review-queue.mjs --count    # just the number
```

**To review an entry, comment on its own issue.** Each accepted submission is assigned to you and carries a ready-to-edit block at the bottom of the bot's reply. Edit the three values and post it:

```
/verify
grade: weak
flag: ok
claim: Meta-analysis of 17 studies, zinc 1.85 umol/L lower in depressed subjects, heterogeneity 88%.
```

**You never type an entry number.** It is read from a marker the intake bot left in the issue, which removes that whole class of mistake. The workflow writes the row, rebuilds the reading view, runs the validator, comments with what it did, and closes the issue. If the grade or flag is not a valid value, or the claim is too short, it changes nothing and tells you why.

Only collaborators can do this. Anyone can comment on a public issue, so the workflow checks permission and declines politely, pointing the person at the correction form instead.

For a seed entry with no submitting issue, use the **[Verify an entry](../../actions/workflows/verify.yml)** workflow in the Actions tab, which takes the entry number by hand.

That workflow is deliberately not an issue form. GitHub shows the Run workflow button only to people with write access, so it is genuinely restricted to collaborators. An issue template cannot be hidden, since anyone who can see a public repository can see every template in it.

To do it by hand instead, set `claim`, `evidence_grade` and `source_quality_flag`, change `review_status` to `verified`, and run `node scripts/build-browse.mjs`. The validator refuses a verified row missing any of those three fields, so the standard is enforced rather than remembered.

### Review settings

`main` is protected. Changes need a proposed change with one approving review from the code owner, and the automatic check has to pass. Force pushes and deletions are blocked.

Administrators are currently exempt, deliberately. GitHub does not let anyone approve their own proposed change, so with a single reviewer an enforced rule would lock the repository. **Turn the administrator exemption off as soon as a second reviewer exists.**

### Status

Seeded with checked references and the full evidence review. It is a working collection, not a finished one.

The thing that decides whether this is worth anything in two years is not the tooling. It is whether someone is reading the review queue. A queue nobody reads fills up with unchecked entries, and then this is a spreadsheet with extra steps.
