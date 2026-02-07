import { Customer } from '../types/game';
import { createCustomer, createGameState } from './factories';

/**
 * Creates an array of customers, one per specified lane.
 */
export const createCustomersInLanes = (lanes: number[]): Customer[] =>
  lanes.map((lane, index) =>
    createCustomer({
      id: `test-customer-${index + 1}`,
      lane,
    })
  );

/**
 * Creates a GameState populated with multiple customers.
 */
export const createGameStateWithCustomers = (customerOverrides: Partial<Customer>[]) => {
  const customers = customerOverrides.map((overrides, index) =>
    createCustomer({
      id: `test-customer-${index + 1}`,
      ...overrides,
    })
  );
  return createGameState({ customers });
};
