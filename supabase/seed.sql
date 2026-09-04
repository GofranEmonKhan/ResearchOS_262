-- ResearchOS — Seed Data for Local Development & Testing
-- Seed users across all 3 application roles (Admin, Supervisor, Researcher)
-- Along with Module 02 Research Workspace sample data (Projects, Members, Milestones, Tasks, Chat, Notifications)

DO $$
DECLARE
  v_admin_id UUID;
  v_supervisor_id UUID;
  v_researcher_mit UUID;
  v_researcher_user UUID;
  
  v_proj_genomics UUID := 'c0000000-0000-0000-0000-000000000001';
  v_proj_personal_alex UUID := 'c0000000-0000-0000-0000-000000000002';
  v_proj_robotics UUID := 'c0000000-0000-0000-0000-000000000003';
  v_proj_personal_user UUID := 'c0000000-0000-0000-0000-000000000004';
  
  v_ms_g1 UUID := 'e0000000-0000-0000-0000-000000000001';
  v_ms_g2 UUID := 'e0000000-0000-0000-0000-000000000002';
  v_ms_g3 UUID := 'e0000000-0000-0000-0000-000000000003';
  
  v_ms_u1 UUID := 'e0000000-0000-0000-0000-000000000004';
  v_ms_u2 UUID := 'e0000000-0000-0000-0000-000000000005';
BEGIN
  -- Resolve IDs dynamically from profiles or default to well-known IDs
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'Admin' LIMIT 1;
  IF v_admin_id IS NULL THEN v_admin_id := '25ceee13-543f-4e54-975c-525948e91c94'; END IF;

  SELECT id INTO v_supervisor_id FROM public.profiles WHERE role = 'Supervisor' AND status = 'Active' LIMIT 1;
  IF v_supervisor_id IS NULL THEN v_supervisor_id := '6299daa2-8a53-42d2-ba9a-e47518d4c45c'; END IF;

  SELECT id INTO v_researcher_mit FROM public.profiles WHERE role = 'Researcher' AND full_name LIKE '%Alex%' LIMIT 1;
  IF v_researcher_mit IS NULL THEN v_researcher_mit := '81feb088-1476-4fe5-8079-915ede4ddef5'; END IF;

  SELECT id INTO v_researcher_user FROM public.profiles WHERE role = 'Researcher' AND id != v_researcher_mit LIMIT 1;
  IF v_researcher_user IS NULL THEN v_researcher_user := v_researcher_mit; END IF;

  -- 1. Ensure Profiles have rich metadata & avatar images
  UPDATE public.profiles SET
    photo_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
    institution = 'Stanford University',
    department = 'Computer Science & AI',
    research_field_tags = ARRAY['Machine Learning', 'Neural Scaling', 'NLP'],
    bio = 'Principal Investigator leading the Neural Systems & Scaled Architectures Lab.'
  WHERE id = v_supervisor_id;

  UPDATE public.profiles SET
    photo_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face',
    institution = 'MIT',
    department = 'CSAIL',
    research_field_tags = ARRAY['Deep Learning', 'Transformers', 'Optimization'],
    bio = 'PhD Candidate researching transformer memory efficiency and sequence scaling.'
  WHERE id = v_researcher_mit;

  IF v_researcher_user != v_researcher_mit THEN
    UPDATE public.profiles SET
      photo_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
      institution = 'MIT',
      department = 'Bioinformatics & Machine Learning',
      research_field_tags = ARRAY['Genomics', 'Transformers', 'Reinforcement Learning'],
      bio = 'Lead Researcher exploring transformer foundation models in single-cell biology.'
    WHERE id = v_researcher_user;
  END IF;

  -- 2. Projects
  -- Project 1: Supervised Group (Prof. Sarah Vance)
  INSERT INTO public.projects (
    id, owner_id, is_personal, title, abstract, domain_tags, start_date, end_date, status, progress_percent, created_at, updated_at
  ) VALUES (
    v_proj_genomics, v_supervisor_id, false,
    'Neural Architecture Search for High-Throughput Genomics',
    'Developing energy-efficient transformer architectures and sparse attention mechanisms for large-scale single-cell transcriptomic modeling.',
    ARRAY['Deep Learning', 'Genomics', 'Transformers', 'Bioinformatics'],
    CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '120 days',
    'Ongoing', 45, NOW(), NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    progress_percent = 45;

  -- Project 2: Personal Project (Alex Chen)
  INSERT INTO public.projects (
    id, owner_id, is_personal, title, abstract, domain_tags, start_date, end_date, status, progress_percent, created_at, updated_at
  ) VALUES (
    v_proj_personal_alex, v_researcher_mit, true,
    'Transformer Memory Optimization & Kernel Benchmarking',
    'Custom Triton/CUDA FP8 FlashAttention kernel implementation and ablation study on consumer GPUs.',
    ARRAY['CUDA', 'PyTorch', 'Quantization', 'Efficiency'],
    CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE + INTERVAL '60 days',
    'Ongoing', 60, NOW(), NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    progress_percent = 60;

  -- Project 3: Supervised Group (Prof. Sarah Vance)
  INSERT INTO public.projects (
    id, owner_id, is_personal, title, abstract, domain_tags, start_date, end_date, status, progress_percent, created_at, updated_at
  ) VALUES (
    v_proj_robotics, v_supervisor_id, false,
    'Autonomous Laboratory Robotics & Liquid Handling',
    'Reinforcement learning for high-precision micro-pipetting, vision-guided titration, and automated assay protocols.',
    ARRAY['Robotics', 'Control Systems', 'Automation'],
    CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '180 days',
    'Planning', 15, NOW(), NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    progress_percent = 15;

  -- Project 4: Personal Workspace (User)
  IF v_researcher_user != v_researcher_mit THEN
    INSERT INTO public.projects (
      id, owner_id, is_personal, title, abstract, domain_tags, start_date, end_date, status, progress_percent, created_at, updated_at
    ) VALUES (
      v_proj_personal_user, v_researcher_user, true,
      'Computational Proteomics & Sparse Attention Lab',
      'Independent workbench for training graph-based diffusion models for molecular binding affinity prediction.',
      ARRAY['Proteomics', 'Diffusion Models', 'PyTorch', 'Structural Biology'],
      CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '90 days',
      'Ongoing', 50, NOW(), NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      progress_percent = 50;
  END IF;

  -- 3. Project Members
  INSERT INTO public.project_members (id, project_id, user_id, project_role, added_by, joined_at) VALUES
    ('d1000000-0000-0000-0000-000000000001', v_proj_genomics, v_researcher_user, 'Member', v_supervisor_id, NOW() - INTERVAL '28 days'),
    ('d1000000-0000-0000-0000-000000000002', v_proj_genomics, v_researcher_mit, 'Member', v_supervisor_id, NOW() - INTERVAL '25 days'),
    ('d1000000-0000-0000-0000-000000000003', v_proj_robotics, v_researcher_user, 'Member', v_supervisor_id, NOW() - INTERVAL '6 days')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- 4. Milestones
  INSERT INTO public.milestones (id, project_id, name, target_date, weight_pct, status, is_locked, is_proposed, created_at, updated_at) VALUES
    (v_ms_g1, v_proj_genomics, 'Phase 1: Dataset Pipeline & Preprocessing', CURRENT_DATE - INTERVAL '5 days', 30, 'Completed', false, false, NOW(), NOW()),
    (v_ms_g2, v_proj_genomics, 'Phase 2: Baseline Architecture Exploration', CURRENT_DATE + INTERVAL '20 days', 40, 'InProgress', false, false, NOW(), NOW()),
    (v_ms_g3, v_proj_genomics, 'Phase 3: Benchmarking & Peer Manuscript Draft', CURRENT_DATE + INTERVAL '60 days', 30, 'Pending', false, false, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  IF v_researcher_user != v_researcher_mit THEN
    INSERT INTO public.milestones (id, project_id, name, target_date, weight_pct, status, is_locked, is_proposed, created_at, updated_at) VALUES
      (v_ms_u1, v_proj_personal_user, 'Data Ingestion & Feature Normalization', CURRENT_DATE + INTERVAL '10 days', 50, 'InProgress', false, false, NOW(), NOW()),
      (v_ms_u2, v_proj_personal_user, 'Cross-Validation & Binding Affinity Benchmarks', CURRENT_DATE + INTERVAL '35 days', 50, 'Pending', false, false, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 5. Tasks (All Kanban statuses: Approved, InProgress, Submitted, RevisionRequested, ToDo, Proposed)
  INSERT INTO public.tasks (
    id, project_id, milestone_id, title, description,
    assignee_id, created_by, due_date, priority, status,
    progress_note, revision_note, is_proposed, proposed_by, created_at, updated_at
  ) VALUES
    (
      'f0000000-0000-0000-0000-000000000001', v_proj_genomics, v_ms_g1,
      'Preprocess 100k single-cell transcriptomic profiles',
      'Normalize count matrices and apply PCA dimensional reduction for cell type clustering.',
      v_researcher_user, v_supervisor_id,
      CURRENT_DATE - INTERVAL '8 days', 'High', 'Approved',
      'Dataset successfully filtered and cached into Zarr arrays.', null, false, null, NOW() - INTERVAL '20 days', NOW() - INTERVAL '6 days'
    ),
    (
      'f0000000-0000-0000-0000-000000000002', v_proj_genomics, v_ms_g2,
      'Implement Multi-Head Attention sparse mask generator',
      'Construct bipartite gene-interaction graph masks for 16k context window.',
      v_researcher_user, v_supervisor_id,
      CURRENT_DATE + INTERVAL '4 days', 'High', 'InProgress',
      'Writing CUDA kernel bindings and PyTorch custom autograd function.', null, false, null, NOW() - INTERVAL '10 days', NOW()
    ),
    (
      'f0000000-0000-0000-0000-000000000003', v_proj_genomics, v_ms_g2,
      'Evaluate FlashAttention-v3 scaling on 8x H100 cluster',
      'Benchmarked throughput at 128k token sequences with FP8 precision.',
      v_researcher_user, v_supervisor_id,
      CURRENT_DATE + INTERVAL '7 days', 'Medium', 'Submitted',
      'Benchmarks completed with 3.4x throughput speedup over standard SDPA. Deliverables ready for review.', null, false, null, NOW() - INTERVAL '8 days', NOW()
    ),
    (
      'f0000000-0000-0000-0000-000000000004', v_proj_genomics, v_ms_g2,
      'Literature Review on sparse spatial representations',
      'Survey 2024-2025 papers on spatial transcriptomics representation learning.',
      v_researcher_mit, v_supervisor_id,
      CURRENT_DATE + INTERVAL '9 days', 'Medium', 'RevisionRequested',
      'Initial draft written.', 'Please include the latest Nature Methods 2025 paper comparing cross-attention layers.', false, null, NOW() - INTERVAL '12 days', NOW()
    ),
    (
      'f0000000-0000-0000-0000-000000000005', v_proj_genomics, v_ms_g3,
      'Draft Methodology section for Nature Machine Intelligence',
      'Formalize the sparse graph formulation and theoretical convergence bounds.',
      v_researcher_user, v_supervisor_id,
      CURRENT_DATE + INTERVAL '25 days', 'Medium', 'ToDo',
      null, null, false, null, NOW() - INTERVAL '5 days', NOW()
    ),
    (
      'f0000000-0000-0000-0000-000000000006', v_proj_genomics, v_ms_g2,
      'Integrate LoRA adapter tuning for low-resource inference',
      'Proposed task to enable lightweight fine-tuning on academic desktop GPUs.',
      v_researcher_user, v_researcher_user,
      CURRENT_DATE + INTERVAL '15 days', 'Low', 'ToDo',
      null, null, true, v_researcher_user, NOW(), NOW()
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    status = EXCLUDED.status,
    priority = EXCLUDED.priority,
    progress_note = EXCLUDED.progress_note,
    revision_note = EXCLUDED.revision_note;

  IF v_researcher_user != v_researcher_mit THEN
    INSERT INTO public.tasks (
      id, project_id, milestone_id, title, description,
      assignee_id, created_by, due_date, priority, status,
      progress_note, revision_note, is_proposed, proposed_by, created_at, updated_at
    ) VALUES
      (
        'f0000000-0000-0000-0000-000000000007', v_proj_personal_user, v_ms_u1,
        'Implement equivariant graph neural network backbone',
        'E(n)-equivariant convolutional message passing layers for 3D coordinate prediction.',
        v_researcher_user, v_researcher_user,
        CURRENT_DATE + INTERVAL '5 days', 'High', 'InProgress',
        'Backbone network forward pass verified on PDB test structures.', null, false, null, NOW() - INTERVAL '5 days', NOW()
      ),
      (
        'f0000000-0000-0000-0000-000000000008', v_proj_personal_user, v_ms_u2,
        'Benchmark molecular docking score correlations against AutoDock Vina',
        'Compare scoring function Pearson correlations across 500 PDBbind complexes.',
        v_researcher_user, v_researcher_user,
        CURRENT_DATE + INTERVAL '14 days', 'Medium', 'ToDo',
        null, null, false, null, NOW() - INTERVAL '2 days', NOW()
      )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      status = EXCLUDED.status,
      priority = EXCLUDED.priority,
      progress_note = EXCLUDED.progress_note,
      revision_note = EXCLUDED.revision_note;
  END IF;

  -- 6. Task Comments
  INSERT INTO public.task_comments (id, task_id, author_id, body, created_at) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', v_supervisor_id, 'Excellent throughput gains on the 128k context benchmarks. Please ensure the numerical stability checks across FP8 formats are included in the appendix.', NOW() - INTERVAL '1 day'),
    ('a1000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004', v_supervisor_id, 'Please check the revision notes and update the comparative taxonomy table with the recent 2025 preprints.', NOW() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- 7. Messages
  INSERT INTO public.project_messages (id, project_id, sender_id, body, created_at) VALUES
    ('b1000000-0000-0000-0000-000000000001', v_proj_genomics, v_supervisor_id, 'Welcome everyone to the Neural Architecture Search project channel! Please review the Phase 2 milestone deadlines.', NOW() - INTERVAL '15 days'),
    ('b1000000-0000-0000-0000-000000000002', v_proj_genomics, v_researcher_user, 'Thanks Professor! I have submitted Task 3 with the 8x H100 benchmark results for your review and started on the attention sparse masks.', NOW() - INTERVAL '2 days'),
    ('b1000000-0000-0000-0000-000000000003', v_proj_genomics, v_researcher_mit, 'I am updating the literature review taxonomy table now to incorporate the 2025 spatial cross-attention papers.', NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- 8. Notifications
  INSERT INTO public.notifications (id, user_id, type, payload, channel, is_read, created_at) VALUES
    -- Supervisor notifications
    ('c1000000-0000-0000-0000-000000000010', v_supervisor_id, 'ReviewDeadline', jsonb_build_object('title', 'Deliverable Ready for Review: FlashAttention-v3 scaling on 8x H100 cluster', 'taskId', 'f0000000-0000-0000-0000-000000000003', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'submittedBy', 'Abdul Gofran Emon', 'message', 'Abdul Gofran Emon completed benchmarks with 3.4x throughput speedup over standard SDPA. Awaiting your approval.'), 'InApp', false, NOW() - INTERVAL '18 minutes'),
    ('c1000000-0000-0000-0000-000000000011', v_supervisor_id, 'TaskAssigned', jsonb_build_object('title', 'New Task Proposal: LoRA adapter tuning for low-resource inference', 'taskId', 'f0000000-0000-0000-0000-000000000006', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'proposedBy', 'Alex Chen', 'message', 'Alex Chen submitted a task proposal for low-rank adaptation on academic workstation GPUs.'), 'InApp', false, NOW() - INTERVAL '1 hour'),
    ('c1000000-0000-0000-0000-000000000012', v_supervisor_id, 'MilestoneDue', jsonb_build_object('title', 'Phase 2: Baseline Architecture Exploration due in 5 days', 'milestoneId', v_ms_g2, 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'dueDate', (CURRENT_DATE + INTERVAL '5 days')::text, 'message', 'Milestone target date is approaching. 2 of 4 associated tasks have been verified.'), 'InApp', false, NOW() - INTERVAL '3 hours'),
    ('c1000000-0000-0000-0000-000000000013', v_supervisor_id, 'BookingRequest', jsonb_build_object('title', 'Cryo-EM High-Resolution Imaging Slot Confirmed', 'facility', 'Stanford Bio-X Core Facility', 'slotDate', (CURRENT_DATE + INTERVAL '2 days')::text, 'message', 'Your 4-hour reservation on the Titan Krios G4 microscope has been approved by the core facility manager.'), 'InApp', true, NOW() - INTERVAL '1 day'),
    ('c1000000-0000-0000-0000-000000000014', v_supervisor_id, 'ForumReply', jsonb_build_object('title', 'Discussion reply on "Sparse Attention Stability under FP8"', 'author', 'Dr. Arthur Pendelton', 'message', 'Dr. Pendelton commented: "We observed gradient underflow when scaling past 64k tokens. Recommend cosine decay with warmup."'), 'InApp', true, NOW() - INTERVAL '2 days'),

    -- Researcher notifications
    ('c1000000-0000-0000-0000-000000000020', v_researcher_user, 'TaskApproved', jsonb_build_object('title', 'Task Approved: Preprocess 100k single-cell transcriptomic profiles', 'taskId', 'f0000000-0000-0000-0000-000000000001', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'approvedBy', 'Prof. Sarah Vance', 'message', 'Prof. Sarah Vance approved your deliverable. Project progress increased to 45%.'), 'InApp', false, NOW() - INTERVAL '25 minutes'),
    ('c1000000-0000-0000-0000-000000000021', v_researcher_user, 'RevisionRequested', jsonb_build_object('title', 'Revision Requested: Literature Review on sparse spatial representations', 'taskId', 'f0000000-0000-0000-0000-000000000004', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'revisionNote', 'Please include the latest Nature Methods 2025 paper comparing cross-attention layers.', 'message', 'Prof. Sarah Vance requested revisions: "Please include the latest Nature Methods 2025 paper comparing cross-attention layers."'), 'InApp', false, NOW() - INTERVAL '45 minutes'),
    ('c1000000-0000-0000-0000-000000000022', v_researcher_user, 'DeadlineIn48h', jsonb_build_object('title', '48-Hour Deadline Alert: Implement Multi-Head Attention sparse mask generator', 'taskId', 'f0000000-0000-0000-0000-000000000002', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'dueDate', (CURRENT_DATE + INTERVAL '2 days')::text, 'message', 'This high-priority task is scheduled for completion within the next 48 hours.'), 'InApp', false, NOW() - INTERVAL '2 hours'),
    ('c1000000-0000-0000-0000-000000000023', v_researcher_user, 'TaskAssigned', jsonb_build_object('title', 'New Task Assignment: Draft Methodology section for Nature Machine Intelligence', 'taskId', 'f0000000-0000-0000-0000-000000000005', 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'dueDate', (CURRENT_DATE + INTERVAL '25 days')::text, 'message', 'You have been assigned lead author for formalizing theoretical convergence bounds.'), 'InApp', true, NOW() - INTERVAL '1 day'),
    ('c1000000-0000-0000-0000-000000000024', v_researcher_user, 'MilestoneDue', jsonb_build_object('title', 'Milestone Finalized: Phase 1 Dataset Pipeline & Preprocessing', 'milestoneId', v_ms_g1, 'projectId', v_proj_genomics, 'projectName', 'Neural Architecture Search for High-Throughput Genomics', 'message', 'All Phase 1 deliverables were marked complete and verified by the principal investigator.'), 'InApp', true, NOW() - INTERVAL '4 days'),

    -- Admin notifications
    ('c1000000-0000-0000-0000-000000000040', v_admin_id, 'ReviewDeadline', jsonb_build_object('title', 'Supervisor Verification Submitted: Dr. Arthur Pendelton', 'institution', 'Stanford University', 'department', 'Computer Science & AI', 'message', 'New faculty institutional credentials uploaded for administrative review and activation.'), 'InApp', false, NOW() - INTERVAL '20 minutes'),
    ('c1000000-0000-0000-0000-000000000041', v_admin_id, 'BookingRequest', jsonb_build_object('title', 'Monthly Automated Security Audit & pgvector Health Check', 'message', 'Automated security scan completed with 100% compliance across RLS policies, audit logs, and encryption tokens.'), 'InApp', true, NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO UPDATE SET
    payload = EXCLUDED.payload,
    is_read = EXCLUDED.is_read;

END $$;
