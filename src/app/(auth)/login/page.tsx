"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    console.log("Sign in attempt:", { email });

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("Sign in result:", result);

      if (result?.error) {
        setError("Invalid email or password: " + result.error);
      } else if (result?.ok) {
        // Use hard redirect to ensure session cookie is picked up
        window.location.href = "/dashboard";
      } else {
        setError("Unexpected response: " + JSON.stringify(result));
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("Something went wrong: " + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(18, 18, 18)' }}>
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <h1 
          className="text-[28px] text-white/90 italic text-center mb-8"
          style={{ fontFamily: 'var(--font-serif), Georgia, serif' }}
        >
          Tribe
        </h1>

        {/* Form Card */}
        <div 
          className="rounded-[16px] border border-white/[0.08] p-7"
          style={{ background: 'rgba(255, 255, 255, 0.03)' }}
        >
          <h2 className="text-[18px] font-medium text-white/90 mb-6 text-center">
            Welcome back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-white/40 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                required
              />
            </div>

            <div>
              <label className="block text-[12px] text-white/40 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                required
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-400/80">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-[8px] text-[12px] font-medium tracking-[0.08em] text-white/80 transition-colors disabled:opacity-50 hover:bg-white/[0.12]"
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              {isLoading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-white/40">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-white/60 hover:text-white/80 underline transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

