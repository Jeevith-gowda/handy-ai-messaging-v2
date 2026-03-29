import AdminUsersDirectory from '@/components/AdminUsersDirectory';

export default function AdminHandymenPage() {
  return (
    <AdminUsersDirectory
      title="Handymen"
      subtitle="Staff accounts that sign in with email at /login."
      apiRole="handyman"
      recordKind="handyman"
      addNewLabel="+ Add New Handyman"
    />
  );
}
