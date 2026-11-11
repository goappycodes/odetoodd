import { Card, PageHeader, SimpleTable, Button } from "@/components/ui";
import { suppliers, materials, inr } from "@/lib/data";

export const metadata = { title: "Suppliers" };

export default function SuppliersPage() {
  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who supplies each material, and how long they take." actions={<Button>Add supplier</Button>} />
      <Card pad={false}>
        <SimpleTable
          head={["Supplier", "Supplies", "City", "Contact", "Phone", "Lead time", "Materials", "Below minimum", "Stock value"]}
          align={["left", "left", "left", "left", "left", "right", "right", "right", "right"]}
          rows={suppliers.map((s) => {
            const mine = materials.filter((m) => m.supplierId === s.id);
            const low = mine.filter((m) => m.stock < m.minLevel).length;
            return [
              <span key="n" className="font-medium">{s.name}</span>, s.category, s.city, s.contact, s.phone, `${s.leadTimeDays} days`, mine.length,
              low ? <span key="l" className="text-bad">{low}</span> : 0,
              inr(mine.reduce((a, m) => a + m.stock * m.cost, 0)),
            ];
          })}
        />
      </Card>
    </>
  );
}
