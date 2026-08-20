import { useEffect, useRef } from "react";
import breakIntroVideoSrc from "../../assets/pet/breakOverlay/break-reminder.mp4";
import breakQuietLoopVideoSrc from "../../assets/pet/breakOverlay/quiet-loop.mp4";

// 720px-wide processing is visually sufficient for the soft-edged overlay and
// avoids uploading a half-million-pixel texture on every video frame.
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 405;

type PlaybackPhase = "intro" | "quiet";
type FrameRenderer = () => void;

interface BreakCatVideoProps {
  onPlaybackStart?: () => void;
  onSettled?: () => void;
}

const compileShader = (
  gl: WebGLRenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createGpuRenderer = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): FrameRenderer | null => {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D u_video;
    varying vec2 v_texCoord;
    void main() {
      vec4 color = texture2D(u_video, v_texCoord);
      float greenLead = color.g - max(color.r, color.b);

      if (color.g > 0.227 && greenLead > 0.047) {
        float opacity = 1.0 - clamp((greenLead - 0.047) / 0.188, 0.0, 1.0);
        color.g = min(color.g, (color.r + color.b) * 0.58);
        color.a *= opacity;
      }

      if (
        v_texCoord.x > 0.84 && v_texCoord.y < 0.29 &&
        color.r > 0.588 && color.g > 0.588 && color.b > 0.588
      ) {
        color.a = 0.0;
      }

      gl_FragColor = color;
    }
  `);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const vertices = new Float32Array([
    -1, -1, 0, 0,
     1, -1, 1, 0,
    -1,  1, 0, 1,
     1,  1, 1, 1,
  ]);
  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
  const position = gl.getAttribLocation(program, "a_position");
  const textureCoordinate = gl.getAttribLocation(program, "a_texCoord");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(textureCoordinate);
  gl.vertexAttribPointer(
    textureCoordinate,
    2,
    gl.FLOAT,
    false,
    stride,
    2 * Float32Array.BYTES_PER_ELEMENT,
  );

  const texture = gl.createTexture();
  if (!texture) return null;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(gl.getUniformLocation(program, "u_video"), 0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  gl.clearColor(0, 0, 0, 0);

  return () => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      video,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
};

const createCpuFallbackRenderer = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): FrameRenderer | null => {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  return () => {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const frame = context.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const pixels = frame.data;

    // Keep the fallback linear and cheap: no division or coordinate lookup in
    // the full-frame loop. Most machines use the GPU renderer above.
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const greenLead = green - Math.max(red, blue);
      if (green > 58 && greenLead > 12) {
        const opacity = 1 - Math.min(1, (greenLead - 12) / 48);
        pixels[index + 3] = Math.round(255 * opacity);
        pixels[index + 1] = Math.min(green, Math.round((red + blue) * 0.58));
      }
    }

    const startX = Math.floor(CANVAS_WIDTH * 0.84);
    const startY = Math.floor(CANVAS_HEIGHT * 0.71);
    for (let y = startY; y < CANVAS_HEIGHT; y += 1) {
      for (let x = startX; x < CANVAS_WIDTH; x += 1) {
        const index = (y * CANVAS_WIDTH + x) * 4;
        if (
          pixels[index] > 150 &&
          pixels[index + 1] > 150 &&
          pixels[index + 2] > 150
        ) {
          pixels[index + 3] = 0;
        }
      }
    }

    context.putImageData(frame, 0, 0);
  };
};

export function BreakCatVideo({ onPlaybackStart, onSettled }: BreakCatVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPlaybackStartRef = useRef(onPlaybackStart);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    onPlaybackStartRef.current = onPlaybackStart;
    onSettledRef.current = onSettled;
  }, [onPlaybackStart, onSettled]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const renderFrame =
      createGpuRenderer(canvas, video) ?? createCpuFallbackRenderer(canvas, video);
    if (!renderFrame) return;

    let animationFrame = 0;
    let videoFrameCallback = 0;
    let disposed = false;
    let phase: PlaybackPhase = "intro";
    let introStarted = false;
    let quietStarted = false;
    let lastRenderedTime = -1;

    const renderCurrentVideoFrame = () => {
      if (disposed || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      if (video.currentTime === lastRenderedTime) return;
      lastRenderedTime = video.currentTime;
      renderFrame();
    };

    const scheduleNextFrame = () => {
      if (disposed) return;
      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrameCallback = video.requestVideoFrameCallback(() => {
          renderCurrentVideoFrame();
          scheduleNextFrame();
        });
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        renderCurrentVideoFrame();
        scheduleNextFrame();
      });
    };

    const renderFirstFrame = () => {
      renderCurrentVideoFrame();
    };

    const playCurrentPhase = () => {
      video.playbackRate = 1;
      void video.play().catch(renderFirstFrame);
    };

    const markPlaying = () => {
      if (phase === "intro") {
        if (introStarted) return;
        introStarted = true;
        onPlaybackStartRef.current?.();
        return;
      }

      if (quietStarted) return;
      quietStarted = true;
      onSettledRef.current?.();
    };

    const beginQuietLoop = () => {
      if (disposed || phase === "quiet") return;

      renderCurrentVideoFrame();
      phase = "quiet";
      lastRenderedTime = -1;
      video.pause();
      video.loop = true;
      video.src = breakQuietLoopVideoSrc;
      video.load();
    };

    video.addEventListener("loadeddata", playCurrentPhase);
    video.addEventListener("playing", markPlaying);
    video.addEventListener("ended", beginQuietLoop);

    video.loop = false;
    video.src = breakIntroVideoSrc;
    video.load();
    scheduleNextFrame();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      if (typeof video.cancelVideoFrameCallback === "function") {
        video.cancelVideoFrameCallback(videoFrameCallback);
      }
      video.pause();
      video.removeEventListener("loadeddata", playCurrentPhase);
      video.removeEventListener("playing", markPlaying);
      video.removeEventListener("ended", beginQuietLoop);
    };
  }, []);

  return (
    <div className="break-cat-video" aria-label="猫咪从右边走到中间，翻身后安静地眨眼呼吸">
      <video
        ref={videoRef}
        className="break-cat-video__source"
        muted
        playsInline
        preload="auto"
      />
      <canvas
        ref={canvasRef}
        className="break-cat-video__canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
    </div>
  );
}
