import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, BarChart3, Target, Shield, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">HomeAdvisor CRM</span>
          </div>
          <a href="/api/login">
            <Button data-testid="button-login">Sign In</Button>
          </a>
        </div>
      </nav>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[60vh]">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight">
                Professional Real Estate
                <span className="text-primary block">CRM Solution</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                Manage your leads, inventory, and sales pipeline with our comprehensive CRM designed specifically for real estate brokers and agents.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <a href="/api/login">
                  <Button size="lg" data-testid="button-get-started">
                    Get Started
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap gap-6 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Secure & Reliable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Fast & Efficient</span>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl" />
              <Card className="relative p-8 shadow-2xl">
                <CardContent className="p-0 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">New Lead Added</div>
                      <div className="text-sm text-muted-foreground">Ahmed Mohamed - 3 bedroom villa</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">Deal Closed</div>
                      <div className="text-sm text-muted-foreground">Palm Hills - Unit A-205</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">Monthly Report</div>
                      <div className="text-sm text-muted-foreground">32 leads converted this month</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-24">
            <h2 className="text-2xl font-bold text-center mb-12">Everything You Need to Succeed</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 hover-elevate">
                <CardContent className="p-0 space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Lead Management</h3>
                  <p className="text-muted-foreground text-sm">
                    Track and manage all your leads through customizable pipelines. Never miss a follow-up again.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 hover-elevate">
                <CardContent className="p-0 space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Inventory Control</h3>
                  <p className="text-muted-foreground text-sm">
                    Manage developers, projects, and units with visual stacking plans. Real-time availability tracking.
                  </p>
                </CardContent>
              </Card>
              <Card className="p-6 hover-elevate">
                <CardContent className="p-0 space-y-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Advanced Analytics</h3>
                  <p className="text-muted-foreground text-sm">
                    Comprehensive reports on sales, team performance, and lead sources. Export to Excel or PDF.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>HomeAdvisor CRM - Professional Real Estate Management</p>
        </div>
      </footer>
    </div>
  );
}
