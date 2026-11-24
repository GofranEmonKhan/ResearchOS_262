import React, { useState, useEffect } from 'react';
import { Logo } from '../brand/Logo.js';
import { Layers, ArrowRight, Menu, X, BookOpen, Activity, Compass, DollarSign, FileText } from 'lucide-react';

interface NavbarProps {
  onSignInClick?: () => void;
  onGetStartedClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSignInClick, onGetStartedClick }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features', icon: Compass },
    { label: 'Supervision', href: '#supervision', icon: Activity },
    { label: 'Literature', href: '#literature', icon: BookOpen },
    { label: 'Experiments', href: '#experiments', icon: Layers },
    { label: 'Pricing', href: '#pricing', icon: DollarSign },
    { label: 'Blogs', href: '#blogs', icon: FileText },
  ];

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 sm:pt-5 transition-all duration-300">
      <div
        className={`max-w-5xl mx-auto nav-pill-bar rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-300 ${
          scrolled ? 'shadow-glow-sm border-purple-500/20' : ''
        }`}
      >
        {/* Brand Logo */}
        <Logo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-2.5">
          <button
            onClick={onSignInClick}
            className="btn-ghost-glass px-4 py-1.5 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={onGetStartedClick}
            className="btn-electric-pill px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 group focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={onGetStartedClick}
            className="btn-electric-pill px-3 py-1.5 rounded-full text-xs font-semibold"
          >
            Join
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden mt-2 max-w-5xl mx-auto card-glass rounded-2xl p-4 border border-purple-500/20 shadow-2xl flex flex-col gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-200 hover:bg-purple-500/10 hover:text-purple-300 transition"
              >
                <Icon className="w-4 h-4 text-purple-400" />
                {link.label}
              </a>
            );
          })}
          <div className="pt-2 mt-1 border-t border-white/10 flex items-center gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onSignInClick?.();
              }}
              className="flex-1 btn-ghost-glass py-2 rounded-xl text-xs font-medium text-center"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGetStartedClick?.();
              }}
              className="flex-1 btn-electric-pill py-2 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
