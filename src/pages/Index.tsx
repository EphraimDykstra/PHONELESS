import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">📵 Phone Away</h1>
          <p className="text-muted-foreground">
            Put your phone away, earn a free snack!
          </p>
        </div>

        <Card
          className="cursor-pointer transition-shadow hover:shadow-lg"
          onClick={() => navigate("/student")}
        >
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Get Started</CardTitle>
            <CardDescription>Register your student ID and start earning snacks</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
};

export default Index;
