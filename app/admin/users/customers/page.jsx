import AdminUsersDirectory from '@/components/AdminUsersDirectory';

export default function AdminCustomersPage() {
  return (
    <AdminUsersDirectory
      title="Customers"
      subtitle="Customer portal accounts (phone login). New accounts require email, phone, and password."
      apiRole="customer"
      recordKind="customer"
      addNewLabel="+ Add New Customer"
    />
  );
}
