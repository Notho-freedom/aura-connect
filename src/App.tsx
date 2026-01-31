import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import JoinCall from "./pages/JoinCall";
import PreCall from "./pages/PreCall";
import VideoCall from "./pages/VideoCall";
import NewCall from "./pages/NewCall";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contacts"
                element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join"
                element={
                  <ProtectedRoute>
                    <JoinCall />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join/:meetingId"
                element={
                  <ProtectedRoute>
                    <PreCall />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/call/new"
                element={
                  <ProtectedRoute>
                    <NewCall />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pre-call/:meetingId"
                element={
                  <ProtectedRoute>
                    <PreCall />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/call/:meetingId"
                element={
                  <ProtectedRoute>
                    <VideoCall />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
