import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Login from "./components/authpage/Login";
import Register from "./components/authpage/Register";
import HomePage from "./components/main/HomePage";

export const router = createBrowserRouter([
    {path: "/", element: <App />},
    {path: "/login", element: <Login />},
    {path: "/register", element: <Register />},
    {path: "/homepage", element: <HomePage />}, 
]);