const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const usersToCreateOrUpdate = [
  {
    name: 'Swami Vivekananda',
    email: 'guru@gmail.com',
    role: 'guru'
  },
  {
    name: 'Ramanuja',
    email: 'scholar@gmail.com',
    role: 'scholar'
  },
  {
    name: 'Adi Shankara',
    email: 'judge@gmail.com',
    role: 'guru'
  }
];

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    for (const item of usersToCreateOrUpdate) {
      let user = await User.findOne({ email: item.email });
      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Password123', salt);
        
        user = new User({
          name: item.name,
          email: item.email,
          password: hashedPassword,
          role: item.role,
          reputation: 500,
          provider: 'local'
        });
        await user.save();
        console.log(`Created user ${item.email} with role ${item.role}`);
      } else {
        user.role = item.role;
        user.reputation = 500;
        await user.save();
        console.log(`Updated user ${item.email} to role ${item.role}`);
      }
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
  });
