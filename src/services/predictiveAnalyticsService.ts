/**
 * PREDICTIVE ANALYTICS SERVICE FOR SAFETY TRENDS - REFACTORED FOR BACKEND API
 * Advanced machine learning algorithms for predicting safety incidents and trends
 * Features: Time series analysis, pattern recognition, anomaly detection, forecasting
 * 
 * REFACTORED: All AI processing now happens on backend for mobile compatibility
 */

interface SafetyDataPoint {
  timestamp: number;
  location: string;
  incidentCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  environmentalFactors: {
    weather?: string;
    temperature?: number;
    humidity?: number;
    season?: string;
  };
  workforceFactors: {
    workersPresent?: number;
    experienceLevel?: number;
    trainingHours?: number;
    fatigueLevel?: number;
  };
  operationalFactors: {
    workType?: string;
    equipmentUsage?: string[];
    safetyMeasures?: string[];
    supervision?: boolean;
  };
}

interface PredictionResult {
  prediction_id: string;
  timestamp: number;
  timeframe: string; // e.g., "next_7_days", "next_month"
  predictions: Array<{
    metric: string;
    predicted_value: number;
    confidence_interval: [number, number];
    confidence_level: number; // 0-100
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    contributing_factors: string[];
    mitigation_recommendations: string[];
  }>;
  trend_analysis: {
    direction: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    magnitude: number;
    significance: number;
    seasonal_patterns: string[];
  };
  anomaly_detection: {
    anomalies_detected: boolean;
    anomaly_score: number;
    anomalous_factors: string[];
    investigation_recommended: boolean;
  };
  actionable_insights: {
    immediate_actions: string[];
    preventive_measures: string[];
    monitoring_recommendations: string[];
    resource_allocation: string[];
  };
}

interface TrendForecast {
  forecast_period: string;
  data_quality_score: number;
  historical_accuracy: number;
  forecasts: Array<{
    date: string;
    predicted_incidents: number;
    severity_distribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    location_hotspots: Array<{
      location: string;
      risk_score: number;
      expected_incidents: number;
    }>;
    category_breakdown: Array<{
      category: string;
      predicted_count: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
  }>;
  uncertainty_factors: string[];
  model_confidence: number;
}

/**
 * Helper function for predictive analytics API calls
 */
const callAnalyticsAPI = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`/api/ai${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Predictive analytics API call failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Predictive analytics API call failed for ${endpoint}:`, error);
    return {
      error: 'Predictive analytics service temporarily unavailable',
      fallback: true
    };
  }
};

export class PredictiveAnalyticsService {
  /**
   * Generate comprehensive safety predictions
   */
  async generateSafetyPredictions(historicalData: SafetyDataPoint[], timeframe: string = '30-days'): Promise<PredictionResult> {
    const predictionData = {
      historical_data: historicalData,
      timeframe,
      prediction_type: 'comprehensive'
    };

    return callAnalyticsAPI('/safety-predictions', predictionData);
  }

  /**
   * Forecast incident trends
   */
  async forecastIncidentTrends(data: SafetyDataPoint[], forecastPeriod: string): Promise<TrendForecast> {
    const forecastData = {
      data,
      forecast_period: forecastPeriod,
      analysis_type: 'trend_forecast'
    };

    return callAnalyticsAPI('/incident-forecast', forecastData);
  }

  /**
   * Detect anomalies in safety data
   */
  async detectAnomalies(currentData: SafetyDataPoint[], baselineData: SafetyDataPoint[]): Promise<any> {
    const anomalyData = {
      current_data: currentData,
      baseline_data: baselineData,
      detection_type: 'anomaly'
    };

    return callAnalyticsAPI('/detect-anomalies', anomalyData);
  }

  /**
   * Risk scoring and assessment
   */
  async calculateRiskScores(location: string, activityType: string, conditions: any): Promise<any> {
    const riskData = {
      location,
      activity_type: activityType,
      conditions,
      calculation_type: 'risk_score'
    };

    return callAnalyticsAPI('/risk-scores', riskData);
  }

  /**
   * Seasonal pattern analysis
   */
  async analyzeSeasonalPatterns(data: SafetyDataPoint[], years: number = 3): Promise<any> {
    const seasonalData = {
      data,
      years,
      analysis_type: 'seasonal_patterns'
    };

    return callAnalyticsAPI('/seasonal-analysis', seasonalData);
  }

  /**
   * Leading indicators analysis
   */
  async analyzeLeadingIndicators(metrics: any[], incidents: any[]): Promise<any> {
    const indicatorData = {
      metrics,
      incidents,
      analysis_type: 'leading_indicators'
    };

    return callAnalyticsAPI('/leading-indicators', indicatorData);
  }

  /**
   * Resource allocation optimization
   */
  async optimizeResourceAllocation(availableResources: any[], riskAreas: any[]): Promise<any> {
    const optimizationData = {
      available_resources: availableResources,
      risk_areas: riskAreas,
      optimization_type: 'resource_allocation'
    };

    return callAnalyticsAPI('/optimize-resources', optimizationData);
  }

  /**
   * Predictive maintenance recommendations
   */
  async predictMaintenanceNeeds(equipmentData: any[], usagePatterns: any[]): Promise<any> {
    const maintenanceData = {
      equipment_data: equipmentData,
      usage_patterns: usagePatterns,
      prediction_type: 'maintenance'
    };

    return callAnalyticsAPI('/predict-maintenance', maintenanceData);
  }

  /**
   * Training effectiveness prediction
   */
  async predictTrainingEffectiveness(trainingData: any[], performanceMetrics: any[]): Promise<any> {
    const trainingAnalysisData = {
      training_data: trainingData,
      performance_metrics: performanceMetrics,
      analysis_type: 'training_effectiveness'
    };

    return callAnalyticsAPI('/training-effectiveness', trainingAnalysisData);
  }

  /**
   * Cost-benefit analysis for safety investments
   */
  async analyzeCostBenefit(investments: any[], expectedOutcomes: any[]): Promise<any> {
    const costBenefitData = {
      investments,
      expected_outcomes: expectedOutcomes,
      analysis_type: 'cost_benefit'
    };

    return callAnalyticsAPI('/cost-benefit-analysis', costBenefitData);
  }

  /**
   * Real-time risk monitoring
   */
  async monitorRealTimeRisk(currentConditions: any, historicalBaseline: SafetyDataPoint[]): Promise<any> {
    const monitoringData = {
      current_conditions: currentConditions,
      historical_baseline: historicalBaseline,
      monitoring_type: 'real_time_risk'
    };

    return callAnalyticsAPI('/monitor-risk', monitoringData);
  }

  /**
   * Generate predictive insights report
   */
  async generateInsightsReport(analysisResults: any[]): Promise<any> {
    const reportData = {
      analysis_results: analysisResults,
      report_type: 'insights'
    };

    return callAnalyticsAPI('/insights-report', reportData);
  }
}

// Export singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();

// Export individual functions for backward compatibility
export const generateSafetyPredictions = (data: SafetyDataPoint[], timeframe?: string) => {
  return predictiveAnalyticsService.generateSafetyPredictions(data, timeframe);
};

export const forecastIncidentTrends = (data: SafetyDataPoint[], period: string) => {
  return predictiveAnalyticsService.forecastIncidentTrends(data, period);
};

export const detectAnomalies = (current: SafetyDataPoint[], baseline: SafetyDataPoint[]) => {
  return predictiveAnalyticsService.detectAnomalies(current, baseline);
};

export const calculateRiskScores = (location: string, activity: string, conditions: any) => {
  return predictiveAnalyticsService.calculateRiskScores(location, activity, conditions);
};

export const analyzeSeasonalPatterns = (data: SafetyDataPoint[], years?: number) => {
  return predictiveAnalyticsService.analyzeSeasonalPatterns(data, years);
};

export const optimizeResourceAllocation = (resources: any[], riskAreas: any[]) => {
  return predictiveAnalyticsService.optimizeResourceAllocation(resources, riskAreas);
};

interface PredictionModel {
  modelType: 'time_series' | 'regression' | 'classification' | 'ensemble';
  accuracy: number;
  confidence: number;
  trainingData: number; // Number of data points
  lastUpdated: number;
  features: string[];
  parameters: Record<string, number>;
}

interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  correlation: number;
  seasonality: {
    detected: boolean;
    pattern?: string;
    strength?: number;
    peaks?: string[];
  };
  anomalies: Array<{
    timestamp: number;
    value: number;
    severity: 'minor' | 'major' | 'critical';
    description: string;
    potential_causes: string[];
  }>;
  changePoints: Array<{
    timestamp: number;
    significance: number;
    description: string;
    contributing_factors: string[];
  }>;
}

interface SafetyForecast {
  timeframe: string;
  predictions: Array<{
    date: string;
    predicted_incidents: number;
    confidence_interval: {
      lower: number;
      upper: number;
    };
    risk_factors: string[];
    severity_distribution: Record<string, number>;
  }>;
  scenarios: Array<{
    name: string;
    probability: number;
    description: string;
    expected_incidents: number;
    mitigation_strategies: string[];
  }>;
  early_warning_indicators: Array<{
    indicator: string;
    current_value: number;
    threshold: number;
    alert_level: 'green' | 'yellow' | 'red';
    trend: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    timeframe: string;
  }>;
}

interface RiskHotspot {
  location: string;
  risk_score: number;
  predicted_incidents: number;
  contributing_factors: Array<{
    factor: string;
    weight: number;
    trend: string;
  }>;
  intervention_recommendations: string[];
  monitoring_requirements: string[];
}

interface PerformanceMetrics {
  prediction_accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  precision: number;
  recall: number;
  f1_score: number;
  model_drift: number;
  last_evaluation: number;
}

interface SafetyKPI {
  name: string;
  current_value: number;
  target_value: number;
  trend: 'improving' | 'declining' | 'stable';
  prediction_30_days: number;
  prediction_90_days: number;
  factors_influencing: Array<{
    factor: string;
    impact: number;
    controllable: boolean;
  }>;
}

class PredictiveAnalyticsService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private initialized = false;
  private predictionModels: Map<string, PredictionModel> = new Map();
  private historicalData: SafetyDataPoint[] = [];

  constructor() {
    this.initializeAI();
    this.loadHistoricalData();
  }

  private async initializeAI(): Promise<void> {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('🤖 Gemini API key not found - Predictive Analytics will use statistical models');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 4096,
        },
      });
      
      this.initialized = true;
      console.log('✅ Predictive Analytics Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Predictive Analytics AI:', error);
    }
  }

  private loadHistoricalData(): void {
    // Generate mock historical data for the last 12 months
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (let i = 0; i < 365; i++) {
      const timestamp = now - (i * msPerDay);
      const date = new Date(timestamp);
      
      // Simulate seasonal patterns and trends
      const seasonality = Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.3;
      const weekday_effect = date.getDay() === 0 || date.getDay() === 6 ? 0.5 : 1.0;
      const base_incidents = 2 + seasonality + Math.random() * 2;
      
      const dataPoint: SafetyDataPoint = {
        timestamp,
        location: this.randomLocation(),
        incidentCount: Math.max(0, Math.floor(base_incidents * weekday_effect)),
        severity: this.randomSeverity(),
        category: this.randomCategory(),
        environmentalFactors: {
          weather: this.randomWeather(),
          temperature: 15 + Math.random() * 20,
          humidity: 40 + Math.random() * 40,
          season: this.getSeason(date)
        },
        operationalFactors: {
          workload: 0.6 + Math.random() * 0.4,
          staffingLevel: 0.8 + Math.random() * 0.2,
          equipmentAge: Math.random() * 10,
          maintenanceStatus: Math.random() > 0.8 ? 'overdue' : 'current'
        },
        humanFactors: {
          trainingScore: 70 + Math.random() * 30,
          experience: Math.random() * 20,
          fatigue: Math.random(),
          compliance: 0.7 + Math.random() * 0.3
        }
      };
      
      this.historicalData.push(dataPoint);
    }
    
    console.log(`📊 Loaded ${this.historicalData.length} historical data points`);
  }

  async analyzeTrends(timeframe: number = 90): Promise<TrendAnalysis> {
    const recentData = this.getDataInTimeframe(timeframe);
    
    if (recentData.length < 10) {
      throw new Error('Insufficient data for trend analysis');
    }

    const incidents = recentData.map(d => d.incidentCount);
    const timestamps = recentData.map(d => d.timestamp);

    return {
      trend: this.calculateTrend(incidents),
      slope: this.calculateSlope(timestamps, incidents),
      correlation: this.calculateCorrelation(timestamps, incidents),
      seasonality: this.detectSeasonality(recentData),
      anomalies: this.detectAnomalies(recentData),
      changePoints: this.detectChangePoints(recentData)
    };
  }

  async generateForecast(timeframe_days: number = 30): Promise<SafetyForecast> {
    try {
      const trendAnalysis = await this.analyzeTrends();
      const predictions = this.generatePredictions(timeframe_days, trendAnalysis);
      
      if (this.initialized && this.model) {
        const aiEnhancement = await this.enhanceWithAI(predictions, trendAnalysis);
        return this.combinePredictions(predictions, aiEnhancement);
      }
      
      return this.generateBaseForecast(predictions, trendAnalysis);
    } catch (error) {
      console.error('Forecast generation failed:', error);
      return this.generateFallbackForecast(timeframe_days);
    }
  }

  private async enhanceWithAI(predictions: any, trends: TrendAnalysis): Promise<any> {
    const prompt = `As a predictive analytics expert, enhance this safety forecast with AI insights:

CURRENT TRENDS:
Trend Direction: ${trends.trend}
Slope: ${trends.slope}
Anomalies Detected: ${trends.anomalies.length}
Seasonality: ${trends.seasonality.detected ? trends.seasonality.pattern : 'None detected'}

HISTORICAL PATTERNS:
Recent incident average: ${this.calculateAverage(this.historicalData.slice(0, 30).map(d => d.incidentCount))}
Peak incidents months: ${trends.seasonality.peaks?.join(', ') || 'No clear pattern'}

Please provide enhanced forecast in JSON format:
{
  "scenarios": [
    {
      "name": "Optimistic Scenario",
      "probability": 0.3,
      "description": "Best case with all interventions working",
      "expected_incidents": 15,
      "mitigation_strategies": ["strategy1", "strategy2"]
    },
    {
      "name": "Realistic Scenario", 
      "probability": 0.5,
      "description": "Expected outcome based on current trends",
      "expected_incidents": 22,
      "mitigation_strategies": ["strategy1", "strategy2"]
    },
    {
      "name": "Pessimistic Scenario",
      "probability": 0.2,
      "description": "Worst case if trends continue",
      "expected_incidents": 35,
      "mitigation_strategies": ["emergency_measures"]
    }
  ],
  "early_warning_indicators": [
    {
      "indicator": "Near miss reporting rate",
      "current_value": 15.2,
      "threshold": 20.0,
      "alert_level": "yellow",
      "trend": "increasing"
    }
  ],
  "recommendations": [
    {
      "action": "Implement targeted safety interventions",
      "impact": 0.25,
      "priority": "high", 
      "timeframe": "immediate"
    }
  ]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const aiText = response.text();
      
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (error) {
      console.error('AI enhancement failed:', error);
      return {};
    }
  }

  async identifyRiskHotspots(analysis_window_days: number = 30): Promise<RiskHotspot[]> {
    const locationRisks = new Map<string, SafetyDataPoint[]>();
    const recentData = this.getDataInTimeframe(analysis_window_days);
    
    // Group data by location
    recentData.forEach(point => {
      if (!locationRisks.has(point.location)) {
        locationRisks.set(point.location, []);
      }
      locationRisks.get(point.location)!.push(point);
    });

    const hotspots: RiskHotspot[] = [];

    locationRisks.forEach((data, location) => {
      const totalIncidents = data.reduce((sum, d) => sum + d.incidentCount, 0);
      const avgSeverity = this.calculateSeverityScore(data);
      const riskScore = this.calculateLocationRisk(data);
      
      if (riskScore > 60) { // High risk threshold
        hotspots.push({
          location,
          risk_score: riskScore,
          predicted_incidents: this.predictLocationIncidents(data),
          contributing_factors: this.analyzeContributingFactors(data),
          intervention_recommendations: this.generateLocationRecommendations(data),
          monitoring_requirements: this.defineMonitoringRequirements(location, riskScore)
        });
      }
    });

    return hotspots.sort((a, b) => b.risk_score - a.risk_score);
  }

  async evaluateModelPerformance(): Promise<PerformanceMetrics> {
    // Simulate model evaluation metrics
    return {
      prediction_accuracy: 0.82,
      false_positive_rate: 0.15,
      false_negative_rate: 0.12,
      precision: 0.78,
      recall: 0.85,
      f1_score: 0.81,
      model_drift: 0.08,
      last_evaluation: Date.now()
    };
  }

  async predictSafetyKPIs(kpi_names: string[]): Promise<SafetyKPI[]> {
    const kpis: SafetyKPI[] = [];
    
    kpi_names.forEach(name => {
      const currentValue = this.calculateCurrentKPI(name);
      const trend = this.calculateKPITrend(name);
      
      kpis.push({
        name,
        current_value: currentValue,
        target_value: this.getKPITarget(name),
        trend,
        prediction_30_days: this.predictKPI(name, 30),
        prediction_90_days: this.predictKPI(name, 90),
        factors_influencing: this.identifyKPIFactors(name)
      });
    });

    return kpis;
  }

  // Utility Methods
  private getDataInTimeframe(days: number): SafetyDataPoint[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.historicalData.filter(d => d.timestamp >= cutoff);
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    const change = (secondAvg - firstAvg) / firstAvg;
    const volatility = this.calculateVolatility(values);
    
    if (volatility > 0.3) return 'volatile';
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateSlope(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private detectSeasonality(data: SafetyDataPoint[]): TrendAnalysis['seasonality'] {
    // Simple seasonality detection based on monthly patterns
    const monthlyData = new Map<number, number[]>();
    
    data.forEach(point => {
      const month = new Date(point.timestamp).getMonth();
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(point.incidentCount);
    });

    const monthlyAverages = Array.from(monthlyData.entries()).map(([month, incidents]) => ({
      month,
      average: this.calculateAverage(incidents)
    }));

    if (monthlyAverages.length < 4) {
      return { detected: false };
    }

    const maxAvg = Math.max(...monthlyAverages.map(m => m.average));
    const minAvg = Math.min(...monthlyAverages.map(m => m.average));
    const variation = (maxAvg - minAvg) / minAvg;

    return {
      detected: variation > 0.2,
      pattern: variation > 0.2 ? 'Monthly variation detected' : undefined,
      strength: variation,
      peaks: monthlyAverages
        .filter(m => m.average > (maxAvg * 0.8))
        .map(m => new Date(2024, m.month).toLocaleDateString('en-US', { month: 'long' }))
    };
  }

  private detectAnomalies(data: SafetyDataPoint[]): TrendAnalysis['anomalies'] {
    const incidents = data.map(d => d.incidentCount);
    const mean = this.calculateAverage(incidents);
    const std = this.calculateStandardDeviation(incidents);
    
    return data
      .map((point, i) => ({
        point,
        zScore: Math.abs((point.incidentCount - mean) / std)
      }))
      .filter(({ zScore }) => zScore > 2) // 2 standard deviations
      .map(({ point, zScore }) => ({
        timestamp: point.timestamp,
        value: point.incidentCount,
        severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'major' : 'minor',
        description: `Unusual incident spike: ${point.incidentCount} incidents (${zScore.toFixed(2)} σ from mean)`,
        potential_causes: this.identifyAnomalyCauses(point)
      }));
  }

  private detectChangePoints(data: SafetyDataPoint[]): TrendAnalysis['changePoints'] {
    // Simple change point detection using moving averages
    const windowSize = 7;
    const changePoints: TrendAnalysis['changePoints'] = [];
    
    for (let i = windowSize; i < data.length - windowSize; i++) {
      const before = data.slice(i - windowSize, i).map(d => d.incidentCount);
      const after = data.slice(i, i + windowSize).map(d => d.incidentCount);
      
      const avgBefore = this.calculateAverage(before);
      const avgAfter = this.calculateAverage(after);
      const change = Math.abs(avgAfter - avgBefore) / avgBefore;
      
      if (change > 0.3) { // Significant change threshold
        changePoints.push({
          timestamp: data[i].timestamp,
          significance: change,
          description: `Significant change detected: ${(change * 100).toFixed(1)}% shift in incident rate`,
          contributing_factors: this.identifyChangePointFactors(data[i])
        });
      }
    }

    return changePoints;
  }

  private generatePredictions(days: number, trends: TrendAnalysis): any {
    const predictions = [];
    const baseRate = this.calculateAverage(this.historicalData.slice(0, 30).map(d => d.incidentCount));
    
    for (let i = 1; i <= days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      let predicted = baseRate;
      
      // Apply trend
      predicted += trends.slope * i * 0.001; // Scale slope appropriately
      
      // Apply seasonality if detected
      if (trends.seasonality.detected) {
        predicted += Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.3;
      }
      
      // Add some randomness
      predicted += (Math.random() - 0.5) * 0.4;
      predicted = Math.max(0, predicted);
      
      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted_incidents: Math.round(predicted * 100) / 100,
        confidence_interval: {
          lower: Math.max(0, predicted * 0.7),
          upper: predicted * 1.3
        },
        risk_factors: this.identifyDailyRiskFactors(date),
        severity_distribution: this.predictSeverityDistribution()
      });
    }
    
    return predictions;
  }

  private combinePredictions(base: any, ai: any): SafetyForecast {
    return {
      timeframe: `${base.length} days`,
      predictions: base,
      scenarios: ai.scenarios || this.generateDefaultScenarios(base),
      early_warning_indicators: ai.early_warning_indicators || this.generateEarlyWarning(),
      recommendations: ai.recommendations || this.generateRecommendations(base)
    };
  }

  private generateBaseForecast(predictions: any, trends: TrendAnalysis): SafetyForecast {
    return {
      timeframe: `${predictions.length} days`,
      predictions,
      scenarios: this.generateDefaultScenarios(predictions),
      early_warning_indicators: this.generateEarlyWarning(),
      recommendations: this.generateRecommendations(predictions)
    };
  }

  // Helper methods
  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateAverage(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.calculateAverage(squaredDiffs));
  }

  private calculateVolatility(values: number[]): number {
    const mean = this.calculateAverage(values);
    return this.calculateStandardDeviation(values) / mean;
  }

  private randomLocation(): string {
    const locations = ['Warehouse A', 'Production Floor', 'Loading Dock', 'Office Building', 'Maintenance Shop'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private randomSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const rand = Math.random();
    if (rand < 0.5) return 'low';
    if (rand < 0.8) return 'medium';
    if (rand < 0.95) return 'high';
    return 'critical';
  }

  private randomCategory(): string {
    const categories = ['Slip/Fall', 'Equipment', 'Chemical', 'Fire', 'Ergonomic', 'Vehicle'];
    return categories[Math.floor(Math.random() * categories.length)];
  }

  private randomWeather(): string {
    const weather = ['Clear', 'Rainy', 'Cloudy', 'Snowy', 'Windy'];
    return weather[Math.floor(Math.random() * weather.length)];
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    if (month >= 8 && month <= 10) return 'Fall';
    return 'Winter';
  }

  private calculateSeverityScore(data: SafetyDataPoint[]): number {
    const severityWeights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeight = data.reduce((sum, d) => sum + severityWeights[d.severity], 0);
    return totalWeight / data.length;
  }

  private calculateLocationRisk(data: SafetyDataPoint[]): number {
    const incidentRate = data.reduce((sum, d) => sum + d.incidentCount, 0) / data.length;
    const severityScore = this.calculateSeverityScore(data);
    return Math.min(100, (incidentRate * 10 + severityScore * 15));
  }

  private predictLocationIncidents(data: SafetyDataPoint[]): number {
    const avgIncidents = this.calculateAverage(data.map(d => d.incidentCount));
    return Math.round(avgIncidents * 30); // 30-day prediction
  }

  private analyzeContributingFactors(data: SafetyDataPoint[]): Array<{ factor: string; weight: number; trend: string; }> {
    return [
      { factor: 'Equipment Age', weight: 0.25, trend: 'increasing' },
      { factor: 'Staff Training Level', weight: 0.30, trend: 'stable' },
      { factor: 'Environmental Conditions', weight: 0.20, trend: 'variable' },
      { factor: 'Work Load', weight: 0.25, trend: 'increasing' }
    ];
  }

  private generateLocationRecommendations(data: SafetyDataPoint[]): string[] {
    return [
      'Increase safety inspections frequency',
      'Implement additional training programs',
      'Review and update safety procedures',
      'Install additional safety monitoring equipment'
    ];
  }

  private defineMonitoringRequirements(location: string, riskScore: number): string[] {
    const requirements = ['Daily safety checks', 'Incident reporting'];
    if (riskScore > 80) {
      requirements.push('Hourly safety observations', 'Management spot checks');
    }
    return requirements;
  }

  private identifyAnomalyCauses(point: SafetyDataPoint): string[] {
    const causes = ['Environmental conditions'];
    if (point.operationalFactors.workload && point.operationalFactors.workload > 0.9) {
      causes.push('High workload');
    }
    if (point.operationalFactors.maintenanceStatus === 'overdue') {
      causes.push('Overdue maintenance');
    }
    return causes;
  }

  private identifyChangePointFactors(point: SafetyDataPoint): string[] {
    return ['Operational changes', 'Seasonal factors', 'Policy updates'];
  }

  private identifyDailyRiskFactors(date: Date): string[] {
    const factors = [];
    if (date.getDay() === 1) factors.push('Monday effect');
    if (date.getMonth() === 11 || date.getMonth() === 0) factors.push('Winter conditions');
    return factors;
  }

  private predictSeverityDistribution(): Record<string, number> {
    return {
      low: 0.50,
      medium: 0.35,
      high: 0.12,
      critical: 0.03
    };
  }

  private generateDefaultScenarios(predictions: any): SafetyForecast['scenarios'] {
    const totalPredicted = predictions.reduce((sum: number, p: any) => sum + p.predicted_incidents, 0);
    
    return [
      {
        name: 'Best Case',
        probability: 0.25,
        description: 'All safety measures effective',
        expected_incidents: Math.round(totalPredicted * 0.7),
        mitigation_strategies: ['Enhanced training', 'Proactive maintenance']
      },
      {
        name: 'Expected Case',
        probability: 0.50,
        description: 'Current trends continue',
        expected_incidents: Math.round(totalPredicted),
        mitigation_strategies: ['Standard safety protocols', 'Regular monitoring']
      },
      {
        name: 'Worst Case',
        probability: 0.25,
        description: 'Safety measures fail',
        expected_incidents: Math.round(totalPredicted * 1.4),
        mitigation_strategies: ['Emergency interventions', 'Immediate reviews']
      }
    ];
  }

  private generateEarlyWarning(): SafetyForecast['early_warning_indicators'] {
    return [
      {
        indicator: 'Near Miss Rate',
        current_value: 15.2,
        threshold: 20.0,
        alert_level: 'green',
        trend: 'stable'
      },
      {
        indicator: 'Equipment Downtime',
        current_value: 8.5,
        threshold: 10.0,
        alert_level: 'yellow',
        trend: 'increasing'
      }
    ];
  }

  private generateRecommendations(predictions: any): SafetyForecast['recommendations'] {
    return [
      {
        action: 'Implement predictive maintenance program',
        impact: 0.30,
        priority: 'high',
        timeframe: '1-3 months'
      },
      {
        action: 'Enhance safety training frequency',
        impact: 0.25,
        priority: 'medium',
        timeframe: '1 month'
      }
    ];
  }

  private generateFallbackForecast(days: number): SafetyForecast {
    const predictions = [];
    for (let i = 1; i <= days; i++) {
      const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted_incidents: 2 + Math.random(),
        confidence_interval: { lower: 1, upper: 4 },
        risk_factors: ['Standard operations'],
        severity_distribution: this.predictSeverityDistribution()
      });
    }
    
    return this.generateBaseForecast(predictions, {
      trend: 'stable',
      slope: 0,
      correlation: 0.5,
      seasonality: { detected: false },
      anomalies: [],
      changePoints: []
    });
  }

  private calculateCurrentKPI(name: string): number {
    // Mock current KPI values
    const kpiValues: Record<string, number> = {
      'TRIR': 3.2,
      'LTIFR': 1.8,
      'Near Miss Rate': 15.2,
      'Training Compliance': 87.5
    };
    return kpiValues[name] || 50;
  }

  private calculateKPITrend(name: string): 'improving' | 'declining' | 'stable' {
    return Math.random() > 0.5 ? 'improving' : 'stable';
  }

  private getKPITarget(name: string): number {
    const current = this.calculateCurrentKPI(name);
    return current * 0.8; // Target 20% improvement
  }

  private predictKPI(name: string, days: number): number {
    const current = this.calculateCurrentKPI(name);
    const trend = this.calculateKPITrend(name);
    
    if (trend === 'improving') {
      return current * (1 - (days / 365) * 0.1);
    } else if (trend === 'declining') {
      return current * (1 + (days / 365) * 0.05);
    }
    return current;
  }

  private identifyKPIFactors(name: string): SafetyKPI['factors_influencing'] {
    return [
      { factor: 'Training effectiveness', impact: 0.3, controllable: true },
      { factor: 'Equipment condition', impact: 0.25, controllable: true },
      { factor: 'Work environment', impact: 0.2, controllable: true },
      { factor: 'External factors', impact: 0.25, controllable: false }
    ];
  }
}

// Create singleton instance
const predictiveAnalyticsService = new PredictiveAnalyticsService();

export default predictiveAnalyticsService;
export type { 
  SafetyDataPoint, 
  TrendAnalysis, 
  SafetyForecast, 
  RiskHotspot, 
  PerformanceMetrics, 
  SafetyKPI 
};