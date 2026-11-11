import { Check, Minus } from "lucide-react";
import { Card, PageHeader, SimpleTable, Badge, Button } from "@/components/ui";
import { users, roles, permissions } from "@/lib/data";

export const metadata = { title: "Users and roles" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users and roles" subtitle="Each person sees only the screens their role needs. Access is checked on the server for every action." actions={<Button>Invite user</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Users" pad={false}>
          <SimpleTable
            head={["Name", "Email", "Role", "Last active"]}
            rows={users.map((u) => [<span key="n" className="font-medium">{u.name}</span>, <span key="e" className="text-muted">{u.email}</span>, <Badge key="r">{roles.find((r) => r.id === u.role)?.name}</Badge>, u.lastActive])}
          />
        </Card>
        <Card title="Roles">
          <ul className="space-y-3 text-sm">
            {roles.map((r) => (
              <li key={r.id}>
                <p className="font-medium">{r.name} <span className="text-xs font-normal text-muted">· {users.filter((u) => u.role === r.id).length} users</span></p>
                <p className="text-muted">{r.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="What each role can access" className="mt-6" pad={false}>
        <SimpleTable
          head={["Area", ...roles.map((r) => r.name)]}
          rows={permissions.map((p) => [p.area, ...roles.map((r) => (p.allowed.includes(r.id) ? <Check key={r.id} className="size-4 text-good" /> : <Minus key={r.id} className="size-4 text-faint" />))])}
        />
      </Card>
    </>
  );
}
