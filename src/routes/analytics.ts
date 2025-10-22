import { Hono } from 'hono';
import { Env, APIResponse } from '../types';
import { DatabaseQueries } from '../db/queries';
import { CostCalculator } from '../services/cost-calculator';

const analytics = new Hono<{ Bindings: Env }>();
const calculator = new CostCalculator();

// GET /api/analytics/summary - Overall cost summary
analytics.get('/summary', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const projectId = c.req.query('project_id');

    // Get all costs
    const productionCosts = await dbQueries.getProductionCosts();
    const transportationCosts = await dbQueries.getTransportationCosts(
      projectId ? parseInt(projectId) : undefined
    );
    const installationCosts = await dbQueries.getInstallationCosts(
      projectId ? parseInt(projectId) : undefined
    );

    // Calculate totals
    const totalProduction = productionCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const totalTransportation = transportationCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const totalInstallation = installationCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const grandTotal = totalProduction + totalTransportation + totalInstallation;

    // Calculate averages
    const avgProductionCostPerUnit = productionCosts.length > 0
      ? productionCosts.reduce((sum, c) => sum + c.cost_per_unit, 0) / productionCosts.length
      : 0;

    const avgTransportationCost = transportationCosts.length > 0
      ? totalTransportation / transportationCosts.length
      : 0;

    const avgInstallationCost = installationCosts.length > 0
      ? totalInstallation / installationCosts.length
      : 0;

    const summary = {
      overview: {
        total_production_cost: totalProduction,
        total_transportation_cost: totalTransportation,
        total_installation_cost: totalInstallation,
        grand_total: grandTotal,
      },
      averages: {
        avg_production_cost_per_unit: avgProductionCostPerUnit,
        avg_transportation_cost: avgTransportationCost,
        avg_installation_cost: avgInstallationCost,
      },
      counts: {
        production_records: productionCosts.length,
        transportation_records: transportationCosts.length,
        installation_records: installationCosts.length,
      },
      breakdown_percentage: {
        production: grandTotal > 0 ? (totalProduction / grandTotal) * 100 : 0,
        transportation: grandTotal > 0 ? (totalTransportation / grandTotal) * 100 : 0,
        installation: grandTotal > 0 ? (totalInstallation / grandTotal) * 100 : 0,
      },
    };

    const response: APIResponse = {
      success: true,
      data: summary,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch analytics summary',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/analytics/compare - Compare costs between projects
analytics.get('/compare', async (c) => {
  try {
    const projectIdsParam = c.req.query('project_ids');

    if (!projectIdsParam) {
      return c.json(
        {
          success: false,
          error: 'project_ids parameter is required',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const projectIds = projectIdsParam.split(',').map((id) => parseInt(id));
    const dbQueries = new DatabaseQueries(c.env.DB);

    const comparison = [];

    for (const projectId of projectIds) {
      const project = await dbQueries.getProject(projectId);

      if (!project) {
        continue;
      }

      const transportationCosts = await dbQueries.getTransportationCosts(projectId);
      const installationCosts = await dbQueries.getInstallationCosts(projectId);

      const totalTransportation = transportationCosts.reduce((sum, c) => sum + c.total_cost, 0);
      const totalInstallation = installationCosts.reduce((sum, c) => sum + c.total_cost, 0);
      const totalActual = totalTransportation + totalInstallation;

      const variance = calculator.calculateCostVariance(
        totalActual,
        project.total_estimated_cost || 0
      );

      comparison.push({
        project_id: projectId,
        project_name: project.name,
        location: project.location,
        status: project.status,
        costs: {
          estimated: project.total_estimated_cost || 0,
          actual: totalActual,
          transportation: totalTransportation,
          installation: totalInstallation,
        },
        variance: {
          amount: variance.variance,
          percentage: variance.variancePercentage,
          over_budget: variance.overBudget,
        },
      });
    }

    const response: APIResponse = {
      success: true,
      data: comparison,
      metadata: {
        timestamp: new Date().toISOString(),
        count: comparison.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error comparing projects:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to compare projects',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /api/analytics/estimate - Estimate cost for new project
analytics.post('/estimate', async (c) => {
  try {
    const body = await c.req.json<{
      products: Array<{
        product_id: number;
        quantity: number;
      }>;
      distance_km: number;
      installation_days: number;
    }>();

    // Validation
    if (!body.products || !body.distance_km || !body.installation_days) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields: products, distance_km, installation_days',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);

    // Calculate production costs based on historical averages
    let totalProductionCost = 0;
    const productBreakdown = [];

    for (const item of body.products) {
      const productCosts = await dbQueries.getProductionCosts(item.product_id);

      if (productCosts.length === 0) {
        return c.json(
          {
            success: false,
            error: `No historical cost data for product_id ${item.product_id}`,
            code: 'VALIDATION_ERROR',
            timestamp: new Date().toISOString(),
          },
          400
        );
      }

      const avgCostPerUnit =
        productCosts.reduce((sum, c) => sum + c.cost_per_unit, 0) / productCosts.length;
      const productTotal = avgCostPerUnit * item.quantity;
      totalProductionCost += productTotal;

      productBreakdown.push({
        product_id: item.product_id,
        quantity: item.quantity,
        avg_cost_per_unit: avgCostPerUnit,
        total: productTotal,
      });
    }

    // Estimate transportation cost based on historical average per km
    const allTransportCosts = await dbQueries.getTransportationCosts();
    const avgTransportCostPerKm =
      allTransportCosts.length > 0
        ? allTransportCosts.reduce(
            (sum, c) => sum + calculator.calculateTransportationCostPerKm(c.total_cost, c.distance_km),
            0
          ) / allTransportCosts.length
        : 50; // Default 50 baht/km if no data

    const estimatedTransportationCost = avgTransportCostPerKm * body.distance_km;

    // Estimate installation cost based on historical average per day
    const allInstallCosts = await dbQueries.getInstallationCosts();
    const avgInstallCostPerDay =
      allInstallCosts.length > 0
        ? allInstallCosts.reduce((sum, c) => sum + c.total_cost / (c.duration_hours / 8), 0) /
          allInstallCosts.length
        : 5000; // Default 5000 baht/day if no data

    const estimatedInstallationCost = avgInstallCostPerDay * body.installation_days;

    // Calculate total
    const totalEstimate =
      totalProductionCost + estimatedTransportationCost + estimatedInstallationCost;

    // Add 10% contingency
    const contingency = totalEstimate * 0.1;
    const totalWithContingency = totalEstimate + contingency;

    const estimate = {
      production: {
        total: totalProductionCost,
        breakdown: productBreakdown,
      },
      transportation: {
        total: estimatedTransportationCost,
        distance_km: body.distance_km,
        avg_cost_per_km: avgTransportCostPerKm,
      },
      installation: {
        total: estimatedInstallationCost,
        days: body.installation_days,
        avg_cost_per_day: avgInstallCostPerDay,
      },
      summary: {
        subtotal: totalEstimate,
        contingency: contingency,
        total: totalWithContingency,
      },
      confidence: allTransportCosts.length > 0 && allInstallCosts.length > 0 ? 'high' : 'medium',
    };

    const response: APIResponse = {
      success: true,
      data: estimate,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error estimating project cost:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to estimate project cost',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/analytics/trends - Get cost trends over time
analytics.get('/trends', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const productId = c.req.query('product_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    const productionCosts = await dbQueries.getProductionCosts(
      productId ? parseInt(productId) : undefined,
      startDate,
      endDate
    );

    // Group by month
    const monthlyData: Record<string, any> = {};

    productionCosts.forEach((cost) => {
      const month = cost.date.substring(0, 7); // YYYY-MM

      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          total_cost: 0,
          avg_cost_per_unit: 0,
          count: 0,
        };
      }

      monthlyData[month].total_cost += cost.total_cost;
      monthlyData[month].avg_cost_per_unit += cost.cost_per_unit;
      monthlyData[month].count += 1;
    });

    // Calculate averages
    const trends = Object.values(monthlyData).map((data: any) => ({
      month: data.month,
      total_cost: data.total_cost,
      avg_cost_per_unit: data.avg_cost_per_unit / data.count,
      record_count: data.count,
    }));

    // Sort by month
    trends.sort((a, b) => a.month.localeCompare(b.month));

    const response: APIResponse = {
      success: true,
      data: trends,
      metadata: {
        timestamp: new Date().toISOString(),
        count: trends.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching cost trends:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch cost trends',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default analytics;
