import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MeetingList from "./pages/MeetingList";
import MeetingEditor from "./pages/MeetingEditor";
import TeamSettings from "./pages/TeamSettings";
import Integrations from "./pages/Integrations";
import Insight from "./pages/Insight";
import WhiteboardList from "./pages/WhiteboardList";
import WhiteboardEditor from "./pages/WhiteboardEditor";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/meetings" element={<MeetingList />} />
              <Route path="/meetings/:meetingId" element={<MeetingEditor />} />
              <Route path="/team" element={<TeamSettings />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/insight" element={<Insight />} />
              <Route path="/whiteboards" element={<WhiteboardList />} />
              <Route path="/whiteboards/:whiteboardId" element={<WhiteboardEditor />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
