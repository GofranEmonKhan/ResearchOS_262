import { supabase } from '../supabase.js';
import { 
  Profile, 
  UpdateProfileDto, 
  SubmitSupervisorVerificationDto, 
  SupervisorVerificationRequest, 
  UserRole,
  Project,
  Paper,
  CreatePaperDto,
  UpdatePaperDto,
  PaperSearchParams,
  PaperListResponse,
  MetadataResult,
  Collection,
  CreateCollectionDto,
  UpdateCollectionDto,
  PaperSidebarFields,
  UpdateSidebarFieldsDto,
  PaperAnnotation,
  CreateAnnotationDto,
  UpdateAnnotationDto,
  PaperComment,
  AddPaperCommentDto,
  CitationPurpose,
  CreateCitationPurposeDto,
  Experiment,
  CreateExperimentDto,
  UpdateExperimentDto,
  ExperimentSearchParams,
  ExperimentListResponse,
  ExperimentComparisonResponse,
  ExperimentFlag,
  CreateExperimentFlagDto,
  ResolveExperimentFlagDto,
  ExperimentComment,
  AddExperimentCommentDto,
} from '@researchos/shared-types';

export const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;
export const API_BASE = env?.VITE_API_URL || '';

export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_auth_token') || '' : '');
}

/**
 * Standard authenticated fetch helper that attaches the live Supabase JWT
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `API Request Failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Profiles
  async getMe(): Promise<Profile> {
    return fetchApi<Profile>('/me');
  },

  async updateProfile(updates: UpdateProfileDto): Promise<Profile> {
    return fetchApi<Profile>('/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Supervisor Verification
  async submitSupervisorVerification(dto: SubmitSupervisorVerificationDto): Promise<SupervisorVerificationRequest> {
    return fetchApi<SupervisorVerificationRequest>('/supervisor-verification', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Admin APIs
  async getAdminSupervisorVerifications(): Promise<SupervisorVerificationRequest[]> {
    return fetchApi<SupervisorVerificationRequest[]>('/admin/supervisor-verifications');
  },

  async approveSupervisorVerification(id: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/admin/supervisor-verifications/${id}/approve`, {
      method: 'POST',
    });
  },

  async rejectSupervisorVerification(id: string, rejectionReason: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/admin/supervisor-verifications/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  },

  async suspendUser(id: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/admin/users/${id}/suspend`, {
      method: 'POST',
    });
  },

  async forcePasswordReset(id: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/admin/users/${id}/force-password-reset`, {
      method: 'POST',
    });
  },

  async changeUserRole(id: string, role: UserRole): Promise<Profile> {
    return fetchApi<Profile>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // Notifications APIs
  async getNotifications(): Promise<import('@researchos/shared-types').Notification[]> {
    return fetchApi<import('@researchos/shared-types').Notification[]>('/notifications');
  },

  async getUnreadNotificationsCount(): Promise<{ count: number }> {
    return fetchApi<{ count: number }>('/notifications/unread-count');
  },

  async markNotificationAsRead(id: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return fetchApi<{ message: string }>('/notifications/read-all', {
      method: 'POST',
    });
  },

  // Projects
  async getProjects(): Promise<Project[]> {
    return fetchApi<Project[]>('/projects');
  },

  // ==========================================
  // Literature Review & Paper Manager (Spec 03)
  // ==========================================

  // Papers
  async getPapers(params?: PaperSearchParams): Promise<PaperListResponse> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.readingStatus) query.set('readingStatus', params.readingStatus);
    if (params?.isRequiredReading !== undefined) query.set('isRequiredReading', String(params.isRequiredReading));
    if (params?.year) query.set('year', String(params.year));
    if (params?.projectId) query.set('projectId', params.projectId);
    if (params?.collectionId) query.set('collectionId', params.collectionId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return fetchApi<PaperListResponse>(`/papers${qs ? `?${qs}` : ''}`);
  },

  async getPaper(paperId: string): Promise<Paper> {
    return fetchApi<Paper>(`/papers/${paperId}`);
  },

  async getPaperDownloadUrl(paperId: string): Promise<{ signedUrl: string; fileName: string; expiresIn: number }> {
    return fetchApi<{ signedUrl: string; fileName: string; expiresIn: number }>(`/papers/${paperId}/download-url`);
  },

  async resolveMetadata(storagePath: string, fileName: string): Promise<MetadataResult> {
    return fetchApi<MetadataResult>('/metadata/resolve', {
      method: 'POST',
      body: JSON.stringify({ storagePath, fileName }),
    });
  },

  async createPaper(dto: CreatePaperDto): Promise<Paper> {
    return fetchApi<Paper>('/papers', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updatePaper(paperId: string, dto: UpdatePaperDto): Promise<Paper> {
    return fetchApi<Paper>(`/papers/${paperId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deletePaper(paperId: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/papers/${paperId}`, {
      method: 'DELETE',
    });
  },

  async sharePaper(paperId: string, projectId: string): Promise<Paper> {
    return fetchApi<Paper>(`/papers/${paperId}/share`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },

  async setRequiredReading(paperId: string, isRequired: boolean, linkedTaskId?: string): Promise<{ message: string }> {
    if (isRequired) {
      return fetchApi<{ message: string }>(`/papers/${paperId}/required-reading`, {
        method: 'POST',
        body: JSON.stringify({ linkedTaskId }),
      });
    } else {
      return fetchApi<{ message: string }>(`/papers/${paperId}/required-reading`, {
        method: 'DELETE',
      });
    }
  },

  // Collections
  async getCollections(): Promise<Collection[]> {
    return fetchApi<Collection[]>('/collections');
  },

  async createCollection(dto: CreateCollectionDto): Promise<Collection> {
    return fetchApi<Collection>('/collections', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateCollection(id: string, dto: UpdateCollectionDto): Promise<Collection> {
    return fetchApi<Collection>(`/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteCollection(id: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/collections/${id}`, {
      method: 'DELETE',
    });
  },

  async addPaperToCollection(collectionId: string, paperId: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/collections/${collectionId}/papers`, {
      method: 'POST',
      body: JSON.stringify({ paperId }),
    });
  },

  async removePaperFromCollection(collectionId: string, paperId: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/collections/${collectionId}/papers/${paperId}`, {
      method: 'DELETE',
    });
  },

  // Export
  async exportPapers(
    format: 'bibtex' | 'ris',
    options?: { paperIds?: string[]; projectId?: string; collectionId?: string }
  ): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const query = new URLSearchParams();
    query.set('format', format);
    if (options?.paperIds && options.paperIds.length > 0) {
      query.set('paperIds', options.paperIds.join(','));
    }
    if (options?.projectId) query.set('projectId', options.projectId);
    if (options?.collectionId) query.set('collectionId', options.collectionId);

    const res = await fetch(`${API_BASE}/papers/export?${query.toString()}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Export failed');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = `researchos-export.${format === 'bibtex' ? 'bib' : 'ris'}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Sidebar Fields
  async getSidebar(paperId: string): Promise<PaperSidebarFields> {
    return fetchApi<PaperSidebarFields>(`/papers/${paperId}/sidebar`);
  },

  async updateSidebar(paperId: string, dto: UpdateSidebarFieldsDto): Promise<PaperSidebarFields> {
    return fetchApi<PaperSidebarFields>(`/papers/${paperId}/sidebar`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  // Annotations
  async getAnnotations(paperId: string): Promise<PaperAnnotation[]> {
    return fetchApi<PaperAnnotation[]>(`/papers/${paperId}/annotations`);
  },

  async createAnnotation(paperId: string, dto: CreateAnnotationDto): Promise<PaperAnnotation> {
    return fetchApi<PaperAnnotation>(`/papers/${paperId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateAnnotation(annotationId: string, dto: UpdateAnnotationDto): Promise<PaperAnnotation> {
    return fetchApi<PaperAnnotation>(`/annotations/${annotationId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteAnnotation(annotationId: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/annotations/${annotationId}`, {
      method: 'DELETE',
    });
  },

  // Paper Comments
  async getComments(paperId: string): Promise<PaperComment[]> {
    return fetchApi<PaperComment[]>(`/papers/${paperId}/comments`);
  },

  async addComment(paperId: string, dto: AddPaperCommentDto): Promise<PaperComment> {
    return fetchApi<PaperComment>(`/papers/${paperId}/comments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  // Citation Purposes
  async getCitations(paperId: string): Promise<CitationPurpose[]> {
    return fetchApi<CitationPurpose[]>(`/papers/${paperId}/citations`);
  },

  async addCitation(paperId: string, dto: CreateCitationPurposeDto): Promise<CitationPurpose> {
    return fetchApi<CitationPurpose>(`/papers/${paperId}/citations`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async deleteCitation(citationId: string): Promise<{ message: string }> {
    return fetchApi<{ message: string }>(`/citations/${citationId}`, {
      method: 'DELETE',
    });
  },

  // ==========================================
  // Experiment Tracker (Spec 04)
  // ==========================================
  async getProjectExperiments(projectId: string, params?: ExperimentSearchParams): Promise<ExperimentListResponse> {
    const query = new URLSearchParams();
    if (params?.purpose) query.set('purpose', params.purpose);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return fetchApi<ExperimentListResponse>(`/projects/${projectId}/experiments${qs ? `?${qs}` : ''}`);
  },

  async createExperiment(projectId: string, dto: CreateExperimentDto): Promise<Experiment> {
    return fetchApi<Experiment>(`/projects/${projectId}/experiments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getExperimentById(experimentId: string): Promise<Experiment> {
    return fetchApi<Experiment>(`/experiments/${experimentId}`);
  },

  async updateExperiment(experimentId: string, dto: UpdateExperimentDto): Promise<Experiment> {
    return fetchApi<Experiment>(`/experiments/${experimentId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async deleteExperiment(experimentId: string): Promise<void> {
    return fetchApi<void>(`/experiments/${experimentId}`, {
      method: 'DELETE',
    });
  },

  async finalizeExperiment(experimentId: string): Promise<Experiment> {
    return fetchApi<Experiment>(`/experiments/${experimentId}/finalize`, {
      method: 'POST',
    });
  },

  async compareExperiments(experimentIds: string[]): Promise<ExperimentComparisonResponse> {
    const query = new URLSearchParams();
    query.set('ids', experimentIds.join(','));
    return fetchApi<ExperimentComparisonResponse>(`/experiments/compare?${query.toString()}`);
  },

  async getExperimentFlags(experimentId: string): Promise<ExperimentFlag[]> {
    return fetchApi<ExperimentFlag[]>(`/experiments/${experimentId}/flags`);
  },

  async createExperimentFlag(experimentId: string, dto: CreateExperimentFlagDto): Promise<ExperimentFlag> {
    return fetchApi<ExperimentFlag>(`/experiments/${experimentId}/flags`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async resolveExperimentFlag(flagId: string, dto: ResolveExperimentFlagDto): Promise<ExperimentFlag> {
    return fetchApi<ExperimentFlag>(`/experiments/flags/${flagId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  async getExperimentComments(experimentId: string): Promise<ExperimentComment[]> {
    return fetchApi<ExperimentComment[]>(`/experiments/${experimentId}/comments`);
  },

  async addExperimentComment(experimentId: string, dto: AddExperimentCommentDto): Promise<ExperimentComment> {
    return fetchApi<ExperimentComment>(`/experiments/${experimentId}/comments`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getTaskLinkedExperiments(taskId: string): Promise<Experiment[]> {
    return fetchApi<Experiment[]>(`/tasks/${taskId}/experiments`);
  },

  async linkTaskExperiment(taskId: string, experimentId: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/tasks/${taskId}/experiments`, {
      method: 'POST',
      body: JSON.stringify({ experimentId }),
    });
  },

  async unlinkTaskExperiment(taskId: string, experimentId: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/tasks/${taskId}/experiments/${experimentId}`, {
      method: 'DELETE',
    });
  },
};
