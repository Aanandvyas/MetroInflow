import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./components/authpage/Login";
import Register from "./components/authpage/Register";
import HomePage from "./components/main/HomePage";
import ProtectedRoute from "./ProtectedRoute";
import Profile from "./components/authpage/Profile"; 

export const Router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ProtectedRoute>
                <App />
            </ProtectedRoute>
        ),
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            { path: "/profile",
              element: <Profile /> 
            },
        ],
    },
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/register",
        element: <Register />,
    },
]);