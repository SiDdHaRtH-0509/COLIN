import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, 
  X, 
  LogOut, 
  ChevronDown, 
  ShieldCheck, 
  PlusCircle, 
  Sparkles
} from 'lucide-react';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Explore Stays', href: '/#featured-properties' },
    { label: 'Categories', href: '/#categories' },
    { label: 'Why COLIN', href: '/#why-colin' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'COLIN Living', href: '/#colin-living' },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith('/#')) {
      const elementId = href.replace('/#', '');
      if (location.pathname !== '/') {
        navigate(`/${href}`);
      } else {
        const el = document.getElementById(elementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-colin-charcoal-200/70'
          : 'bg-white/90 backdrop-blur-sm border-b border-colin-charcoal-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand Identity */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative">
              <img
                src="/assets/colin-logo.png"
                alt="COLIN Logo"
                className="h-11 sm:h-12 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-colin-teal rounded-full border-2 border-white"></span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-extrabold tracking-tight text-colin-navy flex items-center gap-1 font-display leading-none">
                COLIN
                <span className="text-colin-orange text-3xl leading-none">.</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-colin-teal-700 font-sans mt-0.5">
                Verified Student Living
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-semibold text-colin-charcoal-700 hover:text-colin-navy transition-colors relative py-1 hover:after:w-full after:transition-all after:duration-300 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-colin-teal"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Action CTAs & Auth Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Owner Listing CTA */}
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal('/#owner-cta', 'Sign in to access the COLIN Owner Verification portal.');
                } else {
                  handleNavClick('/#owner-cta');
                }
              }}
              className="text-xs font-bold text-colin-navy hover:text-colin-teal transition-colors flex items-center gap-1.5 px-3 py-2 rounded-xl border border-colin-charcoal-200 hover:border-colin-teal/40 bg-colin-offwhite"
            >
              <PlusCircle size={15} className="text-colin-orange" />
              <span>List Property</span>
            </button>

            {isAuthenticated ? (
              /* Authenticated Profile Menu */
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full border border-colin-charcoal-200 hover:border-colin-teal transition-all bg-colin-offwhite hover:bg-white shadow-sm"
                  aria-expanded={userDropdownOpen}
                >
                  <img
                    src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user?.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-colin-teal/40"
                  />
                  <div className="text-left hidden xl:block">
                    <div className="text-xs font-bold text-colin-navy truncate max-w-[120px]">
                      {user?.name}
                    </div>
                    <div className="text-[10px] text-colin-teal-700 font-semibold uppercase">
                      {user?.role === 'student' ? 'Student' : 'Property Host'}
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
                        <span>COLIN Verified Member</span>
                      </div>
                    </div>

                    <div className="py-1">
                      <div className="px-4 py-2 text-xs text-colin-charcoal-600">
                        <span className="font-semibold text-colin-charcoal-800">Campus:</span>{' '}
                        {user?.university || 'Delhi NCR Region'}
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
              /* Guest Login & Signup Buttons */
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="primary" size="sm" rightIcon={<Sparkles size={13} className="text-colin-orange" />}>
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {!isAuthenticated && (
              <Link to="/login">
                <Button variant="outline" size="sm" className="px-2.5 py-1 text-xs">
                  Login
                </Button>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-colin-navy hover:text-colin-teal rounded-xl hover:bg-colin-charcoal-100 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-colin-charcoal-100 bg-white px-4 pt-3 pb-6 space-y-4 shadow-lg animate-fadeIn">
          {isAuthenticated && (
            <div className="flex items-center gap-3 p-3 bg-colin-navy-50 rounded-2xl border border-colin-navy-100">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                alt={user?.name || 'User'}
                className="w-10 h-10 rounded-full object-cover border border-colin-teal"
              />
              <div className="flex-1">
                <div className="text-sm font-bold text-colin-navy">{user?.name}</div>
                <div className="text-xs text-colin-teal-700 font-semibold">
                  {user?.role === 'student' ? 'Student Member' : 'Property Host'}
                </div>
              </div>
              <button
                onClick={logout}
                className="text-xs text-rose-600 font-bold p-2 hover:bg-rose-50 rounded-lg"
              >
                Sign Out
              </button>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-bold text-colin-charcoal-700 hover:text-colin-navy hover:bg-colin-charcoal-50"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-colin-charcoal-100 space-y-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleNavClick('/#owner-cta');
              }}
              className="w-full py-2.5 px-4 text-xs font-bold text-colin-navy bg-colin-navy-50 rounded-xl flex items-center justify-center gap-2"
            >
              <PlusCircle size={15} className="text-colin-orange" />
              <span>List Your Property on COLIN</span>
            </button>

            {!isAuthenticated && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" className="w-full">
                  <Button variant="outline" size="md" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" className="w-full">
                  <Button variant="primary" size="md" className="w-full">
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
