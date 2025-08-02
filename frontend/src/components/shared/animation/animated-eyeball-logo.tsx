import React, { useEffect, useRef, useState } from "react";

interface AnimatedEyeballLogoProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedEyeballLogo({
  width = 80,
  height = 80,
  className,
  style,
}: AnimatedEyeballLogoProps) {
  const logoRef = useRef<SVGSVGElement>(null);
  const [leftEyePosition, setLeftEyePosition] = useState({ x: 0, y: 0 });
  const [rightEyePosition, setRightEyePosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!logoRef.current) return;

      const rect = logoRef.current.getBoundingClientRect();

      // Calculate centers for each eye individually
      const leftEyeCenter = {
        x: rect.left + rect.width * 0.264, // Approximate position of left eye
        y: rect.top + rect.height * 0.437,
      };

      const rightEyeCenter = {
        x: rect.left + rect.width * 0.651, // Approximate position of right eye
        y: rect.top + rect.height * 0.425,
      };

      // Calculate the nose/center point between the eyes
      const noseCenter = {
        x: (leftEyeCenter.x + rightEyeCenter.x) / 2,
        y: (leftEyeCenter.y + rightEyeCenter.y) / 2,
      };

      // Calculate mouse position relative to each eye
      const leftMouseX = e.clientX - leftEyeCenter.x;
      const leftMouseY = e.clientY - leftEyeCenter.y;
      const rightMouseX = e.clientX - rightEyeCenter.x;
      const rightMouseY = e.clientY - rightEyeCenter.y;

      // Calculate mouse position relative to nose center for cross-eyed logic
      const noseMouseX = e.clientX - noseCenter.x;
      const noseMouseY = e.clientY - noseCenter.y;

      // Maximum movement distance for realistic eye physics
      const maxMovement = 45; // More realistic movement range

      // REALISTIC EYE PHYSICS LOGIC
      function calculateEyePosition(
        eyeCenterX: number,
        eyeCenterY: number,
        mouseX: number,
        mouseY: number,
      ) {
        const deltaX = mouseX - eyeCenterX;
        const deltaY = mouseY - eyeCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const angle = Math.atan2(deltaY, deltaX);

        // Natural eye movement - smooth transition based on distance
        let actualDistance;
        if (distance > 150) {
          actualDistance = maxMovement; // Full movement when mouse is far
        } else if (distance > 80) {
          actualDistance = maxMovement * 0.8; // 80% movement for medium distance
        } else if (distance > 40) {
          actualDistance = maxMovement * 0.6; // 60% movement for close distance
        } else {
          actualDistance = (distance / 40) * maxMovement * 0.6; // Proportional for very close
        }

        return {
          x: Math.cos(angle) * actualDistance,
          y: Math.sin(angle) * actualDistance,
        };
      }

      // Calculate natural eye positions
      const leftEyePos = calculateEyePosition(
        leftEyeCenter.x,
        leftEyeCenter.y,
        e.clientX,
        e.clientY,
      );
      const rightEyePos = calculateEyePosition(
        rightEyeCenter.x,
        rightEyeCenter.y,
        e.clientX,
        e.clientY,
      );

      // SPECIAL CASE: Cross-eyed effect when mouse is between/close to nose
      const distanceFromNose = Math.sqrt(
        noseMouseX * noseMouseX + noseMouseY * noseMouseY,
      );

      if (distanceFromNose < 60) {
        // When mouse is near the nose/center
        const crossEyeFactor = Math.max(0, (60 - distanceFromNose) / 60); // 0 to 1 based on proximity to nose

        // Make eyes look inward toward each other (cross-eyed)
        const crossEyeOffset = maxMovement * crossEyeFactor * 0.7;

        // Left eye looks right (toward center), right eye looks left (toward center)
        setLeftEyePosition({
          x: crossEyeOffset, // Left eye moves right (positive X)
          y: leftEyePos.y * (1 - crossEyeFactor * 0.5), // Reduce Y movement when cross-eyed
        });
        setRightEyePosition({
          x: -crossEyeOffset, // Right eye moves left (negative X)
          y: rightEyePos.y * (1 - crossEyeFactor * 0.5), // Reduce Y movement when cross-eyed
        });
      } else {
        // Normal tracking when mouse is not near nose
        setLeftEyePosition(leftEyePos);
        setRightEyePosition(rightEyePos);
      }

      setIsActive(true);
    };

    const handleMouseLeave = () => {
      // Reset to center when mouse leaves
      setLeftEyePosition({ x: 0, y: 0 });
      setRightEyePosition({ x: 0, y: 0 });
      setIsActive(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <svg
      ref={logoRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1349 1221"
      width={width}
      height={height}
      className={className}
      style={style}
    >
      <style>
        {`.a{fill:#ff5900}.b{fill:#ff9d68}.c{fill:#a74714}
         .left-pupil{transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)}
         .right-pupil{transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)}
         .eyeball-container{transform-origin: center}
         .eyeball-container:hover{animation: eyeball-pulse 2s ease-in-out infinite}`}
      </style>

      {/* Main body path */}
      <path
        className="a"
        d="m1260.1 895.6c-5.9-10-16.6-18-27.9-21.3-115.9-34.8-209.8-133.6-239.7-250.6-1.1-4.1-2.1-8.2-3.1-12.3 13.2-44.4 6.9-187.3 0.6-208.8 0-1.6-0.7-25.7-0.7-27.3 0-194-163.8-328.8-366.8-328.8-203.1 0-367.7 157.3-367.7 351.3 0 31.6-28.9 169.4 40.5 247.4 5.8 6.5-33 88.6-50.3 107.7-21.7 23.7-48.3 42.5-77.4 55.9-41.2 18.9-113.4 32.8-105.6 93.2 4.9 37.5 46.8 55.4 79.7 61.5 71.5 13.2 140.4-34.3 193.7-75.9 1.9-1.5 4.5 0.5 3.4 2.7-17.4 34.9-41.4 77.5-36 118 5.7 42.9 58.1 59.2 95.5 55.2 76.8-8.1 104.1-71.5 134.2-146.7 2.6-6.6 12.2-5.9 13.8 1 11.5 49 24.9 105.5 57.6 145.3 28.9 35.2 74 66.2 120.4 70.5 62.8 5.9 62-61.6 49.7-104.7-8.4-29.6-15.1-74.4-22.8-110.8-0.9-4.3 4.9-6.7 7.2-3 30.1 47.4 72.3 87 122.7 112 32.3 16 69.4 32.3 106.4 31.9 17.3-0.1 37.8-5 48.9-19.3 15.9-20.2-1.3-40.7-16.3-55.1-18.2-17.4-34.5-36.4-52.2-54.2-1.8-1.9 0.4-4.8 2.7-3.5 71.9 42.9 161.5 55.4 242.2 32.8 25.3-7.1 65.9-32 47.3-64.1z"
      />

      {/* Right eye background */}
      <path
        className="b"
        d="m713.8 519.3c0 90.7 73.5 164.1 164.1 164.1 90.7 0 164.1-73.4 164.1-164.1 0-90.6-73.4-164.1-164.1-164.1-90.6 0-164.1 73.5-164.1 164.1z"
      />

      {/* Right eye pupil - animated */}
      <circle
        className="right-pupil"
        cx="877.9"
        cy="519.3"
        r="45"
        fill="black"
        style={{
          transform: `translate(${rightEyePosition.x}px, ${rightEyePosition.y}px)`,
        }}
      />

      {/* Left eye background */}
      <path
        className="b"
        d="m216.3 527.4c0 90.7 73.5 164.1 164.2 164.1 90.6 0 164.1-73.4 164.1-164.1 0-90.6-73.5-164.1-164.1-164.1-90.7 0-164.2 73.5-164.2 164.1z"
      />

      {/* Left eye pupil - animated */}
      <circle
        className="left-pupil"
        cx="356.5"
        cy="533.8"
        r="45"
        fill="black"
        style={{
          transform: `translate(${leftEyePosition.x}px, ${leftEyePosition.y}px)`,
        }}
      />

      {/* Mouth */}
      <path
        className="c"
        d="m640.4 723.2c60.9 0 130.5-31.7 130.5-31.7 0 34.5-58.4 75.3-130.5 75.3-72.2 0-130.6-40.8-130.6-75.3 0 0 69.6 31.7 130.6 31.7z"
      />

      {/* Nose */}
      <path
        className="b"
        d="m695.5 739.2c-0.3-4.7-4.3-8.3-9-8.3l-34 6.3c-8.7 1.6-17.7 1.6-26.5 0l-34-6.3c-4.7 0-8.6 3.6-9 8.3l-6.5 86.7h0.1c0 0.6-0.1 1.2-0.1 1.8 0 30.2 28.1 54.6 62.8 54.6 34.6 0 62.7-24.4 62.7-54.6 0-0.6-0.1-1.2-0.1-1.8h0.1z"
      />
    </svg>
  );
}
