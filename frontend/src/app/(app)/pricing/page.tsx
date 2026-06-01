'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useActivePricing, usePricingMutations } from '@/hooks/queries/use-pricing';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';

const FIELDS = [
  { key: 'investmentFundRate', label: 'Investment Fund Rate' },
  { key: 'operationProfitRate', label: 'Operation Profit Rate' },
  { key: 'netProfitRateOfOP', label: 'Net Profit Rate' },
  { key: 'payrollRateOfOPMinusNP', label: 'Payroll Rate' },
  { key: 'otherCostsRateOfOPMinusNP', label: 'Other Costs Rate' },
  { key: 'salesTaxRate20', label: 'Sales Tax 20%' },
  { key: 'salesTaxRate4', label: 'Sales Tax 4%' },
] as const;

type RateKey = (typeof FIELDS)[number]['key'];

export default function PricingPage() {
  const { data: active, isLoading } = useActivePricing();
  const { create } = usePricingMutations();
  const [rates, setRates] = useState<Record<RateKey, number>>({
    investmentFundRate: 0.05,
    operationProfitRate: 0.15,
    netProfitRateOfOP: 0.3,
    payrollRateOfOPMinusNP: 0.2,
    otherCostsRateOfOPMinusNP: 0.1,
    salesTaxRate20: 0.2,
    salesTaxRate4: 0.04,
  });
  const [sampleCost, setSampleCost] = useState(100);

  useEffect(() => {
    if (active) {
      setRates({
        investmentFundRate: parseFloat(active.investmentFundRate),
        operationProfitRate: parseFloat(active.operationProfitRate),
        netProfitRateOfOP: parseFloat(active.netProfitRateOfOP),
        payrollRateOfOPMinusNP: parseFloat(active.payrollRateOfOPMinusNP),
        otherCostsRateOfOPMinusNP: parseFloat(active.otherCostsRateOfOPMinusNP),
        salesTaxRate20: parseFloat(active.salesTaxRate20),
        salesTaxRate4: parseFloat(active.salesTaxRate4),
      });
    }
  }, [active]);

  const cp = sampleCost;
  const ifAmount = cp * rates.investmentFundRate;
  const op = cp * rates.operationProfitRate;
  const np = op * rates.netProfitRateOfOP;
  const opMinusNp = op - np;
  const payroll = opMinusNp * rates.payrollRateOfOPMinusNP;
  const other = opMinusNp * rates.otherCostsRateOfOPMinusNP;
  const gp2 = ifAmount + op;
  const pbt = cp + gp2;
  const min20 = pbt * (1 + rates.salesTaxRate20);
  const min4 = pbt * (1 + rates.salesTaxRate4);

  const handleSave = () => {
    create.mutate({ ...rates, name: `Config ${new Date().toLocaleDateString()}` });
  };

  if (isLoading) {
    return (
      <AppShell title="Pricing Formula" allowedRoles={['ADMIN']}>
        <Skeleton className="h-96 w-full" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Pricing Formula" allowedRoles={['ADMIN']}>
      <div className="mb-4 flex items-center gap-2">
        <Badge variant="success">Active Configuration</Badge>
        {active?.name && (
          <span className="text-sm text-muted-foreground">{active.name}</span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Formula Configuration</CardTitle>
            <CardDescription>Manage pricing percentages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <Label className="shrink-0">{label}</Label>
                  <span className="text-sm font-medium text-primary">
                    {(rates[key] * 100).toFixed(1)}%
                  </span>
                  <Input
                    className="max-w-[120px]"
                    type="number"
                    step="0.0001"
                    min={0}
                    max={1}
                    value={rates[key]}
                    onChange={(e) =>
                      setRates((prev) => ({
                        ...prev,
                        [key]: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </div>
            ))}
            <Button onClick={handleSave} disabled={create.isPending} className="w-full">
              Save Configuration
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live Formula Preview</CardTitle>
            <CardDescription>Cost → Profit Layers → Taxes → Final Minimum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sample Cost Price</Label>
              <Input
                type="number"
                value={sampleCost}
                onChange={(e) => setSampleCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              {[
                { label: 'Cost Price (CP)', value: cp },
                { label: '+ Investment Fund', value: ifAmount },
                { label: '+ Operation Profit', value: op },
                { label: 'Net Profit (NP)', value: np },
                { label: 'Payroll Fund', value: payroll },
                { label: 'Other Costs', value: other },
                { label: 'Gross Profit (GP2)', value: gp2 },
                { label: 'Price Before Tax (PBT)', value: pbt },
                { label: 'Minimum @ 20%', value: min20 },
                { label: 'Minimum @ 4%', value: min4 },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className={`flex justify-between ${i === 0 ? 'font-semibold' : ''} ${
                    i >= 8 ? 'font-semibold text-secondary' : 'text-muted-foreground'
                  }`}
                >
                  <span>{row.label}</span>
                  <span>{formatCurrency(row.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
