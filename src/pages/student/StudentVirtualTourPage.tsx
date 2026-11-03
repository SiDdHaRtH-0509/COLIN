import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PROPERTIES } from '../../data/mockData';
import { TourArea, TourHotspot } from '../../types';
import {
  Camera,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  Calendar,
  ShieldCheck,
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Move,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { VisitSlotModal } from '../../components/property/VisitSlotModal';

export const StudentVirtualTourPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const property = PROPERTIES.find((p) => p.id === id);

  const [activeAreaIndex, setActiveAreaIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffsetX, setPanOffsetX] = useState(0); // in percent (-25 to 25)
  const [panOffsetY, setPanOffsetY] = useState(0); // in percent (-15 to 15)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeHotspot, setActiveHotspot] = useState<TourHotspot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // 6 Verified Room Categories as specified in V4
  const defaultAreas: TourArea[] = [
    {
      id: 'bedroom',
      name: 'Student Bedroom',
      image: property?.featuredImage || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=80',
      description: 'Fully furnished student bedroom with natural lighting, solid wood ergonomic study desk, orthopedic memory-foam mattress, and secure double wardrobe.',
      dimensions: '16 ft × 12 ft',
      hotspots: [
        { label: 'Ergonomic Study Workstation', x: 28, y: 55, info: 'Solid wood table, LED desk lamp, and dual high-speed laptop charging sockets.' },
        { label: 'Orthopedic Mattress', x: 65, y: 68, info: 'High-density memory foam with anti-dust mite protective cover.' },
        { label: 'Split Inverter AC', x: 50, y: 20, info: '5-star energy efficient inverter air conditioner with remote temperature control.' },
      ],
    },
    {
      id: 'bathroom',
      name: 'Ensuite Bathroom',
      image: property?.galleryImages?.[1] || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1400&q=80',
      description: 'Clean western bathroom with modern chrome fittings, 25L instant hot water geyser, and verified anti-skid floor tiles.',
      dimensions: '7 ft × 6 ft',
      hotspots: [
        { label: 'Instant Water Geyser', x: 35, y: 30, info: 'Automatic 25L electric geyser providing continuous hot water during winter.' },
        { label: 'Anti-Skid Floor Tiles', x: 60, y: 80, info: 'Certified safe wet flooring sanitized weekly with anti-bacterial solution.' },
        { label: 'High Pressure Shower', x: 75, y: 40, info: 'Tested water pressure ensuring uninterrupted hot shower flow.' },
      ],
    },
    {
      id: 'kitchen',
      name: 'Modular Pantry / Kitchen',
      image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1400&q=80',
      description: 'Equipped student pantry with dual induction cooktops, microwave oven, large double-door refrigerator, and RO water dispenser.',
      dimensions: '14 ft × 10 ft',
      hotspots: [
        { label: 'Induction Cooktops', x: 30, y: 58, info: 'Safe flameless induction stoves for late-night tea and student meal prep.' },
        { label: 'Microwave & Oven', x: 70, y: 45, info: 'Digital microwave for quick reheating of food and tiffin boxes.' },
        { label: 'Industrial RO Dispenser', x: 82, y: 65, info: '7-stage UV/UF water purification plant with continuous TDS monitoring.' },
      ],
    },
    {
      id: 'study',
      name: 'Silent Study Area',
      image: property?.galleryImages?.[2] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=80',
      description: 'Dedicated noise-free library and study lounge with 300 Mbps high-speed Wi-Fi, reference books, and comfortable task chairs.',
      dimensions: '25 ft × 16 ft',
      hotspots: [
        { label: 'Enterprise Wi-Fi AP', x: 48, y: 22, info: 'Dual-band Wi-Fi 6 access point ensuring <10ms ping for online exams.' },
        { label: 'Acoustic Soundproofing', x: 78, y: 50, info: 'Double-glazed soundproof glass completely isolating corridor noise.' },
        { label: 'Task Lighting Stations', x: 22, y: 62, info: 'Individual flicker-free reading lights at each study cubicle.' },
      ],
    },
    {
      id: 'dining',
      name: 'Dining Area',
      image: property?.galleryImages?.[0] || 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1400&q=80',
      description: 'Spacious student dining hall with stainless steel serving counters, UV water filtration, and daily hygiene sanitization.',
      dimensions: '30 ft × 20 ft',
      hotspots: [
        { label: 'Heated Food Buffet', x: 40, y: 65, info: 'Warm meal buffet counters sanitized before each meal shift.' },
        { label: 'UV Sanitized Cutlery', x: 78, y: 68, info: 'Hospitality-grade sterilization unit for plates and cutlery.' },
      ],
    },
    {
      id: 'common',
      name: 'Common Space / Lounge',
      image: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=1400&q=80',
      description: 'Vibrant student recreation zone with table tennis, high-definition streaming TV, beanbags, and community board games.',
      dimensions: '28 ft × 22 ft',
      hotspots: [
        { label: 'Table Tennis Arena', x: 32, y: 68, info: 'Stiga tournament-grade TT table with rackets and balls provided.' },
        { label: 'Smart TV & Streaming', x: 68, y: 35, info: '65-inch 4K smart TV for weekend movie screenings and cricket matches.' },
      ],
    },
  ];

  const tourAreas = property?.tourAreas?.length ? property.tourAreas : defaultAreas;
  const currentArea = tourAreas[activeAreaIndex] || tourAreas[0];

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!document.fullscreenElement) {
      viewerContainerRef.current.requestFullscreen?.().catch(() => {
        setIsFullscreen(!isFullscreen);
      });
    } else {
      document.exitFullscreen?.().catch(() => {
        setIsFullscreen(false);
      });
    }
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 1.0));
  const handleResetView = () => {
    setZoomLevel(1.0);
    setPanOffsetX(0);
    setPanOffsetY(0);
  };

  // Mouse drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = (e.clientX - dragStart.x) * 0.08;
    const deltaY = (e.clientY - dragStart.y) * 0.08;

    setPanOffsetX((prev) => Math.max(-25, Math.min(25, prev + deltaX)));
    setPanOffsetY((prev) => Math.max(-15, Math.min(15, prev + deltaY)));
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  // Touch drag-to-pan handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = (e.touches[0].clientX - dragStart.x) * 0.1;
    const deltaY = (e.touches[0].clientY - dragStart.y) * 0.1;

    setPanOffsetX((prev) => Math.max(-25, Math.min(25, prev + deltaX)));
    setPanOffsetY((prev) => Math.max(-15, Math.min(15, prev + deltaY)));
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  }, [isDragging, dragStart]);

  const handleTouchEnd = () => setIsDragging(false);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!property) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-colin-navy">Stay Not Found</h2>
        <Link to="/student/explore">
          <Button variant="primary" size="sm">Back to Explore</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-16">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            to={`/student/property/${property.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-colin-charcoal-600 hover:text-colin-navy transition-colors mb-1 bg-white px-3 py-1.5 rounded-xl border border-colin-charcoal-200 shadow-xs"
          >
            <ArrowLeft size={14} />
            <span>Back to Property Details</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-colin-teal bg-colin-teal/10 px-2.5 py-0.5 rounded-full">
              Interactive Room Inspection
            </span>
            <span className="text-xs font-bold text-colin-navy truncate max-w-[280px]">
              {property.title}
            </span>
          </div>

          <h1 className="text-2xl font-black text-colin-navy tracking-tight font-display">
            Virtual Property Tour & Room Inspection
          </h1>
        </div>

        {/* Honest Simulated Tour Notice */}
        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 max-w-md shadow-xs">
          <Info size={16} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-snug">
            <span className="font-extrabold block">Interactive Simulated Tour Experience:</span>
            <span className="text-[11px] text-amber-800 block">
              Drag anywhere to pan across the room. Click on verified <strong>+ hotspot pins</strong> to inspect certified equipment, dimensions, and amenities.
            </span>
          </div>
        </div>
      </div>

      {/* 6 Room Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {tourAreas.map((area, i) => (
          <button
            key={area.id}
            onClick={() => {
              setActiveAreaIndex(i);
              setActiveHotspot(null);
              setPanOffsetX(0);
              setPanOffsetY(0);
              setZoomLevel(1.0);
            }}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border flex items-center gap-2 shadow-xs ${
              activeAreaIndex === i
                ? 'bg-colin-navy text-white border-colin-navy scale-102 ring-2 ring-colin-teal/30'
                : 'bg-white text-colin-charcoal-700 border-colin-charcoal-200 hover:bg-slate-50'
            }`}
          >
            <Camera size={14} className={activeAreaIndex === i ? 'text-colin-teal' : 'text-colin-charcoal-400'} />
            <span>{area.name}</span>
          </button>
        ))}
      </div>

      {/* Main Interactive Viewer Canvas */}
      <div
        ref={viewerContainerRef}
        data-testid="virtual-tour-viewer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`relative aspect-[16/9] w-full bg-colin-navy-950 rounded-3xl overflow-hidden shadow-2xl border border-colin-navy-800 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen aspect-auto' : ''}`}
      >
        {/* Main Room Viewport with Interactive Pan & Zoom */}
        <div
          className="w-full h-full relative overflow-hidden transition-transform duration-75 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffsetX}%, ${panOffsetY}%)`,
          }}
        >
          <img
            src={currentArea.image}
            alt={currentArea.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />

          {/* Interactive Inspection Hotspots */}
          {currentArea.hotspots?.map((hs, idx) => (
            <div
              key={idx}
              className="absolute z-20 pointer-events-auto"
              style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveHotspot(hs)}
                className="relative group p-2 focus:outline-none"
                title={`Inspect: ${hs.label}`}
              >
                <span className="w-6 h-6 rounded-full bg-colin-teal text-white flex items-center justify-center text-xs font-black shadow-xl ring-4 ring-colin-teal/40 animate-pulse hover:scale-125 transition-transform">
                  +
                </span>
                <span className="hidden group-hover:block absolute left-8 top-1/2 -translate-y-1/2 whitespace-nowrap bg-colin-navy-950/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/20 shadow-xl z-30">
                  {hs.label}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* Hotspot Specification Modal / Card (If selected) */}
        {activeHotspot && (
          <div
            className="absolute top-4 left-4 z-30 max-w-sm bg-colin-navy-950/95 backdrop-blur-md text-white p-5 rounded-2xl border border-colin-teal/50 shadow-2xl animate-scaleUp pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
              <span className="text-[10px] uppercase font-bold text-colin-teal flex items-center gap-1.5">
                <Sparkles size={12} className="text-colin-orange" />
                <span>Audited Room Feature</span>
              </span>
              <button
                onClick={() => setActiveHotspot(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                aria-label="Close hotspot dialog"
              >
                <X size={15} />
              </button>
            </div>

            <h4 className="font-extrabold text-sm text-white mb-1.5">
              {activeHotspot.label}
            </h4>

            <p className="text-xs text-colin-charcoal-200 leading-relaxed mb-3">
              {activeHotspot.info}
            </p>

            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              <CheckCircle2 size={12} />
              <span>Physically verified by COLIN ambassador team</span>
            </div>
          </div>
        )}

        {/* Top Info Overlay Badge */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 pointer-events-none">
          <div className="bg-colin-navy-950/85 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-bold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-colin-teal animate-ping" />
            <span>{currentArea.name}</span>
            {currentArea.dimensions && (
              <span className="text-[11px] text-slate-300 font-normal">({currentArea.dimensions})</span>
            )}
          </div>
        </div>

        {/* Center Drag Hint (Fades out when panning) */}
        {!isDragging && panOffsetX === 0 && panOffsetY === 0 && (
          <div className="absolute inset-x-0 top-12 flex justify-center pointer-events-none">
            <div className="bg-colin-navy-950/75 backdrop-blur-md text-slate-200 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/15 flex items-center gap-2 shadow-md">
              <Move size={13} className="text-colin-teal" />
              <span>Click and drag to pan • Click + to inspect</span>
            </div>
          </div>
        )}

        {/* Bottom Interactive Controls Toolbar */}
        <div
          className="absolute bottom-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 bg-colin-navy-950/90 backdrop-blur-md p-3 rounded-2xl border border-white/15 text-white pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pan Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPanOffsetX((prev) => Math.max(-25, prev - 4))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Pan Left"
              aria-label="Pan Left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPanOffsetX((prev) => Math.min(25, prev + 4))}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Pan Right"
              aria-label="Pan Right"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-bold text-colin-teal px-1">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleResetView}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
              title="Reset View"
              aria-label="Reset Camera View"
            >
              <RotateCcw size={16} />
            </button>
          </div>

          {/* Fullscreen Mode Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-1.5 text-xs font-bold"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* Area Description Box */}
      <div className="bg-white rounded-3xl p-5 border border-colin-charcoal-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase text-colin-navy">
              Current Area: {currentArea.name}
            </span>
            {currentArea.dimensions && (
              <span className="text-xs font-semibold text-colin-teal bg-colin-teal/10 px-2 py-0.5 rounded-md">
                Dimensions: {currentArea.dimensions}
              </span>
            )}
          </div>
          <p className="text-xs text-colin-charcoal-600 leading-relaxed max-w-2xl">
            {currentArea.description}
          </p>
        </div>
      </div>

      {/* In-Person Verification Slot CTA */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-colin-charcoal-200/90 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-colin-teal" />
            <h3 className="font-extrabold text-colin-navy text-base">
              Ready to verify this space in person?
            </h3>
          </div>
          <p className="text-xs text-colin-charcoal-600 max-w-xl leading-relaxed">
            While this simulated virtual tour previews room dimensions and certified amenities, nothing replaces walking into the room yourself. Book a guided visit backed by our <strong>55% refund assurance (₹82.50 refunded on on-site rejection)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <Button
            variant="accent"
            size="md"
            className="w-full md:w-auto text-colin-navy-950 font-black justify-center shadow-md py-3"
            onClick={() => setIsSlotModalOpen(true)}
            rightIcon={<Calendar size={16} />}
          >
            Book In-Person Visit Slot (₹{(property.visitSlotFee || 150).toFixed(0)})
          </Button>
        </div>
      </div>

      {/* Guided Visit Slot Modal */}
      <VisitSlotModal
        property={property}
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
      />
    </div>
  );
};