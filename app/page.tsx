"use client";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define the base URL - update this to match your backend URL
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface FormData {
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
}

export default function Home() {
  const [isSignIn, setIsSignIn] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    name: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log(
      "Attempting to sign in with URL:",
      `${BASE_URL}/api/auth/login`
    );

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        setError(
          `Server error: Expected JSON but received ${
            contentType || "unknown content type"
          }`
        );
        return;
      }

      const data = await response.json();

      if (response.ok) {
        // Store token in sessionStorage
        if (typeof window !== "undefined" && data.token) {
          try {
            sessionStorage.setItem("auth_token", data.token);
            if (data.token_type) {
              sessionStorage.setItem("token_type", data.token_type);
            }
            if (data.user) {
              sessionStorage.setItem("auth_user", JSON.stringify(data.user));
            }
          } catch (e) {
            console.warn("Failed to persist auth in sessionStorage:", e);
          }
        }

        console.log("Sign in successful:", data);
        router.push("/dashboard");
      } else {
        setError(data.message || "Sign in failed. Please try again.");
      }
    } catch (err) {
      console.error("Sign in error:", err);
      if (err instanceof Error && err.message.includes("JSON")) {
        setError(
          "Server returned invalid response. Please check if your backend is running and the URL is correct."
        );
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    console.log(
      "Attempting to sign up with URL:",
      `${BASE_URL}/api/auth/register`
    );

    try {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.confirmPassword,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      // Check if response is actually JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        setError(
          `Server error: Expected JSON but received ${
            contentType || "unknown content type"
          }`
        );
        return;
      }

      const data = await response.json();

      if (response.ok) {
        console.log("Sign up successful:", data);

        // Automatically sign in after successful registration
        // or redirect to sign in
        setIsSignIn(true);
        setError("");
        setFormData({
          email: formData.email, // Keep email for convenience
          password: "",
          name: "",
          confirmPassword: "",
        });

        // Show success message (you might want to add a success state)
        alert("Account created successfully! Please sign in.");
      } else {
        setError(data.message || "Sign up failed. Please try again.");
      }
    } catch (err) {
      console.error("Sign up error:", err);
      if (err instanceof Error && err.message.includes("JSON")) {
        setError(
          "Server returned invalid response. Please check if your backend is running and the URL is correct."
        );
      } else {
        setError("Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (isSignIn) {
      handleSignIn(e);
    } else {
      handleSignUp(e);
    }
  };

  const handleTabSwitch = (signInMode: boolean) => {
    setIsSignIn(signInMode);
    setError("");
    setFormData({
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 font-montserrat">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <h1 className="text-4xl font-bold mb-2">PIC-AI-SSO</h1>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {isSignIn ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 text-center ${
                isSignIn
                  ? "font-bold border-b-2 border-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => handleTabSwitch(true)}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-2 text-center ${
                !isSignIn
                  ? "font-bold border-b-2 border-blue-500"
                  : "text-gray-500"
              }`}
              onClick={() => handleTabSwitch(false)}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            {!isSignIn && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            {!isSignIn && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium mb-1"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isSignIn ? "Signing In..." : "Signing Up..."}
                </div>
              ) : isSignIn ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
