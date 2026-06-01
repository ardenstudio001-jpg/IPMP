'use client';

import { useEffect, useState } from 'react';
import type { Product } from '@/lib/api/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ApprovalPanelProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (product: Product, finalSellingPrice: number) => void;
  isApproving?: boolean;
}

function defaultFinalPrice(product: Product): string {
  const raw =
    product.finalSellingPrice ?? product.minimum20Percent ?? '0';
  const num = parseFloat(String(raw));
  return Number.isNaN(num) ? '0' : num.toFixed(2);
}

export function ApprovalPanel({
  product,
  open,
  onOpenChange,
  onApprove,
  isApproving = false,
}: ApprovalPanelProps) {
  const [finalPriceInput, setFinalPriceInput] = useState('');

  useEffect(() => {
    if (product) {
      setFinalPriceInput(defaultFinalPrice(product));
    }
  }, [product?.id, product?.finalSellingPrice, product?.minimum20Percent]);

  if (!product) return null;

  const breakdown = [
    { label: 'Unit Cost Price', value: product.unitCostPrice },
    { label: 'Total Cost Price', value: product.totalCostPrice },
    { label: 'Investment Fund', value: product.investmentFund },
    { label: 'Operation Profit', value: product.operationProfit },
    { label: 'Net Profit', value: product.netProfit },
    { label: 'Payroll Fund', value: product.payrollFund },
    { label: 'Other Costs', value: product.otherCosts },
    { label: 'Gross Profit', value: product.grossProfit },
    { label: 'Price Before Tax', value: product.priceBeforeTax },
    { label: 'Minimum @ 20%', value: product.minimum20Percent },
    { label: 'Minimum @ 4%', value: product.minimum4Percent },
  ];

  const showApprove = product.status === 'COSTING_COMPLETED' && onApprove;
  const parsedFinalPrice = parseFloat(finalPriceInput);
  const canSubmitApprove =
    !Number.isNaN(parsedFinalPrice) && parsedFinalPrice >= 0;

  const handleApprove = () => {
    if (!onApprove || !canSubmitApprove) return;
    onApprove(product, parsedFinalPrice);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-md">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4 pt-6">
            <SheetHeader className="space-y-3 pr-10 text-left">
              <SheetTitle>{product.name}</SheetTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={product.status} />
                {product.sku && (
                  <span className="text-sm text-muted-foreground">SKU: {product.sku}</span>
                )}
              </div>
            </SheetHeader>

            <Separator />

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-secondary">Pricing Breakdown</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cost Price → Profit Layers → Taxes → Final Minimum Price
                </p>
              </div>
              <div className="space-y-1">
                {breakdown.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{formatCurrency(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {showApprove && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-4">
                <Label htmlFor="approval-final-price">Final Selling Price</Label>
                <Input
                  id="approval-final-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={finalPriceInput}
                  onChange={(e) => setFinalPriceInput(e.target.value)}
                  disabled={isApproving}
                />
                <p className="text-xs text-muted-foreground">
                  Defaults to minimum @ 20% ({formatCurrency(product.minimum20Percent)}).
                </p>
              </div>
            )}

            {!showApprove && product.finalSellingPrice && (
              <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Final Selling Price</span>
                <span className="font-medium">{formatCurrency(product.finalSellingPrice)}</span>
              </div>
            )}
          </div>

          {showApprove && (
            <div className="shrink-0 border-t border-border px-6 py-4">
              <Button
                className="w-full"
                onClick={handleApprove}
                disabled={isApproving || !canSubmitApprove}
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving…
                  </>
                ) : (
                  'Approve Product'
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
