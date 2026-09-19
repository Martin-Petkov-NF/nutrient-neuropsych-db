# Nutrients and neuropsychiatric symptoms: an open citation database

A collection of primary literature on how nutrient status affects neuropsychiatric symptoms and pain, and on how medications affect nutrient status. Anyone may contribute. Every entry is checked before it is accepted.

## What makes this different from a reading list

**Every row carries an identifier that lets a second person check it.** A row with no PubMed ID and no DOI cannot be merged. This is enforced automatically, not by a person remembering.

**Findings that go the other way are collected on purpose.** Each row records whether the paper supports a claim, fails to support it, is mixed, or is a null result. A collection containing only supportive papers cannot be used to decide anything.

**Intake and deficiency are never conflated.** A population falling below a recommended intake is not a population with a measured deficiency. Most of the confusion in this subject comes from treating the two as one thing, so the schema keeps them apart.

## How to contribute, with no GitHub knowledge

Open a **[new issue using the "Add a citation" form](../../issues/new/choose)**. It is a web form with dropdowns. You do not need to install anything, learn git, or use a command line. A reviewer takes it from there.

If you are comfortable with git, edit `data/citations.csv` and open a pull request. The checks below run automatically.

## What happens to a submission

1. You submit the form.
2. Automatic checks run: the schema, the controlled vocabularies, duplicates, and whether the PubMed ID actually resolves to a real paper.
3. A reviewer reads the source and either accepts it, asks a question, or declines it with a reason.
4. Accepted rows are marked `verified` and given an evidence grade.

Nothing is accepted silently and nothing is rejected silently.

## The evidence behind the seed data

The database ships with the review that produced it. These are not background reading, they are the working papers, and every citation in them was checked against the PubMed record.

| Document | What it is |
|---|---|
| [docs/nutrient-table.md](docs/nutrient-table.md) | The main review. Per nutrient: subclinical and clinical prevalence with biomarker and cutoff, symptoms at each level, tests, risk factors, and an evidence grade per claim. Also the nutrients considered and excluded, with reasons |
| [docs/corrections.md](docs/corrections.md) | Thirteen widely circulated figures traced to their sources. Most do not survive. This is the most useful document here |
| [docs/drugs-and-absorption.md](docs/drugs-and-absorption.md) | Medications and nutrient status, separating three claims that usually get merged: the drug moves a biomarker, the drug causes deficiency, the deficiency causes symptoms |
| [docs/methods.md](docs/methods.md) | The evidence bar all of the above is built to, written before the research rather than after |
| [docs/references.md](docs/references.md) | Every source cited across the four documents, 108 of them, each identifier verified against the PubMed record |

Every PubMed identifier in these documents links to the record, and all 108 were checked to resolve. Three findings give the flavor. Frank folate deficiency has been under 1% of the US population since fortification, and the often-quoted 20% is insufficiency in women of childbearing age against a neural tube defect threshold. The widely cited list of "most common subclinical deficiencies" traces to a single paper authored from a supplement industry trade association, and it measures dietary intake rather than deficiency. The vitamin D figure everyone quotes was measured on a laboratory method the national survey abandoned in 2006.

## The evidence bar

Peer-reviewed journals, federal surveys, and government health agencies. Not accepted: video platforms, supplement sellers, commercial laboratories that sell the test in question, and pop-health sites. Reference sites such as the Linus Pauling Institute may be used to locate a primary source but are never cited as the source.

Where a paper's funder or author has a commercial interest in the result, the row says so in `source_quality_flag`. That is not a reason to exclude it. It is a reason to label it.

## Running the checks yourself

```bash
node scripts/validate.mjs data/citations.csv
```

Add `--offline` to skip the PubMed lookups. Node 20 or newer, no dependencies to install.

## The schema

Twenty-three fields, documented in the contributing guide. The three that do the most work:

- `headline_phrase`: one sentence in the contributor's own words, saying what the paper found. This is what a reader sees first.
- `direction`: whether the paper supports, does not support, or is neutral on the claim.
- `evidence_grade`: set by a reviewer, not by the contributor.

## License

Data is released under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Use it, redistribute it, build on it, with attribution. The validation script is MIT.

## Status

Newly created and seeded with three checked references. It is a working template
with real data in it, not a finished collection.

**Before inviting contributors, two things need doing.** Name a reviewer in
`.github/CODEOWNERS`, and turn on a branch protection rule on `main` requiring
one approving review. Without both, the approval step is decorative and this
becomes a spreadsheet with extra steps.

A review queue with nobody reading it fills up with unchecked rows and stops
being worth anything. That is the failure this repository is designed to
prevent, and it is the one thing the tooling cannot do on its own.

## Not medical advice

See [DISCLAIMER.md](DISCLAIMER.md).
