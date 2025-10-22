import { Hono } from 'hono';
import { Env, ProductionCostInput, TransportationCostInput, InstallationCostInput, APIResponse } from '../types';
import { DatabaseQueries } from '../db/queries';
import { CostCalculator } from '../services/cost-calculator';

const costs = new Hono<{ Bindings: Env }>();
const calculator = new CostCalculator();

// Production Costs
// POST /api/costs/production - Create production cost
costs.post('/production', async (c) => {
  try {
    const body = await c.req.json<ProductionCostInput>();

    // Validation
    if (!body.product_id || !body.material_cost || !body.labor_cost || !body.overhead_cost || !body.quantity || !body.date) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Calculate totals
    const calculation = calculator.calculateProductionCost(body);

    const dbQueries = new DatabaseQueries(c.env.DB);
    const costId = await dbQueries.createProductionCost({
      product_id: body.product_id,
      material_cost: body.material_cost,
      labor_cost: body.labor_cost,
      overhead_cost: body.overhead_cost,
      total_cost: calculation.total,
      cost_per_unit: calculation.cost_per_unit!,
      quantity: body.quantity,
      date: body.date,
      notes: body.notes,
    });

    const response: APIResponse = {
      success: true,
      data: {
        id: costId,
        ...calculation,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating production cost:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create production cost',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/costs/production - Get production costs
costs.get('/production', async (c) => {
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

    const response: APIResponse = {
      success: true,
      data: productionCosts,
      metadata: {
        timestamp: new Date().toISOString(),
        count: productionCosts.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching production costs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch production costs',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Transportation Costs
// POST /api/costs/transportation - Create transportation cost
costs.post('/transportation', async (c) => {
  try {
    const body = await c.req.json<TransportationCostInput>();

    // Validation
    if (!body.project_id || !body.distance_km || !body.fuel_cost || !body.vehicle_type || !body.driver_cost || !body.date) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Calculate totals
    const calculation = calculator.calculateTransportationCost(body);

    const dbQueries = new DatabaseQueries(c.env.DB);
    const costId = await dbQueries.createTransportationCost({
      project_id: body.project_id,
      distance_km: body.distance_km,
      fuel_cost: body.fuel_cost,
      vehicle_type: body.vehicle_type,
      driver_cost: body.driver_cost,
      toll_fees: body.toll_fees || 0,
      total_cost: calculation.total,
      date: body.date,
      notes: body.notes,
    });

    // Update project total
    await dbQueries.updateProjectCosts(body.project_id);

    const response: APIResponse = {
      success: true,
      data: {
        id: costId,
        ...calculation,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating transportation cost:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create transportation cost',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/costs/transportation - Get transportation costs
costs.get('/transportation', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const projectId = c.req.query('project_id');

    const transportationCosts = await dbQueries.getTransportationCosts(
      projectId ? parseInt(projectId) : undefined
    );

    const response: APIResponse = {
      success: true,
      data: transportationCosts,
      metadata: {
        timestamp: new Date().toISOString(),
        count: transportationCosts.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching transportation costs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch transportation costs',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Installation Costs
// POST /api/costs/installation - Create installation cost
costs.post('/installation', async (c) => {
  try {
    const body = await c.req.json<InstallationCostInput>();

    // Validation
    if (!body.project_id || !body.labor_cost || !body.equipment_cost || !body.duration_hours || !body.date) {
      return c.json(
        {
          success: false,
          error: 'Missing required fields',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    // Calculate totals
    const calculation = calculator.calculateInstallationCost(body);

    const dbQueries = new DatabaseQueries(c.env.DB);
    const costId = await dbQueries.createInstallationCost({
      project_id: body.project_id,
      labor_cost: body.labor_cost,
      equipment_cost: body.equipment_cost,
      duration_hours: body.duration_hours,
      crane_cost: body.crane_cost || 0,
      total_cost: calculation.total,
      date: body.date,
      notes: body.notes,
    });

    // Update project total
    await dbQueries.updateProjectCosts(body.project_id);

    const response: APIResponse = {
      success: true,
      data: {
        id: costId,
        ...calculation,
      },
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating installation cost:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create installation cost',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/costs/installation - Get installation costs
costs.get('/installation', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const projectId = c.req.query('project_id');

    const installationCosts = await dbQueries.getInstallationCosts(
      projectId ? parseInt(projectId) : undefined
    );

    const response: APIResponse = {
      success: true,
      data: installationCosts,
      metadata: {
        timestamp: new Date().toISOString(),
        count: installationCosts.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching installation costs:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch installation costs',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default costs;
