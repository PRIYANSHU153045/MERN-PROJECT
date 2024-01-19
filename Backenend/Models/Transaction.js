// server/models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Define your schema based on the structure of the JSON
  // ...

  // Example schema fields:
  title: String,
  description: String,
  price: Number,
  dateOfSale: Date,
  category: String,
});

module.exports = mongoose.model('Transaction', transactionSchema);
