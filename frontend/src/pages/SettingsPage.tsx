import { Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { ROLE_CONFIG, Role } from "../roleConfig";

export default function SettingsPage() {
  const { user } = useAuth();
  const role = (user?.role || "hotel_manager") as Role;
  const config = ROLE_CONFIG[role];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-400">Your account on {config.appName}.</p>
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-semibold">Account</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-400">Name</p>
            <p className="text-sm font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-sm font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Role</p>
            <p className="text-sm font-medium">{config.roleLabel}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Kitchen</p>
            <p className="text-sm font-medium">Cyber Hub Cloud Kitchen</p>
          </div>
        </div>
      </Card>

      {role === "hotel_manager" && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Subscription</p>
          <p className="text-sm text-slate-500">
            Plan: <span className="font-medium text-slate-700">Starter</span> — subscription billing isn't
            wired up in this build yet. When it is, plan, renewal date, and billing history will live here.
          </p>
        </Card>
      )}

      {role === "platform_admin" && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Platform settings</p>
          <p className="text-sm text-slate-500">
            Global settings (plan pricing, kitchen approval rules, platform-wide notifications) will live
            here once multi-kitchen onboarding is built. Right now there's one kitchen, so there's nothing
            platform-level to configure yet.
          </p>
        </Card>
      )}

      {(role === "kitchen_staff" || role === "delivery_partner") && (
        <Card className="p-5">
          <p className="mb-2 text-sm font-semibold">Shift</p>
          <p className="text-sm text-slate-500">
            Availability toggles and shift preferences will live here — not yet connected to the schedule.
          </p>
        </Card>
      )}
    </div>
  );
}
