"use client";

import { useState } from "react";
import { signIn, signUp } from "@/app/auth/actions";

export function AuthForm({ error, message }: { error?: string; message?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return <div className="auth-wrap"><div className="auth-card">
    <div className="logo-large"><div className="brand-mark">K</div><div><div style={{fontWeight:800,letterSpacing:".12em"}}>KANAKO AI</div><div className="muted" style={{fontSize:12}}>Your AI-powered virtual office</div></div></div>
    <div className="panel"><div className="eyebrow">Secure workspace access</div><h1 style={{fontSize:28,marginBottom:8}}>{mode === "signin" ? "Welcome back" : "Create your account"}</h1><p className="muted" style={{fontSize:13,marginTop:0,marginBottom:24}}>Sign in to manage your organization and AI workforce.</p>
      {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
      <form action={mode === "signin" ? signIn : signUp} className="form-stack">
        <label className="muted" style={{fontSize:12}}>Email address</label><input className="field" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        <label className="muted" style={{fontSize:12}}>Password</label><input className="field" name="password" type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" />
        <button className="btn" type="submit" style={{marginTop:8}}>{mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="muted" style={{fontSize:13,textAlign:"center",marginTop:22}}>{mode === "signin" ? "New to KANAKO AI?" : "Already have an account?"} <button className="btn secondary" style={{padding:"6px 9px",marginLeft:5}} onClick={() => setMode(mode === "signin" ? "signup" : "signin")} type="button">{mode === "signin" ? "Create account" : "Sign in"}</button></p>
    </div><p className="muted" style={{fontSize:11,textAlign:"center",marginTop:18}}>Your data is protected by Supabase authentication and organization-level access policies.</p>
  </div></div>;
}
