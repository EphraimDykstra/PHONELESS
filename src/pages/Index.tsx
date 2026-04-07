import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Smartphone, ScanLine } from "lucide-react";
import { toast } from "sonner";

const STAFF_CODE = "SNACK2026";

const Index = () => {
  const navigate = useNavigate();
  const [showStaffInput, setShowStaffInput] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const handleStaffAccess = () => {
    if (accessCode.toUpperCase() === STAFF_CODE) {
      navigate("/staff");
    } else {
      toast.error("Invalid access code");
    }
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
                  <Button onClick={handleStaffAccess}>Go</Button>
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
