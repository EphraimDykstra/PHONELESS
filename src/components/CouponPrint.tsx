import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";

interface CouponPrintProps {
  studentName: string;
  couponCode: string;
  distance: number;
}

const CouponPrint = ({ studentName, couponCode, distance }: CouponPrintProps) => {
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
          <div className="rounded-lg border-2 border-dashed border-primary p-4 my-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Complimentary Snack Coupon</p>
            <p className="text-2xl font-bold font-mono mt-1">{couponCode}</p>
            <p className="text-sm font-medium mt-2">{studentName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Present this coupon to redeem one complimentary snack. One per scan.
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
