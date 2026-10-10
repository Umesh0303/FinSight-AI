import React, { useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Logo } from '../brand/Logo';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

export const PublicNav: React.FC = () => {
  const { currentPath, navigate } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav
      className={`sticky top-0 z-[100] w-full text-white transition-all duration-300 ${
        isScrolled
          ? 'bg-[#041a12]/95 backdrop-blur-md border-b border-[#144737] shadow-[0_12px_32px_rgba(1,16,11,0.7)]'
          : 'bg-[#061d15]/90 backdrop-blur-sm border-b border-[#144737]/50 shadow-none'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo and App Name: Click returns to Home / */}
        <Logo size="md" variant="dark" showText={true} />

        {/* Center Nav Links: Informational (Rule 18: Public Information stays on page) */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => {
              if (currentPath !== '/') navigate('/');
              else window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-[#f1ce72] hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('analytics')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            Analytics
          </button>
          <button
            onClick={() => scrollToSection('insights')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            Insights
          </button>
          <button
            onClick={() => scrollToSection('solutions')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            Solutions
          </button>
          <button
            onClick={() => scrollToSection('risk')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            Risk & Fraud
          </button>
          <button
            onClick={() => navigate('/about')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => navigate('/contact')}
            className="text-[#a2c8b8] hover:text-[#f1ce72] transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>

        {/* Right CTA cluster: Clear ONE application entry button "Go to Dashboard" (Rule 6) */}
        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-semibold text-[#c8e5d9] hover:text-white px-2 py-1.5 transition-colors cursor-pointer"
          >
            Login
          </button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => navigate('/app')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="!px-4 !py-2 !rounded-xl font-bold"
          >
            Go to Dashboard
          </Button>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-white hover:text-[#f1ce72]"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07241a] border-b border-[#144737] px-4 pt-2 pb-6 space-y-3">
          <button
            onClick={() => {
              navigate('/');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-white"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection('analytics')}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            Analytics (Info)
          </button>
          <button
            onClick={() => scrollToSection('insights')}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            Insights (Info)
          </button>
          <button
            onClick={() => scrollToSection('solutions')}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            Solutions (Info)
          </button>
          <button
            onClick={() => scrollToSection('risk')}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            Risk & Fraud (Info)
          </button>
          <button
            onClick={() => {
              navigate('/about');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            About
          </button>
          <button
            onClick={() => {
              navigate('/contact');
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-sm font-medium text-[#c8e5d9]"
          >
            Contact
          </button>
          <div className="pt-4 border-t border-[#124232] flex flex-col gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
            >
              Login
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                navigate('/app');
                setMobileMenuOpen(false);
              }}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};
