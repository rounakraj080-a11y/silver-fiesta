import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState("request"); // "request" | "reset"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      setInfo(res.data.message || "If that email is registered, a code has been sent.");
      setStep("reset");
    } catch (err) {
      setError(err?.response?.data?.error || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { email, code, newPassword });
      navigate("/login");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid or expired code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-discord-darkest">
      <div className="bg-discord-dark w-full max-w-md rounded-lg p-8 shadow-xl">
        <h1 className="text-white text-2xl font-bold text-center mb-2">
          {step === "request" ? "Forgot your password?" : "Enter your code"}
        </h1>
        <p className="text-discord-muted text-center mb-6 text-sm">
          {step === "request"
            ? "We'll email you a 6-digit code to reset it."
            : `Check ${email} for a 6-digit code (expires in 15 minutes).`}
        </p>

        {error && (
          <div className="bg-discord-red/20 border border-discord-red text-discord-red text-sm rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}
        {info && step === "reset" && (
          <div className="bg-discord-green/20 border border-discord-green text-discord-green text-sm rounded px-3 py-2 mb-4">
            {info}
          </div>
        )}

        {step === "request" ? (
          <form onSubmit={submitRequest}>
            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-6 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-discord-blurple hover:bg-indigo-600 transition text-white font-medium rounded py-2.5 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitReset}>
            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">6-digit code</label>
            <input
              required
              autoFocus
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full mb-4 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple text-center tracking-widest text-lg font-mono"
            />

            <label className="block text-xs font-bold text-discord-muted uppercase mb-2">New password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full mb-6 rounded bg-discord-darkest text-discord-text px-3 py-2.5 outline-none border border-transparent focus:border-discord-blurple"
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-discord-blurple hover:bg-indigo-600 transition text-white font-medium rounded py-2.5 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Reset password"}
            </button>

            <button
              type="button"
              onClick={() => setStep("request")}
              className="w-full text-discord-muted hover:text-white text-sm mt-3"
            >
              Didn't get a code? Try a different email
            </button>
          </form>
        )}

        <p className="text-discord-muted text-sm mt-4 text-center">
          <Link to="/login" className="text-discord-blurple hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
