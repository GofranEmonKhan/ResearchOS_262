import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { CreateManuscriptModal } from '../components/manuscripts/CreateManuscriptModal.js';
import { CitationSearchModal } from '../components/manuscripts/CitationSearchModal.js';
import { WhyDidICiteThisModal } from '../components/manuscripts/WhyDidICiteThisModal.js';
import { ReviewCommentDrawer } from '../components/manuscripts/ReviewCommentDrawer.js';
import { SubmissionChecklistCard } from '../components/manuscripts/SubmissionChecklistCard.js';
import { AssignReviewerModal } from '../components/manuscripts/AssignReviewerModal.js';
import { VersionHistoryModal } from '../components/manuscripts/VersionHistoryModal.js';
import { LatexPaperPreview } from '../components/manuscripts/LatexPaperPreview.js';
import { InsertFigureModal, sanitizeFigurePath } from '../components/manuscripts/InsertFigureModal.js';
import { ManuscriptGuidelinesModal } from '../components/manuscripts/ManuscriptGuidelinesModal.js';
import {
  Manuscript,
  ManuscriptSection,
  ManuscriptCitation,
  ManuscriptChecklistItem,
  ReviewComment,
  ManuscriptVersion,
} from '@researchos/shared-types';

describe('Spec 05 — Manuscript Writing & Peer Review UI Component Tests', () => {
  const mockManuscript: Manuscript = {
    id: 'manu-101',
    projectId: 'proj-1',
    title: 'Scalable Low-Rank Adaptation for Multi-Modal Foundation Models',
    abstract: 'Investigating parameter-efficient fine-tuning on vision-language backbones.',
    targetVenue: 'NeurIPS 2026',
    status: 'Draft',
    createdBy: 'user-author-1',
    supervisorId: 'user-sup-1',
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T10:00:00.000Z',
  };

  const mockSections: ManuscriptSection[] = [
    {
      id: 'sec-1',
      manuscriptId: 'manu-101',
      title: 'Introduction & Research Question',
      sectionType: 'Introduction',
      orderIndex: 0,
      contentMarkdown: 'Large-scale multimodal foundation models suffer from high fine-tuning overhead [@Vaswani2017].',
      contentLatex: '',
      wordCount: 120,
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T10:00:00.000Z',
    },
    {
      id: 'sec-2',
      manuscriptId: 'manu-101',
      title: 'Related Work & Baselines',
      sectionType: 'RelatedWork',
      orderIndex: 1,
      contentMarkdown: 'Prior work on LoRA established low-rank parameter decomposition.',
      contentLatex: '',
      wordCount: 340,
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T10:00:00.000Z',
    },
  ];

  const mockComments: ReviewComment[] = [
    {
      id: 'comm-1',
      manuscriptId: 'manu-101',
      sectionId: 'sec-1',
      reviewerId: 'user-rev-1',
      commentText: 'Baseline comparison lacks recent 2025 benchmark models.',
      severity: 'MajorScientific',
      status: 'Open',
      highlightedText: 'suffer from high fine-tuning overhead',
      createdAt: '2026-09-30T11:00:00.000Z',
      updatedAt: '2026-09-30T11:00:00.000Z',
      reviewer: {
        id: 'user-rev-1',
        fullName: 'Dr. Jane PeerReviewer',
      },
    },
    {
      id: 'comm-2',
      manuscriptId: 'manu-101',
      sectionId: 'sec-2',
      reviewerId: 'user-rev-1',
      commentText: 'Typo in equation 3 definition.',
      severity: 'GrammarOrTypo',
      status: 'FixedByResearcher',
      fixNote: 'Corrected subscript indexing in paragraph 2.',
      createdAt: '2026-09-30T11:30:00.000Z',
      updatedAt: '2026-09-30T12:00:00.000Z',
      reviewer: {
        id: 'user-rev-1',
        fullName: 'Dr. Jane PeerReviewer',
      },
    },
  ];

  const mockChecklist: ManuscriptChecklistItem[] = [
    {
      id: 'chk-1',
      manuscriptId: 'manu-101',
      label: 'Ethics Statement & IRB Approval',
      isCompleted: true,
      completedBy: 'user-sup-1',
      isLocked: true,
      orderIndex: 0,
      createdAt: '2026-09-30T10:00:00.000Z',
    },
    {
      id: 'chk-2',
      manuscriptId: 'manu-101',
      label: 'Open Source Code & Data Availability Check',
      isCompleted: false,
      isLocked: false,
      orderIndex: 1,
      createdAt: '2026-09-30T10:00:00.000Z',
    },
  ];

  const mockVersions: ManuscriptVersion[] = [
    {
      id: 'ver-1',
      manuscriptId: 'manu-101',
      versionNumber: 1,
      versionName: 'Initial Internal Draft',
      snapshotData: {
        title: mockManuscript.title,
        status: 'Draft',
        sections: [],
        authors: [],
        citations: [],
      },
      createdBy: 'user-author-1',
      createdAt: '2026-09-30T09:00:00.000Z',
      creator: {
        id: 'user-author-1',
        fullName: 'Alex Researcher',
      },
    },
  ];

  it('1. CreateManuscriptModal renders title, target venue, and default IMRAD structure checkbox', () => {
    const html = renderToString(
      <CreateManuscriptModal
        isOpen={true}
        onClose={() => {}}
        projectId="proj-1"
        projects={[
          { id: 'proj-1', title: 'Deep Learning & Neural Systems Laboratory', isPersonal: false } as any,
          { id: 'proj-2', title: 'Transformer Memory Optimization', isPersonal: true } as any,
        ]}
        onManuscriptCreated={() => {}}
      />
    );

    assert.ok(html.includes('New Academic Manuscript'), 'Should render title header');
    assert.ok(html.includes('Research Project Workspace'), 'Should render project selector');
    assert.ok(html.includes('Deep Learning &amp; Neural Systems Laboratory'), 'Should list project option');
    assert.ok(html.includes('Target Publication Venue'), 'Should render target venue field');
    assert.ok(html.includes('Initialize Standard IMRAD Section Structure'), 'Should render IMRAD toggle');
  });

  it('2. CitationSearchModal renders search input, citation key input, and literature insertion controls', () => {
    const html = renderToString(
      <CitationSearchModal
        isOpen={true}
        onClose={() => {}}
        projectId="proj-1"
        sectionId="sec-1"
        onInsertCitation={async () => {}}
      />
    );

    assert.ok(html.includes('Insert Literature Citation'), 'Should render modal title');
    assert.ok(html.includes('Search by title, author, DOI, or keyword...'), 'Should render search input');
    assert.ok(html.includes('Select a paper to configure citation'), 'Should render selection prompt');
  });

  it('3. WhyDidICiteThisModal renders modal dialog container and citation header badge', () => {
    const html = renderToString(
      <WhyDidICiteThisModal
        isOpen={true}
        onClose={() => {}}
        manuscriptId="manu-101"
        citationKey="Vaswani2017Attention"
      />
    );

    assert.ok(html.includes('Why Did I Cite This?'), 'Should render Why Did I Cite This header');
    assert.ok(html.includes('@Vaswani2017Attention'), 'Should render citation key badge');
    assert.ok(html.includes('Retrieving scholarly context &amp; annotations...'), 'Should render loading state');
  });

  it('4. ReviewCommentDrawer renders comment threads, severity badges, and author fix-note displays', () => {
    const html = renderToString(
      <ReviewCommentDrawer
        manuscriptId="manu-101"
        comments={mockComments}
        sections={mockSections}
        activeSectionId="sec-1"
        isAuthor={true}
        isSupervisor={false}
        isReviewer={false}
        onRefreshComments={async () => {}}
      />
    );

    assert.ok(html.includes('Peer Review Comments (2)'), 'Should render comment count');
    assert.ok(html.includes('Major Scientific'), 'Should render MajorScientific severity badge');
    assert.ok(html.includes('Grammar / Typo'), 'Should render GrammarOrTypo severity badge');
    assert.ok(html.includes('suffer from high fine-tuning overhead'), 'Should render quoted text snippet');
    assert.ok(html.includes('Corrected subscript indexing in paragraph 2.'), 'Should render author fix justification');
    assert.ok(html.includes('Mark as Fixed (Add Note)'), 'Author should see Mark as Fixed button');
  });

  it('5. ReviewCommentDrawer displays Verify & Resolve action for Supervisor', () => {
    const html = renderToString(
      <ReviewCommentDrawer
        manuscriptId="manu-101"
        comments={mockComments}
        sections={mockSections}
        activeSectionId="sec-1"
        isAuthor={false}
        isSupervisor={true}
        isReviewer={false}
        onRefreshComments={async () => {}}
      />
    );

    assert.ok(html.includes('Verify &amp; Resolve'), 'Supervisor should see Verify & Resolve button');
  });

  it('6. SubmissionChecklistCard renders checklist items, supervisor lock badge, and blocker warning', () => {
    const html = renderToString(
      <SubmissionChecklistCard
        manuscript={mockManuscript}
        checklistItems={mockChecklist}
        isAuthor={true}
        isSupervisor={false}
        unresolvedMajorCount={1}
        openCommentsCount={1}
        onRefreshManuscript={async () => {}}
      />
    );

    assert.ok(html.includes('Submission Governance'), 'Should render checklist title');
    assert.ok(html.includes('Submission Approval Blocked'), 'Should render blocker banner when unresolved major flaw exists');
    assert.ok(html.includes('Ethics Statement &amp; IRB Approval'), 'Should render locked checklist item');
    assert.ok(html.includes('Submit for Internal Peer Review'), 'Draft status should show Submit for Review button');
  });

  it('7. AssignReviewerModal renders team member selection and review deadline selector', () => {
    const mockMembers = [
      { userId: 'user-rev-1', fullName: 'Dr. Jane PeerReviewer', role: 'Researcher' },
    ];

    const html = renderToString(
      <AssignReviewerModal
        isOpen={true}
        onClose={() => {}}
        manuscriptId="manu-101"
        projectMembers={mockMembers}
        onReviewerAssigned={async () => {}}
      />
    );

    assert.ok(html.includes('Assign Internal Reviewer'), 'Should render assign reviewer title');
    assert.ok(html.includes('Dr. Jane PeerReviewer'), 'Should render member in dropdown');
    assert.ok(html.includes('Review Deadline (Optional)'), 'Should render deadline input');
  });

  it('8. VersionHistoryModal renders recorded snapshots with version numbers and author metadata', () => {
    const html = renderToString(
      <VersionHistoryModal
        isOpen={true}
        onClose={() => {}}
        manuscriptId="manu-101"
        versions={mockVersions}
        canEdit={true}
        onRefreshVersions={async () => {}}
        onVersionRestored={async () => {}}
      />
    );

    assert.ok(html.includes('Snapshot Version History'), 'Should render version modal title');
    assert.ok(html.includes('v1.0'), 'Should render version badge');
    assert.ok(html.includes('Initial Internal Draft'), 'Should render snapshot version name');
    assert.ok(html.includes('Alex Researcher'), 'Should render creator name');
    assert.ok(html.includes('Create Frozen Snapshot'), 'Should render create snapshot form');
  });

  it('9. LatexPaperPreview renders citation markers without duplicate double-brackets', () => {
    const mockCitations: ManuscriptCitation[] = [
      {
        id: 'cit-1',
        manuscriptId: 'manu-101',
        paperId: 'paper-1',
        citationKey: 'Tunzina2026GreenaiComparative',
        inTextLabel: '[@Tunzina2026GreenaiComparative]',
        contextNote: 'Related Prior Research',
        paper: {
          id: 'paper-1',
          title: 'GreenAI: A Comparative Analysis of Environmental Efficiency',
          authors: ['Tayrin Tunzina', 'Alex Vance'],
          year: 2026,
          venue: 'ACM Computing Surveys',
        },
        createdAt: '2026-09-30T10:00:00.000Z',
      },
    ];

    const testSections: ManuscriptSection[] = [
      {
        id: 'sec-1',
        manuscriptId: 'manu-101',
        title: 'Abstract',
        sectionType: 'Abstract',
        orderIndex: 0,
        contentMarkdown: 'Investigating environmental efficiency [@Tunzina2026GreenaiComparative] in deep learning.',
        contentLatex: '',
        wordCount: 15,
        createdAt: '2026-09-30T10:00:00.000Z',
        updatedAt: '2026-09-30T10:00:00.000Z',
      },
    ];

    const html = renderToString(
      <LatexPaperPreview
        manuscript={mockManuscript}
        sections={testSections}
        activeSectionId="sec-1"
        activeSectionContent="Investigating environmental efficiency [@Tunzina2026GreenaiComparative] in deep learning."
        citations={mockCitations}
        onCitationClick={() => {}}
      />
    );

    // Verify it renders single bracket [@Tunzina2026GreenaiComparative] and NEVER [[@Tunzina2026GreenaiComparative]]
    assert.ok(
      html.includes('[@Tunzina2026GreenaiComparative]'),
      'Should render single-bracketed citation marker'
    );
    assert.ok(
      !html.includes('[[@Tunzina2026GreenaiComparative]]'),
      'Must NOT contain duplicate outer brackets [[@...]]'
    );
  });

  it('10. LatexPaperPreview resolves author-year citations properly when inTextLabel is clean', () => {
    const mockCitations: ManuscriptCitation[] = [
      {
        id: 'cit-2',
        manuscriptId: 'manu-101',
        paperId: 'paper-2',
        citationKey: 'Vaswani2017Attention',
        inTextLabel: 'Vaswani et al., 2017',
        contextNote: 'Foundational transformer architecture',
        paper: {
          id: 'paper-2',
          title: 'Attention Is All You Need',
          authors: ['Ashish Vaswani', 'Noam Shazeer'],
          year: 2017,
          venue: 'NeurIPS',
        },
        createdAt: '2026-09-30T10:00:00.000Z',
      },
    ];

    const testSections: ManuscriptSection[] = [
      {
        id: 'sec-2',
        manuscriptId: 'manu-101',
        title: 'Methodology',
        sectionType: 'Methodology',
        orderIndex: 1,
        contentMarkdown: 'We apply attention [@Vaswani2017Attention] to genomic sequence tokens.',
        contentLatex: '',
        wordCount: 12,
        createdAt: '2026-09-30T10:00:00.000Z',
        updatedAt: '2026-09-30T10:00:00.000Z',
      },
    ];

    const html = renderToString(
      <LatexPaperPreview
        manuscript={mockManuscript}
        sections={testSections}
        activeSectionId="sec-2"
        activeSectionContent="We apply attention [@Vaswani2017Attention] to genomic sequence tokens."
        citations={mockCitations}
        onCitationClick={() => {}}
      />
    );

    assert.ok(
      html.includes('[Vaswani et al., 2017]'),
      'Should format author-year cleanly as [Vaswani et al., 2017]'
    );
    assert.ok(
      !html.includes('[[Vaswani et al., 2017]]'),
      'Must NOT double bracket author-year citation'
    );
  });

  it('11. InsertFigureModal renders image sources, preset gallery, and LaTeX syntax preview', () => {
    const html = renderToString(
      <InsertFigureModal
        isOpen={true}
        onClose={() => {}}
        onInsertFigure={() => {}}
      />
    );

    assert.ok(html.includes('Insert Scholarly Figure'), 'Should render modal title');
    assert.ok(html.includes('Upload File'), 'Should render Upload tab');
    assert.ok(html.includes('Image URL'), 'Should render URL tab');
    assert.ok(html.includes('Scientific Presets'), 'Should render Presets tab');
    assert.ok(html.includes('Syntax Format:'), 'Should render syntax format selector');
    assert.ok(html.includes('\\begin{figure}'), 'Should display preview snippet');
    assert.ok(html.includes('Insert Figure in Section'), 'Should render insert button');
  });

  it('12. ManuscriptGuidelinesModal renders academic author guide categories and copy actions', () => {
    const html = renderToString(
      <ManuscriptGuidelinesModal
        isOpen={true}
        onClose={() => {}}
        onInsertSnippet={() => {}}
      />
    );

    assert.ok(html.includes('Manuscript Authoring Guide &amp; Cheatsheet'), 'Should render guidelines title');
    assert.ok(html.includes('1. Quickstart Guide'), 'Should render quickstart category');
    assert.ok(html.includes('2. IMRAD Structure'), 'Should render IMRAD category');
    assert.ok(html.includes('3. Citations &amp; BibTeX'), 'Should render Citations category');
    assert.ok(html.includes('4. LaTeX Figures &amp; Media'), 'Should render Figures category');
    assert.ok(html.includes('5. LaTeX Math &amp; Equations'), 'Should render Math category');
    assert.ok(html.includes('6. Reviews &amp; Governance'), 'Should render Reviews category');
    assert.ok(html.includes('7. Shortcuts &amp; Cheatsheet'), 'Should render Shortcuts category');
  });

  it('13. LatexPaperPreview renders author/affiliation block and parses LaTeX figure environments into Figure Cards', () => {
    const testSections: ManuscriptSection[] = [
      {
        id: 'sec-results',
        manuscriptId: 'manu-101',
        title: 'Experimental Results',
        sectionType: 'Results',
        orderIndex: 2,
        contentMarkdown: `We demonstrate the model behavior below.\n\n\\begin{figure}[htbp]\n  \\centering\n  \\includegraphics[width=0.9\\linewidth]{https://example.com/nas-dag.png}\n  \\caption{Architecture search DAG on genomic motifs.}\n  \\label{fig:nas-dag}\n\\end{figure}\n\nAs observed in the figure above, convergence is steady.`,
        contentLatex: '',
        wordCount: 30,
        createdAt: '2026-09-30T10:00:00.000Z',
        updatedAt: '2026-09-30T10:00:00.000Z',
      },
    ];

    const html = renderToString(
      <LatexPaperPreview
        manuscript={mockManuscript}
        sections={testSections}
        activeSectionId="sec-results"
        activeSectionContent={testSections[0].contentMarkdown}
        citations={[]}
        onCitationClick={() => {}}
      />
    );

    // Verify Title & Author Affiliation hierarchy
    assert.ok(html.includes('Alex Chen'), 'Should render first author');
    assert.ok(html.includes('Sarah Vance'), 'Should render co-author');
    assert.ok(html.includes('Computational Biology &amp; AI Laboratory'), 'Should render MIT lab');
    assert.ok(html.includes('Stanford University'), 'Should render Stanford affiliation');
    assert.ok(html.includes('alex.chen@mit.edu'), 'Should render corresponding email badge');

    // Verify Figure Card Rendering
    assert.ok(html.includes('Figure 1:'), 'Should render figure index');
    assert.ok(html.includes('Architecture search DAG on genomic motifs.'), 'Should render parsed caption');
    assert.ok(html.includes('\\fig:nas-dag'), 'Should render label badge');
    assert.ok(html.includes('Click to expand figure'), 'Should render interactive zoom hint');
  });

  it('14. sanitizeFigurePath sanitizes user uploaded filenames to clean Overleaf-style relative paths', () => {
    assert.equal(
      sanitizeFigurePath('Distribution Imbalanced Dataset.PNG'),
      'figures/distribution_imbalanced_dataset.png'
    );
    assert.equal(
      sanitizeFigurePath('plot (1) final!.jpeg'),
      'figures/plot_1_final.jpeg'
    );
    assert.equal(
      sanitizeFigurePath(''),
      'figures/figure1.png'
    );
  });

  it('15. LatexPaperPreview resolves clean relative figures/... path from figureAssets registry', () => {
    const figureSection: ManuscriptSection = {
      id: 'sec-fig-test',
      manuscriptId: 'manu-101',
      title: 'Methodology and Visualizations',
      sectionType: 'Methodology',
      orderIndex: 3,
      contentMarkdown: `\\begin{figure}[h]\n  \\centering\n  \\includegraphics[width=0.9\\linewidth]{figures/nas_distribution.png}\n  \\caption{Bar graph of the dataset, imbalanced state.}\n  \\label{fig:nas-cell}\n\\end{figure}`,
      contentLatex: '',
      wordCount: 20,
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T10:00:00.000Z',
    };

    const mockAssets = {
      'figures/nas_distribution.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    };

    const html = renderToString(
      <LatexPaperPreview
        manuscript={mockManuscript}
        sections={[figureSection]}
        activeSectionId="sec-fig-test"
        activeSectionContent={figureSection.contentMarkdown}
        citations={[]}
        figureAssets={mockAssets}
        onCitationClick={() => {}}
      />
    );

    // Verify the image source is resolved to the cached binary data
    assert.ok(
      html.includes('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='),
      'Preview should resolve clean figures/... path to registered binary data'
    );
    assert.ok(
      html.includes('Bar graph of the dataset, imbalanced state.'),
      'Preview should render parsed caption'
    );
    assert.ok(
      html.includes('\\fig:nas-cell'),
      'Preview should render label'
    );
    assert.ok(
      html.includes('figures/nas_distribution.png'),
      'Preview should display clean relative asset path badge'
    );
  });
});
