import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CalendarDays, Zap } from "lucide-react";

const StudentPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [barcodeId, setBarcodeId] = useState("");
  const [student, setStudent] = useState<{ id: string; name: string; barcode_id: string } | null>(null);
  const [locationSharing, setLocationSharing] = useState(false);
  const [eventsAttended, setEventsAttended] = useState<
    { event_name: string; coupon_code: string; coupon_reward: string; created_at: string; redeemed: boolean }[]
  >([]);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem("student_id");
    if (savedId) {
      supabase.from("students").select("*").eq("id", savedId).single().then(({ data }) => {
        if (data) setStudent(data);
      });
    }
  }, []);

  useEffect(() => {
    if (!student) return;
    const fetchEvents = async () => {
      const { data: coupons } = await supabase
        .from("coupons")
        .select("coupon_code, created_at, redeemed, event_id")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (!coupons || coupons.length === 0) {
        setEventsAttended([]);
        return;
      }

      const eventIds = [...new Set(coupons.map((c) => c.event_id).filter(Boolean))];
      const { data: events } = await supabase
        .from("events")
        .select("id, name, coupon_reward")
        .in("id", eventIds);

      const eventMap = new Map(events?.map((e) => [e.id, e]) || []);

      setEventsAttended(
        coupons.map((c) => {
          const event = c.event_id ? eventMap.get(c.event_id) : null;
          return {
            event_name: event?.name || "Event",
            coupon_code: c.coupon_code,
            coupon_reward: event?.coupon_reward || "Complimentary Snack",
            created_at: c.created_at,
            redeemed: c.redeemed,
          };
        })
      );
    };
    fetchEvents();
  }, [student]);

  const updateLocation = useCallback(async () => {
    if (!student || !locationSharing) return;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const { latitude, longitude } = pos.coords;
      // Update current location
      await supabase.from("student_locations").upsert(
        { student_id: student.id, latitude, longitude },
        { onConflict: "student_id" }
      );
      // Log to location history
      await supabase.from("student_location_history").insert({
        student_id: student.id,
        latitude,
        longitude,
      });
    } catch {
      toast.error("Could not get location. Please enable GPS.");
      setLocationSharing(false);
    }
  }, [student, locationSharing]);

  useEffect(() => {
    if (!locationSharing) return;
    updateLocation();
    const interval = setInterval(updateLocation, 30000);
    return () => clearInterval(interval);
  }, [locationSharing, updateLocation]);

  const handleRegister = async () => {
    if (!name.trim() || !barcodeId.trim()) {
      toast.error("Please enter your name and student ID");
      return;
    }
    setRegistering(true);
    const { data, error } = await supabase.from("students")
      .insert({ name: name.trim(), barcode_id: barcodeId.trim() })
      .select().single();
    if (error) {
      if (error.code === "23505") {
        const { data: existing } = await supabase.from("students")
          .select("*").eq("barcode_id", barcodeId.trim()).single();
        if (existing) {
          setStudent(existing);
          localStorage.setItem("student_id", existing.id);
          toast.success("Welcome back, " + existing.name + "!");
        }
      } else {
        toast.error("Registration failed: " + error.message);
      }
    } else if (data) {
      setStudent(data);
      localStorage.setItem("student_id", data.id);
      toast.success("Registered successfully!");
    }
    setRegistering(false);
  };

  if (!student) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-mono">
            <ArrowLeft className="h-4 w-4" /> BACK
          </button>
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Student Registration</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter your name and student ID barcode number</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Student ID</Label>
                <Input placeholder="e.g. 123456789" value={barcodeId} onChange={(e) => setBarcodeId(e.target.value)} className="bg-secondary border-border font-mono" />
              </div>
              <Button className="w-full font-mono uppercase tracking-wider" onClick={handleRegister} disabled={registering}>
                {registering ? "Registering..." : "Register"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors font-mono">
          <ArrowLeft className="h-4 w-4" /> BACK
        </button>

        {/* Profile card */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
              <p className="text-sm font-mono text-muted-foreground">ID: {student.barcode_id}</p>
            </div>
            <Badge variant={locationSharing ? "default" : "secondary"} className="font-mono text-xs uppercase">
              {locationSharing ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-secondary p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <Label htmlFor="location-toggle" className="text-sm">Share Location</Label>
            </div>
            <Switch id="location-toggle" checked={locationSharing} onCheckedChange={setLocationSharing} />
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            Keep this page open during the event. Your location is checked when your ID is scanned.
          </p>
        </div>

        {/* Events */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Events Attended</h3>
          </div>
          {eventsAttended.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet. Put your phone away to earn snacks!</p>
          ) : (
            <div className="space-y-3">
              {eventsAttended.map((e, i) => (
                <div key={i} className="rounded-lg border border-border bg-secondary p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground">{e.event_name}</p>
                    <Badge variant={e.redeemed ? "secondary" : "default"} className="font-mono text-xs">
                      {e.redeemed ? "Redeemed" : "Valid"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-primary" />
                    <p className="text-xs text-muted-foreground">{e.coupon_reward}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs text-muted-foreground">{e.coupon_code}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
