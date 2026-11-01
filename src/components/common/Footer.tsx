import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-colin-navy-950 text-white pt-16 pb-12 border-t border-colin-navy-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-colin-navy-800">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN Logo"
                className="h-12 w-auto object-contain bg-white/95 rounded-xl p-1"
              />
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-1 font-display">
                  COLIN<span className="text-colin-orange">.</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-colin-teal-300 block">
                  Campus Living Verified
                </span>
              </div>
            </Link>

            <p className="text-colin-charcoal-300 text-sm leading-relaxed max-w-sm">
              India’s student-first accommodation ecosystem. 100% in-person verified PGs, student hostels, and co-living spaces with zero brokerage and transparent visit guarantees.
            </p>

            <div className="pt-2 flex flex-wrap gap-2 text-xs">
              <span className="bg-colin-navy-900 border border-colin-navy-700 px-3 py-1.5 rounded-lg text-colin-teal-300 font-semibold flex items-center gap-1.5">
                <ShieldCheck size={14} /> 100% Volunteer Inspected
              </span>
              <span className="bg-colin-navy-900 border border-colin-navy-700 px-3 py-1.5 rounded-lg text-colin-orange font-semibold">
                Zero Brokerage
              </span>
            </div>
          </div>

          {/* Accommodation Types */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-colin-orange font-display">
              Accommodation
            </h4>
            <ul className="space-y-2 text-sm text-colin-charcoal-300">
              <li><a href="/#featured-properties" className="hover:text-white transition-colors">Verified Student PGs</a></li>
              <li><a href="/#featured-properties" className="hover:text-white transition-colors">Academic Hostels</a></li>
              <li><a href="/#featured-properties" className="hover:text-white transition-colors">Private Rental Rooms</a></li>
              <li><a href="/#featured-properties" className="hover:text-white transition-colors">Shared Student Flats</a></li>
              <li><a href="/#featured-properties" className="hover:text-white transition-colors">Modern Co-Living Spaces</a></li>
            </ul>
          </div>

          {/* Top College Hubs */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-colin-teal-300 font-display">
              Major College Hubs
            </h4>
            <ul className="space-y-2 text-sm text-colin-charcoal-300">
              <li><span className="text-white font-medium">Delhi NCR:</span> North & South Campus</li>
              <li><span className="text-white font-medium">Bengaluru:</span> Koramangala & HSR</li>
              <li><span className="text-white font-medium">Pune:</span> Viman Nagar & Kothrud</li>
              <li><span className="text-white font-medium">Mumbai:</span> Powai & Vile Parle</li>
              <li><span className="text-white font-medium">Kota:</span> Landmark Coaching Hub</li>
              <li><span className="text-white font-medium">Hyderabad:</span> HITEC & Gachibowli</li>
            </ul>
          </div>

          {/* For Owners & Trust */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-display">
              Owners & Support
            </h4>
            <ul className="space-y-2 text-sm text-colin-charcoal-300">
              <li><a href="/#owner-cta" className="hover:text-colin-orange transition-colors flex items-center gap-1">List Property <ArrowUpRight size={13} /></a></li>
              <li><a href="/#owner-cta" className="hover:text-white transition-colors">COLIN Certified Badge Audit</a></li>
              <li><a href="/#owner-cta" className="hover:text-white transition-colors">Owner Pro & Premium Tiers</a></li>
              <li><span className="hover:text-white cursor-pointer">Student 24/7 Helpline: 1800-COLIN-STAY</span></li>
              <li><span className="hover:text-white cursor-pointer">help@colinliving.in</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-colin-charcoal-400 gap-4">
          <p>© 2026 COLIN Living Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-colin-teal-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-colin-teal-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-colin-teal-300 cursor-pointer">55% Visit Refund Policy</span>
            <span className="hover:text-colin-teal-300 cursor-pointer">Safety Guidelines</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
