# Order Formatter Utilities

## Overview
The `order-formatter.ts` module centralizes all order data formatting logic to ensure consistency between initial data (from database) and real-time data (from MQTT).

## Key Functions

### Agent Formatting
- `formatAgentNumber(agent)` - Removes '상담원#' prefix from agent strings
- `normalizeAgent(agent)` - Normalizes agent data from various sources (handles string, number, null)
- `formatAgentsDisplay(addAgent, acceptAgent)` - Formats the agents column display (e.g., "10_12")

### Status Formatting
- `formatOrderStatus(order)` - Determines and formats order status with priority logic:
  1. Cancelled orders → shows `cancelStatus`
  2. Accepted orders → shows "배차(agent)" or "앱배차"
  3. Added orders → shows "접수(agent)" or "앱접수"
  4. Default → shows original status

### Styling
- `getOrderRowClass(order)` - Returns CSS classes based on order state
  - Cancelled → red text
  - Waiting → green text with bold

## Usage Example

```typescript
import { formatAgentsDisplay, formatOrderStatus } from '@/utils/order-formatter'

// In component
<td>{formatAgentsDisplay(order.addAgent, order.acceptAgent)}</td>
<td>{formatOrderStatus(order)}</td>
```

## Architecture Benefits

1. **Single Source of Truth**: All formatting logic in one place
2. **Consistency**: Same formatting applied everywhere
3. **Maintainability**: Easy to update formatting rules
4. **Testability**: Pure functions that are easy to test
5. **Type Safety**: Full TypeScript support

## Future Improvements

1. Add unit tests for all formatter functions
2. Add internationalization support for status text
3. Consider moving color/styling constants to a theme configuration
4. Add validation for agent number formats
5. Consider caching formatted values for performance