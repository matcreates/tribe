"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Create account
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      // Sign in after successful signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but failed to sign in. Please try logging in.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Something went wrong");
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
            Create your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] text-white/40 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-[8px] text-[13px] text-white/70 focus:outline-none transition-colors"
                style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                placeholder="Your name"
              />
            </div>

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
                placeholder="At least 6 characters"
                required
                minLength={6}
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
              {isLoading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
            </button>
          </form>

          <p className="mt-6 text-center text-[12px] text-white/40">
            Already have an account?{" "}
            <Link href="/login" className="text-white/60 hover:text-white/80 underline transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

