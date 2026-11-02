'use client';

import { AdminPage } from '@/components/admin/ui';
import { CustomerList } from '@/components/admin/CustomerList';

export default function CustomersAdmin() {
  return (
    <AdminPage
      title="Customers"
      description="People who have made an account on the shop. An order placed as a guest only joins an account once the customer has proved the email address — by pressing the link we send, or by you confirming it here."
    >
      <CustomerList />
    </AdminPage>
  );
}
