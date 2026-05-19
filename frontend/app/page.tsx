"use client"

import React from "react"

import { loginUser, registerUser } from "@/lib/api"
import { getCurrentUser } from "@/lib/api"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Shield,
  BarChart3,
  Lightbulb,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = isLogin
        ? await loginUser(email, password)
        : await registerUser(email, password)

      localStorage.setItem("token", res.data.token)

      const userRes = await getCurrentUser()

      if (userRes.data.role === "admin") {
        router.push("/dashboard/admin")
      } else {
        router.push("/dashboard")
      }

    } catch (error: any) {
      alert(error.response?.data?.detail || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary">
              <CreditCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-sidebar-primary-foreground tracking-tight">
              GigCredit
            </span>
          </div>

          <h2 className="text-4xl font-bold text-sidebar-primary-foreground leading-tight text-balance mb-4">
            Your work speaks louder than a payslip.
          </h2>
          <p className="text-lg text-sidebar-foreground/70 leading-relaxed max-w-md">
            A transparent credit scoring system built specifically for gig
            workers. See exactly how your score is calculated and what you can
            do to improve it.
          </p>

          <div className="mt-12 space-y-5">
            {[
              {
                icon: Shield,
                title: "Transparent Scoring",
                desc: "SHAP-powered explanations for every point in your score",
              },
              {
                icon: BarChart3,
                title: "Alternative Data",
                desc: "Task completion, GPS consistency, and customer ratings",
              },
              {
                icon: Lightbulb,
                title: "Actionable Advice",
                desc: "Know exactly what to improve with What-If simulations",
              },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-accent mt-0.5">
                  <feature.icon className="w-4 h-4 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-sidebar-primary-foreground">
                    {feature.title}
                  </p>
                  <p className="text-sm text-sidebar-foreground/60">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/40">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>All data is encrypted and never shared with third parties</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <CreditCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">
              GigCredit
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to view your credit score and insights"
                : "Start building your credit profile as a gig worker"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g. Ahmad Rizal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label
                  htmlFor="remember"
                  className="text-sm font-normal cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Register"
                : "Already have an account? Sign in"}
            </button>
          </div>

          <p className="mt-8 text-xs text-center text-muted-foreground/60">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
}
