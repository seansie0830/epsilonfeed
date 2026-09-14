import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Header } from "./components/layout/Header.js";
import { FeedPage } from "./pages/FeedPage.js";
import { PostDetailPage } from "./pages/PostDetailPage.js";
import { AuthModal } from "./components/auth/AuthModal.js";
import { DisplaySettingsProvider } from "./context/DisplaySettingsContext.js";
import { User } from "./types/index.js";
import { api } from "./services/api.js";

function AppContent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  // Initialize active user
  useEffect(() => {
    async function initUser() {
      const stored = localStorage.getItem("epsilon_user");
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {
          // ignore
        }
      } else {
        // Default to admin user (alex_dev)
        try {
          const res = await api.login("alex_dev", "password123");
          setCurrentUser(res.user);
        } catch (e) {
          console.error("Auto login error:", e);
        }
      }
    }
    initUser();
  }, []);

  const handleUserSwitch = async (user: User) => {
    try {
      const res = await api.login(user.username, "password123");
      setCurrentUser(res.user);
    } catch (err) {
      console.error("Switch user login error:", err);
      setCurrentUser(user);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const isAdmin = currentUser?.roles === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Universal Top Header */}
      <Header
        currentUser={currentUser}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (window.location.pathname !== "/") {
            navigate("/");
          }
        }}
        onOpenNewPost={() => {
          if (isAdmin) {
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            setShowAuthModal(true);
          }
        }}
        onOpenAuthModal={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

      {/* Route Views */}
      <main className="flex-1 w-full">
        <Routes>
          <Route
            path="/"
            element={
              <FeedPage
                currentUser={currentUser}
                searchQuery={searchQuery}
                onOpenAuthModal={() => setShowAuthModal(true)}
                onUserSwitch={handleUserSwitch}
              />
            }
          />
          <Route
            path="/post/:id"
            element={<PostDetailPage currentUser={currentUser} />}
          />
        </Routes>
      </main>

      {/* Login & Registration Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <DisplaySettingsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </DisplaySettingsProvider>
  );
}


