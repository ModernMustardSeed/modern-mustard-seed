# Publishing build evidence

The existing `/work` and `/work/[slug]` routes remain the canonical proof collection. `/case-studies` already redirects there. No duplicate results collection was added.

`ContentMeta.evidence` and `components/CaseStudyEvidence.tsx` support a reusable build record alongside the existing MDX body, stack and live URL. Omitted fields are not rendered. The component never fills missing results with estimates.

| Field | Required evidence |
| --- | --- |
| `relationship` | Describe client work, founder-owned venture or another actual relationship accurately. |
| `location` | A real business/service location, supplied and cleared for publication. |
| `challenge` | The concrete customer problem. |
| `delivered` | What the shipped system actually does. |
| `results[]` | Each result needs `claim`, `source`, `period` and `method`; only sourced, dated results render. |
| `screenshots[]` | Each image needs `src`, descriptive `alt`, `width`, `height` and `caption`. Use real, approved screenshots and optimized assets. |
| `quote` | Exact approved `text`, correct `attribution`, and an affirmative `permission` flag. |

The existing Cross + Covenant record now identifies it as a founder-owned venture and describes its challenge and delivered functionality using the existing record. It does not present the venture as an independent customer endorsement.

Two unsourced historical outcomes were removed: Wild Daisy's “Down 70%” overhead claim and its conflicting time comparison, and VoiceStaff's 30-percent-to-100-percent answered-call claim. Their build descriptions remain. No new quantitative result was added.

Other historical portfolio numbers remain recorded claims, not independently validated outcomes of this audit. Sarah should prioritize the DEED AI commission comparison, PTG timing comparison, Luxe Design staging comparison, UGC pricing comparison, and Olive Shoot code-reuse percentage for evidence review before reusing them in sales material. Preserve a source and measurement period, or replace the claim with a description of delivered functionality.

When editing a published record, set its actual `dateModified`. Leave `date` as the original publication date. The page renders the author and both relevant dates and supplies Article metadata. Draft content returns 404 and stays outside the sitemap.

Sarah supplies client permission, approved screenshots, quotes and real commercial results. This release creates no implied approvals and no fabricated evidence.
