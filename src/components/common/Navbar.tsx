import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  X, 
  LogOut, 
  ChevronDown, 
  ShieldCheck 
} from 'lucide-react';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const isHomeActive = location.pathname === '/';

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-colin-charcoal-200/50'
          : 'bg-white/60 backdrop-blur-md border-b border-colin-charcoal-100/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Left Side: COLIN Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none shrink-0">
            <div className="relative">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN Logo"
                className="h-9 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-colin-teal rounded-full border-2 border-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-colin-navy flex items-center gap-0.5 font-display leading-none">
                COLIN
                <span className="text-colin-orange text-2xl sm:text-3xl leading-none">.</span>
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-colin-teal-700 font-sans mt-0.5">
                Verified Student Living
              </span>
            </div>
          </Link>

          {/* Main Center Navigation: Minimal (Just Home) */}
          <nav className="hidden md:flex items-center">
            <Link
              to="/"
              className={`text-sm font-bold transition-all px-4 py-2 rounded-xl flex items-center gap-2 ${
                isHomeActive
                  ? 'text-colin-navy bg-colin-navy-50/80 font-extrabold shadow-sm'
                  : 'text-colin-charcoal-600 hover:text-colin-navy hover:bg-colin-charcoal-50'
              }`}
            >
              <span>Home</span>
              {isHomeActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-colin-teal inline-block" />
              )}
            </Link>
          </nav>

          {/* Right Side: Log In & Register / Sign Up */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              /* Authenticated Profile Menu */
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3.5 rounded-full border border-colin-charcoal-200 hover:border-colin-teal transition-all bg-colin-offwhite hover:bg-white shadow-sm"
                  aria-expanded={userDropdownOpen}
                >
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user?.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-colin-teal/40"
                  />
                  <div className="text-left">
                    <div className="text-xs font-bold text-colin-navy truncate max-w-[130px]">
                      {user?.name}
                    </div>
                    <div className="text-[10px] text-colin-teal-700 font-semibold uppercase">
                      {user?.role === 'student' ? 'Student Member' : 'Property Host'}
                    </div>
                  </div>
                  <ChevronDown size={14} className="text-colin-charcoal-400" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-colin-charcoal-200 py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-colin-charcoal-100">
                      <p className="text-xs text-colin-charcoal-500 font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-colin-navy truncate">{user?.name}</p>
                      <p className="text-xs text-colin-charcoal-500 truncate">{user?.email}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-colin-teal-700 bg-colin-teal/10 px-2 py-0.5 rounded-md">
                        <ShieldCheck size={12} />
                        <span>COLIN Verified Account</span>
                      </div>
                    </div>

                    <div className="border-t border-colin-charcoal-100 pt-1">
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-2 transition-colors"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Minimal Log In & Register / Sign Up CTAs */
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-bold text-xs px-4">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button
                    variant="primary"
                    size="sm"
                    className="font-extrabold text-xs px-5 shadow-sm bg-colin-navy hover:bg-colin-navy-800"
                  >
                    Register / Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Navigation Trigger */}
          <div className="flex md:hidden items-center gap-1.5">
            {!isAuthenticated && (
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-xs font-bold px-2.5 py-1.5 h-8">
                  Log In
                </Button>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-colin-navy hover:text-colin-teal rounded-xl hover:bg-colin-charcoal-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-colin-charcoal-100 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 shadow-xl animate-fadeIn">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover border border-colin-teal"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-colin-navy truncate">{user?.name}</div>
                <div className="text-xs text-colin-teal-700 font-semibold truncate">
                  {user?.role === 'student' ? 'Student Member' : 'Property Host'}
                </div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-rose-600 font-bold p-2 hover:bg-rose-50 rounded-lg shrink-0"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link to="/login" className="w-full">
                <Button variant="outline" size="md" className="w-full font-bold text-xs py-2.5">
                  Log In
                </Button>
              </Link>
              <Link to="/signup" className="w-full">
                <Button variant="primary" size="md" className="w-full font-bold text-xs py-2.5">
                  Register
                </Button>
              </Link>
            </div>
          )}

          <div className="pt-2 border-t border-colin-charcoal-100">
            <Link
              to="/"
              className={`block w-full py-2.5 px-3 rounded-xl text-sm font-bold ${
                isHomeActive
                  ? 'bg-colin-navy-50 text-colin-navy'
                  : 'text-colin-charcoal-700 hover:bg-colin-charcoal-50'
              }`}
            >
              Home
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
