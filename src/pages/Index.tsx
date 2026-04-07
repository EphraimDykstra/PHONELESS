import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const [showStaffInput, setShowStaffInput] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [checking, setChecking] = useState(false);

  const handleStaffAccess = async () => {
    if (!accessCode.trim()) return;
    setChecking(true);
    const { data: event } = await supabase
      .from("events")
      .select("*")
      .eq("access_code", accessCode.toUpperCase().trim())
      .eq("active", true)
      .single();

    if (event) {
      sessionStorage.setItem("staff_event", JSON.stringify(event));
      navigate("/staff");
    } else {
      toast.error("Invalid or inactive access code");
    }
    setChecking(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">📵 Phone Away</h1>
          <p className="text-muted-foreground">
            Put your phone away, earn a free snack!
          </p>
        </div>

        <div className="space-y-4">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => navigate("/student")}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Smartphone className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl">I'm a Student</CardTitle>
              <CardDescription>Register your ID and start earning snacks</CardDescription>
            </CardHeader>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => setShowStaffInput(true)}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                <ScanLine className="h-7 w-7 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl">I'm Event Staff</CardTitle>
              <CardDescription>Scan student IDs and issue coupons</CardDescription>
            </CardHeader>
            {showStaffInput && (
              <CardContent className="pt-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStaffAccess()}
                  />
                  <Button onClick={handleStaffAccess} disabled={checking}>
                    {checking ? "..." : "Go"}
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
