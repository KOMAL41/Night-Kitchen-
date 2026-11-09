import { useEffect, useState } from "react";
import { Plus, Trash2, Phone } from "lucide-react";
import { api, Employee } from "../lib/api";
import { Card, Badge, Button, Input, Modal, Spinner, EmptyState } from "../components/ui";

const EMPTY = { name: "", role_title: "", phone: "", shift: "morning" };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  function load() {
    api.get<Employee[]>("/api/employees").then(setEmployees);
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/employees", form);
    setForm(EMPTY);
    setModalOpen(false);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Remove this employee?")) return;
    await api.delete(`/api/employees/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Employees</h1>
          <p className="text-sm text-slate-400">Kitchen staff, chefs, and delivery partners.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add employee</Button>
      </div>

      {!employees ? (
        <Spinner />
      ) : employees.length === 0 ? (
        <EmptyState label="No team members added yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <Card key={emp.id} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                    {emp.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.role_title}</p>
                  </div>
                </div>
                <button onClick={() => remove(emp.id)} className="text-red-500"><Trash2 size={15} /></button>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1"><Phone size={12} /> {emp.phone || "—"}</span>
                <Badge tone="slate">{emp.shift}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add employee">
        <form onSubmit={save} className="space-y-3">
          <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Role (e.g. Head Chef)" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} required />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-violet"
          >
            <option value="morning">Morning shift</option>
            <option value="evening">Evening shift</option>
            <option value="night">Night shift</option>
          </select>
          <Button type="submit" className="w-full">Add employee</Button>
        </form>
      </Modal>
    </div>
  );
}
