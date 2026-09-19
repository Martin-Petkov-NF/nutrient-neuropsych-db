# The evidence standard this table is built to

19 September 2026. Written before the table, so the bar is set by the rules and not by what the research happened to find.

Two standards apply. One is the brief's, stated in the brief itself. The other is a general content standard for health writing. They agree almost everywhere. Where they differ, the stricter one governs, and the differences are named in the last section so nobody is surprised later.

## The four checks used

Two run mechanically and two need a person. Which one you are relying on decides how much the output is worth.

| Check | What it catches | Runs as |
|---|---|---|
| Fabrication scan | Any statistic with no citation and no visible placeholder. Blocks rather than warns | Mechanical |
| Identifier check | A claim of evidence with no PMID or DOI is flagged and never quotable. In this repository it runs in CI and also confirms the identifier resolves against the live PubMed record | Mechanical |
| Certainty grading | Claim strength that outruns evidence strength, treated as an error of fact rather than of tone. The evidence-grade column exists to make this visible per cell | Human review |
| Source verification | Every claim checked back against the primary source, producing a verdict per claim | Human review, assisted |

One rule makes the rest work. An unverified number is replaced by a visible placeholder rather than a plausible-looking figure, and nothing ships with a placeholder still in it. A gap stays visible instead of being filled.

A specific guard is worth naming, because this subject is exactly where it bites. Language models default to certain numbers when inventing examples. Any number that does not trace to a source is removed rather than sanity-checked, because a fabricated prevalence figure looks entirely reasonable and is caught by nothing except tracing it.

## What the brief demanded, and how it maps

The brief sets out its own bar. Most of it is already covered.

| Requirement | Covered by | Gap |
|---|---|---|
| Peer-reviewed primary literature, triangulated | §2.5 citation at point of claim | None |
| No YouTube, no supplement vendors, no pop-health sites | Source-type screen, applied in the research briefs | Not mechanical. Enforced by the brief and by review |
| Skepticism toward functional-psychiatry sources | Same | Same |
| Double-check Linus Pauling Institute | Same, with a rule that it may locate a primary source but never be cited as one | Same |
| Distinguish subclinical from clinical throughout | The table's structure. Separate columns, separate references | None |
| Be conservative in recommending tests | §2.2 certainty registers | None |
| Report when the evidence does not support a popular claim | §2.7, report the evidence and not the wish | None |

Two of its rules have no equivalent in general content standards, so they are added for this work.

**No neurotransmitter mechanism arguments.** It bans explanations that run through dopamine, serotonin, glutamate or GABA. A general content standard permits mechanism claims when they are labeled as mechanism, under the third certainty register. That rule is stricter and it wins here, because the audience is clinicians being taught to distrust exactly this reasoning. The practical effect is large. Strip the mechanism story from the popular case for magnesium, iron and B6 and what remains is thin, which is the point of the exercise.

**Prefer older pre-SSRI-era psychiatry literature.** Nothing in the organization's standard says this. That is right for a narrow reason. Descriptions of deficiency syndromes published before there was a drug to sell for depression are less likely to have been shaped by that market. It applies best to pellagra and Wernicke encephalopathy, where the older literature is also the better literature.

## The sources of record

Named here so that every prevalence figure in the table can be traced to one of them, and so that anything sourced elsewhere is visibly an exception needing a reason.

**Biochemical deficiency prevalence.** The CDC National Report on Biochemical Indicators of Diet and Nutrition. The 2026 edition was released on 24 June 2026 and covers NHANES biomarker data from 1999 through August 2023, across 131 indicators, stratified by dietary supplement use for the first time. It reports by age, sex, and race and Hispanic origin, which is what the brief asked for. Almost every figure circulating in the material behind this request predates it, several by more than a decade.

**Dietary intake, where intake is genuinely the point.** NHANES intake data directly, or a peer-reviewed analysis of it. Never through a secondary summary, for the reason set out in the third correction.

**Clinical claims.** Peer-reviewed journals, with the study design named in the cell.

**Reference information on nutrients.** The NIH Office of Dietary Supplements fact sheets, used to locate primary sources rather than cited as evidence themselves.

One consequence worth stating. Where the 2026 CDC report has a nutrient, its figure wins over anything older, and the table says which edition and which data years produced each number. A prevalence figure with no stated cutoff and no stated data years is not usable, whatever its provenance.

## Where the real risk sits

Not in drafting. In four specific failure modes, each of which produces a confident and wrong cell.

**Intake inadequacy read as deficiency.** The single largest trap in this subject. A figure like "roughly half of adults fall short of the recommended intake of magnesium" describes dietary intake below an estimated requirement. It is not a measured biochemical deficiency and it does not mean half the population is deficient. Several of the circulating numbers in the material that prompted this request are intake figures presented as deficiency figures. Every cell in the table labels which one it is, and where no biochemical prevalence exists, the cell says so.

**Biomarker change read as clinical consequence.** A drug lowering a serum level is a different claim from that drug causing symptoms. Most drug-and-nutrient-depletion lists in circulation never make the distinction. The risk-factor column states, for each drug, whether the consequence has been demonstrated or only inferred.

**Confounding by illness.** People who are unwell eat worse and have lower levels of many nutrients. Cross-sectional findings of low nutrient levels in psychiatric populations are largely uninformative about direction. The brief made this point herself about folate. §2.3 requires the direction problem to be named in the prose rather than parked in a footnote.

**Prevalence numbers that cite a cutoff nobody agrees on.** Vitamin D is the clearest case. Different thresholds produce prevalence figures that differ by a factor of several, and the two main bodies that set them disagree. The table reports the cutoff alongside the number, always, and reports the disagreement rather than resolving it.

## The verification sequence

1. Research pass, one agent per nutrient group, each briefed with the exclusions above and instructed to return "no reliable data found" rather than an estimate.
2. Assembly into the table, with the evidence grade set per cell.
3. Source-verification pass over the assembled table against primary sources, producing a verdict per claim.
4. Every unresolved cell converted to a bracketed placeholder rather than softened.
5. Human sign-off by a named reviewer with the standing to approve health claims. Not yet assigned, and this is the one step that cannot be automated or skipped.

Step 5 is the open item. `CONTENT_STANDARD` §9 ends with the line that governs it: gates propose, a person approves. Nothing here auto-publishes, and a table that goes into clinical teaching under this organization's name needs a person willing to put their name on it.
