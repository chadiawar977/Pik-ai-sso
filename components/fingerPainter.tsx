"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useState, useEffect } from "react";

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    HAND_CONNECTIONS: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}

export default function FingerPainter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(6);
  const [isLoaded, setIsLoaded] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDraggingCamera, setIsDraggingCamera] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const loadScript = (src: string) => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () =>
          reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    const initMediaPipe = async () => {
      try {
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"
        );
        await loadScript(
          "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"
        );

        await new Promise((resolve) => {
          const check = () => {
            if (window.Hands && window.Camera && window.HAND_CONNECTIONS) {
              resolve(true);
            } else {
              setTimeout(check, 100);
            }
          };
          check();
        });

        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const drawingCanvas = document.createElement("canvas");
        const drawingCtx = drawingCanvas.getContext("2d")!;
        drawingCanvasRef.current = drawingCanvas;

        let prevX: number | null = null;
        let prevY: number | null = null;
        let brushColor = "#ff4d4d";
        const MIRROR = true;

        let selectionActive = false;
        let selectionStart: { x: number; y: number } | null = null;
        let selectionEnd: { x: number; y: number } | null = null;
        let selectedImage: ImageData | null = null;
        let selectedX = 0;
        let selectedY = 0;
        let isMovingSelection = false;

        const BTN_R = 30;
        let btnX = 90;
        let btnY = 90;
        let paletteOpen = false;
        const paletteRadius = 95;
        const bubbleR = 20;
        let lastTapTime = 0;
        let dragStartTime = 0;
        let isDraggingBtn = false;
        const dragThresholdMs = 200;
        const COLORS = [
          "#ff4d4d",
          "#ffd166",
          "#06d6a0",
          "#118ab2",
          "#a78bfa",
          "#ff7ab6",
          "#ffffff",
          "#000000",
        ];

        const CLEAR_BTN_R = 35;
        let clearBtnX = canvas.width - CLEAR_BTN_R - 20;
        let clearBtnY = CLEAR_BTN_R + 20;
        let clearTouchStartTime: number | null = null;

        function palettePositions() {
          return COLORS.map((_, i) => {
            const ang = (i / COLORS.length) * Math.PI * 2 - Math.PI / 2;
            return [
              btnX + paletteRadius * Math.cos(ang),
              btnY + paletteRadius * Math.sin(ang),
            ];
          });
        }

        function isFingerUp(lms: any, tipIdx: number, pipIdx: number) {
          return lms[tipIdx].y < lms[pipIdx].y;
        }

        function mirrorXY(lm: any) {
          return {
            x: MIRROR ? (1 - lm.x) * canvas.width : lm.x * canvas.width,
            y: lm.y * canvas.height,
          };
        }

        function dist(ax: number, ay: number, bx: number, by: number) {
          return Math.hypot(ax - bx, ay - by);
        }

        video.addEventListener("loadedmetadata", () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          drawingCanvas.width = canvas.width;
          drawingCanvas.height = canvas.height;
          btnX = Math.min(btnX, canvas.width - BTN_R);
          btnY = Math.min(btnY, canvas.height - BTN_R);

          clearBtnX = canvas.width - CLEAR_BTN_R - 20;
          clearBtnY = CLEAR_BTN_R + 20;
        });

        // Load background from sessionStorage (if any) and draw it once
        try {
          const id = window.location.pathname.split("/").pop();
          if (id) {
            const raw = sessionStorage.getItem(`temp_canvas_${id}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              const src = parsed?.imagePath || parsed?.image;
              if (src) {
                const img = new Image();
                img.onload = () => {
                  setBackgroundImage(img);
                  // Fit image to canvas
                  drawingCtx.drawImage(
                    img,
                    0,
                    0,
                    drawingCanvas.width,
                    drawingCanvas.height
                  );
                };
                img.src = src;
              } else {
                setBackgroundColor("#ffffff");
                drawingCtx.fillStyle = "#ffffff";
                drawingCtx.fillRect(
                  0,
                  0,
                  drawingCanvas.width,
                  drawingCanvas.height
                );
              }
            } else {
              setBackgroundColor("#ffffff");
              drawingCtx.fillStyle = "#ffffff";
              drawingCtx.fillRect(
                0,
                0,
                drawingCanvas.width,
                drawingCanvas.height
              );
            }
          }
        } catch {}

        const hands = new window.Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results: any) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          ctx.save();
          // Do not draw the camera frame on the drawing canvas.
          // The video is shown separately in the UI now.
          if (MIRROR) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.restore();

          const now = performance.now();

          if (results.multiHandLandmarks?.length) {
            const lms = results.multiHandLandmarks[0];
            const indexUp = isFingerUp(lms, 8, 6);
            const middleUp = isFingerUp(lms, 12, 10);
            const ringUp = isFingerUp(lms, 16, 14);
            const pinkyUp = isFingerUp(lms, 20, 18);
            const fingersUp = [indexUp, middleUp, ringUp, pinkyUp].filter(
              Boolean
            ).length;

            const { x: ix, y: iy } = mirrorXY(lms[8]);
            const { x: pxP, y: pyP } = mirrorXY(lms[20]);

            if (pinkyUp && !indexUp && !middleUp && !ringUp && !selectedImage) {
              if (!selectionActive) {
                selectionActive = true;
                selectionStart = { x: pxP, y: pyP };
                selectionEnd = { x: pxP, y: pyP };
              } else {
                selectionEnd = { x: pxP, y: pyP };
              }
            }

            if (
              selectionActive &&
              (!pinkyUp || indexUp || middleUp || ringUp)
            ) {
              selectionActive = false;

              if (selectionStart && selectionEnd) {
                const x = Math.min(selectionStart.x, selectionEnd.x);
                const y = Math.min(selectionStart.y, selectionEnd.y);
                const w = Math.abs(selectionEnd.x - selectionStart.x);
                const h = Math.abs(selectionEnd.y - selectionStart.y);

                if (w > 5 && h > 5) {
                  selectedImage = drawingCtx.getImageData(x, y, w, h);
                  selectedX = x;
                  selectedY = y;

                  drawingCtx.clearRect(x, y, w, h);
                }
              }
            }

            if (selectedImage && pinkyUp && indexUp && !middleUp && !ringUp) {
              selectedX = ix - selectedImage.width / 2;
              selectedY = iy - selectedImage.height / 2;
              isMovingSelection = true;
            }

            if (selectedImage && (!pinkyUp || !indexUp || middleUp || ringUp)) {
              drawingCtx.putImageData(selectedImage, selectedX, selectedY);
              selectedImage = null;
              isMovingSelection = false;
            }

            const dToClear = dist(ix, iy, clearBtnX, clearBtnY);
            if (dToClear <= CLEAR_BTN_R) {
              if (!clearTouchStartTime) clearTouchStartTime = performance.now();
              if (performance.now() - clearTouchStartTime >= 1000) {
                drawingCtx.clearRect(0, 0, canvas.width, canvas.height);
                clearTouchStartTime = null;
              }
            } else {
              clearTouchStartTime = null;
            }

            const { x: px, y: py } = mirrorXY(lms[9]);

            const dToBtn = dist(ix, iy, btnX, btnY);
            const insideBtn = dToBtn <= BTN_R;
            if (insideBtn && indexUp) {
              if (!dragStartTime) dragStartTime = now;
              if (!isDraggingBtn && now - dragStartTime > dragThresholdMs) {
                isDraggingBtn = true;
              }
            } else {
              dragStartTime = 0;
              isDraggingBtn = false;
            }

            if (isDraggingBtn) {
              btnX = Math.max(BTN_R, Math.min(canvas.width - BTN_R, ix));
              btnY = Math.max(BTN_R, Math.min(canvas.height - BTN_R, iy));
            }

            if (
              insideBtn &&
              indexUp &&
              !isDraggingBtn &&
              now - lastTapTime > 500
            ) {
              paletteOpen = !paletteOpen;
              lastTapTime = now;
            }

            if (paletteOpen && indexUp) {
              palettePositions().forEach(([cx, cy], i) => {
                if (dist(ix, iy, cx, cy) <= bubbleR) {
                  brushColor = COLORS[i];
                  paletteOpen = false;
                }
              });
            }

            if (indexUp && !middleUp && !ringUp && !pinkyUp) {
              let nearButton = dist(ix, iy, btnX, btnY) < BTN_R + 8;
              let nearBubble = false;
              if (paletteOpen) {
                palettePositions().forEach(([cx, cy]) => {
                  if (dist(ix, iy, cx, cy) <= bubbleR) nearBubble = true;
                });
              }

              if (!nearButton && !nearBubble) {
                if (prevX !== null && prevY !== null) {
                  drawingCtx.strokeStyle = brushColor;
                  drawingCtx.lineJoin = drawingCtx.lineCap = "round";
                  drawingCtx.lineWidth = brushSize;
                  drawingCtx.beginPath();
                  drawingCtx.moveTo(prevX, prevY);
                  drawingCtx.lineTo(ix, iy);
                  drawingCtx.stroke();
                }
                prevX = ix;
                prevY = iy;
              } else {
                prevX = prevY = null;
              }
            } else {
              prevX = prevY = null;
            }

            if (fingersUp >= 3) {
              const r = Math.max(60, brushSize * 6);
              drawingCtx.save();
              drawingCtx.globalCompositeOperation = "destination-out";
              drawingCtx.beginPath();
              drawingCtx.arc(px, py, r, 0, Math.PI * 2);
              drawingCtx.fill();
              drawingCtx.restore();

              ctx.beginPath();
              ctx.arc(px, py, r, 0, Math.PI * 2);
              ctx.lineWidth = 2;
              ctx.strokeStyle = "rgba(255,255,255,0.8)";
              ctx.stroke();
            }

            // Draw a more visible cursor that follows the index fingertip
            ctx.save();
            // Outer glow
            ctx.beginPath();
            ctx.arc(ix, iy, 12, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fill();
            // Main cursor
            ctx.beginPath();
            ctx.arc(ix, iy, 8, 0, Math.PI * 2);
            ctx.fillStyle = "#000000";
            ctx.fill();
            // Inner highlight
            ctx.beginPath();
            ctx.arc(ix, iy, 6, 0, Math.PI * 2);
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(ix, iy, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.restore();
          }

          if (selectionActive && selectionStart && selectionEnd) {
            const x = Math.min(selectionStart.x, selectionEnd.x);
            const y = Math.min(selectionStart.y, selectionEnd.y);
            const w = Math.abs(selectionEnd.x - selectionStart.x);
            const h = Math.abs(selectionEnd.y - selectionStart.y);

            ctx.save();
            ctx.strokeStyle = "rgba(255,255,0,0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
          }

          // Paint solid background if provided and no background image was drawn
          if (!backgroundImage) {
            ctx.save();
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.restore();
          }
          ctx.drawImage(drawingCanvas, 0, 0);

          if (isMovingSelection && selectedImage) {
            ctx.putImageData(selectedImage, selectedX, selectedY);
          }

          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(btnX, btnY, BTN_R, 0, Math.PI * 2);
          ctx.fillStyle = brushColor;
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(btnX, btnY, BTN_R - 1, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(btnX, btnY, 4, 0, Math.PI * 2);
          ctx.fillStyle = "#111";
          ctx.fill();

          if (paletteOpen) {
            palettePositions().forEach(([cx, cy], i) => {
              ctx.save();
              ctx.shadowColor = "rgba(0,0,0,0.5)";
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(cx, cy, bubbleR, 0, Math.PI * 2);
              ctx.fillStyle = COLORS[i];
              ctx.fill();
              ctx.restore();

              ctx.beginPath();
              ctx.arc(cx, cy, bubbleR - 1, 0, Math.PI * 2);
              ctx.lineWidth = 2;
              ctx.strokeStyle = "rgba(255,255,255,0.9)";
              ctx.stroke();
            });
          }

          ctx.save();
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(clearBtnX, clearBtnY, CLEAR_BTN_R, 0, Math.PI * 2);
          ctx.fillStyle = "#ff3333";
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(clearBtnX, clearBtnY, CLEAR_BTN_R - 1, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(clearBtnX - 10, clearBtnY - 10);
          ctx.lineTo(clearBtnX + 10, clearBtnY + 10);
          ctx.moveTo(clearBtnX + 10, clearBtnY - 10);
          ctx.lineTo(clearBtnX - 10, clearBtnY + 10);
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        const camera = new window.Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 960,
          height: 540,
        });
        camera.start();

        setIsLoaded(true);
      } catch (error) {
        console.error("Error loading MediaPipe:", error);
      }
    };

    initMediaPipe();
  }, [brushSize]);

  const handleCameraMouseDown = (e: React.MouseEvent) => {
    setIsDraggingCamera(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCameraMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCamera) {
      setCameraPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
  };

  const handleCameraMouseUp = () => {
    setIsDraggingCamera(false);
  };

  return (
    <div
      className="flex flex-col items-center bg-black text-white min-h-screen"
      onMouseMove={handleCameraMouseMove}
      onMouseUp={handleCameraMouseUp}
    >
      {!isLoaded && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-white text-lg">Loading Hand Tracking...</div>
        </div>
      )}

      <div className="w-full px-4 py-6 relative">
        {/* Main Canvas - Full Width */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 mb-6">
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="w-full h-auto rounded-md"
          />
        </div>

        {/* Camera Feed - Draggable */}
        <div
          className={`absolute w-64 bg-gray-900/50 border border-gray-700 rounded-xl p-2 cursor-move select-none ${
            isDraggingCamera ? "z-50" : "z-10"
          }`}
          style={{
            left: cameraPosition.x || window.innerWidth - 280,
            top: cameraPosition.y || 32,
          }}
          onMouseDown={handleCameraMouseDown}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-gray-400">Camera Feed</div>
            <div className="text-xs text-gray-500">Drag to move</div>
          </div>
          <video
            ref={videoRef}
            className="w-full h-auto rounded-md scale-x-[-1]"
            muted
            autoPlay
            playsInline
          />
        </div>
      </div>

      <div className="toolbar fixed left-3 right-3 bottom-3 bg-gray-900/80 backdrop-blur-md flex flex-wrap items-center justify-center gap-4 p-3 rounded-xl border border-gray-700">
        <label className="flex items-center gap-2 text-sm">
          Size
          <input
            type="range"
            min="2"
            max="24"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24"
          />
        </label>

        <button
          onClick={() => {
            const drawingCanvas = drawingCanvasRef.current;
            if (drawingCanvas) {
              drawingCanvas
                .getContext("2d")!
                .clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            }
          }}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Clear Canvas
        </button>

        <span className="text-xs text-gray-300 max-w-md">
          Draw: index up only • Erase: open palm • Drag/tap palette to change
          color
        </span>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
