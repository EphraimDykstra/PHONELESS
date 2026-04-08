import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-10">
        {/* Hero */}
        <div className="space-y-4 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-primary text-glow">
            PHONELESS
          </h1>
          <p className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            Put your phone away. Earn a free snack.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/student")}
          className="group relative w-full overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:border-glow"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-foreground">Get Started</p>
              <p className="text-sm text-muted-foreground">
                Register your student ID and start earning
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </button>

        {/* Footer */}
        <p className="text-center text-xs font-mono text-muted-foreground/50">
          v1.0 · PHONELESS
        </p>
      </div>
    </div>
  );
};

export default Index;
