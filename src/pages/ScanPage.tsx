import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Users, Smartphone, Hash } from "lucide-react";
import { calculateDistanceFeet, generateCouponCode } from "@/lib/distance";
import CouponPrint from "@/components/CouponPrint";

const DISTANCE_THRESHOLD = 500;

interface EventInfo {
  id: string;
  name: string;
  coupon_reward: string;
  coupon_text: string;
  coupon_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

const ScanPage = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [eventLocation, setEventLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [settingLocation, setSettingLocation] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [totalScans, setTotalScans] = useState(0);
  const [phonelessCount, setPhonelessCount] = useState(0);
  const [scanFlash, setScanFlash] = useState<"green" | "red" | null>(null);
  const [scanResult, setScanResult] = useState<{
    status: "away" | "nearby" | "unavailable" | null;
    studentName?: string;
    distance?: number;
    couponCode?: string;
  }>({ status: null });
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const checkStudentRef = useRef<(barcodeId: string) => Promise<void>>();

  // Check sessionStorage for saved event
  useEffect(() => {
    const stored = sessionStorage.getItem("staff_event");
    if (stored) {
      const ev = JSON.parse(stored) as EventInfo;
      setEvent(ev);
      if (ev.latitude && ev.longitude) {
        setEventLocation({ latitude: ev.latitude, longitude: ev.longitude });
      }
    }
  }, []);

  // Load scan stats when event is set
  useEffect(() => {
    if (!event) return;
    const loadStats = async () => {
      const { count: total } = await supabase
        .from("scan_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      const { count: away } = await supabase
        .from("scan_logs")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id)
        .eq("result", "away");
      setTotalScans(total || 0);
      setPhonelessCount(away || 0);
    };
    loadStats();
  }, [event, scanResult]);

  const handleAccessCode = async () => {
    if (!accessCode.trim()) return;
    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("access_code", accessCode.toUpperCase().trim())
      .eq("active", true)
      .single();
    if (ev) {
      sessionStorage.setItem("staff_event", JSON.stringify(ev));
      setEvent(ev);
      if (ev.latitude && ev.longitude) {
        setEventLocation({ latitude: ev.latitude, longitude: ev.longitude });
      }
      toast.success("Connected to: " + ev.name);
    } else {
      toast.error("Invalid or inactive access code");
    }
  };

  const setCurrentLocation = async () => {
    if (!event) return;
    setSettingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
      );
      const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      await supabase.from("events").update({ latitude: loc.latitude, longitude: loc.longitude }).eq("id", event.id);
      setEventLocation(loc);
      toast.success("Event location set!");
    } catch {
      toast.error("Could not get location. Please allow location access in Safari Settings > Privacy > Location Services.");
    }
    setSettingLocation(false);
  };

  const checkStudent = async (barcodeId: string) => {
    if (!eventLocation || !event) {
      toast.error("Set the event location first!");
      return;
    }

    const { data: student } = await supabase.from("students")
      .select("*").eq("barcode_id", barcodeId.trim()).single();

    if (!student) {
      toast.error("Student not found with ID: " + barcodeId);
      setScanFlash("red");
      setTimeout(() => setScanFlash(null), 2000);
      setScanResult({ status: null });
      return;
    }

    const { data: loc } = await supabase.from("student_locations")
      .select("*").eq("student_id", student.id).single();

    let result: "away" | "nearby" | "unavailable";
    let distance: number | undefined;

    if (!loc) {
      result = "unavailable";
    } else {
      distance = calculateDistanceFeet(
        eventLocation.latitude, eventLocation.longitude,
        loc.latitude, loc.longitude
      );
      result = distance >= DISTANCE_THRESHOLD ? "away" : "nearby";
    }

    // Flash green or red
    setScanFlash(result === "away" ? "green" : "red");
    setTimeout(() => setScanFlash(null), 3000);

    await supabase.from("scan_logs").insert({
      event_id: event.id,
      student_id: student.id,
      result,
      distance_feet: distance ? Math.round(distance) : null,
    });

    if (result === "away") {
      const couponCode = generateCouponCode();
      await supabase.from("coupons").insert({
        student_id: student.id,
        coupon_code: couponCode,
        event_id: event.id,
      });
      setScanResult({ status: "away", studentName: student.name, distance: Math.round(distance!), couponCode });
    } else if (result === "nearby") {
      setScanResult({ status: "nearby", studentName: student.name, distance: Math.round(distance!) });
    } else {
      setScanResult({ status: "unavailable", studentName: student.name });
    }

    setManualBarcode("");
  };

  // Keep ref in sync so the scanner callback always has fresh state
  useEffect(() => {
    checkStudentRef.current = checkStudent;
  });

  const startScanner = async () => {
    setScanning(true);
    setScanResult({ status: null });
    setScanFlash(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });
      html5QrCodeRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 280, height: 120 }, aspectRatio: 1.777 },
        (decodedText: string) => {
          scanner.stop().then(() => {
            setScanning(false);
            checkStudentRef.current?.(decodedText);
          });
        },
        () => {}
      );
    } catch {
      toast.error("Camera access denied. In Safari, go to Settings > Safari > Camera and set to Allow.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
    }
    setScanning(false);
  };

  // Step 1: Enter access code
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>🔐 Staff Scanner</CardTitle>
            <CardDescription>Enter your event access code to begin scanning</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Access code (e.g. ABC123)"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAccessCode()}
              className="text-center font-mono text-lg uppercase"
            />
            <Button className="w-full" onClick={handleAccessCode}>Connect</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: Set event location
  if (!eventLocation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Set Event Location
              </CardTitle>
              <CardDescription>
                Set your current GPS position for <strong>{event.name}</strong>. Students whose phones are 500+ feet from here earn: <strong>{event.coupon_reward}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                ⚠️ On iPhone, make sure Safari has location access: Settings → Privacy → Location Services → Safari → "While Using"
              </p>
              <Button className="w-full" onClick={setCurrentLocation} disabled={settingLocation}>
                {settingLocation ? "Getting location..." : "Use My Current Location"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Step 3: Scanner dashboard
  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        {/* Camera scanner at top */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-center">{event.name}</CardTitle>
            <CardDescription className="text-center">Scan student ID barcode</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative overflow-hidden rounded-lg">
              <div id="barcode-reader" ref={scannerRef} />
              {scanFlash && (
                <div
                  className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 ${
                    scanFlash === "green"
                      ? "bg-green-500/30 border-4 border-green-500"
                      : "bg-red-500/30 border-4 border-red-500"
                  } rounded-lg`}
                >
                  <span className="text-5xl">{scanFlash === "green" ? "✅" : "❌"}</span>
                </div>
              )}
            </div>
            {!scanning ? (
              <Button className="w-full" onClick={startScanner}>
                <Camera className="mr-2 h-4 w-4" /> Start Camera Scanner
              </Button>
            ) : (
              <Button className="w-full" variant="destructive" onClick={stopScanner}>
                Stop Scanner
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Scan result */}
        {scanResult.status === "away" && (
          <CouponPrint
            studentName={scanResult.studentName!}
            couponCode={scanResult.couponCode!}
            distance={scanResult.distance!}
            rewardText={event.coupon_reward}
            eventName={event.name}
            couponText={event.coupon_text}
            couponImageUrl={event.coupon_image_url}
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
          <Card className="border-destructive/50">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl">⚠️</p>
              <p className="mt-2 text-lg font-semibold">Location unavailable</p>
              <p className="text-sm text-muted-foreground">
                {scanResult.studentName}'s app isn't sharing location. Ask them to open the app and enable location sharing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats tally */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Students Scanned</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{totalScans}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Smartphone className="h-4 w-4" />
                <span className="text-xs">Phone-less ✅</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{phonelessCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Manual entry */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            {!showManualEntry ? (
              <Button variant="outline" className="w-full gap-2" onClick={() => setShowManualEntry(true)}>
                <Hash className="h-4 w-4" /> Manual ID Entry
              </Button>
            ) : (
              <>
                <Label className="text-xs text-muted-foreground">Type student ID number</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 920145678"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && checkStudent(manualBarcode)}
                    className="font-mono"
                  />
                  <Button onClick={() => checkStudent(manualBarcode)}>Check</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Location info */}
        <p className="text-xs text-muted-foreground text-center">
          📍 ({eventLocation.latitude.toFixed(4)}, {eventLocation.longitude.toFixed(4)})
          <Button variant="link" className="ml-1 h-auto p-0 text-xs" onClick={() => setEventLocation(null)}>
            Change
          </Button>
        </p>
      </div>
    </div>
  );
};

export default ScanPage;
