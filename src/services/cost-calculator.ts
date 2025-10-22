import {
  ProductionCostInput,
  TransportationCostInput,
  InstallationCostInput,
  CostCalculation,
} from '../types';

export class CostCalculator {
  /**
   * Calculate production cost totals
   */
  calculateProductionCost(input: ProductionCostInput): CostCalculation {
    const total = input.material_cost + input.labor_cost + input.overhead_cost;
    const cost_per_unit = total / input.quantity;

    return {
      total,
      cost_per_unit,
      breakdown: {
        material: input.material_cost,
        labor: input.labor_cost,
        overhead: input.overhead_cost,
      },
    };
  }

  /**
   * Calculate transportation cost totals
   */
  calculateTransportationCost(input: TransportationCostInput): CostCalculation {
    const total = input.fuel_cost + input.driver_cost + (input.toll_fees || 0);

    return {
      total,
      breakdown: {
        fuel: input.fuel_cost,
        driver: input.driver_cost,
        toll_fees: input.toll_fees || 0,
      },
    };
  }

  /**
   * Calculate transportation cost from distance and fuel parameters
   */
  calculateTransportationCostFromDistance(
    distanceKm: number,
    fuelPricePerLiter: number,
    fuelConsumption: number, // L/km
    driverCost: number,
    tollFees: number = 0
  ): CostCalculation {
    const fuelCost = distanceKm * fuelConsumption * fuelPricePerLiter;
    const total = fuelCost + driverCost + tollFees;

    return {
      total,
      breakdown: {
        fuel: fuelCost,
        driver: driverCost,
        toll_fees: tollFees,
      },
    };
  }

  /**
   * Calculate installation cost totals
   */
  calculateInstallationCost(input: InstallationCostInput): CostCalculation {
    const total = input.labor_cost + input.equipment_cost + (input.crane_cost || 0);

    return {
      total,
      breakdown: {
        labor: input.labor_cost,
        equipment: input.equipment_cost,
        crane: input.crane_cost || 0,
      },
    };
  }

  /**
   * Calculate installation cost from hourly rates
   */
  calculateInstallationCostFromHours(
    laborCostPerHour: number,
    durationHours: number,
    equipmentCost: number,
    craneCost: number = 0
  ): CostCalculation {
    const laborTotal = laborCostPerHour * durationHours;
    const total = laborTotal + equipmentCost + craneCost;

    return {
      total,
      breakdown: {
        labor: laborTotal,
        equipment: equipmentCost,
        crane: craneCost,
      },
    };
  }

  /**
   * Calculate total project cost
   */
  calculateProjectTotal(costs: {
    production?: number;
    transportation?: number;
    installation?: number;
  }): number {
    return (
      (costs.production || 0) +
      (costs.transportation || 0) +
      (costs.installation || 0)
    );
  }

  /**
   * Calculate cost per unit for transportation (per km)
   */
  calculateTransportationCostPerKm(totalCost: number, distanceKm: number): number {
    if (distanceKm === 0) return 0;
    return totalCost / distanceKm;
  }

  /**
   * Calculate average cost from array of costs
   */
  calculateAverageCost(costs: number[]): number {
    if (costs.length === 0) return 0;
    const sum = costs.reduce((acc, cost) => acc + cost, 0);
    return sum / costs.length;
  }

  /**
   * Calculate cost variance (actual vs estimated)
   */
  calculateCostVariance(actualCost: number, estimatedCost: number): {
    variance: number;
    variancePercentage: number;
    overBudget: boolean;
  } {
    const variance = actualCost - estimatedCost;
    const variancePercentage = estimatedCost === 0 ? 0 : (variance / estimatedCost) * 100;

    return {
      variance,
      variancePercentage,
      overBudget: variance > 0,
    };
  }
}
