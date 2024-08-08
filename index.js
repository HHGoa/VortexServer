const express = require('express');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const { AptosClient, AptosAccount, HexString } = require('aptos');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());

app.use(bodyParser.json());

const client = new AptosClient('https://api.testnet.aptoslabs.com/v1');
const moduleAddress = "0xde5d94dac0db9e017d907b6e02a6d4274e0e2fbbe018e3a698d81e8da2028477";
const moduleAddressForGryff = "0x9da4a621ea5eaaa65f3d37d00c4a7d5d0e9a850e53910886c04944074fbd0d7b";

// Function to generate a unique key
function generateUniqueKey(address, chainName) {
  // Concatenate the values
  const data = `${address}:${chainName}`;

  // Generate a hash of the concatenated values
  const hash = crypto.createHash('sha256').update(data).digest('hex');

  return hash;
}

app.get('/', (req, res) => {
    res.send('Server is working!');
  });

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


// Utility to convert private key to AptosAccount
function getAptosAccount(privateKeyHex) {
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  if (privateKeyBytes.length !== 32) {
    throw new Error('Private key must be 32 bytes long.');
  }

  // Create AptosAccount directly
  return new AptosAccount(privateKeyBytes);
}

// Function to check if list exists
async function listExists(account) {
  try {
    const resource = await client.getAccountResource(account.address(), `${moduleAddress}::vortexengine::EntityList`);
    return !!resource;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

// Function to create a list
app.post('/api/create-list', async (req, res) => {
  const { privateKey } = req.body;
  console.log("Received private key:", privateKey);

  try {
    // Create AptosAccount instance
    const account = getAptosAccount(privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey);
    console.log("Created AptosAccount instance:", account.address().hex());

    // Check if list already exists
    const exists = await listExists(account);
    if (exists) {
      return res.status(400).json({ message: "List already exists for this wallet." });
    }

    // Prepare payload
    const payload = {
      function: `${moduleAddress}::vortexengine::create_list`, // Ensure this function exists in the module
      type_arguments: [], // No type arguments
      arguments: [] // Arguments must match the smart contract's expected input
    };
    console.log("Payload:", payload);

    // Submit transaction
    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const response = await client.submitTransaction(signedTxn);

    console.log("Transaction response:", response);
    await client.waitForTransaction(response.hash);
    res.status(200).json({ message: "List created successfully", hash: response.hash });
  } catch (error) {
    console.error("Error creating list:", error);
    res.status(500).json({ error: "Error creating list", details: error.message });
  }
});



app.post('/api/create-entry', async (req, res) => {
  const { ipfscontent, timestamp, privateKey } = req.body;

  try {
    const account = getAptosAccount(privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey);

    const payload = {
      function: `${moduleAddress}::vortexengine::create_entry`,
      type_arguments: [],
      arguments: [ipfscontent, timestamp],
    };

    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const response = await client.submitTransaction(signedTxn);

    await client.waitForTransaction(response.hash);
    res.status(200).json({ message: "Entry created successfully", hash: response.hash });
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Error creating entry", details: error.message });
  }
});


// Aptos Module Integration with private key for Gryffindors Green

async function listExistsForGryff(account) {
  try {
    const resource = await client.getAccountResource(account.address(), `${moduleAddressForGryff}::cryptdata::BlockControl`);
    return !!resource;
  } catch (error) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

app.post('/api/list-wiht-private', async (req, res) => {
  const { privateKey } = req.body;
  console.log("Received private key:", privateKey);

  try {
    // Create AptosAccount instance
    const account = getAptosAccount(privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey);
    console.log("Created AptosAccount instance:", account.address().hex());

    // Check if list already exists
    const exists = await listExistsForGryff(account);
    if (exists) {
      return res.status(400).json({ message: "List already exists for this wallet." });
    }

    // Prepare payload
    const payload = {
      function: `${moduleAddressForGryff}::cryptdata::create_list`, // Ensure this function exists in the module
      type_arguments: [], // No type arguments
      arguments: [] // Arguments must match the smart contract's expected input
    };
    console.log("Payload:", payload);

    // Submit transaction
    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const response = await client.submitTransaction(signedTxn);

    console.log("Transaction response:", response);
    await client.waitForTransaction(response.hash);
    res.status(200).json({ message: "List created successfully", hash: response.hash });
  } catch (error) {
    console.error("Error creating list:", error);
    res.status(500).json({ error: "Error creating list", details: error.message });
  }
});

app.post('/api/entry-with-private', async (req, res) => {
  const { toaddress, messagecontent, timestamp, privateKey } = req.body;

  try {
    const account = getAptosAccount(privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey);

    const payload = {
      function: `${moduleAddressForGryff}::cryptdata::create_entry`,
      type_arguments: [],
      arguments: [toaddress, messagecontent, timestamp],
    };

    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const response = await client.submitTransaction(signedTxn);

    await client.waitForTransaction(response.hash);
    res.status(200).json({ message: "Entry created successfully", hash: response.hash });
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Error creating entry", details: error.message });
  }
});




app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
