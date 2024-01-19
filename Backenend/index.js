// server.js

const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());




// Connect to MongoDB (replace 'your-database-name' with your preferred database name)
mongoose
  .connect(
    "mongodb+srv://priyanshusingh153045:NASHU153045@cluster0.lnlojy1.mongodb.net/",{ useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.log("Couldn't connect to MongoDB"+error));

// Define MongoDB schema and model
const transactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String,
  isSold: Boolean,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// Fetch data from the third-party API and initialize the database with seed data
app.get("/api/initialize-database", async (req, res) => {
  try {
    const response = await axios.get(
      "https://s3.amazonaws.com/roxiler.com/product_transaction.json"
    );
    const seedData = response.data;

    // Clear existing data in the database
    await Transaction.deleteMany();

    // Insert seed data into the database
    await Transaction.insertMany(seedData);

    res.json({
      success: true,
      message: "Database initialized with seed data.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// API to list all transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const searchText = req.query.search || '';
  
    try {
      // Build the query based on the search text
      const query = buildSearchQuery(searchText);
  
      // Count total records (for pagination)
      const totalRecords = await Transaction.countDocuments(query);
  
      // Perform pagination
      const transactions = await Transaction.find(query)
        .skip((page - 1) * perPage)
        .limit(perPage);
  
      res.json({
        transactions,
        pagination: {
          page,
          perPage,
          totalRecords,
          totalPages: Math.ceil(totalRecords / perPage),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });
  
  function buildSearchQuery(searchText) {
    if (!searchText) {
      // If search parameter is empty, return an empty query (get all records)
      return {};
    }
  
    // If search parameter is provided, build a query for search
    return {
      $or: [
        { title: { $regex: new RegExp(searchText, 'i') } },
        { description: { $regex: new RegExp(searchText, 'i') } },
        { price: { $regex: new RegExp(searchText, 'i') } },
      ],
    };
  }

// API for statistics
app.get("/api/statistics/:month", async (req, res) => {
  const selectedMonth = req.params.month;

  try {
    // Calculate total sale amount, total sold items, and total not sold items
    const totalSaleAmount = await calculateTotalSaleAmount(selectedMonth);
    const totalSoldItems = await calculateTotalSoldItems(selectedMonth);
    const totalNotSoldItems = await calculateTotalNotSoldItems(selectedMonth);

    res.json({ totalSaleAmount, totalSoldItems, totalNotSoldItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
async function calculateTotalSaleAmount(selectedMonth) {
  const transactions = await Transaction.find({
    dateOfSale: { $regex: new RegExp(`^${selectedMonth}`, "i") },
  });

  return transactions.reduce(
    (total, transaction) => total + transaction.price,
    0
  );
}
async function calculateTotalSoldItems(selectedMonth) {
  const transactions = await Transaction.find({
    dateOfSale: { $regex: new RegExp(`^${selectedMonth}`, "i") },
  });

  return transactions.length;
}

async function calculateTotalNotSoldItems(selectedMonth) {
  const transactions = await Transaction.find({
    dateOfSale: { $regex: new RegExp(`^${selectedMonth}`, "i") },
  });

  // Assuming there is a field 'isSold' in your schema to indicate if the item is sold or not
  const totalNotSoldItems = transactions.filter(
    (transaction) => !transaction.isSold
  ).length;

  return totalNotSoldItems;
}

// API for bar chart data
// API for bar chart data
app.get('/api/bar-chart/:month', async (req, res) => {
  const selectedMonth = req.params.month;

  try {
    // Get transactions for the selected month
    const transactions = await Transaction.find({
      dateOfSale: { $regex: new RegExp(`^${selectedMonth}`, 'i') },
    });

    // Calculate bar chart data
    const barChartData = calculateBarChartData(transactions);

    res.json({ barChartData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

function calculateBarChartData(transactions) {
  const priceRanges = [
    { min: 0, max: 100 },
    { min: 101, max: 200 },
    { min: 201, max: 300 },
    { min: 301, max: 400 },
    { min: 401, max: 500 },
    { min: 501, max: 600 },
    { min: 601, max: 700 },
    { min: 701, max: 800 },
    { min: 801, max: 900 },
    { min: 901, max: Infinity }, // Anything above 900
  ];

  // Initialize an object to store counts for each range
  const rangeCounts = {};
  
  // Count occurrences in each price range
  transactions.forEach((transaction) => {
    const price = transaction.price;

    // Find the corresponding range for the price
    const range = priceRanges.find((range) => price >= range.min && price <= range.max);

    // Increment the count for that range
    if (range) {
      const rangeKey = `${range.min}-${range.max}`;
      rangeCounts[rangeKey] = (rangeCounts[rangeKey] || 0) + 1;
    }
  });

  // Convert rangeCounts to the desired format
  const barChartData = Object.keys(rangeCounts).map((rangeKey) => ({
    range: rangeKey,
    count: rangeCounts[rangeKey],
  }));

  return barChartData;
}
// API for pie chart data

// API for pie chart data
app.get('/api/pie-chart/:month', async (req, res) => {
    const selectedMonth = req.params.month;
  
    try {
      // Get transactions for the selected month
      const transactions = await Transaction.find({
        dateOfSale: { $regex: new RegExp(`^${selectedMonth}`, 'i') },
      });
  
      // Calculate pie chart data
      const pieChartData = calculatePieChartData(transactions);
  
      res.json({ pieChartData });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
  });
  
  function calculatePieChartData(transactions) {
    // Initialize an object to store category counts
    const categoryCounts = {};
  
    // Count occurrences of each category
    transactions.forEach((transaction) => {
      const category = transaction.category;
  
      if (category) {
        if (categoryCounts[category]) {
          categoryCounts[category]++;
        } else {
          categoryCounts[category] = 1;
        }
      }
    });
  
    // Convert category counts to the desired format
    const pieChartData = Object.keys(categoryCounts).map((category) => ({
      category,
      count: categoryCounts[category],
    }));
  
    return pieChartData;
 }

// API to fetch data from all three APIs, combine responses, and send a final response
app.get("/api/combined-response/:month", async (req, res) => {
  const selectedMonth = req.params.month;

  try {
    // Fetch data from all three APIs
    // const transactions = /* logic to fetch transactions */
    // const statistics = /* logic to fetch statistics */
    // const barChart = /* logic to fetch bar chart data */
    // const pieChart = /* logic to fetch pie chart data */

    // Combine responses
    const combinedResponse = { transactions, statistics, barChart, pieChart };

    res.json(combinedResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
