// Componente per la protezione delle rotte: consente l'accesso solo agli utenti autenticati

import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const PrivateRoute = ({ component: Component, ...rest }) => {
  const { currentUser } = useAuth();

  return (
    <Route
      {...rest}
      render={props =>
        currentUser ? (
          <Component {...props} />
        ) : (
          <Redirect to={{ pathname: '/login', state: { from: props.location } }} />
        )
      }
    />
  );
};

export default PrivateRoute;