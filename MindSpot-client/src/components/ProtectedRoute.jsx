import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, redirectTo, roleRequired }) => {
  const token = sessionStorage.getItem("token");
  const userRole = sessionStorage.getItem("role"); 

  if (!token) {
    return <Navigate to={redirectTo} replace />;
  }

  // אם הגדרנו שהנתיב דורש תפקיד מסוים והוא לא מתאים
  if (roleRequired && userRole !== roleRequired) {
    return <Navigate to="/" replace />; // 
  }

  return children;
};

export default ProtectedRoute;