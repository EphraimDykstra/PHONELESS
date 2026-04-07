import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin } from "lucide-react";
import { calculateDistanceFeet, generateCouponCode } from "@/lib/distance";
import CouponPrint from "@/components/CouponPrint";

const DISTANCE_THRESHOLD = 500; // feet

const StaffPage = () => {
  const navigate = useNavigate();
  const [eventLocation, setEventLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [eventName, setEventName] = useState("");
  const [settingLocation, setSettingLocation] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: "away" | "nearby" | "unavailable" | null;
    studentName?: string;
    distance?: number;
    couponCode?: string;
  }>({ status: null });
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Load saved event location
  useEffect(() => {
    supabase.from("event_locations").select("*").order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setEventLocation({ latitude: data[0].latitude, longitude: data[0].longitude });
          setEventName(data[0].name);
        }
      });
  }, []);

  const setCurrentLocation = async () => {
    setSettingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      const name = eventName.trim() || "Event";
      await supabase.from("event_locations").insert({ name, ...loc });
      setEventLocation(loc);
      toast.success("Event location set!");
    } catch {
      toast.error("Could not get location. Please enable GPS.");
    }
    setSettingLocation(false);
  };

  const checkStudent = async (barcodeId: string) => {
    if (!eventLocation) {
      toast.error("Set the event location first!");
      return;
    }

    const { data: student } = await supabase.from("students")
      .select("*").eq("barcode_id", barcodeId.trim()).single();

    if (!student) {
      toast.error("Student not found with ID: " + barcodeId);
      setScanResult({ status: null });
      return;
    }

    const { data: loc } = await supabase.from("student_locations")
      .select("*").eq("student_id", student.id).single();

    if (!loc) {
      setScanResult({ status: "unavailable", studentName: student.name });
      return;
    }

    const distance = calculateDistanceFeet(
      eventLocation.latitude, eventLocation.longitude,
      loc.latitude, loc.longitude
    );

    if (distance >= DISTANCE_THRESHOLD) {
      const couponCode = generateCouponCode();
      await supabase.from("coupons").insert({ student_id: student.id, coupon_code: couponCode });
      setScanResult({ status: "away", studentName: student.name, distance: Math.round(distance), couponCode });
    } else {
      setScanResult({ status: "nearby", studentName: student.name, distance: Math.round(distance) });
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setScanResult({ status: null });
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader");
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          scanner.stop().then(() => {
            setScanning(false);
            checkStudent(decodedText);
          });
        },
        () => {}
      );
    } catch (err) {
      toast.error("Camera access denied or not available");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
    }
    setScanning(false);
  };

  if (!eventLocation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Set Event Location
              </CardTitle>
              <CardDescription>
                Set your current GPS position as the event location. Students whose phones are 500+ feet from here will earn a coupon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input placeholder="e.g. Study Hall" value={eventName} onChange={(e) => setEventName(e.target.value)} />
              </div>
              <Button className="w-full" onClick={setCurrentLocation} disabled={settingLocation}>
                {settingLocation ? "Getting location..." : "Use My Current Location"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5" /> Scan Student ID
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div id="barcode-reader" ref={scannerRef} className="overflow-hidden rounded-lg" />
            <div className="flex gap-2">
              {!scanning ? (
                <Button className="w-full" onClick={startScanner}>
                  <Camera className="mr-2 h-4 w-4" /> Start Camera Scanner
                </Button>
              ) : (
                <Button className="w-full" variant="destructive" onClick={stopScanner}>
                  Stop Scanner
                </Button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or type manually</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Enter student ID"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && checkStudent(manualBarcode)}
              />
              <Button onClick={() => checkStudent(manualBarcode)}>Check</Button>
            </div>
          </CardContent>
        </Card>

        {scanResult.status === "away" && (
          <CouponPrint
            studentName={scanResult.studentName!}
            couponCode={scanResult.couponCode!}
            distance={scanResult.distance!}
          />
        )}

        {scanResult.status === "nearby" && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl">❌</p>
              <p className="mt-2 text-lg font-semibold">Phone is nearby</p>
              <p className="text-sm text-muted-foreground">
                {scanResult.studentName}'s phone is only {scanResult.distance} feet away. No coupon issued.
              </p>
            </CardContent>
          </Card>
        )}

        {scanResult.status === "unavailable" && (
          <Card className="border-yellow-500">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl">⚠️</p>
              <p className="mt-2 text-lg font-semibold">Location unavailable</p>
              <p className="text-sm text-muted-foreground">
                {scanResult.studentName}'s app isn't sharing location. Ask them to open the app and enable location sharing.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground text-center">
              📍 Event location set ({eventLocation.latitude.toFixed(4)}, {eventLocation.longitude.toFixed(4)})
              <Button variant="link" className="ml-1 h-auto p-0 text-xs" onClick={() => setEventLocation(null)}>
                Change
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPage;
