import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Copy, Users, ScanLine, ToggleLeft, ToggleRight, Upload, Image } from "lucide-react";

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
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const eventsWithStats = await Promise.all(
        data.map(async (event) => {
          const { count: scanCount } = await supabase
            .from("scan_logs")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);
          const { count: couponCount } = await supabase
            .from("coupons")
            .select("*", { count: "exact", head: true })
            .eq("event_id", event.id);
          const { count: uniqueStudents } = await supabase
            .from("scan_logs")
            .select("student_id", { count: "exact", head: true })
            .eq("event_id", event.id);
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
    const { error } = await supabase.storage
      .from("coupon-images")
      .upload(fileName, file);
    if (error) {
      toast.error("Image upload failed");
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("coupon-images")
      .getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const createEvent = async () => {
    if (!newEventName.trim()) {
      toast.error("Enter an event name");
      return;
    }
    setLoading(true);
    const accessCode = generateAccessCode();

    let imageUrl: string | null = null;
    if (newCouponImage) {
      imageUrl = await uploadImage(newCouponImage);
    }

    const { error } = await supabase.from("events").insert({
      name: newEventName.trim(),
      access_code: accessCode,
      coupon_reward: newCouponReward.trim() || "Complimentary Snack",
      coupon_text: newCouponText.trim(),
      coupon_image_url: imageUrl,
    });
    if (error) {
      toast.error("Failed to create event");
    } else {
      toast.success(`Event created! Access code: ${accessCode}`);
      setNewEventName("");
      setNewCouponReward("Complimentary Snack");
      setNewCouponText("");
      setNewCouponImage(null);
      setImagePreview(null);
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
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle>🔒 Admin Access</CardTitle>
            <CardDescription>Enter the admin password to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button className="w-full" onClick={handleLogin}>Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">📵 Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Create events, generate staff access codes, and view stats</p>
        </div>

        {/* Create Event */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" /> Create New Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                placeholder="e.g. Study Hall Spring 2026"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Coupon Reward</Label>
              <Input
                placeholder="e.g. Free Cookie, Complimentary Smoothie"
                value={newCouponReward}
                onChange={(e) => setNewCouponReward(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">The snack or item the student receives</p>
            </div>
            <div className="space-y-2">
              <Label>Custom Coupon Message (optional)</Label>
              <Textarea
                placeholder="e.g. Thank you for staying focused! Enjoy your treat on us."
                value={newCouponText}
                onChange={(e) => setNewCouponText(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Extra text printed on the coupon</p>
            </div>
            <div className="space-y-2">
              <Label>Coupon Branding Image (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  {newCouponImage ? "Change Image" : "Upload Image"}
                </Button>
                {imagePreview && (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Logo or snack image shown on the printed coupon</p>
            </div>
            <Button className="w-full" onClick={createEvent} disabled={loading}>
              {loading ? "Creating..." : "Create Event & Generate Access Code"}
            </Button>
          </CardContent>
        </Card>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Your Events</h2>
          {events.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No events yet. Create one above!</p>
          )}
          {events.map((event) => (
            <Card key={event.id} className={!event.active ? "opacity-60" : ""}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {event.coupon_image_url && (
                      <div className="h-12 w-12 overflow-hidden rounded-lg border shrink-0">
                        <img src={event.coupon_image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-foreground">{event.name}</h3>
                      <p className="text-sm text-muted-foreground">🎁 {event.coupon_reward}</p>
                      {event.coupon_text && (
                        <p className="text-xs text-muted-foreground mt-1 italic">"{event.coupon_text}"</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEvent(event.id, event.active)}
                    className="gap-1"
                  >
                    {event.active ? (
                      <><ToggleRight className="h-4 w-4 text-primary" /> Active</>
                    ) : (
                      <><ToggleLeft className="h-4 w-4" /> Inactive</>
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <span className="text-xs text-muted-foreground">Staff Code:</span>
                  <code className="font-mono font-bold text-foreground">{event.access_code}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={() => copyCode(event.access_code)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs">Attendees</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{event.uniqueStudents}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <ScanLine className="h-3.5 w-3.5" />
                      <span className="text-xs">Scans</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{event.scanCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <span className="text-xs">🎟️</span>
                      <span className="text-xs">Coupons</span>
                    </div>
                    <p className="text-xl font-bold text-foreground">{event.couponCount}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {new Date(event.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
