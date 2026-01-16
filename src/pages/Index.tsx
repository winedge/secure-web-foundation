import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, BarChart3, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="gradient-bg min-h-[90vh] flex items-center">
        <div className="container mx-auto px-6 py-20 relative z-10">
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                <span className="text-xl font-bold text-accent-foreground">L</span>
              </div>
              <span className="text-2xl font-bold text-white">LeadsThru</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Button asChild variant="secondary">
                  <Link to="/dashboard">Go to Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link to="/auth?mode=signup">Get Started</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Mass Tort Leads,{' '}
              <span className="text-accent">AI-Verified</span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl">
              Access the most transparent marketplace for verified mass tort leads. 
              AI-scored, compliance-ready, and available for instant purchase.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8">
                <Link to="/auth?mode=signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 text-lg px-8">
                <Link to="/marketplace">Browse Leads</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Law Firms Choose LeadsThru</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The smarter way to acquire high-quality mass tort leads
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-8 rounded-2xl bg-card border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
            Join hundreds of law firms already using LeadsThru to grow their practice.
          </p>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8">
            <Link to="/auth?mode=signup">
              Create Your Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">L</span>
              </div>
              <span className="font-semibold">LeadsThru</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 LeadsThru. All rights reserved. Not a law firm. Not legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
