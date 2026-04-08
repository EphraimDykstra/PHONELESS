import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface CouponPrintProps {
  studentName: string;
  couponCode: string;
  distance: number;
  rewardText?: string;
  eventName?: string;
  couponText?: string;
  couponImageUrl?: string | null;
}

const CouponPrint = ({
  studentName,
  couponCode,
  distance,
  rewardText = "Complimentary Snack",
  eventName,
  couponText,
  couponImageUrl,
}: CouponPrintProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="rounded-xl border-2 border-primary bg-card p-6 text-center space-y-3 border-glow" id="coupon-printable">
        <p className="text-3xl">✅</p>
        <p className="text-lg font-bold text-primary">Phone Away!</p>
        <p className="text-sm text-muted-foreground">
          {studentName}'s phone is <span className="font-mono text-primary">{distance} ft</span> away
        </p>
        <div className="rounded-lg border border-dashed border-primary/50 p-4 my-4 space-y-3">
          {couponImageUrl && (
            <div className="mx-auto h-20 w-20 overflow-hidden rounded-lg">
              <img src={couponImageUrl} alt="Coupon branding" className="h-full w-full object-contain" />
            </div>
          )}
          {eventName && (
            <p className="text-xs font-mono font-semibold uppercase tracking-widest text-primary">{eventName}</p>
          )}
          <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{rewardText} Coupon</p>
          <p className="text-2xl font-bold font-mono text-foreground">{couponCode}</p>
          <p className="text-sm font-medium text-foreground">{studentName}</p>
          {couponText && <p className="text-xs italic text-muted-foreground">{couponText}</p>}
          <p className="text-xs font-mono text-muted-foreground/50">
            {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Present this coupon to redeem: {rewardText}. One per scan.
        </p>
      </div>

      <Button className="w-full print:hidden font-mono uppercase tracking-wider gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" /> Print Coupon
      </Button>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #coupon-printable, #coupon-printable * { visibility: visible; }
          #coupon-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 8mm;
          }
        }
      `}</style>
    </>
  );
};

export default CouponPrint;
