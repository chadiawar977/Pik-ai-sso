"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Base URL for API calls
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

// User Profile Dropdown Component
const UserProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const authToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem("auth_token")
          : null;
      const tokenType =
        typeof window !== "undefined"
          ? sessionStorage.getItem("token_type") || "Bearer"
          : "Bearer";
      const response = await fetch(`${BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: authToken
          ? {
              Authorization: `${tokenType} ${authToken}`,
              Accept: "application/json",
            }
          : { Accept: "application/json" },
      });

      if (response.ok) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("token_type");
          sessionStorage.removeItem("auth_user");
        }
        router.push("/");
      } else {
        console.error("Logout failed:", response.statusText);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center hover:shadow-lg hover:scale-105 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          className="w-5 h-5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          ></path>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 ring-1 ring-black ring-opacity-5 z-20 transform opacity-100 scale-100 transition-all duration-200">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Account</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage your profile</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors disabled:opacity-50 mt-1"
          >
            {isLoggingOut ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                ></path>
              </svg>
            )}
            <span className="font-medium">{isLoggingOut ? "Logging out..." : "Logout"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Canvas Card Component
const CanvasCard = ({
  canvas,
  onClick,
}: {
  canvas: {
    id: number;
    user_id: number;
    canvas_name: string;
    canvas_url: string;
    aspect_width: number;
    aspect_height: number;
    created_at: string;
    updated_at: string;
  };
  onClick: (canvas: any) => void;
}) => {
  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-700 overflow-hidden transform hover:-translate-y-1"
      onClick={() => onClick(canvas)}
    >
      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-t-2xl overflow-hidden relative">
        <img
          src={canvas.canvas_url}
          alt={canvas.canvas_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%23e5e7eb' width='200' height='150'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-family='sans-serif' font-size='16'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-5">
        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {canvas.canvas_name}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs font-medium">{new Date(canvas.created_at).toLocaleDateString()}</span>
          </div>
          <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
            {canvas.aspect_width}×{canvas.aspect_height}
          </span>
        </div>
      </div>
    </div>
  );
};

// New Canvas Modal Component
const NewCanvasModal = ({
  isOpen,
  onClose,
  onCreateCanvas,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateCanvas: (canvas: any) => void;
}) => {
  const [canvasType, setCanvasType] = useState("blank");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  
  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      const temporaryId = Date.now();
      const canvasName = `Canvas ${temporaryId}`;

      let thumbnailUrl: string | undefined = undefined;
      if (selectedFile) {
        thumbnailUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(selectedFile);
        });
      }

      const dimensions = { width: 1920, height: 1080 };

      const localCanvas = {
        id: temporaryId,
        user_id: 0,
        canvas_name: canvasName,
        canvas_url: thumbnailUrl || "",
        aspect_width: dimensions.width,
        aspect_height: dimensions.height,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      onCreateCanvas(localCanvas);

      if (typeof window !== "undefined") {
        const payload = {
          name: canvasName,
          image: thumbnailUrl || null,
          width: dimensions.width,
          height: dimensions.height,
        };
        sessionStorage.setItem(
          `canvas_${temporaryId}`,
          JSON.stringify(payload)
        );
        
        if (thumbnailUrl) {
          const backgroundData = {
            id: temporaryId,
            name: canvasName,
            backgroundImage: thumbnailUrl,
            width: dimensions.width,
            height: dimensions.height
          };
          sessionStorage.setItem(
            `canvas_background_${temporaryId}`,
            JSON.stringify(backgroundData)
          );
        }
      }

      router.push(`/canvas/${temporaryId}?temp=1`);
      onClose();
      setCanvasType("blank");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error creating canvas:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCanvasType("upload");

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof window !== "undefined") {
          sessionStorage.setItem("uploaded_image", String(reader.result));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg transform transition-all animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New Canvas
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Start your creative journey</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors hover:rotate-90 transform duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-base font-semibold mb-4 text-gray-900 dark:text-white">
              Choose Canvas Type
            </label>
            <div className="space-y-3">
              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                canvasType === "blank" 
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md" 
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
              }`}>
                <input
                  type="radio"
                  name="canvasType"
                  value="blank"
                  checked={canvasType === "blank"}
                  onChange={(e) => setCanvasType(e.target.value)}
                  className="mr-4 text-blue-500 focus:ring-blue-500 w-4 h-4"
                />
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21,15 16,10 5,21" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-base text-gray-900 dark:text-white">
                      Blank Canvas
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Start with a clean white canvas
                    </div>
                  </div>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                canvasType === "upload" 
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-md" 
                  : "border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600"
              }`}>
                <input
                  type="radio"
                  name="canvasType"
                  value="upload"
                  checked={canvasType === "upload"}
                  onChange={(e) => setCanvasType(e.target.value)}
                  className="mr-4 text-green-500 focus:ring-green-500 w-4 h-4"
                />
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-base text-gray-900 dark:text-white">
                      Upload Image
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Start with an existing image
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {canvasType === "upload" && (
            <div className="mb-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-all duration-200"
              >
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                <div className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {selectedFile ? "✓ Image Selected" : "Choose an Image"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedFile ? selectedFile.name : "PNG, JPG, GIF up to 10MB"}
                </div>
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {isCreating && (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              {isCreating ? "Creating..." : "Create Canvas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  const [canvases, setCanvases] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchCanvases = async () => {
      try {
        const authToken =
          typeof window !== "undefined"
            ? sessionStorage.getItem("auth_token")
            : null;
        const tokenType =
          typeof window !== "undefined"
            ? sessionStorage.getItem("token_type") || "Bearer"
            : "Bearer";
        const response = await fetch(`${BASE_URL}/api/users_canvases`, {
          headers: {
            Accept: "application/json",
            ...(authToken
              ? { Authorization: `${tokenType} ${authToken}` }
              : {}),
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCanvases(data);
        } else {
          setError("Failed to fetch canvases");
        }
      } catch (error) {
        console.error("Error fetching canvases:", error);
        setError("Network error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCanvases();
  }, []);

  const handleCreateCanvas = (newCanvas: any) => {
    setCanvases((prev) => [newCanvas, ...prev]);
  };

  const handleCanvasClick = (canvas: { 
    id: number; 
    canvas_name: string;
    canvas_url: string;
    aspect_width: number;
    aspect_height: number;
  }) => {
    console.log("Opening canvas:", canvas.canvas_name);
    
    const canvasData = {
      id: canvas.id,
      name: canvas.canvas_name,
      backgroundImage: canvas.canvas_url,
      width: canvas.aspect_width,
      height: canvas.aspect_height
    };
    
    sessionStorage.setItem(`canvas_background_${canvas.id}`, JSON.stringify(canvasData));
    router.push(`/canvas/${canvas.id}`);
  };

  const filteredCanvases = canvases.filter((canvas) =>
    (canvas.canvas_name ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 font-montserrat">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg ring-2 ring-blue-500/20">
                <Image
                  src="/logo.png"
                  alt="PIK-AI-SSO Logo"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  PIK-AI-SSO
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your Creative Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2.5 px-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Canvas
              </button>
              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search your canvases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 shadow-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-20">
            <svg
              className="w-12 h-12 animate-spin mx-auto text-blue-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Loading your canvases...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Error Loading Canvases
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-2.5 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Canvases Grid */}
        {!isLoading && !error && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Your Canvases{" "}
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  ({filteredCanvases.length})
                </span>
              </h2>
            </div>

            {filteredCanvases.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-blue-500 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No canvases found" : "No canvases yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                  {searchTerm
                    ? "Try adjusting your search terms to find what you're looking for"
                    : "Create your first canvas to start bringing your ideas to life"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 mx-auto transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Your First Canvas
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCanvases.map((canvas) => (
                  <CanvasCard
                    key={canvas.id}
                    canvas={canvas}
                    onClick={handleCanvasClick}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* New Canvas Modal */}
      <NewCanvasModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateCanvas={handleCreateCanvas}
      />
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */