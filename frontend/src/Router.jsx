import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./components/authpage/Login";
import Register from "./components/authpage/Register";
import HomePage from "./components/main/HomePage";
import Profile from "./components/main/Profile"; 
import DocumentUpload from "./components/main/DocumentUpload";
import ProtectedRoute from "./ProtectedRoute";
import RoleProtectedRoute from "./RoleProtectedRoute";
import DepartmentFiles from "./components/main/DepartmentFiles";
import AssignToMe from "./components/main/AssignToMe";
import FileViewer from './components/main/FileViewer';
import AllFiles from "./components/main/AllFiles";
import Summary from "./components/main/Summary";
import Important from "./components/main/Important";
import Notifications from "./components/main/Notifications";
import About from "./components/header/About";

// Department Head components
import HeadDashboard from "./departmenthead/HeadDashboard";
import SharedFiles from "./departmenthead/SharedFiles";
import Confidential from "./departmenthead/Confidential";
import Calendar from "./departmenthead/Calendar";
import CollabDepartment from "./departmenthead/CollabDepartment";
import TestCollabFolders from "./departmenthead/TestCollabFolders";

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
            { 
                path: "/", 
                element: (
                    <RoleProtectedRoute restrictToPosition="head">
                        <HomePage />
                    </RoleProtectedRoute>
                ) 
            },
            { path: "/profile", element: <Profile /> },
            { path: "/upload-document", element: <DocumentUpload /> },
            { path: "/department/:d_uuid", element: <DepartmentFiles /> },
            { path: "/summary", element: <Summary /> },
            { path: "/important", element: <Important /> },
            { path: "/notifications", element: <Notifications /> },
            { path: "/about", element: <About/> },

            // ✅ Added new routes for the sidebar links - restricted for heads
            { 
                path: "/all-files", 
                element: <AllFiles /> 
            },
            { path: "/custom-fields", element: <Placeholder title="Custom Fields" /> },
            { path: "/document-types", element: <Placeholder title="Document Types" /> },
            { 
                path: "/assigned-to-me", 
                element: (
                    <RoleProtectedRoute restrictToPosition="head">
                        <AssignToMe />
                    </RoleProtectedRoute>
                ) 
            }, 
            { path: "/file/:uuid", element: <FileViewer /> },

            // ✅ Department Head Routes - restricted to heads only
            { 
                path: "/head-dashboard", 
                element: (
                    <RoleProtectedRoute requiredPosition="head">
                        <HeadDashboard />
                    </RoleProtectedRoute>
                ) 
            },
            { 
                path: "/shared-files", 
                element: (
                    <RoleProtectedRoute requiredPosition="head">
                        <SharedFiles />
                    </RoleProtectedRoute>
                ) 
            },
            { 
                path: "/confidential", 
                element: (
                    <RoleProtectedRoute requiredPosition="head">
                        <Confidential />
                    </RoleProtectedRoute>
                ) 
            },
            { 
                path: "/calendar", 
                element: (
                    <RoleProtectedRoute requiredPosition="head">
                        <Calendar />
                    </RoleProtectedRoute>
                ) 
            },
            { 
                path: "/department-collab/:departmentId", 
                element: (
                    <RoleProtectedRoute requiredPosition="head">
                        <CollabDepartment />
                    </RoleProtectedRoute>
                ) 
            },
            {
                path: "/test-collab-folders",
                element: <TestCollabFolders />
            }
        ],
    },
    { path: "/login", element: <Login /> },
    { path: "/register", element: <Register /> },
]);