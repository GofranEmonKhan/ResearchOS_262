import 'dotenv/config';
import { supabaseAdmin } from '../supabase.js';

async function seedGenomicsManuscript() {
  console.log('🧬 Starting Genomics Seed Manuscript script...');

  // 1. Find the project "Neural Architecture Search for High-Throughput Genomics"
  const { data: projects, error: projError } = await supabaseAdmin
    .from('projects')
    .select('id, title, owner_id')
    .ilike('title', '%Neural Architecture Search for High-Throughput Genomics%');

  if (projError) {
    console.error('Error fetching projects:', projError);
    process.exit(1);
  }

  let project = projects?.[0];

  if (!project) {
    // Check if any project with "Genomics" exists
    const { data: altProjects } = await supabaseAdmin
      .from('projects')
      .select('id, title, owner_id')
      .ilike('title', '%Genomics%');

    if (altProjects && altProjects.length > 0) {
      project = altProjects[0];
      console.log(`Found alternative genomics project: "${project.title}" (${project.id})`);
    } else {
      // Find active user to create the project
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role')
        .eq('role', 'Researcher')
        .limit(1);

      const ownerId = users?.[0]?.id;
      if (!ownerId) {
        console.error('No researcher user found in profiles.');
        process.exit(1);
      }

      console.log(`Creating project "Neural Architecture Search for High-Throughput Genomics" under owner ${ownerId}...`);
      const { data: newProj, error: createProjError } = await supabaseAdmin
        .from('projects')
        .insert({
          title: 'Neural Architecture Search for High-Throughput Genomics',
          description: 'Automated continuous differentiable architecture search for cellular variant impact prediction and chromatin interaction graphs.',
          owner_id: ownerId,
          visibility: 'Workspace',
          status: 'Active'
        })
        .select()
        .single();

      if (createProjError || !newProj) {
        console.error('Failed to create project:', createProjError);
        process.exit(1);
      }
      project = newProj;
    }
  }

  console.log(`Using Project: "${project.title}" (${project.id})`);
  const ownerId = project.owner_id;

  // Find supervisor if available
  const { data: supervisors } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'Supervisor')
    .limit(1);
  const supervisorId = supervisors?.[0]?.id || ownerId;

  // 2. Create File Assets and Papers if they don't exist
  const seedPapersData = [
    {
      title: 'DARTS: Differentiable Architecture Search',
      authors: ['Hanxiao Liu', 'Karen Simonyan', 'Yiming Yang'],
      year: 2018,
      doi: '10.48550/arXiv.1806.09055',
      venue: 'ICLR 2019',
      citationKey: '[@Liu2018DARTS]',
      inTextLabel: 'Liu et al., 2018',
      contextNote: 'Foundation for continuous relaxation in neural architecture search and bilevel gradient optimization.',
      sidebar: {
        research_gap: 'Traditional discrete search methods (RL and evolutionary algorithms) require thousands of GPU days to evaluate genomic sequence representations.',
        methodology: 'Continuous relaxation of architecture representation, allowing gradient descent optimization via bilevel optimization: min_alpha L_val(w*(alpha), alpha) s.t. w*(alpha) = argmin_w L_train(w, alpha).',
        results: 'Achieves competitive error rates on CIFAR-10 in 4 GPU days, orders of magnitude faster than standard evolutionary search.',
        limitation: 'Performance collapse due to accumulation of parameter-free skip-connections during continuous relaxation training.',
        future_work: 'Application to 1D biological sequence motifs and chromatin accessibility graphs.',
        dataset_used: 'CIFAR-10, ImageNet, PTB',
      }
    },
    {
      title: 'Effective gene expression prediction from DNA sequence with transformers (Enformer)',
      authors: ['Žiga Avsec', 'Vikram Agarwal', 'Daniel Visentin', 'Joseph R. Ledsam'],
      year: 2021,
      doi: '10.1038/s41592-021-01252-x',
      venue: 'Nature Methods',
      citationKey: '[@Avsec2021Enformer]',
      inTextLabel: 'Avsec et al., 2021',
      contextNote: 'Long-range transformer attention modeling for enhancer-promoter interactions up to 100kb.',
      sidebar: {
        research_gap: 'Previous CNNs (e.g. DeepSEA, Basenji) failed to capture long-range enhancer-promoter regulatory interactions beyond 20-40 kilobases.',
        methodology: 'Combined convolutional blocks with multi-head self-attention transformer layers operating on up to 100 kilobase sequence contexts.',
        results: 'Substantially improves gene expression prediction accuracy and chromatin track correlation across 5,313 human and 1,643 mouse targets.',
        limitation: 'Quadratic memory scaling with sequence length limits full-genome promoter-enhancer graph exploration.',
        future_work: 'Neural architecture search to discover linear-complexity sequence attention mechanisms for mammalian variant effect prediction.',
        dataset_used: 'ENCODE and Roadmap Epigenomics ChIP-seq / CAGE datasets',
      }
    },
    {
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
      year: 2017,
      doi: '10.48550/arXiv.1706.03762',
      venue: 'NeurIPS 2017',
      citationKey: '[@Vaswani2017Attention]',
      inTextLabel: 'Vaswani et al., 2017',
      contextNote: 'Canonical multi-head self-attention formulation utilized in biological sequence transformers.',
      sidebar: {
        research_gap: 'Recurrent models prohibit parallelized training over long temporal sequence contexts.',
        methodology: 'Scaled dot-product attention and multi-head self-attention mechanisms without recurrence or convolution.',
        results: 'State-of-the-art BLEU score on WMT 2014 translation while training in a fraction of previous recurrent network time.',
        limitation: 'Quadratic sequence length overhead O(N^2) in vanilla attention.',
        future_work: 'Sparse and linear attention variants for biological context windows.',
        dataset_used: 'WMT 2014 English-to-German, English-to-French',
      }
    }
  ];

  const seededPaperMap = new Map<string, string>(); // citationKey -> paper_id

  for (const pData of seedPapersData) {
    // Check if paper already exists
    const { data: existingPapers } = await supabaseAdmin
      .from('papers')
      .select('id, title')
      .eq('title', pData.title)
      .limit(1);

    let paperId: string;

    if (existingPapers && existingPapers.length > 0) {
      paperId = existingPapers[0].id;
      console.log(`✓ Paper already exists: "${pData.title}" (${paperId})`);
    } else {
      // Create dummy file asset
      const { data: fileAsset, error: fileAssetError } = await supabaseAdmin
        .from('file_assets')
        .insert({
          owner_id: ownerId,
          storage_path: `${ownerId}/${encodeURIComponent(pData.title.slice(0, 30))}.pdf`,
          file_name: `${pData.title.slice(0, 30)}.pdf`,
          mime_type: 'application/pdf',
          size_bytes: 1420500
        })
        .select()
        .single();

      if (fileAssetError || !fileAsset) {
        console.error(`Failed to create file_asset for ${pData.title}:`, fileAssetError);
        continue;
      }

      // Create paper
      const { data: newPaper, error: paperError } = await supabaseAdmin
        .from('papers')
        .insert({
          uploader_id: ownerId,
          project_id: project.id,
          title: pData.title,
          authors: pData.authors,
          year: pData.year,
          doi: pData.doi,
          venue: pData.venue,
          file_asset_id: fileAsset.id,
          reading_status: 'DeeplyAnalysed',
          metadata_source: 'user',
          metadata_confidence: 0.98
        })
        .select()
        .single();

      if (paperError || !newPaper) {
        console.error(`Failed to create paper for ${pData.title}:`, paperError);
        continue;
      }

      paperId = newPaper.id;
      console.log(`✓ Created Paper: "${pData.title}" (${paperId})`);

      // Insert sidebar fields
      await supabaseAdmin
        .from('paper_sidebar_fields')
        .upsert({
          paper_id: paperId,
          research_gap: pData.sidebar.research_gap,
          methodology: pData.sidebar.methodology,
          results: pData.sidebar.results,
          limitation: pData.sidebar.limitation,
          future_work: pData.sidebar.future_work,
          dataset_used: pData.sidebar.dataset_used,
          personal_notes: 'Crucial reference for the GenoDARTS architecture search search-space definition.'
        });
    }

    seededPaperMap.set(pData.citationKey, paperId);
  }

  // 3. Create or Update Manuscript
  const manuscriptTitle = 'Differentiable Neural Architecture Search for High-Throughput Variant Impact Prediction';
  const { data: existingManuscripts } = await supabaseAdmin
    .from('manuscripts')
    .select('id, title')
    .eq('project_id', project.id)
    .eq('title', manuscriptTitle)
    .limit(1);

  let manuscriptId: string;

  if (existingManuscripts && existingManuscripts.length > 0) {
    manuscriptId = existingManuscripts[0].id;
    console.log(`✓ Seed Manuscript already exists (${manuscriptId}), updating contents...`);
  } else {
    const { data: newManuscript, error: msError } = await supabaseAdmin
      .from('manuscripts')
      .insert({
        project_id: project.id,
        title: manuscriptTitle,
        abstract: 'Accurately predicting the functional regulatory impact of non-coding genetic variants remains a foundational challenge in computational genomics. While deep convolutional neural networks and transformer backbones such as Enformer [@Avsec2021Enformer] have substantially expanded receptive fields, hand-crafted architectures are inherently biased and computationally prohibitive for whole-genome saturation mutagenesis. Here, we present GenoDARTS, a continuous-relaxation differentiable neural architecture search (NAS) framework [@Liu2018DARTS] specifically tailored for multi-scale genomic sequence representations. By formulating cell-specific motif discovery and long-range promoter-enhancer interactions as a bilevel optimization problem with self-attention routing [@Vaswani2017Attention], GenoDARTS discovers Pareto-optimal topologies that achieve state-of-the-art Spearman rank correlation (r = 0.842) on CAGI6 saturation mutagenesis benchmark datasets while reducing training GPU hours by 78%. Our findings provide a rigorous computational methodology for automated architecture synthesis in functional genomics.',
        target_venue: 'Nature Machine Intelligence',
        status: 'UnderInternalReview',
        created_by: ownerId,
        supervisor_id: supervisorId
      })
      .select()
      .single();

    if (msError || !newManuscript) {
      console.error('Failed to create manuscript:', msError);
      process.exit(1);
    }
    manuscriptId = newManuscript.id;
    console.log(`✓ Created Manuscript: "${manuscriptTitle}" (${manuscriptId})`);

    // Assign author
    await supabaseAdmin
      .from('manuscript_authors')
      .upsert({
        manuscript_id: manuscriptId,
        user_id: ownerId,
        author_order: 1,
        affiliation: 'Computational Biology & AI Laboratory',
        is_corresponding: true
      });
  }

  // 4. Create or Update Sections (IMRAD structure)
  const sectionsData = [
    {
      title: 'Abstract',
      section_type: 'Abstract',
      order_index: 0,
      content_markdown: `Accurately predicting the functional regulatory impact of non-coding genetic variants remains a foundational challenge in computational genomics. While deep convolutional neural networks and transformer backbones such as Enformer [@Avsec2021Enformer] have substantially expanded receptive fields, hand-crafted architectures are inherently biased and computationally prohibitive for whole-genome saturation mutagenesis.

Here, we present **GenoDARTS**, a continuous-relaxation differentiable neural architecture search (NAS) framework [@Liu2018DARTS] specifically tailored for multi-scale genomic sequence representations. By formulating cell-specific motif discovery and long-range promoter-enhancer interactions as a bilevel optimization problem with self-attention routing [@Vaswani2017Attention], GenoDARTS discovers Pareto-optimal topologies that achieve state-of-the-art Spearman rank correlation ($r = 0.842$) on CAGI6 saturation mutagenesis benchmark datasets while reducing training GPU hours by 78%. Our findings provide a rigorous computational methodology for automated architecture synthesis in functional genomics.`
    },
    {
      title: '1. Introduction',
      section_type: 'Introduction',
      order_index: 1,
      content_markdown: `The vast majority of disease-associated variants identified by genome-wide association studies (GWAS) reside within non-coding regulatory sequences, confounding straightforward mechanistic interpretation. Accurately deciphering how single-nucleotide polymorphisms (SNPs) alter transcriptional factor (TF) binding affinity, chromatin accessibility, and downstream target gene expression represents a central problem in modern precision medicine.

### 1.1 Limitations of Handcrafted Deep Architectures
Over the past decade, deep learning models have emerged as the primary tool for sequence-to-function mapping. Seminal convolutional networks demonstrated the viability of scanning sequence motifs using parallel filter banks. More recently, transformer-based architectures such as Enformer [@Avsec2021Enformer] demonstrated that integrating multi-head self-attention mechanisms [@Vaswani2017Attention] enables the capture of long-range regulatory interactions up to 100 kb.

However, existing genomic models suffer from two primary shortcomings:
1. **Manual Architectural Heuristics:** Current architectures rely heavily on human trial-and-error, often adopting standard computer vision or natural language topologies without formal verification that such inductive biases align with the biophysical constraints of chromatin folding.
2. **Computational Inefficiency:** Evaluating long sequence contexts with dense attention scales quadratically ($\mathcal{O}(N^2)$), rendering saturation mutagenesis experiments and evolutionary scans computationally prohibitive for broad lab adoption.

### 1.2 Our Contribution: GenoDARTS
To overcome these limitations, we introduce **GenoDARTS**, which brings continuous differentiable neural architecture search [@Liu2018DARTS] directly to biological sequence models. Rather than navigating a discrete combinatorial search space via expensive reinforcement learning or evolutionary algorithms, our method relaxes the architectural choice into continuous softmax weights over directed acyclic graph (DAG) operations, permitting joint end-to-end optimization of both model parameters and architectural topologies via gradient descent.`
    },
    {
      title: '2. Methodology & Mathematical Formulation',
      section_type: 'Methodology',
      order_index: 2,
      content_markdown: `### 2.1 Continuous Relaxation of Genomic Candidate Operations
Following the continuous relaxation framework of DARTS [@Liu2018DARTS], we define the search space over a directed acyclic graph $\\mathcal{G} = (\\mathcal{V}, \\mathcal{E})$ comprising $N$ ordered nodes. Each intermediate node $x^{(j)}$ represents a latent genomic representation, and each directed edge $(i, j)$ represents an information flow modulated by candidate operations $\\mathcal{O}$.

To make the categorical choice of operation continuously differentiable, we compute a softmax probability distribution over all candidate operations $o \\in \\mathcal{O}$:

$$\\bar{o}^{(i,j)}(x) = \\sum_{o \\in \\mathcal{O}} \\frac{\\exp(\\alpha_o^{(i,j)})}{\\sum_{o' \\in \\mathcal{O}} \\exp(\\alpha_{o'}^{(i,j)})} o(x)$$

where $\\alpha^{(i,j)}$ is a continuous vector of dimension $|\\mathcal{O}|$ parametrizing the architectural preference on edge $(i, j)$.

### 2.2 Bilevel Optimization Objective
The learning task is formulated as a bilevel optimization problem:

$$\\min_{\\alpha} \\mathcal{L}_{val}(w^*(\\alpha), \\alpha) \\quad \\text{subject to} \\quad w^*(\\alpha) = \\arg\\min_w \\mathcal{L}_{train}(w, \\alpha)$$

Here, $\\mathcal{L}_{train}$ and $\\mathcal{L}_{val}$ denote the cross-entropy and Poisson negative log-likelihood losses evaluated over the training and validation genomic partitions respectively. Following [@Liu2018DARTS], we approximate the architectural gradient $\\nabla_\\alpha \\mathcal{L}_{val}$ using a virtual unrolled one-step update:

$$\\nabla_\\alpha \\mathcal{L}_{val}(w^*(\\alpha), \\alpha) \\approx \\nabla_\\alpha \\mathcal{L}_{val}(w', \\alpha) - \\xi \\nabla^2_{\\alpha, w} \\mathcal{L}_{train}(w, \\alpha) \\nabla_{w'} \\mathcal{L}_{val}(w', \\alpha)$$

where $w' = w - \\xi \\nabla_w \\mathcal{L}_{train}(w, \\alpha)$ is the virtual model weight following one gradient step.

### 2.3 Candidate Operation Space for Genomic Motifs
Our candidate operator dictionary $\\mathcal{O}$ includes:
- **Dilated 1D Convolutions:** Kernels $k \\in \\{5, 9, 15\\}$ with dilation rates $d \\in \\{1, 2, 4\\}$ for multi-scale motif recognition.
- **Linear-Complexity Self-Attention:** Formulated according to [@Vaswani2017Attention] with linearized kernel projections for long-range promoter-enhancer distance scaling.
- **Residual Gated Skip Connections:** Preserving low-level motif co-occurrence signals.`
    },
    {
      title: '3. Experiments and Benchmark Results',
      section_type: 'Results',
      order_index: 3,
      content_markdown: `### 3.1 CAGI6 Saturation Mutagenesis Benchmarks
We evaluated the discovered GenoDARTS topologies against baseline models on the Critical Assessment of Genome Interpretation (CAGI6) saturation mutagenesis dataset. Models were tasked with predicting experimental log-fold changes in transcriptional output induced by single-nucleotide alterations across 14 disease-relevant promoter and enhancer regions.

| Architecture | Search Cost (GPU-hrs) | Params (M) | Spearman Rank ($r$) | Pearson ($R$) |
| :--- | :--- | :--- | :--- | :--- |
| **DeepSEA (Baseline CNN)** | — | 52.4 | 0.612 | 0.589 |
| **Enformer [@Avsec2021Enformer]** | — | 240.1 | 0.814 | 0.801 |
| **DARTS Standard [@Liu2018DARTS]** | 96.0 | 38.6 | 0.748 | 0.732 |
| **GenoDARTS (Ours)** | **21.5** | **44.2** | **0.842** | **0.829** |

### 3.2 Computational Scaling and Efficiency
As highlighted in the table above, GenoDARTS achieves higher variant effect concordance ($r = 0.842$) compared to the 240-million parameter Enformer backbone [@Avsec2021Enformer], while requiring **78% fewer training GPU hours** to converge.`
    },
    {
      title: '4. Discussion and Future Work',
      section_type: 'Discussion',
      order_index: 4,
      content_markdown: `In this work, we demonstrated that differentiable neural architecture search provides a principled, automated path toward discovering optimal deep topologies for computational genomics. By grounding search operations in continuous relaxation [@Liu2018DARTS] and transformer attention primitives [@Vaswani2017Attention], GenoDARTS bypasses the heuristic trial-and-error that has historically constrained model exploration.

### 4.1 Broader Biological Impact
The ability to discover specialized sub-architectures for individual tissue types and single-cell chromatin profiles offers unprecedented adaptability. Future iterations will incorporate 3D Hi-C contact maps directly into the DAG adjacency matrices to constrain search paths by physical nuclear proximity.`
    }
  ];

  // Upsert sections
  const sectionIdMap = new Map<string, string>(); // section title -> section id

  for (const sec of sectionsData) {
    const { data: existingSec } = await supabaseAdmin
      .from('manuscript_sections')
      .select('id')
      .eq('manuscript_id', manuscriptId)
      .eq('order_index', sec.order_index)
      .limit(1);

    let secId: string;
    const wordCount = sec.content_markdown.split(/\s+/).filter(Boolean).length;

    if (existingSec && existingSec.length > 0) {
      secId = existingSec[0].id;
      await supabaseAdmin
        .from('manuscript_sections')
        .update({
          title: sec.title,
          section_type: sec.section_type,
          content_markdown: sec.content_markdown,
          word_count: wordCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', secId);
    } else {
      const { data: newSec, error: secErr } = await supabaseAdmin
        .from('manuscript_sections')
        .insert({
          manuscript_id: manuscriptId,
          title: sec.title,
          section_type: sec.section_type,
          order_index: sec.order_index,
          content_markdown: sec.content_markdown,
          word_count: wordCount,
          updated_by: ownerId
        })
        .select()
        .single();

      if (secErr || !newSec) {
        console.error(`Failed to create section ${sec.title}:`, secErr);
        continue;
      }
      secId = newSec.id;
    }

    sectionIdMap.set(sec.title, secId);
    console.log(`✓ Section ready: "${sec.title}" (${secId})`);
  }

  // 5. Connect Citations in manuscript_citations
  const citationsToInsert = [
    {
      citation_key: '[@Liu2018DARTS]',
      paper_key: '[@Liu2018DARTS]',
      in_text_label: 'Liu et al., 2018',
      context_note: 'Primary continuous relaxation formulation for differentiable architectural search.',
      section_title: '2. Methodology & Mathematical Formulation'
    },
    {
      citation_key: '[@Avsec2021Enformer]',
      paper_key: '[@Avsec2021Enformer]',
      in_text_label: 'Avsec et al., 2021',
      context_note: 'State-of-the-art transformer baseline for sequence-to-expression prediction across 100kb context.',
      section_title: '1. Introduction'
    },
    {
      citation_key: '[@Vaswani2017Attention]',
      paper_key: '[@Vaswani2017Attention]',
      in_text_label: 'Vaswani et al., 2017',
      context_note: 'Theoretical basis for scaled dot-product multi-head attention blocks.',
      section_title: '1. Introduction'
    }
  ];

  for (const cite of citationsToInsert) {
    const paperId = seededPaperMap.get(cite.paper_key);
    const sectionId = sectionIdMap.get(cite.section_title);

    if (paperId) {
      const { error: citeErr } = await supabaseAdmin
        .from('manuscript_citations')
        .upsert({
          manuscript_id: manuscriptId,
          section_id: sectionId,
          paper_id: paperId,
          citation_key: cite.citation_key,
          in_text_label: cite.in_text_label,
          context_note: cite.context_note,
          created_by: ownerId
        }, { onConflict: 'manuscript_id, citation_key' });

      if (citeErr) {
        console.error(`Error linking citation ${cite.citation_key}:`, citeErr);
      } else {
        console.log(`✓ Linked citation: ${cite.citation_key} -> Paper ${paperId}`);
      }
    }
  }

  // 6. Seed Review Comments
  const introSecId = sectionIdMap.get('1. Introduction');
  const methodSecId = sectionIdMap.get('2. Methodology & Mathematical Formulation');

  if (introSecId) {
    await supabaseAdmin
      .from('review_comments')
      .upsert({
        manuscript_id: manuscriptId,
        section_id: introSecId,
        reviewer_id: supervisorId,
        highlighted_text: 'CAGI6 saturation mutagenesis benchmark datasets',
        comment_text: 'Please verify whether the CAGI6 dataset version used includes the recent MPRA validation tracks from the Kircher lab.',
        severity: 'MinorScientific',
        status: 'Open'
      });
    console.log('✓ Added review comment on Introduction');
  }

  if (methodSecId) {
    await supabaseAdmin
      .from('review_comments')
      .upsert({
        manuscript_id: manuscriptId,
        section_id: methodSecId,
        reviewer_id: supervisorId,
        highlighted_text: 'virtual unrolled one-step update',
        comment_text: 'The bilevel gradient approximation in Eq. 3 assumes Hessian-free vector products. Consider specifying whether first-order or second-order DARTS was utilized.',
        severity: 'MajorScientific',
        status: 'FixedByResearcher',
        fix_note: 'Clarified in section 2.2: we utilized the unrolled virtual step second-order approximation.'
      });
    console.log('✓ Added review comment on Methodology');
  }

  // 7. Seed Checklist Items
  const checklistItems = [
    { label: 'Verify all mathematical equations have consistent notation across sections', is_completed: true, order_index: 0 },
    { label: 'Confirm citation grounding for all empirical claims in the Results section', is_completed: false, order_index: 1 },
    { label: 'Upload supplementary Jupyter notebooks and checkpoint weights to Zenodo', is_completed: false, order_index: 2 }
  ];

  for (const item of checklistItems) {
    await supabaseAdmin
      .from('manuscript_checklist_items')
      .insert({
        manuscript_id: manuscriptId,
        label: item.label,
        is_completed: item.is_completed,
        order_index: item.order_index,
        completed_by: item.is_completed ? ownerId : null,
        completed_at: item.is_completed ? new Date().toISOString() : null
      });
  }
  console.log('✓ Seeded manuscript checklist items');

  console.log('\n🎉 Successfully seeded Genomics Manuscript and Literature Citations!');
  console.log(`Manuscript ID: ${manuscriptId}`);
  console.log(`Project: "${project.title}" (${project.id})`);
}

seedGenomicsManuscript().catch((err) => {
  console.error('Fatal error in seedGenomicsManuscript:', err);
  process.exit(1);
});
