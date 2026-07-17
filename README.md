# Manticore Similarity Configuration Prototype

This repository contains the interactive React prototype for the **Manticore Attribute-Based Similarity Engine Configurator**, tailored for Enterprise Product Lifecycle Management (PLM) systems. 

It provides administrators with a highly granular, rules-driven workbench to configure, test, and debug physical parts deduplication rules without coding or database re-indexing.

---

## Key Functional Modules

### 1. Attribute-Level Similarity Rules (`FieldSimilarityView`)
- **Granular Algorithm Rules**: Configures match algorithms for individual fields:
  - **EXACT**: Exact matching with auto unit alignment.
  - **NUMERIC_TOLERANCE**: Relative/absolute margins (BOTH, HIGHER, LOWER) supporting units.
  - **NUMERIC_DECAY**: Continuous decay calculations based on linear physical distance.
  - **NATIVE_HIERARCHY**: Taxonomy path similarity scoring for PLM classification trees.
  - **TEXT_SIMILARITY**: Standard, non-AI string-overlap ratio computation.
- **Dynamic Context Inputs**: Provides custom input type components (Date pickers, HTML5 numbers, read-only unit alignment panels) and robust bounds validations.
- **Instant Simulator**: A side-by-side interactive playground rendering real-time score feedback as you adjust rule parameters.

### 2. Standardization & Synonym Mapping Rules
- **Text Standardization**: Standardizes variations in material names and classifications (e.g., standardizing `SUS304` and `304 Steel` to unified master keys).
- **Keyword Synonyms**: Maps synonym tokens into equivalence classes to bridge descriptive gaps in legacy records.

### 3. Category Diversion & Early Filtering
- **Category Control Policies**: Globally toggles calculation engines or adjusts high/medium score thresholds per category.
- **Hard Filters**: Establishes fail-fast query parameters (e.g., lifecycle state checks) to eliminate non-qualifying candidates immediately.

### 4. Trial Query Preview Workstation
- **Comprehensive Sandbox**: Executes virtual query testcases against underlying mock datasets using rule snapshots from different namespaces (**Live**, **Saved Draft**, **Editing Draft**).
- **Deduplication Diagnostic Log**: Breaks down the aggregated score into separate attribute match logs, disclosing precise formula outputs, intermediate unit transformations, and filter reasons.
- **Side-by-Side Comparator**: Interactively triggers visual drawers comparing source objects against candidate items with colored difference highlighting.

---

## Responsive & Aesthetic Standard
- **Layout Consistency**: Formatted for 1440px desktop workstations to present dense columns without horizontal page overflow. Fully supports responsive grid adapters for smaller mobile screens down to 820px.
- **Clean Styling**: Styled entirely with **Tailwind CSS** utility classes and custom semantic color indicators (emerald green for matching, rose-red for filtering, slate-gray for waiting).
- **Icon Library**: Built exclusively with **Lucide React** vector glyphs.
