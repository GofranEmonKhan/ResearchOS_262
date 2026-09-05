import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireProjectOwnerSupervisor, requireProjectMember } from '../middleware/workspaceGuards.js';
import {
  listUserProjects,
  getProjectById,
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  listProjectMembers,
} from '../services/project.service.js';
import { createProjectInvite, listProjectInvites, revokeProjectInvite } from '../services/invite.service.js';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  CreateProjectInviteDto,
} from '@researchos/shared-types';

const router: Router = Router();

/**
 * GET /projects
 * List all projects accessible to the authenticated user.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const projects = await listUserProjects(req.user!.id, req.user!.role);
    return res.json(projects);
  } catch (err: any) {
    console.error('Error listing projects:', err);
    return res.status(500).json({ error: err.message || 'Failed to list projects' });
  }
});

/**
 * POST /projects
 * Create a new research project.
 * - Researcher: creates personal project.
 * - Supervisor: creates supervised (or personal) project.
 */
router.post('/', authenticate, async (req: Request<{}, {}, CreateProjectDto>, res: Response) => {
  try {
    const { title, abstract, domainTags, startDate, endDate, isPersonal } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Project title is required' });
    }

    const project = await createProject(req.user!.id, req.user!.role, {
      title,
      abstract,
      domainTags,
      startDate,
      endDate,
      isPersonal,
    });

    return res.status(201).json(project);
  } catch (err: any) {
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('Error creating project:', err);
    return res.status(500).json({ error: err.message || 'Failed to create project' });
  }
});

/**
 * GET /projects/:projectId
 * Get detailed project information and members.
 */
router.get('/:projectId', authenticate, requireProjectMember('projectId'), async (req: Request<{ projectId: string }>, res: Response) => {
  try {
    const data = await getProjectById(req.user!.id, req.user!.role, req.params.projectId);
    return res.json(data);
  } catch (err: any) {
    if (err.message === 'Project not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    console.error('Error fetching project:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch project' });
  }
});

/**
 * PATCH /projects/:projectId
 * Update project metadata.
 * Project Owner Supervisor only.
 */
router.patch(
  '/:projectId',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string }, {}, UpdateProjectDto>, res: Response) => {
    try {
      const project = await updateProject(req.user!.id, req.params.projectId, req.body);
      return res.json(project);
    } catch (err: any) {
      console.error('Error updating project:', err);
      return res.status(500).json({ error: err.message || 'Failed to update project' });
    }
  }
);

/**
 * GET /projects/:projectId/members
 * List all members of a project.
 * Accessible to any member of the project.
 */
router.get(
  '/:projectId/members',
  authenticate,
  requireProjectMember('projectId'),
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const members = await listProjectMembers(req.params.projectId);
      return res.json(members);
    } catch (err: any) {
      console.error('Error listing project members:', err);
      return res.status(500).json({ error: err.message || 'Failed to list project members' });
    }
  }
);

/**
 * POST /projects/:projectId/members
 * Add a member directly to the project.
 * Project Owner Supervisor only.
 */
router.post(
  '/:projectId/members',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string }, {}, AddProjectMemberDto>, res: Response) => {
    try {
      const { userId, projectRole } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'Target userId is required' });
      }

      const member = await addProjectMember(req.user!.id, req.params.projectId, {
        userId,
        projectRole,
      });

      return res.status(201).json(member);
    } catch (err: any) {
      if (err.message?.includes('already a member')) {
        return res.status(409).json({ error: err.message });
      }
      if (err.message?.includes('does not exist')) {
        return res.status(404).json({ error: err.message });
      }
      console.error('Error adding member:', err);
      return res.status(500).json({ error: err.message || 'Failed to add project member' });
    }
  }
);

/**
 * DELETE /projects/:projectId/members/:userId
 * Remove a member from the project.
 * Project Owner Supervisor only.
 */
router.delete(
  '/:projectId/members/:userId',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string; userId: string }>, res: Response) => {
    try {
      await removeProjectMember(req.user!.id, req.params.projectId, req.params.userId);
      return res.json({ message: 'Project member removed successfully' });
    } catch (err: any) {
      if (err.message?.includes('cannot be removed')) {
        return res.status(400).json({ error: err.message });
      }
      console.error('Error removing member:', err);
      return res.status(500).json({ error: err.message || 'Failed to remove project member' });
    }
  }
);

/**
 * PATCH /projects/:projectId/members/:userId
 * Update a project member's role (e.g. Member <-> CoSupervisor).
 * Project Owner Supervisor only.
 */
router.patch(
  '/:projectId/members/:userId',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string; userId: string }, {}, UpdateProjectMemberDto>, res: Response) => {
    try {
      const { projectRole } = req.body;
      if (!projectRole || !['Member', 'CoSupervisor'].includes(projectRole)) {
        return res.status(400).json({ error: 'Valid projectRole ("Member" or "CoSupervisor") is required' });
      }

      const updated = await updateProjectMemberRole(
        req.user!.id,
        req.params.projectId,
        req.params.userId,
        projectRole
      );

      return res.json(updated);
    } catch (err: any) {
      if (err.message?.includes('cannot be modified')) {
        return res.status(400).json({ error: err.message });
      }
      if (err.message?.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      console.error('Error updating member role:', err);
      return res.status(500).json({ error: err.message || 'Failed to update member role' });
    }
  }
);

/**
 * POST /projects/:projectId/invites
 * Create a new join invite code / email invite.
 * Project Owner Supervisor only.
 */
router.post(
  '/:projectId/invites',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string }, {}, CreateProjectInviteDto>, res: Response) => {
    try {
      const { inviteType, invitedEmail, invitedRole, maxUses, expiresInDays } = req.body;

      if (!inviteType || !['Email', 'Code'].includes(inviteType)) {
        return res.status(400).json({ error: 'Valid inviteType ("Email" or "Code") is required' });
      }

      const invite = await createProjectInvite(req.user!.id, req.params.projectId, {
        inviteType,
        invitedEmail,
        invitedRole,
        maxUses,
        expiresInDays,
      });

      return res.status(201).json(invite);
    } catch (err: any) {
      console.error('Error creating invite:', err);
      return res.status(500).json({ error: err.message || 'Failed to create invite' });
    }
  }
);

/**
 * GET /projects/:projectId/invites
 * List all active/pending invites for the project.
 * Project Owner Supervisor only.
 */
router.get(
  '/:projectId/invites',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string }>, res: Response) => {
    try {
      const invites = await listProjectInvites(req.params.projectId);
      return res.json(invites);
    } catch (err: any) {
      console.error('Error listing invites:', err);
      return res.status(500).json({ error: err.message || 'Failed to list invites' });
    }
  }
);

/**
 * POST /projects/:projectId/invites/:inviteId/revoke
 * Revoke an active invite code/link.
 * Project Owner Supervisor only.
 */
router.post(
  '/:projectId/invites/:inviteId/revoke',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string; inviteId: string }>, res: Response) => {
    try {
      await revokeProjectInvite(req.user!.id, req.params.projectId, req.params.inviteId);
      return res.json({ message: 'Invite revoked successfully' });
    } catch (err: any) {
      if (err.message === 'Invite not found') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Error revoking invite:', err);
      return res.status(500).json({ error: err.message || 'Failed to revoke invite' });
    }
  }
);

/**
 * DELETE /projects/:projectId/invites/:inviteId
 * Revoke an active invite code/link (REST alias).
 */
router.delete(
  '/:projectId/invites/:inviteId',
  authenticate,
  requireProjectOwnerSupervisor('projectId'),
  async (req: Request<{ projectId: string; inviteId: string }>, res: Response) => {
    try {
      await revokeProjectInvite(req.user!.id, req.params.projectId, req.params.inviteId);
      return res.json({ message: 'Invite revoked successfully' });
    } catch (err: any) {
      if (err.message === 'Invite not found') {
        return res.status(404).json({ error: err.message });
      }
      console.error('Error revoking invite:', err);
      return res.status(500).json({ error: err.message || 'Failed to revoke invite' });
    }
  }
);

export default router;
