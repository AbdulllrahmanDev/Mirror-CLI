```jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CUSTOM INTERACTIVE WAVE CANVAS ---
const WaveCanvas = ({ isHighContrast }) => {
  const canvasRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      time += 0.01;
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;

      ctx.clearRect(0, 0, width, height);

      // Draw multiple layers of elegant organic waves
      const waveCount = 5;
      for (let i = 0; i < waveCount; i++) {
        ctx.beginPath();
        // Color changes depending on contrast mode
        ctx.strokeStyle = isHighContrast
          ? `rgba(22, 0, 0, ${0.05 + (i * 0.04)})`
          : `rgba(245, 235, 214, ${0.04 + (i * 0.03)})`;
        ctx.lineWidth = 1 + i * 0.5;

        const amplitude = 25 + i * 15 + (mouse.y / (window.innerHeight + 1)) * 30;
        const frequency = 0.002 + i * 0.0008;
        const speed = 0.015 + i * 0.005;

        for (let x = 0; x <= width; x += 15) {
          const y =
            height / 2 +
            Math.sin(x * frequency + time * speed) * amplitude +
            Math.cos((x + mouse.x * 0.2) * 0.004) * (amplitude * 0.4);

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isHighContrast, mouse]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// --- GLITCHY BINARY SEPARATOR ---
const BinarySeparator = ({ seed = "1001001 1101110 1110100" }) => {
  const [binary, setBinary] = useState(seed);

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = seed
        .split('')
        .map((char) => {
          if (char === ' ') return ' ';
          return Math.random() > 0.92 ? (char === '1' ? '0' : '1') : char;
        })
        .join('');
      setBinary(updated);
    }, 150);
    return () => clearInterval(interval);
  }, [seed]);

  return (
    <div className="flex items-center justify-between w-full py-4 opacity-45 font-mono text-[10px] tracking-[0.2em] select-none border-t border-b border-current/10 my-4">
      <span className="text-[8px]">▲</span>
      <div className="hidden md:flex space-x-8 overflow-hidden">
        <span>{binary}</span>
        <span className="opacity-30">{binary.split('').reverse().join('')}</span>
      </div>
      <div className="flex md:hidden">
        <span>{binary.slice(0, 15)}</span>
      </div>
      <span className="text-[8px]">▲</span>
    </div>
  );
};

export default function AWPortfolio() {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [consoleMsg, setConsoleMsg] = useState("SYS_STATUS: OPTIMAL // LOC: FRANCE // LATENCY: 14MS");
  const [activeProject, setActiveProject] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("antoine@wodniack.dev");
    setCopiedEmail(true);
    setConsoleMsg("EVENT: EMAIL_COPIED_TO_CLIPBOARD // HIRE_ME_REQUEST: ACTIVE");
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const projects = [
    {
      id: "waaark",
      title: "Waaark Studio",
      category: "Creative Direction & Dev",
      year: "2016 - Present",
      description: "Co-founded award-winning creative studio. Crafted bespoke animation engines and WebGL layouts for premium international brands.",
      awards: "Awwwards Studio of the Year Nominee / 12x SOTD",
      link: "https://waaark.com"
    },
    {
      id: "incredibles",
      title: "Incredibles.dev",
      category: "Premium Web Development",
      year: "2022 - Present",
      description: "A specialized front-end lab producing high-fidelity GSAP animations, flawless micro-interactions, and ultra-performant React architectures.",
      awards: "FWA of the Day / CSSDA Best UI/UX",
      link: "https://incredibles.dev"
    },
    {
      id: "atelier",
      title: "L'Atelier de l'Imaginaire",
      category: "Immersive WebGL Experience",
      year: "2024",
      description: "Step into an interactive canvas storybook. Utilizes custom fragment shaders, spatialized multi-channel audio, and dynamic fluid simulations.",
      awards: "Awwwards SOTD / Webby Nominee",
      link: "#"
    },
    {
      id: "retroconsole",
      title: "Retro Console OS",
      category: "Experimental OS Simulation",
      year: "2023",
      description: "A fully functional simulated desktop environment mimicking late-90s terminal aesthetics, integrated with real-time API integrations.",
      awards: "CSSDA Best Front-End Developer Winner",
      link: "#"
    }
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-700 ease-in-out font-serif selection:bg-red-600 selection:text-white ${
        isHighContrast ? 'bg-[#f5ebd6] text-[#160000]' : 'bg-[#160000] text-[#f5ebd6]'
      }`}
    >
      {/* BACKGROUND WAVE ENGINE */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-80">
        <WaveCanvas isHighContrast={isHighContrast} />
      </div>

      {/* --- HEADER --- */}
      <header className="relative z-10 border-b border-current/10 px-4 md:px-12 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Logo */}
          <div className="md:col-span-3 flex items-center justify-between md:justify-start">
            <a 
              href="#" 
              className="group flex items-center space-x-3"
              onMouseEnter={() => setConsoleMsg("SYS_ACTION: GO_TO_TOP // LOGO_HOVER")}
            >
              <svg 
                className={`w-12 h-12 transition-transform duration-500 group-hover:rotate-180 ${
                  isHighContrast ? 'text-[#160000]' : 'text-[#f5ebd6]'
                }`} 
                viewBox="0 0 280 280" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M240.245 0v263.2h-19.894V0h-39.756v263.2h-19.861V0h-39.755v280H280V0h-39.755Z" fill="currentColor"></path>
                <path d="M0 0v280h39.755V16.8H59.65V280h39.756V0H0Z" fill="currentColor"></path>
              </svg>
              <span className="font-mono text-xs tracking-widest font-bold uppercase">A.Wodniack</span>
            </a>

            {/* Mobile Contrast Toggle */}
            <button
              onClick={() => {
                setIsHighContrast(!isHighContrast);
                setConsoleMsg(`THEME_CHANGED: ${!isHighContrast ? 'HIGH_CONTRAST_LIGHT' : 'DEEP_WINE_DARK'}`);
              }}
              className="md:hidden p-2 rounded border border-current/20 hover:bg-current/5 transition-all"
              aria-label="Toggle Contrast"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.0996 20C8.71628 20 7.41628 19.7373 6.19961 19.212C4.98294 18.6867 3.92461 17.9743 3.02461 17.075C2.12461 16.1757 1.41228 15.1173 0.887611 13.9C0.362944 12.6827 0.100277 11.3827 0.0996106 10C0.098944 8.61733 0.361611 7.31733 0.887611 6.1C1.41361 4.88267 2.12594 3.82433 3.02461 2.925C3.92328 2.02567 4.98161 1.31333 6.19961 0.788C7.41761 0.262667 8.71761 0 10.0996 0C11.4816 0 12.7816 0.262667 13.9996 0.788C15.2176 1.31333 16.2759 2.02567 17.1746 2.925C18.0733 3.82433 1