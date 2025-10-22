import { describe, it, expect, beforeEach } from 'vitest';
import { CostCalculator } from '../services/cost-calculator';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    calculator = new CostCalculator();
  });

  describe('calculateProductionCost', () => {
    it('should calculate production cost correctly', () => {
      const input = {
        product_id: 1,
        material_cost: 5000,
        labor_cost: 2000,
        overhead_cost: 1000,
        quantity: 10,
        date: '2025-10-22',
      };

      const result = calculator.calculateProductionCost(input);

      expect(result.total).toBe(8000);
      expect(result.cost_per_unit).toBe(800);
      expect(result.breakdown.material).toBe(5000);
      expect(result.breakdown.labor).toBe(2000);
      expect(result.breakdown.overhead).toBe(1000);
    });

    it('should handle single quantity', () => {
      const input = {
        product_id: 1,
        material_cost: 1000,
        labor_cost: 500,
        overhead_cost: 300,
        quantity: 1,
        date: '2025-10-22',
      };

      const result = calculator.calculateProductionCost(input);

      expect(result.total).toBe(1800);
      expect(result.cost_per_unit).toBe(1800);
    });
  });

  describe('calculateTransportationCost', () => {
    it('should calculate transportation cost correctly', () => {
      const input = {
        project_id: 1,
        distance_km: 50,
        fuel_cost: 1500,
        vehicle_type: '10-wheeler',
        driver_cost: 800,
        toll_fees: 200,
        date: '2025-10-22',
      };

      const result = calculator.calculateTransportationCost(input);

      expect(result.total).toBe(2500);
      expect(result.breakdown.fuel).toBe(1500);
      expect(result.breakdown.driver).toBe(800);
      expect(result.breakdown.toll_fees).toBe(200);
    });

    it('should handle zero toll fees', () => {
      const input = {
        project_id: 1,
        distance_km: 30,
        fuel_cost: 900,
        vehicle_type: '6-wheeler',
        driver_cost: 600,
        date: '2025-10-22',
      };

      const result = calculator.calculateTransportationCost(input);

      expect(result.total).toBe(1500);
      expect(result.breakdown.toll_fees).toBe(0);
    });
  });

  describe('calculateInstallationCost', () => {
    it('should calculate installation cost correctly', () => {
      const input = {
        project_id: 1,
        labor_cost: 3000,
        equipment_cost: 2000,
        duration_hours: 8,
        crane_cost: 1500,
        date: '2025-10-22',
      };

      const result = calculator.calculateInstallationCost(input);

      expect(result.total).toBe(6500);
      expect(result.breakdown.labor).toBe(3000);
      expect(result.breakdown.equipment).toBe(2000);
      expect(result.breakdown.crane).toBe(1500);
    });

    it('should handle zero crane cost', () => {
      const input = {
        project_id: 1,
        labor_cost: 2500,
        equipment_cost: 1500,
        duration_hours: 6,
        date: '2025-10-22',
      };

      const result = calculator.calculateInstallationCost(input);

      expect(result.total).toBe(4000);
      expect(result.breakdown.crane).toBe(0);
    });
  });

  describe('calculateTransportationCostFromDistance', () => {
    it('should calculate cost from distance parameters', () => {
      const result = calculator.calculateTransportationCostFromDistance(
        100, // distance_km
        35, // fuel_price_per_liter
        0.25, // fuel_consumption (L/km)
        800, // driver_cost
        150 // toll_fees
      );

      // 100km * 0.25L/km * 35฿/L = 875฿
      expect(result.total).toBe(1825); // 875 + 800 + 150
      expect(result.breakdown.fuel).toBe(875);
      expect(result.breakdown.driver).toBe(800);
      expect(result.breakdown.toll_fees).toBe(150);
    });
  });

  describe('calculateInstallationCostFromHours', () => {
    it('should calculate cost from hourly rates', () => {
      const result = calculator.calculateInstallationCostFromHours(
        375, // labor_cost_per_hour
        8, // duration_hours
        2000, // equipment_cost
        1500 // crane_cost
      );

      // 375 * 8 = 3000
      expect(result.total).toBe(6500); // 3000 + 2000 + 1500
      expect(result.breakdown.labor).toBe(3000);
      expect(result.breakdown.equipment).toBe(2000);
      expect(result.breakdown.crane).toBe(1500);
    });
  });

  describe('calculateProjectTotal', () => {
    it('should sum all cost types', () => {
      const result = calculator.calculateProjectTotal({
        production: 10000,
        transportation: 2500,
        installation: 6500,
      });

      expect(result).toBe(19000);
    });

    it('should handle missing cost types', () => {
      const result = calculator.calculateProjectTotal({
        production: 10000,
      });

      expect(result).toBe(10000);
    });
  });

  describe('calculateTransportationCostPerKm', () => {
    it('should calculate cost per kilometer', () => {
      const result = calculator.calculateTransportationCostPerKm(2500, 50);
      expect(result).toBe(50);
    });

    it('should handle zero distance', () => {
      const result = calculator.calculateTransportationCostPerKm(2500, 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateAverageCost', () => {
    it('should calculate average of multiple costs', () => {
      const costs = [1000, 2000, 3000, 4000];
      const result = calculator.calculateAverageCost(costs);
      expect(result).toBe(2500);
    });

    it('should handle empty array', () => {
      const result = calculator.calculateAverageCost([]);
      expect(result).toBe(0);
    });

    it('should handle single cost', () => {
      const result = calculator.calculateAverageCost([1500]);
      expect(result).toBe(1500);
    });
  });

  describe('calculateCostVariance', () => {
    it('should calculate variance when over budget', () => {
      const result = calculator.calculateCostVariance(12000, 10000);

      expect(result.variance).toBe(2000);
      expect(result.variancePercentage).toBe(20);
      expect(result.overBudget).toBe(true);
    });

    it('should calculate variance when under budget', () => {
      const result = calculator.calculateCostVariance(8000, 10000);

      expect(result.variance).toBe(-2000);
      expect(result.variancePercentage).toBe(-20);
      expect(result.overBudget).toBe(false);
    });

    it('should handle zero estimated cost', () => {
      const result = calculator.calculateCostVariance(5000, 0);

      expect(result.variance).toBe(5000);
      expect(result.variancePercentage).toBe(0);
      expect(result.overBudget).toBe(true);
    });

    it('should handle exact match', () => {
      const result = calculator.calculateCostVariance(10000, 10000);

      expect(result.variance).toBe(0);
      expect(result.variancePercentage).toBe(0);
      expect(result.overBudget).toBe(false);
    });
  });
});
