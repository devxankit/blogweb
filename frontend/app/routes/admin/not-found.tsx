import { Link } from "react-router";
import { AdminPage, Empty } from "~/components/admin/ui";

export default function AdminNotFound() {
  return (
    <AdminPage title="Page not found">
      <Empty title="There is nothing at this address.">
        <Link to="/admin">Go to the dashboard</Link>
      </Empty>
    </AdminPage>
  );
}
