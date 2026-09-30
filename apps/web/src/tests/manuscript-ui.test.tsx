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
});
