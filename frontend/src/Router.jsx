import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./components/authpage/Login";
import Register from "./components/authpage/Register";
import HomePage from "./components/main/HomePage";
import Profile from "./components/authpage/Profile";
import DocumentUpload from "./components/main/DocumentUpload";
import ProtectedRoute from "./ProtectedRoute";
import DepartmentFiles from "./components/main/DepartmentFiles"; // ✅ 1. Import the new component

export const Router = createBrowserRouter([
    {
        path: "/",
        element: <ProtectedRoute><App /></ProtectedRoute>,
        children: [
            { path: "/", element: <HomePage /> },
            { path: "/profile", element: <Profile /> },
            { path: "/upload-document", element: <DocumentUpload /> },
            // ✅ 2. Add the new dynamic route for departments
            { path: "/department/:d_uuid", element: <DepartmentFiles /> },
        ],
    },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
]);