"use client";

// 1. Remove the lucide-react import
// import { X, File, Upload } from 'lucide-react';

interface NewCanvasModalProps {
  onClose: () => void;
}

export default function NewCanvasModal({ onClose }: NewCanvasModalProps) {
  const handleCreateBlank = () => {
    console.log("Creating a blank canvas...");
    onClose();
  };

  const handleUploadImage = () => {
    console.log("Uploading an image...");
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 relative animate-in fade-in-0 zoom-in-95"
      >
        <div className="flex items-center justify-between pb-4 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold">Create New Canvas</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {/* 2. Replace the <X /> component with an inline SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleCreateBlank}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            {/* 3. Replace the <File /> component with an inline SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span className="font-semibold">Start with a Blank Canvas</span>
          </button>

          <button
            onClick={handleUploadImage}
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
          >
            {/* 4. Replace the <Upload /> component with an inline SVG */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span className="font-semibold">Upload an Image</span>
          </button>
        </div>
      </div>
    </div>
  );
}
