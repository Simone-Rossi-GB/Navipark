// Componente per la protezione delle rotte: consente l'accesso solo agli utenti autenticati

import { useAuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

// Versione aggiornata per React Router v6
export default function PrivateRoute({ children }) {
  const { user } = useAuthContext();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}