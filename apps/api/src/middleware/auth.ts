import { Request, Response, NextFunction } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { supabaseAdmin } from '../supabase.js';
import { Profile, UserRole, UserStatus } from '@researchos/shared-types';

const supabaseUrl = process.env.SUPABASE_URL || '';
const jwksUrl = process.env.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`;

// Cache JWKS public keys in-memory (handles rotation and cache automatically)
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

/**
 * Helper to map database snake_case row to camelCase Profile model
 */
export function mapDbProfileToProfile(row: any): Profile {
  return {
    id: row.id,
    fullName: row.full_name || '',
    role: row.role as UserRole,
    status: row.status as UserStatus,
    institution: row.institution || '',
    department: row.department || '',
    researchFieldTags: row.research_field_tags || [],
    photoUrl: row.photo_url || null,
    bio: row.bio || null,
    orcidUrl: row.orcid_url || null,
    scholarUrl: row.scholar_url || null,
    researchInterests: row.research_interests || [],
    skills: row.skills || [],
    reputationPoints: row.reputation_points ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Authenticate middleware:
 * 1. Verifies incoming Supabase JWT against cached JWKS.
 * 2. Extracts user id (sub).
 * 3. Performs a live lookup in public.profiles for role and status.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Token missing valid sub identifier' });
    }

    // Live profiles lookup — single source of truth for application role & status
    const { data: dbProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !dbProfile) {
      // If profile is missing (e.g. newly registered OAuth user before trigger finish), attempt fallback lookup
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!authUser?.user) {
        return res.status(401).json({ error: 'User profile not found' });
      }

      // Create fallback profile row
      const newFullName = authUser.user.user_metadata?.fullName || authUser.user.user_metadata?.name || 'Scholar';
      const roleReq = (authUser.user.user_metadata?.roleRequest as UserRole) || 'Researcher';
      const initialRole: UserRole = roleReq === 'Supervisor' ? 'Supervisor' : 'Researcher';
      const initialStatus: UserStatus = initialRole === 'Supervisor' ? 'PendingVerification' : 'Active';

      const { data: createdProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name: newFullName,
          role: initialRole,
          status: initialStatus,
          institution: authUser.user.user_metadata?.institution || '',
          department: authUser.user.user_metadata?.department || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (insertError || !createdProfile) {
        return res.status(401).json({ error: 'Failed to initialize profile' });
      }

      req.user = mapDbProfileToProfile(createdProfile);
      req.userId = userId;
      return next();
    }

    if (dbProfile.status === 'Suspended') {
      return res.status(403).json({ error: 'Account is suspended. Please contact administrator.' });
    }

    req.user = mapDbProfileToProfile(dbProfile);
    req.userId = userId;
    return next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid, expired, or untrusted JWT token' });
  }
}

/**
 * Require status middleware (e.g. requireStatus('Active'))
 */
export function requireStatus(...allowedStatuses: UserStatus[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.status === 'Suspended') {
      return res.status(403).json({ error: 'Account is suspended. Please contact administrator.' });
    }

    if (!allowedStatuses.includes(req.user.status)) {
      return res.status(403).json({ 
        error: `Action forbidden. Current account status: ${req.user.status}`,
        status: req.user.status 
      });
    }

    return next();
  };
}

/**
 * Require role middleware (e.g. requireRole('Admin') or requireRole('Supervisor', 'Admin'))
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role`,
        role: req.user.role 
      });
    }

    return next();
  };
}
