import { FaceDetector, FilesetResolver, ObjectDetector, type BoundingBox, type Detection } from "@mediapipe/tasks-vision";
import simdLoaderUrl from "./assets/mediapipe/vision_wasm_internal.js.bin";
import plainLoaderUrl from "./assets/mediapipe/vision_wasm_nosimd_internal.js.bin";
import simdWasmUrl from "./assets/mediapipe/vision_wasm_internal.wasm.bin";
import plainWasmUrl from "./assets/mediapipe/vision_wasm_nosimd_internal.wasm.bin";
import faceModelUrl from "./assets/mediapipe/blaze_face_short_range.tflite";
import objectModelUrl from "./assets/mediapipe/efficientdet_lite0.tflite";

export type ProcessingQuality = "compact" | "balanced" | "higher";

export const PROCESSING_QUALITY: Record<ProcessingQuality, { label: string; detail: string; maxEdge: number; videoBits: number; audioBits: number }> = {
  compact: { label: "Compact", detail: "Best for long recordings · about 69 MB/hour", maxEdge: 960, videoBits: 128_000, audioBits: 24_000 },
  balanced: { label: "Balanced", detail: "Clearer motion · about 151 MB/hour", maxEdge: 1280, videoBits: 304_000, audioBits: 32_000 },
  higher: { label: "Higher quality", detail: "Short recordings only · about 389 MB/hour", maxEdge: 1920, videoBits: 800_000, audioBits: 64_000 },
};

export type PrivacyProcessingResult = {
  file: File;
  selectiveFrames: number;
  fallbackFrames: number;
  detectedKinds: string[];
  usedDetection: boolean;
  /** Rendering engine that produced selective frames. "mask" is the built-in
   * feathered-mask compositor (SAM-style mask rendering, on-device detection).
   * It is NOT Meta SAM 3.1 output — SAM jobs run separately through the
   * Meta Model API once a founder key is configured and verified. */
  engine: "mask" | "box" | "fallback";
  maskFrames: number;
};

type Region = { x: number; y: number; width: number; height: number; score: number; kind: string; missed: number };
type DetectorSet = { face: FaceDetector; object: ObjectDetector };

let detectorsPromise: Promise<DetectorSet> | null = null;

async function detectorSet(): Promise<DetectorSet> {
  if (!detectorsPromise) {
    detectorsPromise = (async () => {
      const simd = await FilesetResolver.isSimdSupported();
      const files = {
        wasmLoaderPath: simd ? simdLoaderUrl : plainLoaderUrl,
        wasmBinaryPath: simd ? simdWasmUrl : plainWasmUrl,
      };
      const [face, object] = await Promise.all([
        FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: faceModelUrl, delegate: "CPU" }, runningMode: "VIDEO", minDetectionConfidence: 0.2 }),
        ObjectDetector.createFromOptions(files, { baseOptions: { modelAssetPath: objectModelUrl, delegate: "CPU" }, runningMode: "VIDEO", scoreThreshold: 0.2, maxResults: 10 }),
      ]);
      return { face, object };
    })().catch((error) => {
      detectorsPromise = null;
      throw error;
    });
  }
  return detectorsPromise;
}

const protectedAnimals = new Set(["bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"]);

function fromDetection(detection: Detection, kind: string): Region | null {
  const box: BoundingBox | undefined = detection.boundingBox;
  const score = detection.categories[0]?.score ?? 0;
  if (!box) return null;
  return { x: box.originX, y: box.originY, width: box.width, height: box.height, score, kind, missed: 0 };
}

function intersectionOverUnion(a: Region, b: Region): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const area = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = a.width * a.height + b.width * b.height - area;
  return union > 0 ? area / union : 0;
}

function updateTracks(previous: Region[], detected: Region[]): Region[] {
  const next: Region[] = [];
  const used = new Set<number>();
  for (const candidate of detected) {
    let bestIndex = -1;
    let bestOverlap = 0;
    previous.forEach((track, index) => {
      if (used.has(index) || track.kind !== candidate.kind) return;
      const overlap = intersectionOverUnion(track, candidate);
      if (overlap > bestOverlap) { bestOverlap = overlap; bestIndex = index; }
    });
    if (bestIndex >= 0 && bestOverlap > 0.12) {
      const old = previous[bestIndex];
      if (old) {
        used.add(bestIndex);
        const weight = 0.58;
        next.push({
          x: old.x * (1 - weight) + candidate.x * weight,
          y: old.y * (1 - weight) + candidate.y * weight,
          width: old.width * (1 - weight) + candidate.width * weight,
          height: old.height * (1 - weight) + candidate.height * weight,
          score: candidate.score,
          kind: candidate.kind,
          missed: 0,
        });
      }
    } else next.push(candidate);
  }
  previous.forEach((track, index) => {
    if (!used.has(index) && track.missed < 12) next.push({ ...track, missed: track.missed + 1, score: track.score * 0.94 });
  });
  return next;
}

function regionCanvasRect(region: Region, video: HTMLVideoElement, canvasWidth: number, canvasHeight: number) {
  const facePadding = region.kind === "face" ? 0.38 : 0.14;
  const padX = region.width * facePadding;
  const padY = region.height * facePadding;
  const x = Math.max(0, region.x - padX);
  const y = Math.max(0, region.y - padY);
  const width = Math.min(video.videoWidth - x, region.width + padX * 2);
  const height = Math.min(video.videoHeight - y, region.height + padY * 2);
  const scaleX = canvasWidth / video.videoWidth;
  const scaleY = canvasHeight / video.videoHeight;
  return { dx: x * scaleX, dy: y * scaleY, dw: width * scaleX, dh: height * scaleY };
}

function drawBlurredRegion(context: CanvasRenderingContext2D, video: HTMLVideoElement, region: Region, canvasWidth: number, canvasHeight: number) {
  const { dx, dy, dw, dh } = regionCanvasRect(region, video, canvasWidth, canvasHeight);
  const x = (dx / canvasWidth) * video.videoWidth;
  const y = (dy / canvasHeight) * video.videoHeight;
  const width = (dw / canvasWidth) * video.videoWidth;
  const height = (dh / canvasHeight) * video.videoHeight;
  context.save();
  context.beginPath();
  context.roundRect(dx, dy, dw, dh, Math.min(dw, dh) * 0.18);
  context.clip();
  context.filter = "blur(24px)";
  context.drawImage(video, x, y, width, height, dx - 16, dy - 16, dw + 32, dh + 32);
  context.restore();
}

/**
 * SAM-style mask compositing: build a white alpha mask from the tracked
 * regions (ellipse for faces, soft blob for bodies/pets), feather its edges,
 * then show a heavily blurred copy of the frame only through that mask.
 * The result follows the subject's shape instead of a hard rectangle.
 * Returns false when any canvas step is unsupported, so the caller can fall
 * back to per-region box blur.
 */
function drawMaskedBlur(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  regions: Region[],
  canvasWidth: number,
  canvasHeight: number,
  scratch: { blur: HTMLCanvasElement; mask: HTMLCanvasElement; feather: HTMLCanvasElement },
): boolean {
  const blurCtx = scratch.blur.getContext("2d");
  const maskCtx = scratch.mask.getContext("2d");
  const featherCtx = scratch.feather.getContext("2d");
  if (!blurCtx || !maskCtx || !featherCtx) return false;
  try {
    // Blurred copy of the full frame (overscanned so edges stay covered).
    blurCtx.save();
    blurCtx.filter = "blur(28px)";
    blurCtx.drawImage(video, -28, -28, canvasWidth + 56, canvasHeight + 56);
    blurCtx.restore();
    // Alpha mask from region shapes.
    maskCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    maskCtx.fillStyle = "#ffffff";
    for (const region of regions) {
      const { dx, dy, dw, dh } = regionCanvasRect(region, video, canvasWidth, canvasHeight);
      maskCtx.beginPath();
      if (region.kind === "face") {
        maskCtx.ellipse(dx + dw / 2, dy + dh / 2, dw / 2, dh / 2, 0, 0, Math.PI * 2);
      } else {
        maskCtx.roundRect(dx, dy, dw, dh, Math.min(dw, dh) * 0.32);
      }
      maskCtx.fill();
    }
    // Feather the mask edges so the blur melts into the frame.
    featherCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    featherCtx.save();
    featherCtx.filter = "blur(10px)";
    featherCtx.drawImage(scratch.mask, 0, 0);
    featherCtx.restore();
    // Keep the blurred copy only where the feathered mask is opaque.
    blurCtx.save();
    blurCtx.globalCompositeOperation = "destination-in";
    blurCtx.drawImage(scratch.feather, 0, 0);
    blurCtx.restore();
    context.drawImage(scratch.blur, 0, 0);
    return true;
  } catch {
    return false;
  }
}

export async function createProcessedVideo(
  sourceFile: File,
  options: { selectivePrivacy: boolean; quality: ProcessingQuality; onProgress: (value: number) => void },
): Promise<PrivacyProcessingResult> {
  if (!sourceFile.type.startsWith("video/")) throw new Error("Video processing needs a video file.");
  if (typeof MediaRecorder === "undefined") throw new Error("Video processing is not supported on this device. Keep the original and contact staff for a secure upload option.");
  const quality = PROCESSING_QUALITY[options.quality];
  const sourceUrl = URL.createObjectURL(sourceFile);
  const video = document.createElement("video");
  video.src = sourceUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("The video could not be opened for processing."));
  });
  const scale = Math.min(1, quality.maxEdge / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  const drawing = canvas.getContext("2d");
  if (!drawing) { URL.revokeObjectURL(sourceUrl); throw new Error("Video processing is not supported on this device."); }

  let detectors: DetectorSet | null = null;
  if (options.selectivePrivacy) {
    try { detectors = await detectorSet(); } catch { detectors = null; }
  }
  const scratch = {
    blur: document.createElement("canvas"),
    mask: document.createElement("canvas"),
    feather: document.createElement("canvas"),
  };
  for (const layer of [scratch.blur, scratch.mask, scratch.feather]) {
    layer.width = canvas.width;
    layer.height = canvas.height;
  }
  let maskSupported = true;

  const canvasStream = canvas.captureStream(24);
  const audioContext = new AudioContext();
  const audioDestination = audioContext.createMediaStreamDestination();
  const audioSource = audioContext.createMediaElementSource(video);
  audioSource.connect(audioDestination);
  const output = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: quality.videoBits, audioBitsPerSecond: quality.audioBits });
  const chunks: Blob[] = [];
  let frameNumber = 0;
  let tracks: Region[] = [];
  let selectiveFrames = 0;
  let fallbackFrames = 0;
  let maskFrames = 0;
  const detectedKinds = new Set<string>();
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
  const completed = new Promise<File>((resolve, reject) => {
    recorder.onerror = () => reject(new Error("Video processing stopped before the protected copy was ready."));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const suffix = options.selectivePrivacy ? "privacy-protected" : `compressed-${options.quality}`;
      resolve(new File([blob], `${sourceFile.name.replace(/\.[^.]+$/, "")}-${suffix}.webm`, { type: "video/webm" }));
    };
  });

  const draw = () => {
    if (video.ended || video.paused) return;
    drawing.filter = "none";
    drawing.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (options.selectivePrivacy) {
      let lowConfidence = false;
      if (detectors && frameNumber % 5 === 0) {
        const timestamp = Math.max(1, Math.round(video.currentTime * 1000));
        const faces = detectors.face.detectForVideo(video, timestamp).detections
          .map((item) => fromDetection(item, "face"))
          .filter((item): item is Region => item !== null);
        const objects = detectors.object.detectForVideo(video, timestamp).detections
          .map((item) => {
            const label = item.categories[0]?.categoryName.toLowerCase() ?? "";
            return label === "person" || protectedAnimals.has(label) ? fromDetection(item, label || "animal") : null;
          })
          .filter((item): item is Region => item !== null);
        const all = [...faces, ...objects];
        lowConfidence = all.some((item) => item.score < 0.45);
        const confident = all.filter((item) => item.score >= 0.45);
        tracks = updateTracks(tracks, confident);
      }
      const active = tracks.filter((item) => item.score >= 0.3);
      if (!detectors || lowConfidence || active.length === 0) {
        drawing.save();
        drawing.filter = "blur(22px)";
        drawing.drawImage(video, -22, -22, canvas.width + 44, canvas.height + 44);
        drawing.restore();
        fallbackFrames += 1;
      } else {
        active.forEach((region) => detectedKinds.add(region.kind));
        if (maskSupported && drawMaskedBlur(drawing, video, active, canvas.width, canvas.height, scratch)) {
          maskFrames += 1;
        } else {
          maskSupported = false;
          active.forEach((region) => drawBlurredRegion(drawing, video, region, canvas.width, canvas.height));
        }
        selectiveFrames += 1;
      }
    }
    frameNumber += 1;
    options.onProgress(video.duration > 0 ? Math.min(99, Math.round(video.currentTime / video.duration * 100)) : 0);
    requestAnimationFrame(draw);
  };
  video.onended = () => { options.onProgress(100); if (recorder.state !== "inactive") recorder.stop(); };
  try {
    await audioContext.resume();
    recorder.start(1000);
    await video.play();
    requestAnimationFrame(draw);
    const file = await completed;
    const engine: PrivacyProcessingResult["engine"] = maskFrames > 0 ? "mask" : selectiveFrames > 0 ? "box" : "fallback";
    return { file, selectiveFrames, fallbackFrames, detectedKinds: [...detectedKinds], usedDetection: detectors !== null, engine, maskFrames };
  } finally {
    video.pause();
    output.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    URL.revokeObjectURL(sourceUrl);
  }
}
