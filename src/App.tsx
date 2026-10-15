import { useAuth } from "./context/AuthContext";
import { Toast } from "./components/ui";
import AppShell from "./components/AppShell";
import ConnectPage from "./pages/ConnectPage";
import LoginPage from "./pages/LoginPage";
import ChangePinPage from "./pages/ChangePinPage";

export default function App() {
  const { screen, ready, notice, clearNotice } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/logo-app.png" alt="Meser" className="w-14 h-14 rounded-3xl shadow-elev2" />
      </div>
    );
  }

  return (
    <>
      {notice && <Toast message={notice.message} type={notice.type} onDismiss={clearNotice} />}
      {renderScreen(screen)}
    </>
  );
}

function renderScreen(screen: ReturnType<typeof useAuth>["screen"]) {
  switch (screen.name) {
    case "connect":
      return <ConnectPage />;
    case "login":
      return <LoginPage />;
    case "change-pin":
      return <ChangePinPage />;
    case "home":
    case "orders":
    case "new-order":
    case "order-detail":
      return <AppShell />;
    default:
      return <ConnectPage />;
  }
}