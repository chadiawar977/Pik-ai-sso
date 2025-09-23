"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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

  // Close dropdown when clicking outside
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
        // Remove credentials if causing CORS issues
        // credentials: 'include',
      });

      if (response.ok) {
        // Clear any local storage or session data if needed
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("auth_token");
          sessionStorage.removeItem("token_type");
          sessionStorage.removeItem("auth_user");
        }

        // Redirect to login page or home page after successful logout
        router.push("/");
      } else {
        console.error("Logout failed:", response.statusText);
        // Handle error (show notification, etc.)
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Handle network error
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors"
        aria-label="User menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg
          className="w-6 h-6 text-gray-600 dark:text-gray-300"
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
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors disabled:opacity-50"
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
            {isLoggingOut ? "Logging out..." : "Logout"}
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
    name: string;
    thumbnail?: string;
    createdAt: string;
    size?: string;
  };
  onClick: (canvas: any) => void;
}) => {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
      onClick={() => onClick(canvas)}
    >
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-t-lg overflow-hidden">
        <img
          src={
            canvas.thumbnail ||
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%23f0f0f0' width='200' height='150'/%3E%3C/svg%3E"
          }
          alt={canvas.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white truncate">
          {canvas.name}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
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
            <span>{new Date(canvas.createdAt).toLocaleDateString()}</span>
          </div>
          {canvas.size && (
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              <span>{canvas.size}</span>
            </div>
          )}
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
  const [canvasName, setCanvasName] = useState("");
  const [canvasType, setCanvasType] = useState("blank");
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  const [isCreating, setIsCreating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSubmit = async () => {
    if (!canvasName.trim()) return;

    setIsCreating(true);
    try {
      const temporaryId = Date.now();
      let thumbnailUrl: string | undefined = undefined;
      if (selectedFile) {
        thumbnailUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(selectedFile);
        });
      }
      const localCanvas = {
        id: temporaryId,
        name: canvasName,
        thumbnail: thumbnailUrl,
        createdAt: new Date().toISOString(),
        size: `${dimensions.width}x${dimensions.height}`,
      } as any;

      onCreateCanvas(localCanvas);
      try {
        if (typeof window !== "undefined") {
          const payload = {
            image: thumbnailUrl || null,
            imagePath: thumbnailUrl || null,
            width: dimensions.width,
            height: dimensions.height,
          };
          sessionStorage.setItem(
            `temp_canvas_${temporaryId}`,
            JSON.stringify(payload)
          );
        }
      } catch {}
      router.push(`/canvas/${temporaryId}?temp=1`);
      onClose();
      setCanvasName("");
      setCanvasType("blank");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error creating canvas:", error);
      // Handle network error
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!canvasName.trim()) {
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        setCanvasName(baseName);
      }
      setCanvasType("upload");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Create New Canvas
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              Canvas Name
            </label>
            <input
              type="text"
              value={canvasName}
              onChange={(e) => setCanvasName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter canvas name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Canvas Type
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="canvasType"
                  value="blank"
                  checked={canvasType === "blank"}
                  onChange={(e) => setCanvasType(e.target.value)}
                  className="mr-3 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Blank Canvas
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Start with a blank canvas
                    </div>
                  </div>
                </div>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  name="canvasType"
                  value="upload"
                  checked={canvasType === "upload"}
                  onChange={(e) => setCanvasType(e.target.value)}
                  className="mr-3 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    <polyline points="16,13 12,17 8,13" />
                    <line x1="12" y1="17" x2="12" y2="9" />
                  </svg>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
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

          {canvasType === "blank" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Width
                </label>
                <input
                  type="number"
                  value={dimensions.width}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      width: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-white">
                  Height
                </label>
                <input
                  type="number"
                  value={dimensions.height}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {canvasType === "upload" && (
            <div>
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
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center hover:border-blue-500 transition-colors"
              >
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  <polyline points="16,13 12,17 8,13" />
                  <line x1="12" y1="17" x2="12" y2="9" />
                </svg>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedFile
                    ? selectedFile.name
                    : "Click to upload an image"}
                </div>
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isCreating || !canvasName.trim()}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              {isCreating && (
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

  // Fetch canvases from API
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
          // Remove credentials if causing CORS issues
          // credentials: 'include',
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

  const handleCanvasClick = (canvas: { id: number; name: string }) => {
    console.log("Opening canvas:", canvas.name);
    // Navigate to the canvas editor page with the canvas ID
    router.push(`/canvas/${canvas.id}`);
  };

  const filteredCanvases = canvases.filter((canvas) =>
    canvas.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-montserrat">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                PIC-AI-SSO
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your Creative Dashboard
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search your canvases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <svg
              className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4"
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
            <p className="text-gray-600 dark:text-gray-400">
              Loading your canvases...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-red-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Error Loading Canvases
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Canvases Grid */}
        {!isLoading && !error && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Your Canvases ({filteredCanvases.length})
            </h2>

            {filteredCanvases.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No canvases found" : "No canvases yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Create your first canvas to get started"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2 mx-auto transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
