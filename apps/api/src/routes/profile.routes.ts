import { Router, Request, Response } from 'express';
import { authenticate, mapDbProfileToProfile } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabase.js';
import { searchProfiles } from '../services/project.service.js';
import { Profile, UpdateProfileDto } from '@researchos/shared-types';

const router: Router = Router();

/**
 * GET /profiles/search?q=... and GET /search?q=...
 * Search active user profiles for member invitations and collaboration
 */
const handleSearchProfiles = async (req: Request, res: Response<Profile[] | { error: string }>) => {
  try {
    const query = (req.query.q as string) || '';
    const profiles = await searchProfiles(query, req.userId);
    return res.json(profiles);
  } catch (err: any) {
    console.error('Error searching profiles:', err);
    return res.status(500).json({ error: err.message || 'Failed to search profiles' });
  }
};

router.get('/profiles/search', authenticate, handleSearchProfiles);
router.get('/search', authenticate, handleSearchProfiles);

/**
 * GET /me
 * Returns current authenticated user's profile from the live database
 */
router.get('/me', authenticate, async (req: Request, res: Response<Profile | { error: string }>) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return res.json(req.user);
});

/**
 * PATCH /me
 * Updates own profile. Cannot change role, status, or id.
 */
router.patch('/me', authenticate, async (req: Request<{}, {}, UpdateProfileDto>, res: Response<Profile | { error: string }>) => {
  if (!req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    fullName,
    photoUrl,
    bio,
    orcidUrl,
    scholarUrl,
    institution,
    department,
    researchFieldTags,
    researchInterests,
    skills,
  } = req.body;

  // Build sanitized update object with whitelisted fields only
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (fullName !== undefined) updates.full_name = fullName.trim();
  if (photoUrl !== undefined) updates.photo_url = photoUrl;
  if (bio !== undefined) updates.bio = bio;
  if (orcidUrl !== undefined) updates.orcid_url = orcidUrl;
  if (scholarUrl !== undefined) updates.scholar_url = scholarUrl;
  if (institution !== undefined) updates.institution = institution;
  if (department !== undefined) updates.department = department;
  if (researchFieldTags !== undefined) updates.research_field_tags = researchFieldTags;
  if (researchInterests !== undefined) updates.research_interests = researchInterests;
  if (skills !== undefined) updates.skills = skills;

  const { data: updatedRow, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', req.userId)
    .select('*')
    .single();

  if (error || !updatedRow) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }

  return res.json(mapDbProfileToProfile(updatedRow));
});

export default router;
