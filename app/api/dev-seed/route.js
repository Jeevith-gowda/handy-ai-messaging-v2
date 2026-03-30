import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  // Ensure this is strictly isolated to development environments
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This route is strictly available in development environments only.' }, { status: 403 });
  }

  await dbConnect();

  try {
    const existingAdmin = await User.findOne({ email: 'admin@handy.com' });
    
    if (!existingAdmin) {
      // The User model has a pre-save hook that automatically hashes the password!
      const newAdmin = new User({
        name: 'System Admin',
        email: 'admin@handy.com',
        password: 'Admin123!',
        role: 'admin',
      });
      await newAdmin.save();
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin user successfully created!', 
        user: { email: newAdmin.email, role: newAdmin.role } 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin user already exists.', 
      user: { email: existingAdmin.email, role: existingAdmin.role } 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to seed development admin target.' }, { status: 500 });
  }
}
