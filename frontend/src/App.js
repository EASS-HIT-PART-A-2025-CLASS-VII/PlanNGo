import React from "react";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./context/AuthContext";
import ChatAdvisor from "./components/ChatAdvisor";

function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <ChatAdvisor />
    </AuthProvider>
  );
}

export default App;
