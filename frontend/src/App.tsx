import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import DashboardPage from "./pages/DashboardPage";
import MenuPage from "./pages/MenuPage";
import OrdersPage from "./pages/OrdersPage";
import InventoryPage from "./pages/InventoryPage";
import EmployeesPage from "./pages/EmployeesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ReviewsPage from "./pages/ReviewsPage";
import Customer from "./pages/Customer";

// Staff dashboard (Layout + role-branched pages) is for every role except
// "customer". Customers get their own single-page app: pages/Customer.tsx.
function StaffRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "customer") return <Navigate to="/customer" replace />;
  return children;
}

function CustomerRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "customer") return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Auth />} />

      <Route
        path="/app"
        element={
          <StaffRoute>
            <Layout />
          </StaffRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/customer"
        element={
          <CustomerRoute>
            <Customer />
          </CustomerRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
