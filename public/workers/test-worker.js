console.log('[Test Worker] Loaded successfully');

self.onmessage = (event) => {
  console.log('[Test Worker] Received message:', event.data);
  self.postMessage({ 
    type: 'test-response', 
    received: event.data 
  });
};