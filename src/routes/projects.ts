import { Hono } from 'hono';
import { Env, Project, APIResponse } from '../types';
import { DatabaseQueries } from '../db/queries';

const projects = new Hono<{ Bindings: Env }>();

// GET /api/projects - Get all projects
projects.get('/', async (c) => {
  try {
    const dbQueries = new DatabaseQueries(c.env.DB);
    const status = c.req.query('status');

    const projectList = await dbQueries.getAllProjects(status);

    const response: APIResponse<Project[]> = {
      success: true,
      data: projectList,
      metadata: {
        timestamp: new Date().toISOString(),
        count: projectList.length,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch projects',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/projects/:id - Get project by ID
projects.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid project ID',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const project = await dbQueries.getProject(id);

    if (!project) {
      return c.json(
        {
          success: false,
          error: 'Project not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    const response: APIResponse<Project> = {
      success: true,
      data: project,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch project',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// POST /api/projects - Create new project
projects.post('/', async (c) => {
  try {
    const body = await c.req.json<Project>();

    // Validation
    if (!body.name) {
      return c.json(
        {
          success: false,
          error: 'Missing required field: name',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const projectId = await dbQueries.createProject({
      name: body.name,
      location: body.location,
      start_date: body.start_date,
      end_date: body.end_date,
      status: body.status || 'active',
      total_estimated_cost: body.total_estimated_cost,
      total_actual_cost: body.total_actual_cost,
    });

    const project = await dbQueries.getProject(projectId);

    const response: APIResponse<Project> = {
      success: true,
      data: project!,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    };

    return c.json(response, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to create project',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// GET /api/projects/:id/summary - Get project cost summary
projects.get('/:id/summary', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(
        {
          success: false,
          error: 'Invalid project ID',
          code: 'VALIDATION_ERROR',
          timestamp: new Date().toISOString(),
        },
        400
      );
    }

    const dbQueries = new DatabaseQueries(c.env.DB);
    const project = await dbQueries.getProject(id);

    if (!project) {
      return c.json(
        {
          success: false,
          error: 'Project not found',
          code: 'NOT_FOUND',
          timestamp: new Date().toISOString(),
        },
        404
      );
    }

    // Get all costs for this project
    const transportationCosts = await dbQueries.getTransportationCosts(id);
    const installationCosts = await dbQueries.getInstallationCosts(id);

    const totalTransportation = transportationCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const totalInstallation = installationCosts.reduce((sum, c) => sum + c.total_cost, 0);
    const totalActual = totalTransportation + totalInstallation;

    const summary = {
      project,
      costs: {
        transportation: {
          total: totalTransportation,
          count: transportationCosts.length,
        },
        installation: {
          total: totalInstallation,
          count: installationCosts.length,
        },
        total_actual: totalActual,
        total_estimated: project.total_estimated_cost || 0,
        variance: totalActual - (project.total_estimated_cost || 0),
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
    console.error('Error fetching project summary:', error);
    return c.json(
      {
        success: false,
        error: 'Failed to fetch project summary',
        code: 'SERVER_ERROR',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

export default projects;
