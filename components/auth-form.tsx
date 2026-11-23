"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signUp, resendConfirmation } from "@/app/auth/actions";

export function AuthForm({ error, message }: { error?: string; message?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  return <div className="auth-wrap"><div className="auth-card">
    <div className="logo-large"><div className="brand-mark">K</div><div><div style={{fontWeight:800,letterSpacing:".12em"}}>KANAKO AI</div><div className="muted" style={{fontSize:12}}>Your AI-powered virtual office</div></div></div>
    <div className="panel"><div className="eyebrow">{mode === "signin" ? "Secure owner access" : "First-time setup"}</div><h1 style={{fontSize:28,marginBottom:8}}>{mode === "signin" ? "Welcome back" : "Create Owner Account"}</h1><p className="muted" style={{fontSize:13,marginTop:0,marginBottom:24}}>{mode === "signin" ? "Sign in to open your company and AI workforce." : "Set up your owner login. KANAKO AI will create your company workspace, nine departments, and Kanako CEO profile after verification."}</p>
      {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
      <form action={mode === "signin" ? signIn : signUp} className="form-stack">
        {mode === "signup" && <><label className="muted" style={{fontSize:12}}>Your full name</label><input className="field" name="full_name" type="text" required maxLength={100} autoComplete="name" placeholder="Owner name" /><label className="muted" style={{fontSize:12}}>Company / workspace name</label><input className="field" name="organization_name" type="text" required maxLength={120} placeholder="e.g. My AI Company" /></>}
        <label className="muted" style={{fontSize:12}}>Email address</label><input className="field" name="email" type="email" required autoComplete="email" placeholder="you@company.com" />
        <label className="muted" style={{fontSize:12}}>Password</label><input className="field" name="password" type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 8 characters" />
        <button className="btn" type="submit" style={{marginTop:8}}>{mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="muted" style={{fontSize:13,textAlign:"center",marginTop:22}}>{mode === "signin" ? "First time setting up KANAKO AI?" : "Already created an owner account?"} <button className="btn secondary" style={{padding:"6px 9px",marginLeft:5}} onClick={() => setMode(mode === "signin" ? "signup" : "signin")} type="button">{mode === "signin" ? "Create account" : "Sign in"}</button></p>
      {mode === "signin" && <form action={resendConfirmation} className="form-stack" style={{marginTop:16}}>
        <label className="muted" style={{fontSize:12}}>Didn’t receive or couldn’t use your confirmation email?</label>
        <input className="field" name="email" type="email" required autoComplete="email" placeholder="Your registration email" />
        <button className="btn secondary" type="submit">Resend confirmation email</button>
      </form>}
    </div><p className="muted" style={{fontSize:11,textAlign:"center",marginTop:18}}>Your data is protected by Supabase authentication and organization-level access policies.</p><p className="muted" style={{fontSize:12,textAlign:"center",marginTop:12}}>Need to work without internet? <Link className="subtle-link" href="/offline">Open local offline workspace</Link></p>
  </div></div>;
}
