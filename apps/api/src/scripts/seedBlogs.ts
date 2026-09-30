import 'dotenv/config';
import { supabaseAdmin } from '../supabase.js';

async function seedScientificBlogs() {
  console.log('📝 Seeding 3 detailed scientific blogs in Community Forum...');

  // 1. Ensure Supervisor account exists (Prof. Sarah Vance)
  let supervisorId: string | undefined;
  const { data: supUsers } = await supabaseAdmin.auth.admin.listUsers();
  const supUser = supUsers?.users?.find(u => u.email === 'supervisor@stanford.edu');

  if (supUser) {
    supervisorId = supUser.id;
  } else {
    console.log('Creating Supervisor account...');
    const { data: newSup, error: supErr } = await supabaseAdmin.auth.admin.createUser({
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        fullName: 'Prof. Sarah Vance (PI)',
        roleRequest: 'Supervisor',
        institution: 'Stanford University',
        department: 'Computer Science & AI',
      },
    });
    if (supErr || !newSup?.user) {
      throw new Error(`Failed to create supervisor: ${supErr?.message}`);
    }
    supervisorId = newSup.user.id;
  }

  await supabaseAdmin.from('profiles').upsert({
    id: supervisorId,
    full_name: 'Prof. Sarah Vance',
    role: 'Supervisor',
    status: 'Active',
    institution: 'Stanford University',
    department: 'Computer Science & AI',
    bio: 'Principal Investigator leading the Neural Systems & Scaled Architectures Lab.',
    reputation_points: 850,
    research_field_tags: ['neural-architectures', 'deep-learning', 'state-space-models'],
    updated_at: new Date().toISOString(),
  });
  console.log(`✓ Supervisor ready: Prof. Sarah Vance (${supervisorId})`);

  // 2. Ensure Researcher 1 account exists (Alex Chen)
  let researcher1Id: string | undefined;
  const r1User = supUsers?.users?.find(u => u.email === 'researcher@mit.edu');

  if (r1User) {
    researcher1Id = r1User.id;
  } else {
    console.log('Creating Researcher 1 account...');
    const { data: newR1, error: r1Err } = await supabaseAdmin.auth.admin.createUser({
      email: 'researcher@mit.edu',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        fullName: 'Alex Chen',
        roleRequest: 'Researcher',
        institution: 'MIT',
        department: 'CSAIL',
      },
    });
    if (r1Err || !newR1?.user) {
      throw new Error(`Failed to create researcher 1: ${r1Err?.message}`);
    }
    researcher1Id = newR1.user.id;
  }

  await supabaseAdmin.from('profiles').upsert({
    id: researcher1Id,
    full_name: 'Alex Chen',
    role: 'Researcher',
    status: 'Active',
    institution: 'MIT',
    department: 'CSAIL',
    bio: 'PhD Candidate researching transformer memory efficiency, low-bit quantization, and distributed execution.',
    reputation_points: 420,
    research_field_tags: ['pytorch', 'quantization', 'distributed-systems', 'cuda-optimization'],
    updated_at: new Date().toISOString(),
  });
  console.log(`✓ Researcher 1 ready: Alex Chen (${researcher1Id})`);

  // 3. Ensure Researcher 2 account exists (Dr. Elena Rostova)
  let researcher2Id: string | undefined;
  const r2User = supUsers?.users?.find(u => u.email === 'elena.rostova@cmu.edu');

  if (r2User) {
    researcher2Id = r2User.id;
  } else {
    console.log('Creating Researcher 2 account...');
    const { data: newR2, error: r2Err } = await supabaseAdmin.auth.admin.createUser({
      email: 'elena.rostova@cmu.edu',
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        fullName: 'Dr. Elena Rostova',
        roleRequest: 'Researcher',
        institution: 'Carnegie Mellon University',
        department: 'Computational Biology & Machine Learning',
      },
    });
    if (r2Err || !newR2?.user) {
      throw new Error(`Failed to create researcher 2: ${r2Err?.message}`);
    }
    researcher2Id = newR2.user.id;
  }

  await supabaseAdmin.from('profiles').upsert({
    id: researcher2Id,
    full_name: 'Dr. Elena Rostova',
    role: 'Researcher',
    status: 'Active',
    institution: 'Carnegie Mellon University',
    department: 'Computational Biology & Machine Learning',
    bio: 'Postdoctoral Fellow researching SE(3)-equivariant geometric deep learning and generative macromolecular design.',
    reputation_points: 380,
    research_field_tags: ['computational-biology', 'protein-design', 'diffusion-models', 'structural-biology'],
    updated_at: new Date().toISOString(),
  });
  console.log(`✓ Researcher 2 ready: Dr. Elena Rostova (${researcher2Id})`);

  // 4. Define the 3 Detailed Scientific Blogs
  const blogs = [
    {
      author_id: supervisorId,
      title: 'Architectural Paradigms for Scaled Foundation Models: From Dense Attention Bottlenecks to State-Space Hybrids',
      tags: ['scientific-blog', 'neural-architectures', 'deep-learning', 'transformers', 'state-space-models'],
      views_count: 342,
      is_pinned: true,
      body: `Executive Overview

As contemporary foundation models scale beyond hundreds of billions of parameters and context windows expand toward multi-million token sequences, standard multi-head self-attention encounters fundamental memory bandwidth and scaling limitations. While FlashAttention has significantly reduced IO overhead by tiling matrix multiplication operations on SRAM, the quadratic computational complexity and growing cache footprint remain intrinsic barriers for continuous long-context reasoning.

In this monograph, we share observations from our laboratory's scaled training runs on 64-node H100 clusters, analyzing the convergence dynamics, associative recall capacity, and inference efficiency of hybrid architectures combining Selective State-Space Models (Mamba-2) with periodic sliding-window attention layers.

The Quadratic Wall & KV-Cache Footprint

During autoregressive generation, each generated token requires referencing all previous key and value projections. For a sequence length of 128,000 tokens with 64 transformer layers and hidden dimension 8192, the key-value cache memory requirement per batch element reaches approximately 53.7 gigabytes.

At this scale, a single batch entry consumes more than 67% of an 80GB H100 VRAM budget before accounting for model weights, gradients, or optimizer state tensors. Grouped Query Attention mitigates cache consumption by sharing key-value heads across query groups (typically in an 8-to-1 ratio), but does not alter the underlying asymptotic scaling behavior.

State-Space Models & Continuous-Time Discretization

Selective State-Space Models reformulate the sequential representation problem through continuous linear time-invariant systems mapped to discrete hardware. By parameterizing transition matrices as input-dependent projections (the selective mechanism of Mamba), the model dynamically controls information throughput. In our ablation experiments across 1.4B and 7B parameter benchmarks, pure SSM architectures match standard Transformer perplexity on WikiText-103 and C4 datasets while maintaining strictly constant inference memory regardless of sequence length.

However, on synthetic multi-query associative recall tests and needle-in-a-haystack retrieval tasks exceeding 64k tokens, pure SSM representations experience loss of fidelity due to bounded hidden state capacity.

The 3:1 Hybrid Architecture: Synthesis & Results

To resolve this trade-off, we implemented a 3:1 interleaved architectural topology:
- Three Mamba-2 Layers: Providing linear sequential processing, high throughput, and localized state evolution.
- One FlashAttention-3 Layer: Providing global token-to-token associative retrieval and dense calibration.

In benchmark tests, our 3:1 hybrid achieved 342 TFLOPs per second per GPU (compared to 285 TFLOPs for the baseline transformer), slashed the 128k sequence KV-cache footprint down from 53.6 GB to 13.4 GB, and preserved 97.8% multi-query associative recall accuracy while boosting inference generation from 34 tokens per second to 112 tokens per second.

Methodological Guidance for Supervised Researchers

For doctoral students designing foundation model experiments in ResearchOS:
1. Always conduct parameter-matched ablations: Compare architectures at equivalent active parameter counts and cumulative computational budgets.
2. Profile activation memory independently of weights: Use PyTorch Memory Profiler snapshots to verify whether out-of-memory events originate from workspace allocation or backward gradient retention.
3. Validate checkpoint reproducibility: Ensure random number generator states across Tensor Parallel and Pipeline Parallel domains are synchronized prior to benchmark comparisons.

Below is the complete architectural layout diagram and scaling comparison for reference:

![Architectural schematic of State-Space Model (Mamba) and Multi-Head Attention hybrid layers with linear vs quadratic sequence scaling comparisons](/blogs/state_space_hybrid_arch.jpg)

Correspondence: Prof. Sarah Vance, Neural Systems Lab, Stanford University.`,
    },
    {
      author_id: researcher1Id,
      title: 'Overcoming Gradient Divergence and CUDA Out-of-Memory Anomalies During 4-Bit Model Quantization',
      tags: ['scientific-blog', 'pytorch', 'quantization', 'distributed-systems', 'cuda-optimization'],
      views_count: 289,
      is_pinned: false,
      body: `Problem Formulation

When fine-tuning 70B+ parameter language models with 4-bit weight quantization (QLoRA and NormalFloat4), researchers frequently encounter catastrophic CUDA Out-of-Memory (OOM) errors and loss divergence spikes occurring non-deterministically around intermediate transformer blocks (specifically layers 28 to 34).

Over the past three weeks in the MIT CSAIL cluster, our team conducted a forensic trace into the underlying root causes. This post shares the empirical findings, memory layout mechanics, and the stabilization steps that resolve the issue.

Root Cause Analysis: The Gradient Checkpointing Paradox

Standard QLoRA configurations wrap linear operators in quantized forward kernels and attach low-rank adapter matrices where base weights are frozen in 4-bit representation, and adapters are trained in 16-bit precision.

To conserve VRAM, researchers universally enable activation checkpointing. Under activation checkpointing, intermediate activations are dropped from memory during the forward pass and recomputed on-the-fly during the backward pass.

Herein lies the anomaly:
1. Dynamic Dequantization Allocation: During backward recomputation, the 4-bit weights must be momentarily dequantized back into 16-bit precision in GPU SRAM and VRAM to compute input gradients.
2. Asymmetric Recomputation Peak: When gradient checkpointing is combined with sequence lengths of 4096 or longer and FlashAttention backward passes, the momentary peak memory exceeds static VRAM allocation by up to 14.8 GB on deeper layers where the computation graph retains residual streams from preceding layers.
3. Layer 28 Spike: In standard LLaMA-3 70B architectures, layer 28 coincides with the transition boundary of Pipeline Parallelism rank allocations, creating an unbuffered memory spike that triggers the NVIDIA driver allocator to fail.

The Resolution: Paged Dequantization Buffer Pools & Gradient Stabilizers

To eliminate this bottleneck, we engineered two complementary interventions:

1. Paged Dequantization Buffer Pools: Instead of allocating ephemeral dequantization tensors per backward execution, we initialize a single persistent scratchpad buffer allocated directly on the active CUDA stream.
2. Gradient Clipping on Residual Streams: To address gradient divergence spikes caused by numerical underflow during low-bit backward multiplication, we introduced norm-stabilized gradient scaling prior to adapter accumulation.

Empirical Benchmark Verification

We verified the stabilization patch across 100 consecutive training steps on 8x NVIDIA H100 SXM5 GPUs using LLaMA-3-70B with batch size 4 per device and sequence length 8192:
- Standard QLoRA crashed with CUDA OOM at step 14, reaching 81.4 GB peak memory.
- With our persistent paged buffer and residual stabilizer, peak memory dropped to 68.2 GB with 0% out-of-memory errors over 100 full steps, step latency improved to 1.32 seconds, and training loss converged smoothly and monotonically.

The attached memory profile screenshot below illustrates the static versus dynamic VRAM allocation and the layer 28 peak:

![GPU VRAM allocation breakdown, 4-bit NormalFloat tensor quantization layout, and dynamic activation memory peaks during gradient checkpointing on NVIDIA H100](/blogs/cuda_quantization_memory.jpg)

Author: Alex Chen, PhD Candidate, MIT CSAIL.`,
    },
    {
      author_id: researcher2Id,
      title: 'SE(3)-Equivariant Flow Matching for De Novo Protein Backbone Design: Theory to Wet-Lab Synthesis',
      tags: ['scientific-blog', 'computational-biology', 'protein-design', 'diffusion-models', 'structural-biology'],
      views_count: 315,
      is_pinned: false,
      body: `Introduction & Motivation

Generative modeling of macromolecular architectures has shifted decisively from discrete auto-regressive sequence generation toward continuous geometric diffusion and flow matching directly on spatial coordinate manifolds. Generating physically realizable protein backbones requires respecting Euclidean symmetries: rotational and translational invariance in three-dimensional space.

While discrete diffusion frameworks have achieved landmark successes, they rely on Gaussian approximations of stochastic differential equations on curved manifolds that can introduce discretization errors, resulting in steric clashes and non-canonical Ramachandran dihedral angles in novel loop regions.

In this research article, we document our computational methodology using Riemannian Flow Matching over spatial coordinate frames, our automated filtering pipeline in ResearchOS, and initial surface plasmon resonance (SPR) binding kinetics from our wet-lab collaborator trials.

Manifold Representation & Geometry

Each amino acid residue in a nascent polypeptide backbone is parameterized as a rigid coordinate frame combining the three-dimensional orientation of the peptide plane (defined by the nitrogen, alpha-carbon, and carbon atomic triad) and the Cartesian centroid coordinates of the alpha-carbon.

Under standard Continuous Normalizing Flows, vector fields on Euclidean spaces are straight trajectories. On the Riemannian manifold of three-dimensional rigid transformations, geodesics follow exponential geodesic maps that smoothly interpolate orientations and translations without numerical distortion.

In Silico Filtering Protocol

To screen 10,000 de novo generated candidate backbones prior to wet-lab synthesis, we established a rigorous four-stage in silico quality gate:
1. Ramachandran Dihedral Conformance: Calculate backbone torsion angles using BioPython and reject any candidates where more than 5% of non-glycine residues reside in disallowed stereochemical regions.
2. Steric Clash Score: Measure all pairwise inter-atomic distances to ensure no non-adjacent alpha-carbons are closer than 3.8 Angstroms.
3. Inverse Sequence Design via ProteinMPNN: Generate 8 diverse amino acid sequences per backbone structure, conditioning on 3D coordinates.
4. AlphaFold-2 Self-Consistency Validation: Fold the generated sequences with AlphaFold-2 and require a predicted Local Distance Difference Test (pLDDT) of at least 85.0 and backbone root-mean-square deviation below 1.8 Angstroms.

Wet-Lab Validation: SPR Binding Assays

Of the top 12 filtered candidate binders synthesized against human epidermal growth factor receptor (EGFR) domain III:
- 7 candidates demonstrated monodisperse size-exclusion chromatography profiles indicative of well-folded globular monomers.
- 3 candidates exhibited nanomolar binding affinity (KD values of 14.2 nM, 28.6 nM, and 64.1 nM) confirmed via multi-channel Surface Plasmon Resonance.

Below is the experimental synthesis diagram showing the structural docking frame, Ramachandran angle distribution, and surface plasmon resonance binding sensorgrams:

![SE(3)-Equivariant continuous flow matching for de novo protein backbone design, featuring rotational geodesics, Ramachandran angle distributions, and SPR binding affinity kinetics](/blogs/protein_flow_matching.jpg)

Author: Dr. Elena Rostova, Postdoctoral Fellow, CMU Computational Biology.`,
    },
  ];

  for (const blog of blogs) {
    // Check if post with same title already exists
    const { data: existing } = await supabaseAdmin
      .from('forum_posts')
      .select('id')
      .eq('title', blog.title)
      .single();

    if (existing) {
      console.log(`Blog already exists: "${blog.title.slice(0, 45)}..." -> updating`);
      await supabaseAdmin.from('forum_posts').update({
        author_id: blog.author_id,
        body: blog.body,
        tags: blog.tags,
        is_pinned: blog.is_pinned,
        views_count: blog.views_count,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      console.log(`Inserting scientific blog: "${blog.title.slice(0, 45)}..."`);
      const { error: insertErr } = await supabaseAdmin.from('forum_posts').insert({
        author_id: blog.author_id,
        title: blog.title,
        body: blog.body,
        tags: blog.tags,
        is_pinned: blog.is_pinned,
        views_count: blog.views_count,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertErr) {
        console.error('Error inserting blog:', insertErr);
      } else {
        console.log(`✓ Inserted successfully!`);
      }
    }
  }

  console.log('✨ All 3 scientific blogs seeded successfully!');
  process.exit(0);
}

seedScientificBlogs().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
