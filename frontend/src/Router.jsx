import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./components/authpage/Login";
import Register from "./components/authpage/Register";
import HomePage from "./components/main/HomePage";
import Profile from "./components/main/Profile"; 
import DocumentUpload from "./components/main/DocumentUpload";
import ProtectedRoute from "./ProtectedRoute";
import DepartmentFiles from "./components/main/DepartmentFiles";
import AssignToMe from "./components/main/AssignToMe";
import FileViewer from './components/main/FileViewer';
import AllFiles from "./components/main/AllFiles";

// ✅ Simple placeholder component for pages that are not yet built
const Placeholder = ({ title }) => (
    <div className="p-8">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-4 text-gray-600">This page is under construction.</p>
    </div>
);

export const Router = createBrowserRouter([ // Corrected export name
    {
        path: "/",
        element: <ProtectedRoute><App /></ProtectedRoute>,
        children: [
            { path: "/", element: <HomePage /> },
            { path: "/profile", element: <Profile /> },
            { path: "/upload-document", element: <DocumentUpload /> },
            { path: "/department/:d_uuid", element: <DepartmentFiles /> },
            
            // ✅ Added new routes for the sidebar links
            { path: "/recent", element: <Placeholder title="Recent" /> },
            { path: "/all-files", element: <AllFiles /> },
            { path: "/tags", element: <Placeholder title="Tags" /> },
            { path: "/mails", element: <Placeholder title="Mails" /> },
            { path: "/custom-fields", element: <Placeholder title="Custom Fields" /> },
            { path: "/document-types", element: <Placeholder title="Document Types" /> },
            { path: "/archive", element: <Placeholder title="Archive" /> },
            { path: "/assigned-to-me", element: <AssignToMe /> }, 
            { path: "/file/:uuid", element: <FileViewer /> },
        ],
    },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
]);