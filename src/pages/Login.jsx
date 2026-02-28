import React, { useState } from 'react';
import { useAuthContext } from '../context/AuthContext';

export default function Login() {
  const { login, user } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Inserisci username e password');
      return;
    }
    setError('');
    login(username, password);
  };

  if (user) return <div>Sei loggato come {user.username} ({user.role})</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10 p-4 border rounded bg-white">
      <h2 className="text-xl mb-4 font-bold">Login</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <input
        className="block w-full mb-2 p-2 border rounded"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
      />
      <input
        className="block w-full mb-4 p-2 border rounded"
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      />
      <button className="bg-green-600 text-white px-4 py-2 rounded w-full" type="submit">Accedi</button>
    </form>
  );
}
