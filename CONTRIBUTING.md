# Contributing

## The short version

Open a **[new issue using the "Add a citation" form](../../issues/new/choose)**. That is the whole process for most people. Everything below is for reviewers and for contributors who prefer to edit the file directly.

## The fields

Twenty-three. The first eight are what a contributor supplies. The rest are derived from the citation or filled in by a reviewer.

| Field | Filled by | Controlled | Notes |
|---|---|---|---|
| `id` | Auto | No | Sequential. Never reused, even after a deletion |
| `headline_phrase` | Contributor | No | One sentence, in your own words, saying what this paper found. Not the title and not the abstract. Displayed first and displayed bold |
| `nutrient` | Contributor | Yes | One per row in the data. On the submission form you may tick several and a reviewer splits them, so you submit once |
| `topic` | Contributor | Yes | `neuropsychiatric`, `pain`, `absorption`, `drug-nutrient`, `prevalence`, `testing` |
| `claim` | Contributor | No | What the paper claims, stated flatly. The precise version of the headline phrase |
| `population` | Contributor | No | Age, sex, country, health status |
| `study_design` | Contributor | Yes | See below |
| `n` | Contributor | No | Sample size. Blank for a review |
| `direction` | Contributor | Yes | `supports`, `does-not-support`, `mixed`, `null-result`, `background` |
| `evidence_grade` | Reviewer | Yes | `strong`, `moderate`, `weak`, `mechanism-only`, `disputed` |
| `medication_interaction` | Contributor | No | The drug or class, where the paper concerns one |
| `year` | Derived | No | Checked against PubMed automatically |
| `journal` | Derived | No | |
| `citation` | Derived | No | Full reference, one style throughout |
| `pmid` | Derived | No | The stable handle. Fill this before anything else |
| `doi` | Derived | No | |
| `url` | Derived | No | Prefer a PubMed Central link where the paper is open access |
| `open_access` | Derived | Yes | `yes`, `no`. Matters because a contributor who cannot read a paper cannot check the row |
| `source_quality_flag` | Reviewer | Yes | `ok`, `industry-funded`, `predatory-journal`, `secondary-source`, `excluded` |
| `contributor` | Contributor | No | Name or initials |
| `date_added` | Auto | No | ISO format, 2026-09-19 |
| `review_status` | Reviewer | Yes | `unreviewed`, `verified`, `needs-work`, `rejected` |
| `notes` | Anyone | No | Disagreements go here, not in a comment thread that disappears |

**`study_design`**, strongest first: `systematic-review-meta-analysis`, `systematic-review`, `rct`, `non-randomized-trial`, `prospective-cohort`, `case-control`, `cross-sectional`, `case-series`, `case-report`, `narrative-review`, `guideline`, `survey-data`, `animal`, `in-vitro`.

**`evidence_grade`**, which does the most work:

- `strong`: replicated interventional evidence, or a deficiency syndrome not in dispute.
- `moderate`: consistent observational evidence with a defensible case for direction, or one good trial.
- `weak`: cross-sectional only, small, or confounded in a way the paper does not resolve.
- `mechanism-only`: a proposed pathway with no human outcome data. Much of the popular nutrient and mood literature lands here.
- `disputed`: good evidence exists on both sides.

## Three rules that keep it usable

**One paper, one row, per nutrient claim.** A review covering six nutrients becomes six rows sharing a PubMed ID. Sorting by nutrient is the main thing anyone will do, and a row marked "multiple" cannot be sorted. This is a rule about the data, not about the form: contributors tick every nutrient that applies and a reviewer creates the rows.

**Negative and null findings are collected on purpose.** The `direction` field exists so a reader can see that a question was asked and answered no. Leaving those out is the commonest way a reference collection becomes useless for deciding anything.

**Identifier before prose.** A row with no PubMed ID and no DOI cannot be checked by a second person, so the automatic check rejects it however good the headline phrase is.

## For reviewers

**Where the work arrives.** Two places, and they hold the same items. Each accepted submission stays open as its own issue, labeled `not yet read` and assigned to you. And one standing [Review queue](../../issues?q=is%3Aissue+is%3Aopen+label%3A%22review+queue%22) issue lists every unread entry in one table, rebuilt weekly and whenever the data changes.

An issue also labeled `flagged` means the automatic checks noticed something specific: a study design that disagrees with PubMed, an animal-only study, or a headline copied from the title. Those are worth looking at first.

**Closing the loop.** Run the **[Verify an entry](../../actions/workflows/verify.yml)** workflow from the Actions tab. Give it the entry number, the grade, the source flag, the precise claim, and the submitting issue number. It does the rest, including closing the issue. The queue issue closes itself once nothing is waiting.

Only collaborators see that workflow, because GitHub restricts the Run workflow button to people with write access.


Before marking a row `verified`:

1. Open the source and read at least the abstract, and the methods where the row makes a claim about a number.
2. Confirm the headline phrase matches what the paper says, not what it is commonly said to say.
3. Confirm any prevalence figure carries its biomarker, its cutoff and its data years. A figure without those three is not usable.
4. Check whether the number is **intake** or **measured status**. These are different things and conflating them is the most common error in this subject.
5. Set `evidence_grade` and `source_quality_flag`.

Decline with a reason in the thread. A silent rejection teaches the contributor nothing and they will make the same submission again.

## The reading view is generated

`docs/browse.md` is built from `data/citations.csv` by `scripts/build-browse.mjs`. Never edit it by hand. After changing the data, run the script. CI runs it with `--check` and fails if the two are out of step.

## What the automatic checks enforce

Schema and column order, required fields, controlled vocabularies, unique ids, no duplicate source and nutrient and topic combination, ISO dates, a PMID or DOI on every row, and a live lookup confirming the PubMed ID resolves to a real paper. A row marked `verified` must also carry an evidence grade and a quality flag. Separately, CI confirms the generated reading view matches the data.

The checks catch format and fabrication. They cannot tell whether a paper says what a row claims it says. That is what review is for.
