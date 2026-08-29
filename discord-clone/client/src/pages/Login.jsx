import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/channels");
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to log in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-discord-darkest">
      <form
        onSubmit={onSubmit}
        className="bg-discord-dark w-full max-w-md rounded-lg p-8 shadow-xl"
      >
        <h1 className="text-white text-2xl font-bold text-center mb-2">Welcome back!</h1>
        <p className="text-discord-muted text-center mb-6">We're so excited to see you again!</p>

        {error && (
          <div className="bg-discord-red/20 border border-discord-red text-discord-red text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
        />

        <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-6 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-discord-blurple hover:bg-indigo-600 transition text-white font-medium rounded py-2.5 disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Log In"}
        </button>

        <p className="text-discord-muted text-sm mt-4">
          Need an account?{" "}
          <Link to="/register" className="text-discord-blurple hover:underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
