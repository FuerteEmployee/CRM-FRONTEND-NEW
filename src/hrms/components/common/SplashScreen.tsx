import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/hrms/contexts/ThemeContext';
import { Capacitor } from '@capacitor/core';
import { MockLocationDetector } from '@capgo/capacitor-mock-location-detector';
import { AlertTriangle } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { isLoading: isThemeLoading } = useTheme();
  const [animDone, setAnimDone] = useState(false);
  const [fade, setFade] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [devModeError, setDevModeError] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(Capacitor.isNativePlatform());
  const finishedRef = useRef(false);

  useEffect(() => {
    const checkSecurity = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await MockLocationDetector.analyze({ requestLocationSample: false });
          if (result.isSimulated || result.developerMode?.detected) {
            setDevModeError(true);
          }
        } catch (e) {
          console.error("Mock location check failed", e);
        } finally {
          setIsCheckingSecurity(false);
        }
      }
    };
    checkSecurity();
  }, []);

  // Minimum splash duration — 2.8 s for the animation
  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  // Hard safety-net: on iOS network can be slow, dismiss after 8 s no matter what
  useEffect(() => {
    const maxTimer = setTimeout(() => {
      if (!finishedRef.current && !devModeError && !isCheckingSecurity) {
        finishedRef.current = true;
        setFade(true);
        setTimeout(() => { setIsVisible(false); onFinish(); }, 600);
      }
    }, 8000);
    return () => clearTimeout(maxTimer);
  }, [onFinish, devModeError, isCheckingSecurity]);

  // Only dismiss once the animation is done AND settings have loaded
  useEffect(() => {
    if (animDone && !isThemeLoading && !finishedRef.current && !devModeError && !isCheckingSecurity) {
      finishedRef.current = true;
      setFade(true);
      setTimeout(() => {
        setIsVisible(false);
        onFinish();
      }, 600);
    }
  }, [animDone, isThemeLoading, onFinish, devModeError, isCheckingSecurity]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ${fade ? 'opacity-0' : 'opacity-100'}`}>
      <div className="relative flex flex-col items-center">

        {/* Animated Logo Container */}
        <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center animate-[logoEntrance_1.2s_ease-out_forwards]">
          <div className="animate-[float_3s_ease-in-out_infinite_1.2s]">
            <img
              src="/logo-half-2.png"
              alt="Screen Time Digital"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Company Name with Gradient Text */}
        <div className="mt-4 flex flex-col items-center animate-[textFadeIn_1s_ease-out_forwards_0.8s] opacity-0">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="text-[#4c1d95]">Screen Time</span>
            <span className="bg-gradient-to-r from-[#f97316] to-[#ea580c] bg-clip-text text-transparent ml-2">Digital</span>
          </h1>

          <p className="mt-1 text-lg font-medium text-gray-600 animate-[textFadeIn_1s_ease-out_forwards_1.1s] opacity-0">
            By General Electronics
          </p>

          <div className="mt-4 h-[2px] w-16 bg-[#f97316] rounded-full animate-[lineWidth_1s_ease-out_forwards_1.8s] origin-left scale-x-0"></div>
        </div>
      </div>

      {devModeError && (
        <div className="absolute bottom-8 left-4 right-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-8 flex gap-3">
          <AlertTriangle className="h-6 w-6 text-rose-600 shrink-0" />
          <div className="text-sm font-medium text-rose-900 leading-tight">
            Please turn off Developer Options to enter the app. Else not strictly applied.
          </div>
        </div>
      )}

      <style>{`
        @keyframes logoEntrance {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes textFadeIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes lineWidth {
          to { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
