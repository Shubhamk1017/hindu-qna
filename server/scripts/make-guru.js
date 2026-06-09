const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const email = 'guru@gmail.com';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    let user = await User.findOne({ email });
    if (!user) {
      console.log(`User ${email} not found. Register them via the UI first, then run this script.`);
    } else {
      user.role = 'guru';
      user.reputation = 500;
      await user.save();
      console.log(`Updated user ${email} to guru role`);
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
  });
