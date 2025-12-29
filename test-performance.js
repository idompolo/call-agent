// Performance test for monitoring panel
// Run this in the browser console to test with 1000+ orders

// Generate test orders
function generateTestOrders(count) {
  const areas = ['s=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='];
  const orders = [];
  
  for (let i = 0; i < count; i++) {
    const area = areas[Math.floor(Math.random() * areas.length)];
    orders.push({
      id: `order-${i}`,
      addAt: new Date().toISOString(),
      telephone: `010-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`,
      customerName: `Customer ${i}`,
      calldong: `Dong ${i}`,
      callplace: `${area}Location ${i}`,
      extra: `Extra ${i}`,
      poiName: Math.random() > 0.5 ? `POI ${i}` : null,
      drvNo: Math.random() > 0.5 ? Math.floor(Math.random() * 1000) : null,
      licensePlate: Math.random() > 0.5 ? `12가${Math.floor(Math.random() * 10000)}` : null,
      acceptAt: Math.random() > 0.5 ? new Date().toISOString() : null,
      addAgent: Math.floor(Math.random() * 10),
      acceptAgent: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : null,
      cancelAt: Math.random() > 0.9 ? new Date().toISOString() : null,
      reserveAt: Math.random() > 0.8 ? new Date().toISOString() : null,
      selectAgent: Math.random() > 0.7 ? Math.floor(Math.random() * 10) : null,
      token: Math.random() > 0.95
    });
  }
  
  return orders;
}

// Measure performance
function measurePerformance() {
  console.log('Generating 1000 test orders...');
  const testOrders = generateTestOrders(1000);
  
  // Get the order store
  const orderStore = window.useOrderStore?.getState();
  if (!orderStore) {
    console.error('Order store not found. Make sure you are on the dashboard page.');
    return;
  }
  
  // Set test orders
  console.log('Setting orders in store...');
  orderStore.setOrders(testOrders);
  
  // Test area filter toggle performance
  console.log('Testing area filter toggle performance...');
  
  const areas = ['all', 's=', 'c=', 'o=', 'p=', 'k=', 'w=', 'a=', 'y=', 't='];
  
  // Measure toggle all performance
  console.time('Toggle ALL areas');
  orderStore.setAreaFilter(areas);
  console.timeEnd('Toggle ALL areas');
  
  // Measure toggle off performance
  console.time('Toggle OFF all areas');
  orderStore.setAreaFilter([]);
  console.timeEnd('Toggle OFF all areas');
  
  // Measure individual area toggles
  areas.slice(1).forEach(area => {
    console.time(`Toggle area ${area}`);
    orderStore.setAreaFilter([area]);
    console.timeEnd(`Toggle area ${area}`);
  });
  
  // Measure multiple area selection
  console.time('Select 5 areas');
  orderStore.setAreaFilter(['s=', 'c=', 'o=', 'p=', 'k=']);
  console.timeEnd('Select 5 areas');
  
  console.log('Performance test completed!');
  console.log('Total orders:', testOrders.length);
  console.log('Check the UI responsiveness when toggling areas.');
}

// Instructions
console.log('Performance test loaded!');
console.log('Run measurePerformance() to test with 1000 orders');
console.log('Make sure you are on the dashboard page first.');

// Export for use
window.measurePerformance = measurePerformance;
window.generateTestOrders = generateTestOrders;