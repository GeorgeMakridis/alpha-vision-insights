import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { CardGradient } from "./ui/card-gradient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

interface VaRSummaryStatisticsProps {
  ticker: string;
  days?: number;
}

interface VaRSummaryStats {
  totalTests: number;
  violations: number;
  violationPercent: number;
  expectedViolations: number;
  lrStatistic: number;
  kupiecPass: boolean;
  avgExcessLoss: number;
}

export default function VaRSummaryStatistics({ ticker, days }: VaRSummaryStatisticsProps) {
  const ROLLING_WINDOW = 252;
  
  // Fetch VaR time-series data
  const { data: varTimeSeriesData, isLoading, error } = useQuery({
    queryKey: ['var-timeseries', ticker, days, ROLLING_WINDOW],
    queryFn: () => apiService.getVarTimeSeries(ticker, days, ROLLING_WINDOW),
    enabled: !!ticker,
  });

  // Calculate summary statistics from time-series data
  const calculateStats = (varType: 'parametric' | 'monteCarlo' | 'deep' | 'blnn', confidence: '95' | '99'): VaRSummaryStats | null => {
    if (!varTimeSeriesData?.timeseries || varTimeSeriesData.timeseries.length === 0) {
      return null;
    }

    const timeseries = varTimeSeriesData.timeseries;
    const totalTests = timeseries.length;
    
    // Get breach key based on var type and confidence
    // For deep and blnn, use camelCase: deepBreach95, blnnBreach95
    const breachKeyName = varType === 'deep' ? 'deepBreach' : varType === 'blnn' ? 'blnnBreach' : `${varType}Breach`;
    const breachKey = `${breachKeyName}${confidence}` as keyof typeof timeseries[0];
    
    // Get VaR key: deepVaR95, blnnVaR95, parametricVaR95, monteCarloVaR95
    const varKeyName = varType === 'deep' ? 'deepVaR' : varType === 'blnn' ? 'blnnVaR' : `${varType}VaR`;
    const varKey = `${varKeyName}${confidence}` as keyof typeof timeseries[0];
    const actualReturnKey = 'actualReturn' as keyof typeof timeseries[0];
    
    // Check if this VaR method has real data (not all zeros)
    // For DeepVaR and BLNNVaR, if all values are 0, they're not available yet
    const hasRealData = timeseries.some((day: any) => {
      const varValue = day[varKey];
      return varValue !== undefined && varValue !== null && varValue !== 0;
    });
    
    // If no real data (e.g., DeepVaR/BLNNVaR not connected), return null to show '-'
    if (!hasRealData && (varType === 'deep' || varType === 'blnn')) {
      return null;
    }
    
    // Count violations
    let violations = 0;
    let totalExcessLoss = 0;
    let violationCount = 0;
    
    timeseries.forEach((day: any) => {
      if (day[breachKey] === 1) {
        violations++;
        // Calculate excess loss: actual return - VaR threshold
        const actualReturn = day[actualReturnKey] / 100; // Convert percentage to decimal
        const varThreshold = day[varKey] / 100; // VaR is already negative, convert to decimal
        const excessLoss = actualReturn - varThreshold; // Both negative, so excess is more negative
        totalExcessLoss += excessLoss;
        violationCount++;
      }
    });
    
    const violationPercent = (violations / totalTests) * 100;
    const expectedViolations = totalTests * (confidence === '95' ? 0.05 : 0.01);
    
    // Calculate Kupiec LR Statistic
    const expectedProb = confidence === '95' ? 0.05 : 0.01;
    let lrStatistic = 0;
    if (violations > 0) {
      const violationRatio = violations / totalTests;
      lrStatistic = 2 * (
        violations * Math.log(violationRatio / expectedProb) +
        (totalTests - violations) * Math.log((1 - violationRatio) / (1 - expectedProb))
      );
    } else {
      // If no violations, calculate LR statistic for zero violations case
      // LR = 2 * totalTests * ln(1 / (1 - expectedProb))
      lrStatistic = 2 * totalTests * Math.log(1 / (1 - expectedProb));
    }
    
    // Kupiec test: PASS if LR < 3.8415 (chi-square critical value for 1 df at 95% confidence)
    const kupiecPass = lrStatistic < 3.8415;
    
    // Average excess loss (only for violations)
    const avgExcessLoss = violationCount > 0 ? (totalExcessLoss / violationCount) * 100 : 0;
    
    return {
      totalTests,
      violations,
      violationPercent,
      expectedViolations,
      lrStatistic,
      kupiecPass,
      avgExcessLoss,
    };
  };

  if (isLoading) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading VaR summary statistics...</p>
      </CardGradient>
    );
  }

  if (error) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-dashboard-negative">Error loading data: {error.message}</p>
      </CardGradient>
    );
  }

  if (!varTimeSeriesData?.timeseries || varTimeSeriesData.timeseries.length === 0) {
    return (
      <CardGradient className="h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available for {ticker}</p>
      </CardGradient>
    );
  }

  // Calculate statistics for all VaR methods and confidence levels
  const parametricStats95 = calculateStats('parametric', '95');
  const monteCarloStats95 = calculateStats('monteCarlo', '95');
  const deepStats95 = calculateStats('deep', '95');
  const blnnStats95 = calculateStats('blnn', '95');
  const parametricStats99 = calculateStats('parametric', '99');
  const monteCarloStats99 = calculateStats('monteCarlo', '99');
  const deepStats99 = calculateStats('deep', '99');
  const blnnStats99 = calculateStats('blnn', '99');

  return (
    <div className="space-y-6">
      {/* Summary Statistics Table */}
      <CardGradient>
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">VaR Summary Statistics</h3>
          <p className="text-sm text-muted-foreground">
            {days ? `Last ${days} days` : 'All available data'} | Rolling Window: {ROLLING_WINDOW} days
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Parametric VaR 95%</TableHead>
                <TableHead className="text-right">Monte Carlo VaR 95%</TableHead>
                <TableHead className="text-right">Deep VaR 95%</TableHead>
                <TableHead className="text-right">BLNNVaR 95%</TableHead>
                <TableHead className="text-right">Parametric VaR 99%</TableHead>
                <TableHead className="text-right">Monte Carlo VaR 99%</TableHead>
                <TableHead className="text-right">Deep VaR 99%</TableHead>
                <TableHead className="text-right">BLNNVaR 99%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Total Tests</TableCell>
                <TableCell className="text-right">{parametricStats95?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{monteCarloStats95?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{deepStats95?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{blnnStats95?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{parametricStats99?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{monteCarloStats99?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{deepStats99?.totalTests || '-'}</TableCell>
                <TableCell className="text-right">{blnnStats99?.totalTests || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Violations</TableCell>
                <TableCell className="text-right">{parametricStats95?.violations || '-'}</TableCell>
                <TableCell className="text-right">{monteCarloStats95?.violations || '-'}</TableCell>
                <TableCell className="text-right">{deepStats95?.violations || '-'}</TableCell>
                <TableCell className="text-right">{blnnStats95?.violations || '-'}</TableCell>
                <TableCell className="text-right">{parametricStats99?.violations || '-'}</TableCell>
                <TableCell className="text-right">{monteCarloStats99?.violations || '-'}</TableCell>
                <TableCell className="text-right">{deepStats99?.violations || '-'}</TableCell>
                <TableCell className="text-right">{blnnStats99?.violations || '-'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Violation %</TableCell>
                <TableCell className="text-right">
                  {parametricStats95 ? `${parametricStats95.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats95 ? `${monteCarloStats95.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats95 ? `${deepStats95.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats95 ? `${blnnStats95.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {parametricStats99 ? `${parametricStats99.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats99 ? `${monteCarloStats99.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats99 ? `${deepStats99.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats99 ? `${blnnStats99.violationPercent.toFixed(2)}%` : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Expected Violations</TableCell>
                <TableCell className="text-right">
                  {parametricStats95 ? parametricStats95.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats95 ? monteCarloStats95.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats95 ? deepStats95.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats95 ? blnnStats95.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {parametricStats99 ? parametricStats99.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats99 ? monteCarloStats99.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats99 ? deepStats99.expectedViolations.toFixed(1) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats99 ? blnnStats99.expectedViolations.toFixed(1) : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">LR Statistic</TableCell>
                <TableCell className="text-right">
                  {parametricStats95 ? parametricStats95.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats95 ? monteCarloStats95.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats95 ? deepStats95.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats95 ? blnnStats95.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {parametricStats99 ? parametricStats99.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats99 ? monteCarloStats99.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats99 ? deepStats99.lrStatistic.toFixed(4) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats99 ? blnnStats99.lrStatistic.toFixed(4) : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Kupiec Test</TableCell>
                <TableCell className="text-right">
                  {parametricStats95 ? (
                    <span className={parametricStats95.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {parametricStats95.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats95 ? (
                    <span className={monteCarloStats95.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {monteCarloStats95.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats95 ? (
                    <span className={deepStats95.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {deepStats95.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats95 ? (
                    <span className={blnnStats95.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {blnnStats95.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {parametricStats99 ? (
                    <span className={parametricStats99.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {parametricStats99.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats99 ? (
                    <span className={monteCarloStats99.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {monteCarloStats99.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats99 ? (
                    <span className={deepStats99.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {deepStats99.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats99 ? (
                    <span className={blnnStats99.kupiecPass ? 'text-dashboard-positive' : 'text-dashboard-negative'}>
                      {blnnStats99.kupiecPass ? 'PASS ✓' : 'FAIL ✗'}
                    </span>
                  ) : '-'}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Avg Excess Loss</TableCell>
                <TableCell className="text-right">
                  {parametricStats95 ? `${parametricStats95.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats95 ? `${monteCarloStats95.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats95 ? `${deepStats95.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats95 ? `${blnnStats95.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {parametricStats99 ? `${parametricStats99.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {monteCarloStats99 ? `${monteCarloStats99.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {deepStats99 ? `${deepStats99.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {blnnStats99 ? `${blnnStats99.avgExcessLoss.toFixed(4)}%` : '-'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardGradient>

    </div>
  );
}

