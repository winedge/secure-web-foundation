import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, BarChart3, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import logoImg from '@/assets/leadthru-logo.png';

const features = [
  {
    icon: Shield,
    title: 'AI-Verified Leads',
    description: 'Every lead is scored and verified using advanced AI to ensure quality and reduce fraud.',
  },
  {
    icon: Zap,
    title: 'Instant Access',
    description: 'Purchase leads instantly and unlock full contact details with one-click.',
  },
  {
    icon: BarChart3,
    title: 'Transparent Pricing',
    description: 'See lead quality scores and pricing upfront. No hidden fees or surprises.',
  },
];

export default function Index() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-bg min-h-screen flex flex-col">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col">
          {/* Navigation */}
          <nav className="flex items-center justify-between">
            <img src={logoImg} alt="LeadThru" className="h-9 sm:h-10" />

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-3">
              {user ? (
                <Button asChild variant="secondary" size="sm">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="text-white hover:text-white hover:bg-white/10">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/auth?mode=signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="sm:hidden p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl space-y-3">
              {user ? (
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="w-full text-white hover:text-white hover:bg-white/20">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/auth?mode=signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Hero Content */}
          <div className="flex-1 flex items-center py-12 sm:py-20">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
                Mass Tort Leads,{' '}
                <span className="text-accent">AI-Verified</span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 max-w-xl">
                Access the most transparent marketplace for verified mass tort leads. 
                AI-scored, compliance-ready, and available for instant purchase.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base sm:text-lg px-6 sm:px-8">
                  <Link to="/auth?mode=signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-base sm:text-lg px-6 sm:px-8">
                  <Link to="/marketplace">Browse Leads</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Why Law Firms Choose LeadsThru</h2>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              The smarter way to acquire high-quality mass tort leads
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 sm:p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
                  <feature.icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6">Ready to Get Started?</h2>
          <p className="text-base sm:text-lg md:text-xl opacity-80 mb-6 sm:mb-8 max-w-xl mx-auto">
            Join hundreds of law firms already using LeadsThru to grow their practice.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base sm:text-lg px-6 sm:px-8">
            <Link to="/auth?mode=signup">
              Create Your Account
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 bg-card border-t border-border">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src={logoImg} alt="LeadThru" className="h-7" />
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right">
              © 2024 LeadsThru. All rights reserved. Not a law firm. Not legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
