const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// In-memory storage for mappings
const keyMap = {};

// Middleware to parse JSON bodies
app.use(bodyParser.json());

/**
 * Function to generate a unique key
 * @param {string} address 
 * @param {string} chainName 
 * @returns {string} 
 */
function generateUniqueKey(address, chainName) {
  // Concatenate the values
  const data = `${address}:${chainName}`;

  // Generate a hash of the concatenated values
  const hash = crypto.createHash('sha256').update(data).digest('hex');

  return hash;
}

// API endpoint to generate a unique key and map it with the provided parameters
app.post('/generate-key', (req, res) => {
  const { address, chainName } = req.body;

  if (!address || !chainName) {
    return res.status(400).json({ error: 'Address and chainName are required.' });
  }

  const uniqueKey = generateUniqueKey(address, chainName);

  // Store the mapping
//   console.log(uniqueKey);
  keyMap[uniqueKey] = { address, chainName };
  

  return res.json({ uniqueKey });
});

// API endpoint to get the mapped details by providing the unique key
app.get('/get-details/:uniqueKey', (req, res) => {
  const { uniqueKey } = req.params;
    
  const mapping = keyMap[uniqueKey];

  if (!mapping) {
    return res.status(404).json({ error: 'Mapping not found for the provided unique key.' });
  }

//   console.log(uniqueKey,mapping);
  

  return res.json({ uniqueKey, mapping });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
