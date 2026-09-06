import React, { useState } from 'react';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { BlogModal, BlogPost } from './BlogModal';

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'citation-purpose',
    category: 'METHODOLOGY',
    categoryColor: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
    readTime: '5 min read',
    date: 'Aug 12, 2026',
    author: 'Dr. Elena Rostova',
    authorRole: 'Senior Research Fellow, Cambridge AI Institute',
    title: 'How Structured Citation Purposes Prevent Literature Gaps During Peer Review',
    excerpt: 'Why recording the exact reason for citing a paper at the moment of reading saves weeks during manuscript drafting and eliminates vague citations.',
    keyTakeaway: 'Tagging papers at reading time with explicit roles (Baseline, Contradicting Evidence, Methodological Core) accelerates manuscript synthesis by 4.5x and defends your bibliography against critical peer reviewers.',
    content: [
      'In traditional literature review workflows, researchers accumulate hundreds of PDF papers into generic folders. By the time manuscript drafting begins three to six months later, the author remembers that a paper was important, but forgets whether it served as an experimental baseline, a dataset origin, or a theoretical counterpoint.',
      'This cognitive decay leads to what peer reviewers frequently criticize as "citation stuffing" — citing famous papers without articulating how the new work builds upon or departs from them.',
      'By establishing structured Citation Purposes inside the literature manager (e.g. "Comparison Baseline for Section 4", "Contradicting Finding in Sub-Group Analysis"), researchers preserve the exact scholarly motivation. When drafting the Related Work and Discussion sections in ResearchOS, the citation autocompleter instantly reminds the author of why the paper was cataloged.',
      'Laboratory trials demonstrate that structured citation classification reduces manuscript revision cycles and significantly improves reviewer sentiment during internal and external peer review.',
    ],
  },
  {
    id: 'lab-reproducibility',
    category: 'LAB PRODUCTIVITY',
    categoryColor: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
    readTime: '7 min read',
    date: 'Jul 28, 2026',
    author: 'Marcus Vance, PhD',
    authorRole: 'Principal Machine Learning Scientist, Vector Lab',
    title: 'Eliminating the "Works on My Machine" Crisis in Deep Learning Research',
    excerpt: 'A practical framework for hyperparameter tracking, dataset hashing, and reproducible experiment diffs across distributed lab workstations.',
    keyTakeaway: 'Attaching hyperparameter configurations and dataset commit hashes directly to project deliverable tasks ensures full reproducibility before a milestone can be marked approved by the PI.',
    content: [
      'The reproducibility crisis in modern computational science is rarely due to malicious intent; rather, it stems from undocumented hyperparameter drift and informal environment differences between graduate student workstations and lab compute clusters.',
      'A typical scenario involves a researcher achieving breakthrough validation accuracy on a Friday afternoon, only to find that subsequent model runs on Monday produce degraded results because a learning rate decay schedule or random seed was tweaked without being logged.',
      'ResearchOS solves this by binding every experiment run to an immutable JSON parameter configuration and dataset hash. When a researcher submits a task for supervisor review, the run evidence is embedded alongside loss curves.',
      'Supervisors can compare baseline runs against the candidate run in a side-by-side diff matrix, guaranteeing that reported benchmark numbers are fully audited before manuscript preparation.',
    ],
  },
  {
    id: 'supervisor-approval-loop',
    category: 'SUPERVISION',
    categoryColor: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
    readTime: '4 min read',
    date: 'Jul 15, 2026',
    author: 'Prof. Julian Thorne',
    authorRole: 'Department Chair & PI, Oxford Robotics & AI',
    title: 'The Supervisor Approval Loop: Scaling Thesis Advising Without Email Fatigue',
    excerpt: 'How structured deliverable transitions between "Submitted", "Under Review", and "Revision Requested" save PI hours and clarify feedback for students.',
    keyTakeaway: 'Replacing unstructured email threads with an explicit state-transition workflow creates psychological safety for graduate students and gives faculty clear, time-bounded review queues.',
    content: [
      'Faculty members advising 6 to 12 graduate students simultaneously face an avalanche of disconnected email attachments, messy Google Docs comments, and Slack messages with conflicting revision versions.',
      'Without a formal state machine, students are often unsure whether their deliverable has been formally accepted or if further revisions are required before proceeding to the next thesis chapter.',
      'The Supervisor Approval Loop in ResearchOS introduces strict, unambiguous state transitions: To-Do → In Progress → Submitted → Under Review → Approved or Revision Requested.',
      'When a student clicks "Submit for Approval", the work lands in the PI\'s centralized queue. The PI can review the attached evidence, type a concise structured feedback note, and either approve the milestone or return it for revision with single-click precision. This structure saves 4+ hours per week per faculty advisor while dramatically reducing student anxiety.',
    ],
  },
];

export const BlogsSection: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <section id="blogs" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          Research Methodology & Insights
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight mb-4">
          Latest Thinking on{' '}
          <span className="text-gradient-cyan-violet italic">Academic Workflows</span> & Scientific AI.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Essays, guides, and practical methodologies from university faculty, research directors, and doctoral candidates.
        </p>
      </div>

      {/* 3-Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {BLOG_POSTS.map((post) => (
          <article
            key={post.id}
            onClick={() => setSelectedPost(post)}
            className="card-glass-interactive rounded-3xl p-6 sm:p-7 flex flex-col justify-between border border-white/[0.08] cursor-pointer group"
          >
            <div>
              {/* Category and Read Time */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${post.categoryColor}`}>
                  {post.category}
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-400" /> {post.readTime}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-white font-serif mb-3 leading-snug group-hover:text-purple-300 transition-colors">
                {post.title}
              </h3>

              {/* Excerpt */}
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                {post.excerpt}
              </p>
            </div>

            {/* Author and Read Action */}
            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">{post.author}</div>
                <div className="text-[10px] font-mono text-slate-400">{post.date}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-purple-500/20 group-hover:text-purple-300 flex items-center justify-center text-slate-400 transition-colors">
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Reading Modal */}
      <BlogModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
      />
    </section>
  );
};
