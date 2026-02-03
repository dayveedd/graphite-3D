import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Layers, Box, Sparkles, Ruler, Cpu } from 'lucide-react';

export const Landing = () => {
  return (
    <div className="min-h-screen bg-stone-50 relative overflow-hidden">
      {/* Technical Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#d4a57440_1px,transparent_1px),linear-gradient(to_bottom,#d4a57440_1px,transparent_1px)] bg-[size:40px_40px] opacity-40"></div>

      {/* Hero Section */}
      <div className="relative pt-24 md:pt-32 pb-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Main Content Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left: Text Content */}
            <div className="space-y-6 md:space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 border border-amber-200 text-amber-900 text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>AI-Powered Engineering Analysis</span>
              </div>

              {/* Heading */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-black tracking-tight text-stone-900 leading-[0.95]">
                  TRANSFORM
                  <br />
                  <span className="text-amber-700">2D DRAWINGS</span>
                  <br />
                  TO 3D MODELS
                </h1>
                <div className="text-sm md:text-base text-stone-600 font-medium uppercase tracking-wider">
                  Powered by Gemini AI
                </div>
              </div>

              {/* Description */}
              <p className="text-lg md:text-xl text-stone-700 leading-relaxed max-w-xl">
                Upload orthographic engineering drawings and instantly generate interactive 3D CAD models.
                Analyze geometry, visualize assemblies, and explore with AI-powered insights.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  to="/scan"
                  className="inline-flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white text-base md:text-lg font-bold px-8 py-4 rounded-lg shadow-xl shadow-amber-700/20 transition-all hover:scale-105"
                >
                  Start Scanning
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/history"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-900 text-base md:text-lg font-bold px-8 py-4 rounded-lg border-2 border-stone-300 transition-all hover:border-amber-700"
                >
                  View Examples
                </Link>
              </div>

              {/* Technical Annotations */}
              <div className="pt-8 space-y-2 text-xs text-stone-500 font-mono">
                <div>→ COMPATIBLE: ISO, ANSI, DIN Standards</div>
                <div>→ FORMATS: PNG, JPG, PDF</div>
                <div>→ RESPONSE: Real-time Processing</div>
              </div>
            </div>

            {/* Right: Visual/Illustration */}
            <div className="relative">
              {/* Technical Drawing Frame */}
              <div className="relative bg-white/80 backdrop-blur border-2 border-stone-300 rounded-2xl p-8 shadow-2xl">

                {/* Detail Markers */}
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-700 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">A</div>
                <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-700 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">B</div>
                <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-amber-700 text-white rounded-full flex items-center justify-center font-bold text-sm border-2 border-white">C</div>

                {/* Placeholder for Drawing Visualization */}
                <div className="aspect-square bg-gradient-to-br from-stone-100 to-amber-50 rounded-lg border border-stone-200 flex flex-col items-center justify-center gap-4 p-8">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="bg-white border-2 border-amber-700 rounded-lg p-6 flex flex-col items-center gap-2">
                      <Ruler className="w-12 h-12 text-amber-700" />
                      <div className="text-xs font-bold text-stone-700 text-center">2D Input</div>
                    </div>
                    <div className="bg-amber-700 rounded-lg p-6 flex flex-col items-center gap-2">
                      <Box className="w-12 h-12 text-white" />
                      <div className="text-xs font-bold text-white text-center">3D Output</div>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8 text-amber-700 rotate-90 md:rotate-0" />
                  <div className="text-center">
                    <div className="text-sm font-bold text-stone-900">AI Conversion Engine</div>
                    <div className="text-xs text-stone-600 mt-1">Geometric Intelligence</div>
                  </div>
                </div>

                {/* Technical Notes */}
                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-stone-500 font-mono">
                  DETAIL VIEW: AI PROCESSING PIPELINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-16 md:py-24 px-4 md:px-8 bg-white/60 backdrop-blur">
        <div className="max-w-7xl mx-auto">

          {/* Section Header */}
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block px-4 py-1 bg-amber-100 border border-amber-200 rounded-full text-xs font-bold text-amber-900 uppercase tracking-wider mb-4">
              Core Capabilities
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-stone-900 tracking-tight">
              ENGINEERING-GRADE FEATURES
            </h2>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: Layers,
                number: "01",
                title: "CSG Deconstruction",
                description: "AI analyzes constructive solid geometry to identify base shapes, additions, and subtractive operations."
              },
              {
                icon: Box,
                number: "02",
                title: "Interactive 3D Viewer",
                description: "Explore models with split views, dimension overlays, wireframe modes, and exploded assemblies."
              },
              {
                icon: Cpu,
                number: "03",
                title: "AI Engineering Tutor",
                description: "Ask technical questions about your design. Get insights on manufacturing, tolerances, and feasibility."
              }
            ].map((feature, i) => (
              <div
                key={i}
                className="relative bg-white border-2 border-stone-300 rounded-xl p-6 md:p-8 hover:border-amber-700 transition-all group"
              >
                {/* Number Badge */}
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-stone-900 text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-stone-50">
                  {feature.number}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 mb-5 group-hover:bg-amber-700 group-hover:text-white transition-all">
                  <feature.icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-black text-stone-900 mb-3 uppercase tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="py-8 px-4 text-center text-sm text-stone-500 font-mono">
        PRECISION ENGINEERING • AI-POWERED ANALYSIS • REAL-TIME CONVERSION
      </div>
    </div>
  );
};
