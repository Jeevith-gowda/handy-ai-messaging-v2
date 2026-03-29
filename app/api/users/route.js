import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Project from '@/models/Project';
import { requireAuth } from '@/lib/auth';

export async function GET(request) {
  const authError = await requireAuth();
  if (authError) return authError;

  await dbConnect();

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  let query = {};
  if (role) query.role = role;

  const users = await User.find(query).select('-password').sort({ name: 1 });

  const usersWithCounts = await Promise.all(
    users.map(async (user) => {
      const activeProjects = await Project.countDocuments({
        handymanId: user._id,
        status: { $nin: ['completed', 'handyman_paid', 'customer_paid'] },
      });
      return { ...user.toObject(), activeProjects };
    })
  );

  return NextResponse.json(usersWithCounts);
}
