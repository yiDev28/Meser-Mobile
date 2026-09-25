import { useAuth } from "./context/AuthContext";
import { Toast } from "./components/ui";
import ConnectPage from "./pages/ConnectPage";
import LoginPage from "./pages/LoginPage";
import ChangePinPage from "./pages/ChangePinPage";
import HomePage from "./pages/HomePage";
import NewOrderPage from "./pages/NewOrderPage";
import OrderDetailPage from "./pages/OrderDetailPage";

export default function App() {
  const { screen, ready, notice, clearNotice } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-black">
          M
        </div>
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
      return <HomePage />;
    case "new-order":
      return <NewOrderPage />;
    case "order-detail":
      return <OrderDetailPage orderId={screen.orderId} />;
    case "orders":
      return <HomePage />;
    default:
      return <ConnectPage />;
  }
}