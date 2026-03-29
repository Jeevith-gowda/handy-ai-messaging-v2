import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Customer from '@/models/Customer';

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return '+1' + digits.slice(1);
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'welcome123';

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'admin-handyman',
      name: 'AdminHandyman',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await dbConnect();
        const user = await User.findOne({ email: credentials.email?.toLowerCase() });
        if (!user) throw new Error('No user found with this email');
        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) throw new Error('Invalid password');
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    CredentialsProvider({
      id: 'customer',
      name: 'Customer',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await dbConnect();
        const phone = normalizePhone(credentials.phone || '');
        if (!phone) throw new Error('Please enter a valid phone number');
        const customer = await Customer.findOne({ phone });
        if (!customer) throw new Error('No account found for this phone number');
        if (customer.password) {
          const ok = await bcrypt.compare(credentials.password || '', customer.password);
          if (!ok) throw new Error('Invalid password');
        } else if (credentials.password !== CUSTOMER_PASSWORD) {
          throw new Error('Invalid password');
        }
        return {
          id: customer._id.toString(),
          name: customer.name,
          email: customer.email || '',
          role: 'customer',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        try {
          await dbConnect();
          if (token.role === 'customer') {
            const customer = await Customer.findById(token.id).select('name');
            if (customer) session.user.name = customer.name;
          } else {
            const user = await User.findById(token.id).select('name');
            if (user) session.user.name = user.name;
          }
        } catch {
          // keep existing name on error
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
