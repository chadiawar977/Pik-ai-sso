"use client";

import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    HAND_CONNECTIONS: any;
    drawConnectors: any;
    drawLandmarks: any;
  }
}

interface GestureMessage {
  id: number;
  gesture: string;
  timestamp: number;
}

type Mode = "Idle" | "Brush" | "Zoom" | "ColorSelect" | "Annotate";
type ZoomMode = "ZoomIn" | "ZoomOut" | "Move";
type ShapeMode = "Rectangle" | "Triangle" | "Circle" | "Line" | "None";

export default function FingerPainter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const [brushSize, setBrushSize] = useState(6);
  const [mode, setMode] = useState<Mode>("Idle");
  const modeRef = useRef<Mode>(mode);
  const [isLoaded, setIsLoaded] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("ZoomIn");
  const zoomModeRef = useRef<ZoomMode>("ZoomIn");
  const [selectionActive, setSelectionActive] = useState(false);
  const selectionActiveRef = useRef(false);
  const [shapeMode, setShapeMode] = useState<ShapeMode>("None");
  const shapeModeRef = useRef<ShapeMode>("None");
  const [eraserActive, setEraserActive] = useState(false);
  const eraserActiveRef = useRef(false);

  // Features from first code
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [isSaving, setIsSaving] = useState(false);
  const [canvasName, setCanvasName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [gestureMessages, setGestureMessages] = useState<GestureMessage[]>([]);
  const [isGestureEnabled, setIsGestureEnabled] = useState(true);
  const gestureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastGestureRef = useRef<string>("");
  const [handVisible, setHandVisible] = useState(false);

  const cameraSize = { width: 240, height: 135 };
  const [cameraPosition, setCameraPosition] = useState({
    x: 20,
    y: 20,
  });
  const cameraPositionRef = useRef(cameraPosition);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  // Canvas ID handling
  const getCanvasId = () => {
    return window.location.pathname.split("/").pop();
  };

  // Background image loading
  // Background image loading
  const loadBackgroundImage = (
    backgroundCtx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    // Local default background (keeps this function self-contained)
    const setDefaultBG = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number
    ) => {
      setBackgroundColor("#ffffff");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    };

    try {
      const id = getCanvasId();

      // If this canvas was tainted earlier (before CORS fixes), reset once
      let ctx = backgroundCtx;
      const bgEl = backgroundCanvasRef.current;
      if (bgEl) {
        try {
          // Throws if tainted
          bgEl.toDataURL();
        } catch {
          // Reset clears taint + state; reacquire context
          bgEl.width = bgEl.width;
          const newCtx = bgEl.getContext("2d");
          if (newCtx) ctx = newCtx;
        }
      }

      const isDrawableUrl = (u: string | undefined) =>
        !!u &&
        (u.startsWith("data:image/") ||
          u.startsWith("http") ||
          u.startsWith("blob:"));

      const drawFitted = (img: HTMLImageElement) => {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        const imgAspect = img.width / img.height;
        const canvasAspect = canvasWidth / canvasHeight;

        let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

        if (imgAspect > canvasAspect) {
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / imgAspect;
          drawX = 0;
          drawY = (canvasHeight - drawHeight) / 2;
        } else {
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * imgAspect;
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      };

      const loadFromUrl = (url: string, onAfter?: () => void) => {
        const img = new Image();
        
        // First try with CORS enabled
        img.crossOrigin = "anonymous";
        
        img.onload = () => {
          try {
            setBackgroundImage(img);
            drawFitted(img);
            onAfter?.();
          } catch (e) {
            console.error("Error drawing background image with CORS:", e);
            // If CORS fails, try without CORS as fallback
            loadFromUrlWithoutCORS(url, onAfter);
          }
        };
        
        img.onerror = () => {
          console.warn("CORS failed, trying without CORS for:", url);
          // If CORS fails, try without CORS as fallback
          loadFromUrlWithoutCORS(url, onAfter);
        };
        
        img.src = url;
      };

      const loadFromUrlWithoutCORS = (url: string, onAfter?: () => void) => {
        const img = new Image();
        // Remove crossOrigin to allow loading without CORS
        img.crossOrigin = null;
        
        img.onload = () => {
          try {
            setBackgroundImage(img);
            drawFitted(img);
            onAfter?.();
            console.warn("Image loaded without CORS - canvas will be tainted for export");
            
            // Mark the background canvas as potentially tainted
            if (backgroundCanvasRef.current) {
              try {
                backgroundCanvasRef.current.toDataURL();
              } catch (e) {
                console.warn("Background canvas is now tainted due to cross-origin image");
              }
            }
          } catch (e) {
            console.error("Error drawing background image without CORS:", e);
            setDefaultBG(ctx, canvasWidth, canvasHeight);
          }
        };
        
        img.onerror = () => {
          console.error("Failed to load background image even without CORS", { url });
          setDefaultBG(ctx, canvasWidth, canvasHeight);
        };
        
        img.src = url;
      };

      if (id) {
        // 1) canvas-specific background data (API result cached in sessionStorage)
        const backgroundData = sessionStorage.getItem(
          `canvas_background_${id}`
        );
        if (backgroundData) {
          try {
            const parsed = JSON.parse(backgroundData);
            const url: string | undefined = parsed?.backgroundImage;
            if (isDrawableUrl(url)) {
              console.log(
                "Loading background image from canvas_background data"
              );
              loadFromUrl(url!);
              return;
            }
          } catch (e) {
            console.error("Error parsing canvas background data:", e);
          }
        }

        // 2) legacy canvas data
        const canvasData = sessionStorage.getItem(`canvas_${id}`);
        if (canvasData) {
          try {
            const imageData = JSON.parse(canvasData);
            const url: string | undefined = imageData?.image;
            if (isDrawableUrl(url)) {
              console.log("Loading background image from legacy canvas data");
              loadFromUrl(url!);
              return;
            }
          } catch (e) {
            console.error("Error parsing legacy canvas data:", e);
          }
        }

        // 3) uploaded image (for new canvases)
        const uploadedImage = sessionStorage.getItem("uploaded_image");
        if (uploadedImage && isDrawableUrl(uploadedImage)) {
          console.log("Loading background image from uploaded_image");
          loadFromUrl(uploadedImage, () => {
            sessionStorage.removeItem("uploaded_image");
          });
          return;
        }

        // 4) temporary canvas data
        const tempCanvas = sessionStorage.getItem(`temp_canvas_${id}`);
        if (tempCanvas) {
          try {
            const parsed = JSON.parse(tempCanvas);
            const url: string | undefined = parsed?.imagePath || parsed?.image;
            if (isDrawableUrl(url)) {
              console.log("Loading background image from temp canvas data");
              loadFromUrl(url!);
              return;
            }
          } catch (e) {
            console.error("Error parsing temp canvas data:", e);
          }
        }
      }

      // Default: white background
      console.log("No background image found, setting default background");
      setDefaultBG(ctx, canvasWidth, canvasHeight);
    } catch (err) {
      console.error("Error loading background:", err);
      // Best-effort fallback to original ctx
      try {
        setDefaultBG(backgroundCtx, canvasWidth, canvasHeight);
      } catch {}
    }
  };

  const loadCanvasFromAPI = async (canvasId: string) => {
    try {
      const authToken = sessionStorage.getItem("auth_token");
      const tokenType = sessionStorage.getItem("token_type") || "Bearer";

      if (!authToken) {
        console.log("No auth token found, skipping API load");
        return;
      }

      const response = await fetch(
        `${baseUrl}/api/users_canvases/${canvasId}`,
        {
          headers: {
            Authorization: `${tokenType} ${authToken}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const canvasData = await response.json();
        console.log("Canvas data from API:", canvasData);

        // Store the canvas background data for use
        if (canvasData.canvas_url) {
          const backgroundData = {
            id: canvasData.id,
            name: canvasData.canvas_name,
            backgroundImage: canvasData.canvas_url,
            width: canvasData.aspect_width,
            height: canvasData.aspect_height,
          };

          sessionStorage.setItem(
            `canvas_background_${canvasId}`,
            JSON.stringify(backgroundData)
          );

          console.log("Stored canvas background data for canvas:", canvasId);

          // Reload the background image if canvas is already initialized
          if (backgroundCanvasRef.current) {
            const backgroundCtx = backgroundCanvasRef.current.getContext("2d")!;
            loadBackgroundImage(
              backgroundCtx,
              backgroundCanvasRef.current.width,
              backgroundCanvasRef.current.height
            );
          }
        }
      } else {
        console.error("Failed to fetch canvas from API:", response.status);
      }
    } catch (error) {
      console.error("Error loading canvas from API:", error);
    }
  };

  useEffect(() => {
    const canvasId = getCanvasId();
    const isTemp = new URLSearchParams(window.location.search).get("temp");

    // Only try to load from API if it's not a temporary canvas
    if (canvasId && !isTemp) {
      loadCanvasFromAPI(canvasId);
    }
  }, []);

  const setDefaultBackground = (
    backgroundCtx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number
  ) => {
    setBackgroundColor("#ffffff");
    backgroundCtx.fillStyle = "#ffffff";
    backgroundCtx.fillRect(0, 0, canvasWidth, canvasHeight);
  };

  const saveCanvas = async (name: string) => {
    if (!drawingCanvasRef.current || !backgroundCanvasRef.current) {
      alert("Canvas not ready");
      return;
    }

    setIsSaving(true);

    try {
      const bgCanvas = backgroundCanvasRef.current;
      const drawCanvas = drawingCanvasRef.current;

      // Create a completely new clean canvas for export
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = bgCanvas.width;
      tempCanvas.height = bgCanvas.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context");

      // Check if background canvas is tainted by trying to read its data
      let isBackgroundTainted = false;
      try {
        bgCanvas.toDataURL();
      } catch (e) {
        isBackgroundTainted = true;
        console.warn("Background canvas is tainted, using alternative approach");
      }

      if (isBackgroundTainted) {
        // For tainted canvas, we need to recreate the background from the original image
        const canvasId = getCanvasId();
        
        // Try to get the background image URL from session storage
        const backgroundData = sessionStorage.getItem(`canvas_background_${canvasId}`);
        const canvasData = sessionStorage.getItem(`canvas_${canvasId}`);
        const uploadedImage = sessionStorage.getItem("uploaded_image");
        const tempCanvasData = sessionStorage.getItem(`temp_canvas_${canvasId}`);
        
        const backgroundUrl = backgroundData ? JSON.parse(backgroundData)?.backgroundImage : 
                             canvasData ? JSON.parse(canvasData)?.image :
                             uploadedImage || (tempCanvasData ? JSON.parse(tempCanvasData)?.imagePath || JSON.parse(tempCanvasData)?.image : null);
        
        if (backgroundUrl && (backgroundUrl.startsWith("data:image/") || backgroundUrl.startsWith("blob:"))) {
          // For data URLs and blob URLs, we can safely recreate the background
          await new Promise<void>((resolve, reject) => {
            const bgImg = new Image();
            bgImg.crossOrigin = null; // Don't use CORS for data/blob URLs
            bgImg.onload = () => {
              try {
                // Draw the background image fitted to the canvas
                const imgAspect = bgImg.width / bgImg.height;
                const canvasAspect = tempCanvas.width / tempCanvas.height;
                
                let drawWidth, drawHeight, drawX, drawY;
                
                if (imgAspect > canvasAspect) {
                  drawWidth = tempCanvas.width;
                  drawHeight = tempCanvas.width / imgAspect;
                  drawX = 0;
                  drawY = (tempCanvas.height - drawHeight) / 2;
                } else {
                  drawHeight = tempCanvas.height;
                  drawWidth = tempCanvas.height * imgAspect;
                  drawX = (tempCanvas.width - drawWidth) / 2;
                  drawY = 0;
                }
                
                ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
                resolve();
              } catch (e) {
                console.warn("Error drawing background image:", e);
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                resolve();
              }
            };
            bgImg.onerror = () => {
              console.warn("Failed to recreate background from URL, using solid color");
              ctx.fillStyle = backgroundColor;
              ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
              resolve();
            };
            bgImg.src = backgroundUrl;
          });
        } else {
          // Use solid color background as fallback
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
      } else {
        // Safe to copy background canvas
        ctx.drawImage(bgCanvas, 0, 0);
      }

      // Check if drawing canvas is tainted
      let isDrawingTainted = false;
      try {
        drawCanvas.toDataURL();
      } catch (e) {
        isDrawingTainted = true;
        console.warn("Drawing canvas is tainted, cannot export drawings");
      }

      if (!isDrawingTainted) {
        // Safe to copy drawing canvas
        ctx.drawImage(drawCanvas, 0, 0);
      } else {
        console.warn("Drawing canvas is tainted, exporting without drawings");
      }

      // Export merged result
      const mergedBlob: Blob | null = await new Promise((resolve) =>
        tempCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );

      if (!mergedBlob) throw new Error("Failed to create blob from canvas");

      const authToken = sessionStorage.getItem("auth_token");
      const tokenType = sessionStorage.getItem("token_type") || "Bearer";
      if (!authToken) throw new Error("Authentication token not found");

      const formData = new FormData();
      formData.append("name", name);
      formData.append("image", mergedBlob, `${name}.jpg`);

      const canvasId = getCanvasId();
      const urlParams = new URLSearchParams(window.location.search);
      const isTemp = urlParams.get("temp") === "1";

      let apiUrl: string;
      let method = "POST";

      if (canvasId && !isTemp) {
        apiUrl = `${baseUrl}/api/users_canvases/${canvasId}/update`;
      } else {
        apiUrl = `${baseUrl}/api/users_canvases/`;
      }

      const response = await fetch(apiUrl, {
        method,
        headers: {
          Authorization: `${tokenType} ${authToken}`,
          Accept: "application/json",
        },
        body: formData,
      });

      let result: any;

      try {
        result = await response.json();
        console.log("result:", result);
      } catch {
        const text = await response.text();
        throw new Error(`Unexpected response: ${text}`);
      }

      if (!response.ok) {
        throw new Error(
          `Canvas save failed: ${response.status} - ${JSON.stringify(result)}`
        );
      }

      alert(
        `Canvas ${canvasId && !isTemp ? "updated" : "saved"} successfully!`
      );

      setShowSaveModal(false);
      setCanvasName("");

      if (isTemp && result.id) {
        const newUrl = `${window.location.pathname}?id=${result.id}`;
        window.history.replaceState({}, "", newUrl);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(
        `Failed to save canvas: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };
  const captureVideoFrame = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            resolve(blob);
          },
          "image/jpeg",
          0.8
        );
      });
    } catch (error) {
      console.error("Error capturing video frame:", error);
      return null;
    }
  };

  // const analyzeGesture = async () => {
  //   try {
  //     const frameBlob = await captureVideoFrame();
  //     if (!frameBlob) return;

  //     const formData = new FormData();
  //     formData.append("image", frameBlob, "frame.jpg");

  //     const authToken = sessionStorage.getItem("auth_token");
  //     const tokenType = sessionStorage.getItem("token_type") || "Bearer";

  //     const response = await fetch(`${baseUrl}/api/ai/analyze-gesture`, {
  //       method: "POST",
  //       headers: {
  //         ...(authToken ? { Authorization: `${tokenType} ${authToken}` } : {}),
  //       },
  //       body: formData,
  //     });

  //     if (!response.ok) {
  //       console.error(`Gesture API error: ${response.status}`);
  //       return;
  //     }

  //     const data = await response.json();

  //     if (data.gesture && data.gesture !== lastGestureRef.current) {
  //       lastGestureRef.current = data.gesture;
  //       console.log(data);

  //       const newMessage: GestureMessage = {
  //         id: Date.now(),
  //         gesture: data.gesture,
  //         timestamp: Date.now(),
  //       };

  //       setGestureMessages((prev) => [newMessage, ...prev.slice(0, 4)]);

  //       setTimeout(() => {
  //         setGestureMessages((prev) =>
  //           prev.filter((msg) => msg.id !== newMessage.id)
  //         );
  //       }, 3000);
  //     }
  //   } catch (error) {
  //     console.error("Error analyzing gesture:", error);
  //   }
  // };

  // Handle save functionality
  const handleSaveClick = () => {
    setShowSaveModal(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canvasName.trim()) {
      saveCanvas(canvasName.trim());
    }
  };

  useEffect(() => {
    modeRef.current = mode;
    zoomModeRef.current = zoomMode;
    selectionActiveRef.current = selectionActive;
    shapeModeRef.current = shapeMode;
    eraserActiveRef.current = eraserActive;
    cameraPositionRef.current = cameraPosition;
  }, [
    mode,
    zoomMode,
    selectionActive,
    shapeMode,
    eraserActive,
    cameraPosition,
  ]);

  // Gesture detection effect
  // useEffect(() => {
  //   if (isGestureEnabled && isLoaded) {
  //     gestureIntervalRef.current = setInterval(analyzeGesture, 1000);
  //   } else {
  //     if (gestureIntervalRef.current) {
  //       clearInterval(gestureIntervalRef.current);
  //       gestureIntervalRef.current = null;
  //     }
  //   }

  //   return () => {
  //     if (gestureIntervalRef.current) {
  //       clearInterval(gestureIntervalRef.current);
  //     }
  //   };
  // }, [isGestureEnabled, isLoaded, baseUrl]);

  useEffect(() => {
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;

    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const s = document.createElement("script");
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load " + src));
        document.head.appendChild(s);
      });

    const init = async () => {
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
            if (
              window.Hands &&
              window.Camera &&
              window.HAND_CONNECTIONS &&
              window.drawConnectors
            )
              resolve(true);
            else setTimeout(check, 100);
          };
          check();
        });

        if (!mounted) return;

        const PINCH_RATIO_THRESHOLD = 0.25;
        const Z_AXIS_THRESHOLD = 0.08;

        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const cameraCanvas = cameraCanvasRef.current!;
        const ctx = canvas.getContext("2d")!;
        const cameraCtx = cameraCanvas.getContext("2d")!;
        const drawingCanvas = document.createElement("canvas");
        const drawingCtx = drawingCanvas.getContext("2d")!;
        drawingCanvasRef.current = drawingCanvas;

        const backgroundCanvas = document.createElement("canvas");
        const backgroundCtx = backgroundCanvas.getContext("2d")!;
        backgroundCanvasRef.current = backgroundCanvas;

        let prevX: number | null = null;
        let prevY: number | null = null;
        let brushColor = "#ff4d4d";
        const MIRROR = true;

        let TOOLBAR_BTNS: {
          label: Mode;
          x: number;
          y: number;
          w: number;
          h: number;
        }[] = [];

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
        const paletteHoverStart = new Array(COLORS.length).fill(null);
        const ZOOM_BTNS: {
          label: ZoomMode;
          x: number;
          y: number;
          w: number;
          h: number;
        }[] = [];
        const zoomHoverStart: Record<ZoomMode, number | null> = {
          ZoomIn: null,
          ZoomOut: null,
          Move: null,
        };

        const SHAPE_BTNS: {
          label: ShapeMode;
          x: number;
          y: number;
          w: number;
          h: number;
        }[] = [];
        const shapeHoverStart: Record<ShapeMode, number | null> = {
          Rectangle: null,
          Triangle: null,
          Circle: null,
          Line: null,
          None: null,
        };

        const ERASE_BTN = { x: 0, y: 0, w: 0, h: 0 };
        let eraseHoverStart: number | null = null;

        let hoverStart: Record<Mode, number | null> = {
          Idle: null,
          Brush: null,
          Zoom: null,
          ColorSelect: null,
          Annotate: null,
        };

        let selectionStart: { x: number; y: number } | null = null;
        let selectionEnd: { x: number; y: number } | null = null;
        let selectedImage: ImageData | null = null;
        let selectedX = 0;
        let selectedY = 0;
        let selectionBounds: {
          x: number;
          y: number;
          w: number;
          h: number;
        } | null = null;

        let selHoverStart: number | null = null;

        let shapeStart: { x: number; y: number } | null = null;
        let shapeEnd: { x: number; y: number } | null = null;
        let isDrawingShape = false;
        let tempShapeCanvas: HTMLCanvasElement | null = null;
        let tempShapeCtx: CanvasRenderingContext2D | null = null;
        let drawnShapes: {
          type: ShapeMode;
          start: { x: number; y: number };
          end: { x: number; y: number };
          color: string;
        }[] = [];

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;
        let isMoving = false;
        let moveStartX = 0;
        let moveStartY = 0;

        let isMovingCamera = false;
        let cameraMoveStartX = 0;
        let cameraMoveStartY = 0;

        // --- MOUSE DRAG: State variables ---
        let isDraggingWithMouse = false;
        let mouseDragOffsetX = 0;
        let mouseDragOffsetY = 0;

        const BTN_W = 110;
        const BTN_H = 44;
        const BTN_PAD = 12;
        const TOP_MARGIN = 12;
        const PALETTE_X = 40;
        const PALETTE_Y = 120;
        const ZOOM_X = 40;
        const ZOOM_Y = 120;
        const SHAPE_X = 40;
        const SHAPE_Y = 120;
        const SHAPE_BTN_W = 60;
        const SHAPE_BTN_H = 44;
        const SHAPE_BTN_PAD = 8;
        const SEL_X = 40;
        const SEL_Y = 320;
        const SEL_BTN_W = 60;
        const SEL_BTN_H = 44;
        const ERASE_Y = 120;
        const ERASE_BTN_W = 80;
        const ERASE_BTN_H = 44;
        const ZOOM_BTN_W = 60;
        const ZOOM_BTN_H = 44;
        const ZOOM_BTN_PAD = 12;
        const bubbleR = 20;
        let eraserRadius = 60;

        tempShapeCanvas = document.createElement("canvas");
        tempShapeCtx = tempShapeCanvas.getContext("2d");

        const zoomLabels: ZoomMode[] = ["ZoomIn", "ZoomOut", "Move"];
        for (let i = 0; i < zoomLabels.length; i++) {
          ZOOM_BTNS.push({
            label: zoomLabels[i],
            x: ZOOM_X,
            y: ZOOM_Y + i * (ZOOM_BTN_H + ZOOM_BTN_PAD),
            w: ZOOM_BTN_W,
            h: ZOOM_BTN_H,
          });
        }

        const shapeLabels: ShapeMode[] = [
          "Rectangle",
          "Triangle",
          "Circle",
          "Line",
        ];
        for (let i = 0; i < shapeLabels.length; i++) {
          SHAPE_BTNS.push({
            label: shapeLabels[i],
            x: SHAPE_X,
            y: SHAPE_Y + i * (SHAPE_BTN_H + SHAPE_BTN_PAD),
            w: SHAPE_BTN_W,
            h: SHAPE_BTN_H,
          });
        }

        const handleResize = () => {
          if (!stageContainerRef.current || !canvasRef.current || !mounted)
            return;
          const container = stageContainerRef.current;
          const newWidth = container.clientWidth;
          const newHeight = container.clientHeight;

          if (newWidth === 0 || newHeight === 0) return;

          canvas.width = newWidth;
          canvas.height = newHeight;

          if (drawingCanvasRef.current) {
            const tempSave = document.createElement("canvas");
            tempSave.width = drawingCanvasRef.current.width;
            tempSave.height = drawingCanvasRef.current.height;
            tempSave
              .getContext("2d")!
              .drawImage(drawingCanvasRef.current, 0, 0);

            drawingCanvasRef.current.width = newWidth;
            drawingCanvasRef.current.height = newHeight;
            drawingCanvasRef.current
              .getContext("2d")!
              .drawImage(tempSave, 0, 0);
          }

          if (backgroundCanvasRef.current) {
            backgroundCanvasRef.current.width = newWidth;
            backgroundCanvasRef.current.height = newHeight;
            loadBackgroundImage(backgroundCtx, newWidth, newHeight);
          }

          if (tempShapeCanvas) {
            tempShapeCanvas.width = newWidth;
            tempShapeCanvas.height = newHeight;
          }

          const cam = cameraPositionRef.current;
          const boundedX = Math.max(
            0,
            Math.min(newWidth - cameraSize.width, cam.x)
          );
          const boundedY = Math.max(
            0,
            Math.min(newHeight - cameraSize.height, cam.y)
          );

          if (boundedX !== cam.x || boundedY !== cam.y) {
            setCameraPosition({ x: boundedX, y: boundedY });
          }

          ERASE_BTN.x = newWidth - ERASE_BTN_W - 40;
          ERASE_BTN.y = ERASE_Y;
          ERASE_BTN.w = ERASE_BTN_W;
          ERASE_BTN.h = ERASE_BTN_H;

          TOOLBAR_BTNS = [];
          const labels: Mode[] = [
            "Idle",
            "Brush",
            "Zoom",
            "ColorSelect",
            "Annotate",
          ];
          const totalW = labels.length * BTN_W + (labels.length - 1) * BTN_PAD;
          let startX = Math.max(12, (newWidth - totalW) / 2);
          const y = TOP_MARGIN;
          for (let i = 0; i < labels.length; i++) {
            TOOLBAR_BTNS.push({
              label: labels[i],
              x: startX + i * (BTN_W + BTN_PAD),
              y,
              w: BTN_W,
              h: BTN_H,
            });
          }
        };

        resizeObserver = new ResizeObserver(handleResize);
        if (stageContainerRef.current) {
          resizeObserver.observe(stageContainerRef.current);
        }
        handleResize();

        cameraCanvas.width = cameraSize.width;
        cameraCanvas.height = cameraSize.height;

        video.addEventListener("loadedmetadata", () => {
          scale = 1;
          offsetX = 0;
          offsetY = 0;
        });

        function isFingerUp(lms: any, tipIdx: number, pipIdx: number) {
          return lms[tipIdx].y < lms[pipIdx].y;
        }

        function mirrorXY(lm: any) {
          const x = lm.x * canvas.width;
          const y = lm.y * canvas.height;
          return { x: MIRROR ? canvas.width - x : x, y };
        }

        function dist(ax: number, ay: number, bx: number, by: number) {
          return Math.hypot(ax - bx, ay - by);
        }

        function getHandScale(lms: any) {
          const p1 = mirrorXY(lms[5]);
          const p2 = mirrorXY(lms[17]);
          return dist(p1.x, p1.y, p2.x, p2.y);
        }

        function insideBtn(
          mx: number,
          my: number,
          b: { x: number; y: number; w: number; h: number }
        ) {
          return mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;
        }

        function isInsideCamera(x: number, y: number) {
          const cam = cameraPositionRef.current;
          return (
            x >= cam.x &&
            x <= cam.x + cameraSize.width &&
            y >= cam.y &&
            y <= cam.y + cameraSize.height
          );
        }

        // --- MOUSE DRAG: Event Handlers ---
        const handleMouseDown = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          if (isInsideCamera(mouseX, mouseY)) {
            isDraggingWithMouse = true;
            isMovingCamera = false; // Prevent pinch from interfering
            mouseDragOffsetX = mouseX - cameraPositionRef.current.x;
            mouseDragOffsetY = mouseY - cameraPositionRef.current.y;
            canvas.style.cursor = "grabbing";
          }
        };

        const handleMouseMove = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          if (isDraggingWithMouse) {
            const newX = mouseX - mouseDragOffsetX;
            const newY = mouseY - mouseDragOffsetY;
            const boundedX = Math.max(
              0,
              Math.min(canvas.width - cameraSize.width, newX)
            );
            const boundedY = Math.max(
              0,
              Math.min(canvas.height - cameraSize.height, newY)
            );
            setCameraPosition({ x: boundedX, y: boundedY });
          } else {
            // Set cursor to 'grab' if hovering over the camera, otherwise 'default'
            canvas.style.cursor = isInsideCamera(mouseX, mouseY)
              ? "grab"
              : "default";
          }
        };

        const handleMouseUp = (e: MouseEvent) => {
          if (isDraggingWithMouse) {
            isDraggingWithMouse = false;
            // Check cursor state again on mouse up
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            canvas.style.cursor = isInsideCamera(mouseX, mouseY)
              ? "grab"
              : "default";
          }
        };

        // Add Listeners
        canvas.addEventListener("mousedown", handleMouseDown);
        document.addEventListener("mousemove", handleMouseMove); // Use document to allow dragging outside canvas
        document.addEventListener("mouseup", handleMouseUp); // Use document to release click anywhere

        function applyTransform() {
          ctx.save();
          ctx.translate(offsetX, offsetY);
          ctx.scale(scale, scale);
        }

        function restoreTransform() {
          ctx.restore();
        }

        function screenToWorld(x: number, y: number) {
          return {
            x: (x - offsetX) / scale,
            y: (y - offsetY) / scale,
          };
        }

        function worldToScreen(x: number, y: number) {
          return {
            x: x * scale + offsetX,
            y: y * scale + offsetY,
          };
        }

        function drawShapePreview(
          ctx: CanvasRenderingContext2D,
          start: { x: number; y: number },
          end: { x: number; y: number },
          type: ShapeMode,
          color: string
        ) {
          if (!start || !end) return;

          ctx.strokeStyle = color;
          ctx.fillStyle = color + "40";
          ctx.lineWidth = brushSize;

          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const w = Math.abs(end.x - start.x);
          const h = Math.abs(end.y - start.y);
          const centerX = start.x + (end.x - start.x) / 2;
          const centerY = start.y + (end.y - start.y) / 2;
          const radius = Math.max(w, h) / 2;

          switch (type) {
            case "Rectangle":
              ctx.strokeRect(x, y, w, h);
              ctx.fillRect(x, y, w, h);
              break;
            case "Triangle":
              ctx.beginPath();
              ctx.moveTo(centerX, y);
              ctx.lineTo(x, y + h);
              ctx.lineTo(x + w, y + h);
              ctx.closePath();
              ctx.stroke();
              ctx.fill();
              break;
            case "Circle":
              ctx.beginPath();
              ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              ctx.stroke();
              ctx.fill();
              break;
            case "Line":
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              ctx.stroke();
              break;
          }
        }

        function finalizeShape(
          start: { x: number; y: number },
          end: { x: number; y: number },
          type: ShapeMode,
          color: string
        ) {
          if (!start || !end) return;

          drawingCtx.strokeStyle = color;
          drawingCtx.fillStyle = color + "40";
          drawingCtx.lineWidth = brushSize;

          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const w = Math.abs(end.x - start.x);
          const h = Math.abs(end.y - start.y);
          const centerX = start.x + (end.x - start.x) / 2;
          const centerY = start.y + (end.y - start.y) / 2;
          const radius = Math.max(w, h) / 2;

          switch (type) {
            case "Rectangle":
              drawingCtx.strokeRect(x, y, w, h);
              drawingCtx.fillRect(x, y, w, h);
              break;
            case "Triangle":
              drawingCtx.beginPath();
              drawingCtx.moveTo(centerX, y);
              drawingCtx.lineTo(x, y + h);
              drawingCtx.lineTo(x + w, y + h);
              drawingCtx.closePath();
              drawingCtx.stroke();
              drawingCtx.fill();
              break;
            case "Circle":
              drawingCtx.beginPath();
              drawingCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
              drawingCtx.stroke();
              drawingCtx.fill();
              break;
            case "Line":
              drawingCtx.beginPath();
              drawingCtx.moveTo(start.x, start.y);
              drawingCtx.lineTo(end.x, end.y);
              drawingCtx.stroke();
              break;
          }
        }

        function drawSelectionBounds(
          ctx: CanvasRenderingContext2D,
          bounds: { x: number; y: number; w: number; h: number },
          isSelected: boolean
        ) {
          ctx.save();
          ctx.strokeStyle = isSelected
            ? "rgba(0, 255, 0, 0.8)"
            : "rgba(0, 255, 255, 0.8)";
          ctx.fillStyle = isSelected
            ? "rgba(0, 255, 0, 0.2)"
            : "rgba(0, 255, 255, 0.2)";
          ctx.lineWidth = 2;
          ctx.setLineDash(isSelected ? [5, 5] : []);
          ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
          ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);

          if (isSelected) {
            ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
            const handleSize = 8;
            ctx.fillRect(
              bounds.x - handleSize / 2,
              bounds.y - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              bounds.x + bounds.w - handleSize / 2,
              bounds.y - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              bounds.x - handleSize / 2,
              bounds.y + bounds.h - handleSize / 2,
              handleSize,
              handleSize
            );
            ctx.fillRect(
              bounds.x + bounds.w - handleSize / 2,
              bounds.y + bounds.h - handleSize / 2,
              handleSize,
              handleSize
            );
          }
          ctx.restore();
        }

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

        const camera = new window.Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
        });

        hands.onResults((results: any) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          cameraCtx.clearRect(0, 0, cameraCanvas.width, cameraCanvas.height);

          ctx.drawImage(backgroundCanvas, 0, 0);

          const now = performance.now();

          if (results.multiHandLandmarks?.length) {
            setHandVisible(true);
            const lms = results.multiHandLandmarks[0];
            const indexUp = isFingerUp(lms, 8, 6);
            const middleUp = isFingerUp(lms, 12, 10);
            const ringUp = isFingerUp(lms, 16, 14);
            const pinkyUp = isFingerUp(lms, 20, 18);
            const thumbUp = isFingerUp(lms, 4, 2);

            const { x: ix, y: iy } = mirrorXY(lms[8]);
            const { x: tx, y: ty } = mirrorXY(lms[4]);
            const { x: pxP, y: pyP } = mirrorXY(lms[20]);

            const palmCenter = getPalmCenter(lms);

            const handScale = getHandScale(lms);
            const pinchDistance = dist(ix, iy, tx, ty);
            const zDiff = Math.abs(lms[8].z - lms[4].z);

            const isPinching =
              pinchDistance < handScale * PINCH_RATIO_THRESHOLD &&
              zDiff < Z_AXIS_THRESHOLD;

            const isInCamera = isInsideCamera(ix, iy);
            // --- MOUSE DRAG: Add !isDraggingWithMouse to prevent conflict ---
            if (
              isInCamera &&
              isPinching &&
              indexUp &&
              thumbUp &&
              !isDraggingWithMouse
            ) {
              if (!isMovingCamera) {
                isMovingCamera = true;
                cameraMoveStartX = ix - cameraPositionRef.current.x;
                cameraMoveStartY = iy - cameraPositionRef.current.y;
              } else {
                const newX = ix - cameraMoveStartX;
                const newY = iy - cameraMoveStartY;

                const boundedX = Math.max(
                  0,
                  Math.min(canvas.width - cameraSize.width, newX)
                );
                const boundedY = Math.max(
                  0,
                  Math.min(canvas.height - cameraSize.height, newY)
                );

                setCameraPosition({ x: boundedX, y: boundedY });
              }
            } else {
              isMovingCamera = false;
            }

            if (results.image) {
              cameraCtx.save();
              cameraCtx.scale(-1, 1);
              cameraCtx.drawImage(
                results.image,
                -cameraCanvas.width,
                0,
                cameraCanvas.width,
                cameraCanvas.height
              );
              cameraCtx.restore();

              const mirrored = lms.map((p: any) => ({
                x: (1 - p.x) * cameraCanvas.width,
                y: p.y * cameraCanvas.height,
                z: p.z,
              }));

              window.drawConnectors(
                cameraCtx,
                mirrored,
                window.HAND_CONNECTIONS,
                { color: "#00FF00", lineWidth: 2 }
              );
              window.drawLandmarks(cameraCtx, mirrored, {
                color: "#FF0000",
                lineWidth: 1.5,
                radius: 2,
              });
            }

            for (const btn of TOOLBAR_BTNS) {
              if (insideBtn(ix, iy, btn) && indexUp && !isInCamera) {
                if (!hoverStart[btn.label]) hoverStart[btn.label] = now;
                else if (now - (hoverStart[btn.label] ?? 0) >= 1000) {
                  setMode(btn.label);
                  modeRef.current = btn.label;
                  if (btn.label !== "Annotate") {
                    setEraserActive(false);
                    eraserActiveRef.current = false;
                  }
                  Object.keys(hoverStart).forEach(
                    (k) => (hoverStart[k as Mode] = null)
                  );
                }
              } else {
                hoverStart[btn.label] = null;
              }
            }

            if (modeRef.current === "Annotate") {
              for (const btn of SHAPE_BTNS) {
                if (insideBtn(ix, iy, btn) && indexUp) {
                  if (!shapeHoverStart[btn.label])
                    shapeHoverStart[btn.label] = now;
                  else if (now - (shapeHoverStart[btn.label] ?? 0) >= 1000) {
                    setShapeMode(btn.label);
                    shapeModeRef.current = btn.label;
                    setSelectionActive(false);
                    selectionActiveRef.current = false;
                    setEraserActive(false);
                    eraserActiveRef.current = false;
                    Object.keys(shapeHoverStart).forEach(
                      (k) => (shapeHoverStart[k as ShapeMode] = null)
                    );
                  }
                } else {
                  shapeHoverStart[btn.label] = null;
                }
              }

              if (insideBtn(ix, iy, ERASE_BTN) && indexUp) {
                if (!eraseHoverStart) eraseHoverStart = now;
                else if (now - eraseHoverStart >= 1000) {
                  setEraserActive(true);
                  eraserActiveRef.current = true;
                  setShapeMode("None");
                  shapeModeRef.current = "None";
                  setSelectionActive(false);
                  selectionActiveRef.current = false;
                  eraseHoverStart = null;
                }
              } else {
                eraseHoverStart = null;
              }

              const selBtn = { x: SEL_X, y: SEL_Y, w: SEL_BTN_W, h: SEL_BTN_H };
              if (insideBtn(ix, iy, selBtn) && indexUp) {
                if (!selHoverStart) selHoverStart = now;
                else if (now - selHoverStart >= 1000) {
                  setSelectionActive(true);
                  selectionActiveRef.current = true;
                  setShapeMode("None");
                  shapeModeRef.current = "None";
                  setEraserActive(false);
                  eraserActiveRef.current = false;
                  selHoverStart = null;
                }
              } else {
                selHoverStart = null;
              }
            }

            if (modeRef.current === "Zoom") {
              for (const btn of ZOOM_BTNS) {
                if (insideBtn(ix, iy, btn) && indexUp && !isInCamera) {
                  if (!zoomHoverStart[btn.label])
                    zoomHoverStart[btn.label] = now;
                  else if (now - (zoomHoverStart[btn.label] ?? 0) >= 1000) {
                    setZoomMode(btn.label);
                    zoomModeRef.current = btn.label;
                    Object.keys(zoomHoverStart).forEach(
                      (k) => (zoomHoverStart[k as ZoomMode] = null)
                    );
                  }
                } else {
                  zoomHoverStart[btn.label] = null;
                }
              }

              const currentZoomMode = zoomModeRef.current;

              if (
                currentZoomMode === "ZoomIn" &&
                isPinching &&
                indexUp &&
                thumbUp &&
                !isInCamera
              ) {
                scale = Math.min(scale * 1.05, 5);
              } else if (
                currentZoomMode === "ZoomOut" &&
                isPinching &&
                indexUp &&
                thumbUp &&
                !isInCamera
              ) {
                scale = Math.max(scale / 1.05, 0.2);
              } else if (
                currentZoomMode === "Move" &&
                isPinching &&
                indexUp &&
                thumbUp &&
                !isInCamera
              ) {
                const drawX = (ix + tx) / 2;
                const drawY = (iy + ty) / 2;

                if (!isMoving) {
                  isMoving = true;
                  moveStartX = drawX;
                  moveStartY = drawY;
                } else {
                  offsetX += drawX - moveStartX;
                  offsetY += drawY - moveStartY;
                  moveStartX = drawX;
                  moveStartY = drawY;
                }
              } else {
                isMoving = false;
              }
            }

            const currentMode = modeRef.current;
            const currentSelectionActive = selectionActiveRef.current;
            const currentShapeMode = shapeModeRef.current;
            const currentEraserActive = eraserActiveRef.current;

            if (currentMode === "Brush" && !isInCamera) {
              if (
                isPinching &&
                indexUp &&
                thumbUp &&
                !middleUp &&
                !ringUp &&
                !pinkyUp
              ) {
                const screenDrawX = (ix + tx) / 2;
                const screenDrawY = (iy + ty) / 2;
                const worldCoords = screenToWorld(screenDrawX, screenDrawY);
                const drawX = worldCoords.x;
                const drawY = worldCoords.y;

                drawingCtx.fillStyle = brushColor;
                drawingCtx.beginPath();
                drawingCtx.arc(drawX, drawY, brushSize / 2, 0, Math.PI * 2);
                drawingCtx.fill();

                if (prevX !== null && prevY !== null) {
                  drawingCtx.strokeStyle = brushColor;
                  drawingCtx.lineWidth = brushSize;
                  drawingCtx.lineJoin = drawingCtx.lineCap = "round";
                  drawingCtx.beginPath();
                  drawingCtx.moveTo(prevX!, prevY!);
                  drawingCtx.lineTo(drawX, drawY);
                  drawingCtx.stroke();
                }
                prevX = drawX;
                prevY = drawY;
              } else {
                prevX = prevY = null;
              }

              if (
                indexUp &&
                middleUp &&
                ringUp &&
                pinkyUp &&
                thumbUp &&
                !isInCamera
              ) {
                const worldPalmCoords = screenToWorld(
                  palmCenter.x,
                  palmCenter.y
                );

                ctx.save();
                ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
                ctx.fillStyle = "rgba(255, 50, 50, 0.2)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(
                  palmCenter.x,
                  palmCenter.y,
                  eraserRadius,
                  0,
                  Math.PI * 2
                );
                ctx.stroke();
                ctx.fill();
                ctx.restore();

                drawingCtx.save();
                drawingCtx.globalCompositeOperation = "destination-out";
                drawingCtx.beginPath();
                drawingCtx.arc(
                  worldPalmCoords.x,
                  worldPalmCoords.y,
                  eraserRadius / scale,
                  0,
                  Math.PI * 2
                );
                drawingCtx.fill();
                drawingCtx.restore();
              }
            } else {
              prevX = prevY = null;
            }

            if (currentMode === "Annotate" && currentEraserActive) {
              if (indexUp && middleUp && ringUp && pinkyUp && thumbUp) {
                const worldPalmCoords = screenToWorld(
                  palmCenter.x,
                  palmCenter.y
                );

                ctx.save();
                ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
                ctx.fillStyle = "rgba(255, 50, 50, 0.2)";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(
                  palmCenter.x,
                  palmCenter.y,
                  eraserRadius,
                  0,
                  Math.PI * 2
                );
                ctx.stroke();
                ctx.fill();
                ctx.restore();

                drawingCtx.save();
                drawingCtx.globalCompositeOperation = "destination-out";
                drawingCtx.beginPath();
                drawingCtx.arc(
                  worldPalmCoords.x,
                  worldPalmCoords.y,
                  eraserRadius / scale,
                  0,
                  Math.PI * 2
                );
                drawingCtx.fill();
                drawingCtx.restore();
              }
            }

            if (
              currentMode === "Annotate" &&
              currentShapeMode !== "None" &&
              !currentSelectionActive &&
              !currentEraserActive
            ) {
              const indexWorldCoords = screenToWorld(ix, iy);
              const thumbWorldCoords = screenToWorld(tx, ty);

              if (
                isPinching &&
                indexUp &&
                thumbUp &&
                !isDrawingShape &&
                !middleUp &&
                !ringUp &&
                !pinkyUp
              ) {
                isDrawingShape = true;
                const startX = (indexWorldCoords.x + thumbWorldCoords.x) / 2;
                const startY = (indexWorldCoords.y + thumbWorldCoords.y) / 2;
                shapeStart = { x: startX, y: startY };
                shapeEnd = { x: startX, y: startY };
              }

              if (
                isDrawingShape &&
                isPinching &&
                indexUp &&
                thumbUp &&
                shapeStart
              ) {
                const currentX = (indexWorldCoords.x + thumbWorldCoords.x) / 2;
                const currentY = (indexWorldCoords.y + thumbWorldCoords.y) / 2;
                shapeEnd = { x: currentX, y: currentY };

                if (tempShapeCtx) {
                  tempShapeCtx.clearRect(
                    0,
                    0,
                    tempShapeCanvas!.width,
                    tempShapeCanvas!.height
                  );
                  drawShapePreview(
                    tempShapeCtx,
                    shapeStart,
                    shapeEnd,
                    currentShapeMode,
                    brushColor
                  );
                }
              }

              if (
                isDrawingShape &&
                shapeStart &&
                shapeEnd &&
                ((isPinching &&
                  indexUp &&
                  thumbUp &&
                  (middleUp || ringUp || pinkyUp)) ||
                  (indexUp && thumbUp && middleUp && ringUp && pinkyUp))
              ) {
                finalizeShape(
                  shapeStart,
                  shapeEnd,
                  currentShapeMode,
                  brushColor
                );
                drawnShapes.push({
                  type: currentShapeMode,
                  start: { ...shapeStart },
                  end: { ...shapeEnd },
                  color: brushColor,
                });

                isDrawingShape = false;
                shapeStart = null;
                shapeEnd = null;
                if (tempShapeCtx) {
                  tempShapeCtx.clearRect(
                    0,
                    0,
                    tempShapeCanvas!.width,
                    tempShapeCanvas!.height
                  );
                }
              }

              if (isDrawingShape && !isPinching) {
                isDrawingShape = false;
                shapeStart = null;
                shapeEnd = null;
                if (tempShapeCtx) {
                  tempShapeCtx.clearRect(
                    0,
                    0,
                    tempShapeCanvas!.width,
                    tempShapeCanvas!.height
                  );
                }
              }
            }

            if (
              currentMode === "Annotate" &&
              currentSelectionActive &&
              currentShapeMode === "None" &&
              !currentEraserActive
            ) {
              const pinkyWorldCoords = screenToWorld(pxP, pyP);
              const indexWorldCoords = screenToWorld(ix, iy);

              if (selectionStart && selectionEnd) {
                selectionBounds = {
                  x: Math.min(selectionStart.x, selectionEnd.x),
                  y: Math.min(selectionStart.y, selectionEnd.y),
                  w: Math.abs(selectionEnd.x - selectionStart.x),
                  h: Math.abs(selectionEnd.y - selectionStart.y),
                };
              } else if (selectedImage) {
                selectionBounds = {
                  x: selectedX,
                  y: selectedY,
                  w: selectedImage.width,
                  h: selectedImage.height,
                };
              } else {
                selectionBounds = null;
              }

              if (
                pinkyUp &&
                !indexUp &&
                !middleUp &&
                !ringUp &&
                !selectedImage
              ) {
                if (!selectionStart) {
                  selectionStart = {
                    x: pinkyWorldCoords.x,
                    y: pinkyWorldCoords.y,
                  };
                  selectionEnd = {
                    x: pinkyWorldCoords.x,
                    y: pinkyWorldCoords.y,
                  };
                } else {
                  selectionEnd = {
                    x: pinkyWorldCoords.x,
                    y: pinkyWorldCoords.y,
                  };
                }
              }

              if (selectionStart && selectionEnd && selectedImage === null) {
                if (!pinkyUp || indexUp || middleUp || ringUp) {
                  const x = Math.min(selectionStart.x, selectionEnd.x);
                  const y = Math.min(selectionStart.y, selectionEnd.y);
                  const w = Math.abs(selectionEnd.x - selectionStart.x);
                  const h = Math.abs(selectionEnd.y - selectionStart.y);

                  if (w > 10 && h > 10) {
                    try {
                      selectedImage = drawingCtx.getImageData(x, y, w, h);
                      selectedX = x;
                      selectedY = y;
                      drawingCtx.clearRect(x, y, w, h);
                    } catch (e) {
                      console.error("Error getting image data:", e);
                      selectedImage = null;
                    }
                  }
                  selectionStart = null;
                  selectionEnd = null;
                }
              }

              if (selectedImage && pinkyUp && indexUp && !middleUp && !ringUp) {
                selectedX = indexWorldCoords.x - selectedImage.width / 2;
                selectedY = indexWorldCoords.y - selectedImage.height / 2;
              }

              if (selectedImage) {
                const isDragging = pinkyUp && indexUp && !middleUp && !ringUp;
                if (!isDragging) {
                  try {
                    drawingCtx.putImageData(
                      selectedImage,
                      selectedX,
                      selectedY
                    );
                  } catch (e) {
                    console.error("Error putting image data:", e);
                  }
                  selectedImage = null;
                  selectionBounds = null;
                }
              }
            }

            if (currentMode === "ColorSelect") {
              for (let i = 0; i < COLORS.length; i++) {
                const cx = PALETTE_X;
                const cy = PALETTE_Y + i * (bubbleR * 2 + 14);
                if (dist(ix, iy, cx, cy) <= bubbleR && indexUp) {
                  if (!paletteHoverStart[i]) paletteHoverStart[i] = now;
                  else if (now - (paletteHoverStart[i] ?? 0) >= 1000) {
                    brushColor = COLORS[i];
                    setMode("Brush");
                    modeRef.current = "Brush";
                    paletteHoverStart.fill(null);
                  }
                } else {
                  paletteHoverStart[i] = null;
                }
              }
            }

            const mirrored = lms.map((p: any) => ({
              x: 1 - p.x,
              y: p.y,
              z: p.z,
            }));
            window.drawConnectors(ctx, mirrored, window.HAND_CONNECTIONS, {
              color: "#00FF88",
              lineWidth: 2,
            });
            window.drawLandmarks(ctx, mirrored, {
              color: "#ff4444",
              lineWidth: 1.8,
              radius: 1.8,
            });
          } else {
            setHandVisible(false);
          }

          applyTransform();
          ctx.drawImage(drawingCanvas, 0, 0);

          if (isDrawingShape && tempShapeCanvas) {
            ctx.drawImage(tempShapeCanvas, 0, 0);
          }

          if (selectionBounds) {
            drawSelectionBounds(ctx, selectionBounds, !!selectedImage);
          }

          if (selectedImage) {
            ctx.putImageData(selectedImage, selectedX, selectedY);
          }

          restoreTransform();

          ctx.save();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            cameraPositionRef.current.x,
            cameraPositionRef.current.y,
            cameraSize.width,
            cameraSize.height
          );
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(
            cameraPositionRef.current.x,
            cameraPositionRef.current.y,
            cameraSize.width,
            20
          );
          ctx.fillStyle = "white";
          ctx.font = "12px Arial";
          ctx.fillText(
            "Camera (Pinch or Drag)",
            cameraPositionRef.current.x + 5,
            cameraPositionRef.current.y + 15
          );
          ctx.restore();

          drawUI();
        });

        function drawUI() {
          for (const btn of TOOLBAR_BTNS) {
            ctx.save();
            ctx.fillStyle =
              btn.label === modeRef.current
                ? "rgba(0,150,255,0.92)"
                : "rgba(40,40,40,0.82)";
            ctx.strokeStyle = "rgba(255,255,255,0.95)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "white";
            ctx.font = "16px Inter, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
            const hs = hoverStart[btn.label];
            if (hs) {
              const elapsed = Math.min(1000, performance.now() - hs);
              const pct = elapsed / 1000;
              const cx = btn.x + btn.w - 16;
              const cy = btn.y + 16;
              ctx.beginPath();
              ctx.arc(
                cx,
                cy,
                10,
                -Math.PI / 2,
                -Math.PI / 2 + pct * Math.PI * 2
              );
              ctx.strokeStyle = "rgba(255,255,255,0.95)";
              ctx.lineWidth = 3;
              ctx.stroke();
            }
            ctx.restore();
          }

          if (modeRef.current === "Zoom") {
            for (const btn of ZOOM_BTNS) {
              ctx.save();
              ctx.fillStyle =
                btn.label === zoomModeRef.current
                  ? "rgba(0,200,100,0.92)"
                  : "rgba(40,40,40,0.82)";
              ctx.strokeStyle = "rgba(255,255,255,0.95)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = "white";
              ctx.font = "14px Inter, Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
              const hs = zoomHoverStart[btn.label];
              if (hs) {
                const elapsed = Math.min(1000, performance.now() - hs);
                const pct = elapsed / 1000;
                const cx = btn.x + btn.w - 12;
                const cy = btn.y + 12;
                ctx.beginPath();
                ctx.arc(
                  cx,
                  cy,
                  8,
                  -Math.PI / 2,
                  -Math.PI / 2 + pct * Math.PI * 2
                );
                ctx.strokeStyle = "rgba(255,255,255,0.95)";
                ctx.lineWidth = 2;
                ctx.stroke();
              }
              ctx.restore();
            }
          }

          if (modeRef.current === "Annotate") {
            for (const btn of SHAPE_BTNS) {
              ctx.save();
              ctx.fillStyle =
                btn.label === shapeModeRef.current
                  ? "rgba(200,100,0,0.92)"
                  : "rgba(40,40,40,0.82)";
              ctx.strokeStyle = "rgba(255,255,255,0.95)";
              ctx.lineWidth = 2;
              ctx.beginPath();
              roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
              ctx.fill();
              ctx.stroke();
              ctx.fillStyle = "white";
              ctx.font = "14px Inter, Arial, sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
              const hs = shapeHoverStart[btn.label];
              if (hs) {
                const elapsed = Math.min(1000, performance.now() - hs);
                const pct = elapsed / 1000;
                const cx = btn.x + btn.w - 12;
                const cy = btn.y + 12;
                ctx.beginPath();
                ctx.arc(
                  cx,
                  cy,
                  8,
                  -Math.PI / 2,
                  -Math.PI / 2 + pct * Math.PI * 2
                );
                ctx.strokeStyle = "rgba(255,255,255,0.95)";
                ctx.lineWidth = 2;
                ctx.stroke();
              }
              ctx.restore();
            }

            ctx.save();
            ctx.fillStyle = eraserActiveRef.current
              ? "rgba(255,50,50,0.92)"
              : "rgba(40,40,40,0.82)";
            ctx.strokeStyle = "rgba(255,255,255,0.95)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            roundRect(
              ctx,
              ERASE_BTN.x,
              ERASE_BTN.y,
              ERASE_BTN.w,
              ERASE_BTN.h,
              8
            );
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "white";
            ctx.font = "14px Inter, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
              "Erase",
              ERASE_BTN.x + ERASE_BTN.w / 2,
              ERASE_BTN.y + ERASE_BTN.h / 2
            );

            if (eraseHoverStart) {
              const elapsed = Math.min(
                1000,
                performance.now() - eraseHoverStart
              );
              const pct = elapsed / 1000;
              const cx = ERASE_BTN.x + ERASE_BTN.w - 12;
              const cy = ERASE_BTN.y + 12;
              ctx.beginPath();
              ctx.arc(
                cx,
                cy,
                8,
                -Math.PI / 2,
                -Math.PI / 2 + pct * Math.PI * 2
              );
              ctx.strokeStyle = "rgba(255,255,255,0.95)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();

            ctx.save();
            ctx.fillStyle = selectionActiveRef.current
              ? "rgba(200,100,0,0.92)"
              : "rgba(40,40,40,0.82)";
            ctx.strokeStyle = "rgba(255,255,255,0.95)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            roundRect(ctx, SEL_X, SEL_Y, SEL_BTN_W, SEL_BTN_H, 8);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "white";
            ctx.font = "14px Inter, Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Sel", SEL_X + SEL_BTN_W / 2, SEL_Y + SEL_BTN_H / 2);

            if (selHoverStart) {
              const elapsed = Math.min(1000, performance.now() - selHoverStart);
              const pct = elapsed / 1000;
              const cx = SEL_X + SEL_BTN_W - 12;
              const cy = SEL_Y + 12;
              ctx.beginPath();
              ctx.arc(
                cx,
                cy,
                8,
                -Math.PI / 2,
                -Math.PI / 2 + pct * Math.PI * 2
              );
              ctx.strokeStyle = "rgba(255,255,255,0.95)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();
          }

          if (modeRef.current === "ColorSelect") {
            for (let i = 0; i < COLORS.length; i++) {
              const cx = PALETTE_X;
              const cy = PALETTE_Y + i * (bubbleR * 2 + 14);
              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, cy, bubbleR, 0, Math.PI * 2);
              ctx.fillStyle = COLORS[i];
              ctx.fill();
              ctx.lineWidth = 2;
              ctx.strokeStyle = "rgba(255,255,255,0.9)";
              ctx.stroke();
              const ph = paletteHoverStart[i];
              if (ph) {
                const elapsed = Math.min(1000, performance.now() - ph);
                const pct = elapsed / 1000;
                ctx.beginPath();
                ctx.arc(
                  cx,
                  cy,
                  bubbleR + 6,
                  -Math.PI / 2,
                  -Math.PI / 2 + pct * Math.PI * 2
                );
                ctx.strokeStyle = "rgba(255,255,255,0.9)";
                ctx.lineWidth = 3;
                ctx.stroke();
              }
              ctx.restore();
            }
          }
        }

        function roundRect(
          ctx: CanvasRenderingContext2D,
          x: number,
          y: number,
          w: number,
          h: number,
          r: number
        ) {
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        }

        function getPalmCenter(lms: any) {
          const wrist = mirrorXY(lms[0]);
          const middleMCP = mirrorXY(lms[9]);
          return {
            x: (wrist.x + middleMCP.x) / 2,
            y: (wrist.y + middleMCP.y) / 2,
          };
        }

        camera.start();
        if (mounted) setIsLoaded(true);

        const cleanup = () => {
          if (resizeObserver) {
            resizeObserver.disconnect();
          }
          // --- MOUSE DRAG: Remove listeners ---
          canvas.removeEventListener("mousedown", handleMouseDown);
          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);

          try {
            camera?.stop?.();
          } catch {}
          try {
            hands?.close?.();
          } catch {}
        };

        return cleanup;
      } catch (err) {
        console.error("MediaPipe load/init error:", err);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [brushSize]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {!isLoaded && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-white text-lg">Loading Hand Tracking...</div>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 w-96">
            <h2 className="text-xl font-bold mb-4">Save Canvas</h2>
            <form onSubmit={handleSaveSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="canvasName"
                  className="block text-sm font-medium mb-2"
                >
                  Canvas Name
                </label>
                <input
                  type="text"
                  id="canvasName"
                  value={canvasName}
                  onChange={(e) => setCanvasName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter canvas name..."
                  required
                  disabled={isSaving}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setCanvasName("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
                  disabled={isSaving || !canvasName.trim()}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {gestureMessages.length > 0 && (
        <div className="fixed top-4 right-4 z-40 space-y-2">
          {gestureMessages.map((msg) => (
            <div
              key={msg.id}
              className="bg-green-600/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm animate-pulse"
            >
              Gesture: {msg.gesture}
            </div>
          ))}
        </div>
      )}

      <aside className="w-64 bg-gray-900 p-4 flex-shrink-0 border-r border-gray-700 flex flex-col gap-4 overflow-y-auto z-20">
        <h2 className="text-xl font-bold mb-4">Dashboard</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">
              Brush Size
            </label>
            <input
              type="range"
              min="2"
              max="24"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-400">{brushSize}px</span>
          </div>

          <div className="text-sm text-gray-300">
            Mode: <span className="font-semibold text-blue-400">{mode}</span>
          </div>

          {mode === "Zoom" && (
            <div className="text-sm text-gray-300">
              Zoom Mode:{" "}
              <span className="font-semibold text-green-400">{zoomMode}</span>
            </div>
          )}

          {mode === "Annotate" && (
            <>
              <div className="text-sm text-gray-300">
                Selection:{" "}
                <span
                  className={`font-semibold ${
                    selectionActive ? "text-yellow-400" : "text-gray-400"
                  }`}
                >
                  {selectionActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="text-sm text-gray-300">
                Shape Mode:{" "}
                <span className="font-semibold text-orange-400">
                  {shapeMode}
                </span>
              </div>
              <div className="text-sm text-gray-300">
                Eraser:{" "}
                <span
                  className={`font-semibold ${
                    eraserActive ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  {eraserActive ? "Active" : "Inactive"}
                </span>
              </div>
            </>
          )}

          <div className="text-sm text-gray-300">
            Hand:{" "}
            <span
              className={`font-semibold ${
                handVisible ? "text-green-400" : "text-red-400"
              }`}
            >
              {handVisible ? "Visible" : "Not Detected"}
            </span>
          </div>

          <div className="pt-4 border-t border-gray-600">
            <button
              onClick={handleSaveClick}
              className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm transition-colors disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Canvas"}
            </button>
          </div>

          <div className="pt-1">
            <button
              onClick={() => setIsGestureEnabled(!isGestureEnabled)}
              className={`w-full px-3 py-2 rounded text-sm transition-colors ${
                isGestureEnabled
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-600 hover:bg-gray-700"
              }`}
            >
              Gesture Analysis: {isGestureEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Gestures Guide */}
          <div className="pt-4 border-t border-gray-600">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Available Gestures</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤏</span>
                <span>Pinch (Index + Thumb) - Draw</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✋</span>
                <span>Open Palm - Erase</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">👆</span>
                <span>Index Finger - Select Tools</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤏</span>
                <span>Pinch in Camera - Move Camera</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">✌️</span>
                <span>Two Fingers - Zoom/Move Canvas</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-grow relative bg-gray-800" ref={stageContainerRef}>
        <div id="stage" className="absolute inset-0">
          <video ref={videoRef} style={{ display: "none" }} playsInline />
          <canvas ref={canvasRef} className="w-full h-full block" />
          <canvas
            ref={cameraCanvasRef}
            width={240}
            height={135}
            className="absolute border-2 border-gray-400 rounded-lg shadow-lg"
            style={{
              left: cameraPosition.x,
              top: cameraPosition.y,
              zIndex: 10,
            }}
          />
        </div>
      </main>
    </div>
  );
}
