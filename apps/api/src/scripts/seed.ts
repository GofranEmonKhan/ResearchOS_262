import 'dotenv/config';
import { supabaseAdmin } from '../supabase.js';

async function seed() {
  console.log('🌱 Seeding ResearchOS test accounts in Supabase Auth & Profiles...');

  const testAccounts = [
    {
      email: 'admin@researchos.edu',
      password: 'Password123!',
      fullName: 'Dr. Eleanor Vance (System Admin)',
      role: 'Admin' as const,
      status: 'Active' as const,
      institution: 'ResearchOS Governance',
      department: 'Platform Administration',
      bio: 'Platform administrator managing user verification and system integrity.',
    },
    {
      email: 'supervisor@stanford.edu',
      password: 'Password123!',
      fullName: 'Prof. Sarah Vance (PI)',
      role: 'Supervisor' as const,
      status: 'Active' as const,
      institution: 'Stanford University',
      department: 'Computer Science & AI',
      bio: 'Principal Investigator leading the Neural Systems & Scaled Architectures Lab.',
    },
    {
      email: 'supervisor.pending@oxford.edu',
      password: 'Password123!',
      fullName: 'Dr. Arthur Pendelton',
      role: 'Supervisor' as const,
      status: 'PendingVerification' as const,
      institution: 'Oxford University',
      department: 'Robotics & Autonomous Systems',
      bio: 'Faculty applicant pending institutional ID verification.',
    },
    {
      email: 'researcher@mit.edu',
      password: 'Password123!',
      fullName: 'Alex Chen',
      role: 'Researcher' as const,
      status: 'Active' as const,
      institution: 'MIT',
      department: 'CSAIL',
      bio: 'PhD Candidate researching transformer memory efficiency and sequence scaling.',
    },
  ];

  for (const acc of testAccounts) {
    // 1. Check if auth user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let userId: string | undefined = existingUsers?.users?.find(u => u.email === acc.email)?.id;

    if (!userId) {
      console.log(`Creating auth user ${acc.email}...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          fullName: acc.fullName,
          roleRequest: acc.role,
          institution: acc.institution,
          department: acc.department,
        },
      });

      if (createError || !newUser?.user) {
        console.error(`Error creating ${acc.email}:`, createError);
        continue;
      }
      userId = newUser.user.id;
    }

    // 2. Ensure profile has exact desired role and status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: acc.fullName,
        role: acc.role,
        status: acc.status,
        institution: acc.institution,
        department: acc.department,
        bio: acc.bio,
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error(`Error updating profile for ${acc.email}:`, profileError);
    } else {
      console.log(`✓ Profile ready: ${acc.email} (${acc.role} / ${acc.status})`);
    }

    // 3. If supervisor is pending, ensure a verification request exists
    if (acc.status === 'PendingVerification') {
      const { data: existingReq } = await supabaseAdmin
        .from('supervisor_verification_requests')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!existingReq) {
        await supabaseAdmin.from('supervisor_verification_requests').insert({
          user_id: userId,
          document_url: 'verification-docs/oxford-faculty-id-pendelton.pdf',
          institution_domain: 'ox.ac.uk',
          status: 'Pending',
        });
        console.log(`✓ Seeded pending verification request for ${acc.email}`);
      }
    }
  }

  console.log('✨ Seeding complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
