import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Copy, Users, ScanLine, ToggleLeft, ToggleRight, Upload } from "lucide-react";

const ADMIN_PASSWORD = "password";

const AdminPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [newEventName, setNewEventName] = useState("");
  const [newCouponReward, setNewCouponReward] = useState("Complimentary Snack");
  const [newCouponText, setNewCouponText] = useState("");
  const [newCouponImage, setNewCouponImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authenticated) loadEvents();
  }, [authenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
    } else {
      toast.error("Incorrect password");
    }
  };

  const loadEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (data) {
      const eventsWithStats = await Promise.all(
        data.map(async (event) => {
          const { count: scanCount } = await supabase.from("scan_logs").select("*", { count: "exact", head: true }).eq("event_id", event.id);
          const { count: couponCount } = await supabase.from("coupons").select("*", { count: "exact", head: true }).eq("event_id", event.id);
          const { count: uniqueStudents } = await supabase.from("scan_logs").select("student_id", { count: "exact", head: true }).eq("event_id", event.id);
          return { ...event, scanCount: scanCount || 0, couponCount: couponCount || 0, uniqueStudents: uniqueStudents || 0 };
        })
      );
      setEvents(eventsWithStats);
    }
  };

  const generateAccessCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCouponImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("coupon-images").upload(fileName, file);
    if (error) { toast.error("Image upload failed"); return null; }
    const { data: urlData } = supabase.storage.from("coupon-images").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const createEvent = async () => {
    if (!newEventName.trim()) { toast.error("Enter an event name"); return; }
    setLoading(true);
    const accessCode = generateAccessCode();
    let imageUrl: string | null = null;
    if (newCouponImage) { imageUrl = await uploadImage(newCouponImage); }

    const { error } = await supabase.from("events").insert({
      name: newEventName.trim(),
      access_code: accessCode,
      coupon_reward: newCouponReward.trim() || "Complimentary Snack",
      coupon_text: newCouponText.trim(),
      coupon_image_url: imageUrl,
    });
    if (error) { toast.error("Failed to create event"); }
    else {
      toast.success(`Event created! Code: ${accessCode}`);
      setNewEventName(""); setNewCouponReward("Complimentary Snack"); setNewCouponText(""); setNewCouponImage(null); setImagePreview(null);
      loadEvents();
    }
    setLoading(false);
  };

  const toggleEvent = async (eventId: string, currentActive: boolean) => {
    await supabase.from("events").update({ active: !currentActive }).eq("id", eventId);
    loadEvents();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Access code copied!");
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-foreground">Admin Access</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter password to continue</p>
          </div>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="bg-secondary border-border"
          />
          <Button className="w-full font-mono uppercase tracking-wider" onClick={handleLogin}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-primary text-glow tracking-tight">ADMIN</h1>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Create events · Generate codes · View stats</p>
        </div>

        {/* Create Event */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Create New Event</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Event Name</Label>
              <Input placeholder="e.g. Study Hall Spring 2026" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Coupon Reward</Label>
              <Input placeholder="e.g. Free Cookie" value={newCouponReward} onChange={(e) => setNewCouponReward(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Custom Message (optional)</Label>
              <Textarea placeholder="Thank you for staying focused!" value={newCouponText} onChange={(e) => setNewCouponText(e.target.value)} rows={3} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Branding Image (optional)</Label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              <div className="flex items-center gap-3">
                <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} className="gap-2 font-mono text-xs uppercase">
                  <Upload className="h-4 w-4" /> {newCouponImage ? "Change" : "Upload"}
                </Button>
                {imagePreview && (
                  <div className="h-14 w-14 overflow-hidden rounded-lg border border-border">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>
            <Button className="w-full font-mono uppercase tracking-wider" onClick={createEvent} disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Your Events</h2>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 font-mono">No events yet.</p>
          )}
          {events.map((event) => (
            <div key={event.id} className={`rounded-xl border border-border bg-card p-5 space-y-4 ${!event.active ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {event.coupon_image_url && (
                    <div className="h-12 w-12 overflow-hidden rounded-lg border border-border shrink-0">
                      <img src={event.coupon_image_url} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-foreground">{event.name}</h3>
                    <p className="text-sm text-primary">{event.coupon_reward}</p>
                    {event.coupon_text && <p className="text-xs text-muted-foreground mt-1 italic">"{event.coupon_text}"</p>}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleEvent(event.id, event.active)} className="gap-1 font-mono text-xs uppercase">
                  {event.active ? <><ToggleRight className="h-4 w-4 text-primary" /> Active</> : <><ToggleLeft className="h-4 w-4" /> Off</>}
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-secondary p-3">
                <span className="text-xs font-mono text-muted-foreground">CODE:</span>
                <code className="font-mono font-bold text-primary tracking-widest">{event.access_code}</code>
                <button className="ml-auto text-muted-foreground hover:text-primary transition-colors" onClick={() => copyCode(event.access_code)}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: <Users className="h-3.5 w-3.5" />, label: "Attendees", value: event.uniqueStudents },
                  { icon: <ScanLine className="h-3.5 w-3.5" />, label: "Scans", value: event.scanCount },
                  { icon: <span className="text-xs">🎟️</span>, label: "Coupons", value: event.couponCount },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-secondary p-3">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      {stat.icon}
                      <span className="text-xs font-mono uppercase">{stat.label}</span>
                    </div>
                    <p className="text-xl font-bold text-primary font-mono">{stat.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs font-mono text-muted-foreground/50">
                Created {new Date(event.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
