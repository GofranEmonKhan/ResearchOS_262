import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { AuthProvider } from '../context/AuthContext.js';
import { CollectionSidebar } from '../components/literature/CollectionSidebar.js';
import { PaperCard } from '../components/literature/PaperCard.js';
import { UploadPaperModal } from '../components/literature/UploadPaperModal.js';
import { PaperMetadataModal } from '../components/literature/PaperMetadataModal.js';
import { SharePaperModal } from '../components/literature/SharePaperModal.js';
import { AnnotationList } from '../components/literature/AnnotationList.js';
import { HighlightPopover } from '../components/literature/HighlightPopover.js';
import { SmartResearchSidebar } from '../components/literature/SmartResearchSidebar.js';
import { LibraryPage } from '../pages/dashboards/LibraryPage.js';
import { Paper, Collection, Project, PaperAnnotation } from '@researchos/shared-types';

describe('Spec 03 — Literature Review, PDF Reader & Smart Sidebar UI Tests', () => {
  const mockCollections: Collection[] = [
    {
      id: 'col-1',
      ownerId: 'user-123',
      name: 'Transformers & LLMs',
      colorHex: '#8B5CF6',
      paperCount: 4,
    },
    {
      id: 'col-2',
      ownerId: 'user-123',
      name: 'Computer Vision',
      colorHex: '#10B981',
      paperCount: 2,
    },
  ];

  const mockPaper: Paper = {
    id: 'paper-101',
    uploaderId: 'user-123',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar'],
    year: 2017,
    venue: 'NeurIPS',
    doi: '10.5555/3295222.3295349',
    readingStatus: 'Reading',
    isRequiredReading: true,
    metadataSource: 'crossref',
    metadataConfidence: 0.96,
    fileAssetId: 'asset-1',
    createdAt: new Date().toISOString(),
    fileAsset: {
      id: 'asset-1',
      storagePath: 'user-123/uuid.pdf',
      fileName: 'attention.pdf',
      sizeBytes: 2500000,
    },
    collections: [mockCollections[0]],
  };

  const mockProject: Project = {
    id: 'proj-1',
    ownerId: 'user-123',
    title: 'Neural Language Models Study',
    abstract: 'Investigation into self-attention mechanisms',
    domainTags: ['NLP', 'Transformers'],
    startDate: new Date().toISOString(),
    isPersonal: false,
    status: 'Ongoing',
    progressPercent: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('1. CollectionSidebar renders library views, counts, and collections list with color swatches', () => {
    const html = renderToString(
      <CollectionSidebar
        collections={mockCollections}
        selectedCollectionId={null}
        isRequiredFilter={false}
        totalPapersCount={12}
        requiredCount={3}
        onSelectCollection={() => {}}
        onToggleRequired={() => {}}
        onRefreshCollections={() => {}}
      />
    );

    assert.ok(html.includes('Library Views'), 'Contains Library Views section');
    assert.ok(html.includes('All Papers'), 'Contains All Papers quick filter');
    assert.ok(html.includes('12'), 'Contains total papers count badge');
    assert.ok(html.includes('Required Reading'), 'Contains Required Reading filter');
    assert.ok(html.includes('3'), 'Contains required count badge');
    assert.ok(html.includes('Transformers &amp; LLMs') || html.includes('Transformers & LLMs'), 'Contains collection name');
    assert.ok(html.includes('Computer Vision'), 'Contains second collection name');
    assert.ok(html.includes('#8B5CF6'), 'Contains first collection swatch color');
    assert.ok(html.includes('#10B981'), 'Contains second collection swatch color');
  });

  it('2. CollectionSidebar highlights selected collection with active styling', () => {
    const html = renderToString(
      <CollectionSidebar
        collections={mockCollections}
        selectedCollectionId="col-1"
        isRequiredFilter={false}
        totalPapersCount={12}
        requiredCount={3}
        onSelectCollection={() => {}}
        onToggleRequired={() => {}}
        onRefreshCollections={() => {}}
      />
    );

    assert.ok(html.includes('bg-violet-600/20'), 'Selected collection has active background highlight');
  });

  it('3. PaperCard renders title, author summary, year, venue, and external DOI link', () => {
    const html = renderToString(
      <PaperCard
        paper={mockPaper}
        currentUserId="user-123"
        collections={mockCollections}
        onOpenViewer={() => {}}
        onEditMetadata={() => {}}
        onShareToProject={() => {}}
        onDeletePaper={() => {}}
        onPaperUpdated={() => {}}
      />
    );

    assert.ok(html.includes('Attention Is All You Need'), 'Contains paper title');
    assert.ok(html.includes('Ashish Vaswani et al.'), 'Contains formatted author summary');
    assert.ok(html.includes('2017'), 'Contains publication year');
    assert.ok(html.includes('NeurIPS'), 'Contains venue');
    assert.ok(html.includes('https://doi.org/10.5555/3295222.3295349'), 'Contains working external DOI link');
  });

  it('4. PaperCard renders Reading status pill, Required Reading badge, and confidence percentage', () => {
    const html = renderToString(
      <PaperCard
        paper={mockPaper}
        currentUserId="user-123"
        collections={mockCollections}
        onOpenViewer={() => {}}
        onEditMetadata={() => {}}
        onShareToProject={() => {}}
        onDeletePaper={() => {}}
        onPaperUpdated={() => {}}
      />
    );

    assert.ok(html.includes('Reading'), 'Contains active Reading status label');
    assert.ok(html.includes('Required'), 'Contains Required Reading badge');
    assert.ok(html.includes('96%'), 'Contains metadata confidence score (0.96 -> 96%)');
    assert.ok(html.includes('Transformers &amp; LLMs') || html.includes('Transformers & LLMs'), 'Contains collection tag pill');
  });

  it('5. UploadPaperModal renders dropzone, file requirements, and automated extraction subtext', () => {
    const html = renderToString(
      <UploadPaperModal
        isOpen={true}
        onClose={() => {}}
        onPaperCreated={() => {}}
        collections={mockCollections}
        projects={[mockProject]}
        currentUserId="user-123"
      />
    );

    assert.ok(html.includes('Add Paper to Library'), 'Contains modal title');
    assert.ok(html.includes('Click or drag &amp; drop') || html.includes('Click or drag & drop'), 'Contains dropzone text');
    assert.ok(html.includes('PDF format up to 50MB'), 'Contains file size limit notice');
    assert.ok(html.includes('automated CrossRef &amp; OpenAlex') || html.includes('automated CrossRef & OpenAlex'), 'Mentions automated scholarly resolution');
  });

  it('6. PaperMetadataModal renders editing form with reading status, title, authors, year, and venue', () => {
    const html = renderToString(
      <PaperMetadataModal
        paper={mockPaper}
        isOpen={true}
        onClose={() => {}}
        onPaperUpdated={() => {}}
        currentUserId="user-123"
      />
    );

    assert.ok(html.includes('Paper Details &amp; Metadata') || html.includes('Paper Details & Metadata'), 'Contains modal title');
    assert.ok(html.includes('Reading Status'), 'Contains reading status field');
    assert.ok(html.includes('Attention Is All You Need'), 'Contains paper title in form');
    assert.ok(html.includes('Ashish Vaswani, Noam Shazeer, Niki Parmar'), 'Contains comma-separated authors');
    assert.ok(html.includes('2017'), 'Contains year');
    assert.ok(html.includes('NeurIPS'), 'Contains venue');
    assert.ok(html.includes('crossref'), 'Contains metadata source provenance');
  });

  it('7. SharePaperModal lists destination projects with abstracts and collaborative notice', () => {
    const html = renderToString(
      <SharePaperModal
        paper={mockPaper}
        isOpen={true}
        onClose={() => {}}
        onPaperShared={() => {}}
        projects={[mockProject]}
      />
    );

    assert.ok(html.includes('Share Paper to Project'), 'Contains modal header');
    assert.ok(html.includes('Neural Language Models Study'), 'Contains project title');
    assert.ok(html.includes('Investigation into self-attention mechanisms'), 'Contains project abstract');
    assert.ok(html.includes('Once shared, all project members and supervisors will be able to read'), 'Contains collaborative notice');
  });

  it('8. LibraryPage renders top bar, library mode tabs, metadata search input, and action controls', () => {
    const html = renderToString(
      <AuthProvider>
        <LibraryPage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Literature Discovery &amp; Library') || html.includes('Literature Discovery & Library'), 'Contains page title');
    assert.ok(html.includes('My Library'), 'Contains My Library tab');
    assert.ok(html.includes('Project Library'), 'Contains Project Library tab');
    assert.ok(html.includes('Search title, authors, venue...'), 'Contains metadata search placeholder');
    assert.ok(html.includes('Export Citations'), 'Contains Export Citations button');
    assert.ok(html.includes('Add Paper'), 'Contains Add Paper action button');
  });

  const mockAnnotation: PaperAnnotation = {
    id: 'ann-1',
    paperId: 'paper-101',
    userId: 'user-123',
    page: 3,
    highlightedText: 'Self-attention allows the model to associate each word with all other words.',
    positionData: {
      page: 3,
      rects: [{ x: 0.15, y: 0.32, width: 0.70, height: 0.04 }],
    },
    stickyNote: 'Key architectural insight for decoder block',
    linkedSidebarField: 'Methodology',
    createdAt: new Date().toISOString(),
    user: {
      fullName: 'Dr. John Doe',
    },
  };

  it('9. AnnotationList renders list header, search input, annotation snippets, sticky notes, and linked field tags', () => {
    const html = renderToString(
      <AnnotationList
        annotations={[mockAnnotation]}
        currentUserId="user-123"
        currentPage={3}
        onJumpToPage={() => {}}
        onAnnotationDeleted={() => {}}
      />
    );

    assert.ok(html.includes('Annotations') && html.includes('1'), 'Contains annotations count header');
    assert.ok(html.includes('Search highlights or notes...'), 'Contains search input');
    assert.ok(html.includes('Page') && html.includes('3'), 'Contains page number indicator');
    assert.ok(html.includes('Dr. John Doe'), 'Contains author full name');
    assert.ok(html.includes('Self-attention allows the model to associate each word'), 'Contains highlighted text quote');
    assert.ok(html.includes('Key architectural insight for decoder block'), 'Contains sticky note content');
    assert.ok(html.includes('Linked to') && html.includes('Methodology'), 'Contains linked sidebar field tag');
  });

  it('10. HighlightPopover renders selected text quote, sticky note toggle, linked research field selector, and action buttons', () => {
    const html = renderToString(
      <HighlightPopover
        paperId="paper-101"
        pageNumber={2}
        highlightedText="Transformer achieves 28.4 BLEU on the WMT 2014 English-to-German translation task."
        rects={[{ x: 0.1, y: 0.2, width: 0.8, height: 0.05 }]}
        position={{ top: 200, left: 300 }}
        onClose={() => {}}
        onAnnotationCreated={() => {}}
      />
    );

    assert.ok(html.includes('Add Annotation'), 'Contains popover header');
    assert.ok(html.includes('Transformer achieves 28.4 BLEU'), 'Contains selected text preview');
    assert.ok(html.includes('+ Add Sticky Note'), 'Contains sticky note toggle button');
    assert.ok(html.includes('Link to Research Gap or Analysis'), 'Contains linked field selector label');
    assert.ok(html.includes('Save Highlight'), 'Contains save highlight submit button');
  });

  it('11. SmartResearchSidebar renders tabs and Structured Synthesis fields', () => {
    const html = renderToString(
      <SmartResearchSidebar
        paper={mockPaper}
        currentUserId="user-123"
      />
    );

    assert.ok(html.includes('Smart Research Sidebar'), 'Contains sidebar title');
    assert.ok(html.includes('Analysis'), 'Contains Analysis tab');
    assert.ok(html.includes('Notes'), 'Contains Notes tab');
    assert.ok(html.includes('Citations'), 'Contains Citations tab');
  });
});

