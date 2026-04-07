import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <Card className="border-primary print:border-2 print:shadow-none" id="coupon-printable">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-3xl">✅</p>
          <p className="text-lg font-semibold">Phone Away!</p>
          <p className="text-sm text-muted-foreground">
            {studentName}'s phone is {distance} feet away
          </p>
          <div className="rounded-lg border-2 border-dashed border-primary p-4 my-4 space-y-3">
            {couponImageUrl && (
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-lg">
                <img src={couponImageUrl} alt="Coupon branding" className="h-full w-full object-contain" />
              </div>
            )}
            {eventName && (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eventName}</p>
            )}
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{rewardText} Coupon</p>
            <p className="text-2xl font-bold font-mono">{couponCode}</p>
            <p className="text-sm font-medium">{studentName}</p>
            {couponText && (
              <p className="text-xs italic text-muted-foreground">{couponText}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Present this coupon to redeem: {rewardText}. One per scan.
          </p>
        </CardContent>
      </Card>

      <Button className="w-full print:hidden" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" /> Print Coupon
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
