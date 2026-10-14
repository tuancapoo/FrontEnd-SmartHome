import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth.jsx";
import { Spinner } from "./ui.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Users from "./pages/admin/Users.jsx";
import Types from "./pages/dev/Types.jsx";
import ComponentModels from "./pages/dev/ComponentModels.jsx";
import DeviceModels from "./pages/dev/DeviceModels.jsx";
import Devices from "./pages/dev/Devices.jsx";
import MyDevices from "./pages/user/MyDevices.jsx";
import Places from "./pages/user/Places.jsx";
import RegisterDevice from "./pages/user/RegisterDevice.jsx";
import DeviceDetail from "./pages/user/DeviceDetail.jsx";

const HOME = { admin: "/admin/users", developer: "/dev/device-models", user: "/my-devices" };

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/login" replace />;
}

// Chỉ cho phép các role được liệt kê
function Role({ roles, children }) {
  const { user } = useAuth();
  if (roles.includes(user.role)) return children;
  return <div className="alert error">Bạn không có quyền truy cập trang này.</div>;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={HOME[user.role] || "/my-devices"} replace />;
}

const STAFF = ["admin", "developer"];

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="admin/users" element={<Role roles={["admin"]}><Users /></Role>} />
        <Route path="dev/types" element={<Role roles={STAFF}><Types /></Role>} />
        <Route path="dev/component-models" element={<Role roles={STAFF}><ComponentModels /></Role>} />
        <Route path="dev/device-models" element={<Role roles={STAFF}><DeviceModels /></Role>} />
        <Route path="dev/devices" element={<Role roles={STAFF}><Devices /></Role>} />
        <Route path="my-devices" element={<MyDevices />} />
        <Route path="places" element={<Places />} />
        <Route path="register-device" element={<RegisterDevice />} />
        <Route path="device/:id" element={<DeviceDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
