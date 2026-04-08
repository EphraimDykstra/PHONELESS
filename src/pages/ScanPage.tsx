import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, MapPin, Users, Smartphone, Hash } from "lucide-react";
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
  const [scanHint, setScanHint] = useState("Align the full barcode inside the frame");
  const [scanResult, setScanResult] = useState<{
    status: "away" | "nearby" | "unavailable" | null;
    studentName?: string;
    distance?: number;
    couponCode?: string;
  }>({ status: null });
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const checkStudentRef = useRef<(barcodeId: string) => Promise<void>>();

  const normalizeBarcode = (value: string) => value.replace(/\D/g, "");
  const buildBarcodeCandidates = (value: string) => {
    const normalized = normalizeBarcode(value);
    const withoutLeadingZeros = normalized.replace(/^0+/, "");
    return Array.from(new Set([value.trim(), normalized, withoutLeadingZeros].filter(Boolean)));
  };

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
      toast.error("Could not get location. Allow location access in Safari Settings.");
    }
    setSettingLocation(false);
  };

  const checkStudent = async (barcodeId: string) => {
    if (!eventLocation || !event) {
      toast.error("Set the event location first!");
      return;
    }

    const candidates = buildBarcodeCandidates(barcodeId);
    let student: { id: string; name: string; barcode_id: string } | null = null;

    for (const candidate of candidates) {
      const { data } = await supabase.from("students")
        .select("*")
        .eq("barcode_id", candidate)
        .maybeSingle();
      if (data) {
        student = data;
        break;
      }
    }

    if (!student) {
      toast.error("Student not found with ID: " + candidates[0]);
      setScanHint(`Read ${candidates[0]} — no student matched`);
      setScanFlash("red");
      setTimeout(() => setScanFlash(null), 2000);
      setScanResult({ status: null });
      return;
    }

    const { data: loc } = await supabase.from("student_locations")
      .select("*")
      .eq("student_id", student.id)
      .single();

    // Check location history for tracking duration
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: history } = await supabase
      .from("student_location_history")
      .select("created_at")
      .eq("student_id", student.id)
      .gte("created_at", thirtyMinAgo)
      .order("created_at", { ascending: true });

    let trackingMinutes = 0;
    if (history && history.length > 0) {
      const earliest = new Date(history[0].created_at).getTime();
      const latest = new Date(history[history.length - 1].created_at).getTime();
      trackingMinutes = Math.round((latest - earliest) / 60000);
    }

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

    setScanFlash(result === "away" ? "green" : "red");
    setScanHint(`Read ${student.barcode_id}`);
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
      setScanResult({ status: "away", studentName: student.name, distance: Math.round(distance!), couponCode, trackingMinutes, historyPings: history?.length || 0 });
    } else if (result === "nearby") {
      setScanResult({ status: "nearby", studentName: student.name, distance: Math.round(distance!), trackingMinutes, historyPings: history?.length || 0 });
    } else {
      setScanResult({ status: "unavailable", studentName: student.name, trackingMinutes: 0, historyPings: 0 });
    }

    setManualBarcode("");
  };

  useEffect(() => {
    checkStudentRef.current = checkStudent;
  });

  const startScanner = async () => {
    setScanning(true);
    setScanResult({ status: null });
    setScanFlash(null);
    setScanHint("Starting camera…");

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("barcode-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        useBarCodeDetectorIfSupported: false,
        verbose: false,
      } as any);

      html5QrCodeRef.current = scanner;

      let processingRef = false;

      await scanner.start(
        { facingMode: { ideal: "environment" } },
        {
          fps: 10,
          aspectRatio: 3,
          disableFlip: true,
        },
        async (decodedText: string) => {
          if (processingRef) return;
          processingRef = true;

          const normalizedText = normalizeBarcode(decodedText) || decodedText.trim();
          setScanHint(`Barcode detected: ${normalizedText}`);

          try {
            await scanner.stop();
          } catch {}

          setScanning(false);
          await checkStudentRef.current?.(normalizedText);
        },
        () => {}
      );

      setScanHint("Point the barcode at the camera and keep it level");

      try {
        const capabilities = scanner.getRunningTrackCapabilities?.() as MediaTrackCapabilities & {
          zoom?: { max?: number };
          focusMode?: string[];
        };

        const advancedConstraints: MediaTrackConstraintSet[] = [];

        if (capabilities?.zoom) {
          advancedConstraints.push({
            zoom: Math.min(2, capabilities.zoom.max || 2),
          } as MediaTrackConstraintSet);
        }

        if (capabilities?.focusMode?.includes("continuous")) {
          advancedConstraints.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
        }

        if (advancedConstraints.length > 0) {
          await scanner.applyVideoConstraints({ advanced: advancedConstraints } as MediaTrackConstraints);
        }
      } catch {}
    } catch (error) {
      console.error("Scanner failed to start", error);
      toast.error("Camera access denied or barcode reader failed to start.");
      setScanHint("Camera could not start");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try { await html5QrCodeRef.current.stop(); } catch {}
    }
    setScanning(false);
  };

  // Step 1: Access code
  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Staff Scanner</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your event access code</p>
          </div>
          <Input
            placeholder="ACCESS CODE"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAccessCode()}
            className="text-center font-mono text-lg uppercase bg-secondary border-border tracking-widest"
          />
          <Button className="w-full font-mono uppercase tracking-wider" onClick={handleAccessCode}>
            Connect
          </Button>
        </div>
      </div>
    );
  }

  // Step 2: Set location
  if (!eventLocation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Set Event Location</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Set GPS for <span className="text-primary font-semibold">{event.name}</span>. Students 500+ feet away earn: <span className="text-primary">{event.coupon_reward}</span>
            </p>
            <p className="text-xs font-mono text-muted-foreground/70">
              iPhone: Settings → Privacy → Location Services → Safari → "While Using"
            </p>
            <Button className="w-full font-mono uppercase tracking-wider" onClick={setCurrentLocation} disabled={settingLocation}>
              {settingLocation ? "Getting location..." : "Use Current Location"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Scanner dashboard
  return (
    <div className="flex min-h-screen flex-col bg-background p-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        {/* Scanner */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="text-center">
            <h2 className="text-lg font-bold text-primary">{event.name}</h2>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Scan Student ID</p>
          </div>
          <div className="relative overflow-hidden rounded-lg bg-secondary/30" style={{ maxHeight: 180 }}>
            <div id="barcode-reader" className="h-[180px] w-full" style={{ maxHeight: 180 }} />
            {scanFlash && (
              <div className={`absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300 rounded-lg ${
                scanFlash === "green"
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-destructive/20 border-2 border-destructive"
              }`}>
                <span className="text-5xl">{scanFlash === "green" ? "✅" : "❌"}</span>
              </div>
            )}
          </div>
          <p className="text-center text-xs font-mono text-muted-foreground">{scanHint}</p>
          {!scanning ? (
            <Button className="w-full font-mono uppercase tracking-wider gap-2" onClick={startScanner}>
              <Camera className="h-4 w-4" /> Start Scanner
            </Button>
          ) : (
            <Button className="w-full font-mono uppercase tracking-wider" variant="destructive" onClick={stopScanner}>
              Stop Scanner
            </Button>
          )}
        </div>

        {/* Result */}
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
          <div className="rounded-xl border border-destructive/50 bg-card p-6 text-center space-y-2">
            <p className="text-3xl">❌</p>
            <p className="text-lg font-bold text-foreground">Phone is Nearby</p>
            <p className="text-sm text-muted-foreground">
              {scanResult.studentName}'s phone is only <span className="text-destructive font-mono">{scanResult.distance} ft</span> away.
            </p>
          </div>
        )}

        {scanResult.status === "unavailable" && (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-2">
            <p className="text-3xl">⚠️</p>
            <p className="text-lg font-bold text-foreground">Location Unavailable</p>
            <p className="text-sm text-muted-foreground">
              {scanResult.studentName}'s app isn't sharing location.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-mono uppercase">Scanned</span>
            </div>
            <p className="text-3xl font-bold text-primary font-mono">{totalScans}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
              <Smartphone className="h-4 w-4" />
              <span className="text-xs font-mono uppercase">Phone-less</span>
            </div>
            <p className="text-3xl font-bold text-primary font-mono">{phonelessCount}</p>
          </div>
        </div>

        {/* Manual entry */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {!showManualEntry ? (
            <Button variant="outline" className="w-full gap-2 font-mono uppercase tracking-wider" onClick={() => setShowManualEntry(true)}>
              <Hash className="h-4 w-4" /> Manual ID Entry
            </Button>
          ) : (
            <>
              <Label className="text-xs font-mono uppercase text-muted-foreground">Student ID Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. 920145678"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkStudent(manualBarcode)}
                  className="font-mono bg-secondary border-border"
                />
                <Button onClick={() => checkStudent(manualBarcode)} className="font-mono uppercase">Check</Button>
              </div>
            </>
          )}
        </div>

        {/* Location */}
        <p className="text-xs font-mono text-muted-foreground/50 text-center">
          📍 {eventLocation.latitude.toFixed(4)}, {eventLocation.longitude.toFixed(4)}
          <button className="ml-2 text-primary hover:underline" onClick={() => setEventLocation(null)}>Change</button>
        </p>
      </div>
    </div>
  );
};

export default ScanPage;
