import { useEffect, useState } from "react";

export type ParallaxTilt = {
  rotateX: number;
  rotateY: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function useParallax(): ParallaxTilt {
  const [tilt, setTilt] = useState<ParallaxTilt>({ rotateX: 0, rotateY: 0 });

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = clamp(event.beta ?? 0, -30, 30);
      const gamma = clamp(event.gamma ?? 0, -30, 30);
      setTilt({ rotateX: beta / 8, rotateY: gamma / 8 });
    };

    const handlePointer = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      setTilt({ rotateX: clamp(-y * 5, -7, 7), rotateY: clamp(x * 5, -7, 7) });
    };

    window.addEventListener("deviceorientation", handleOrientation);
    window.addEventListener("pointermove", handlePointer);

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("pointermove", handlePointer);
    };
  }, []);

  return tilt;
}
