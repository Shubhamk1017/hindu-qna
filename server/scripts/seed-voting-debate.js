const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Debate = require('../models/Debate');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find users
    const vivekananda = await User.findOne({ email: 'guru@gmail.com' });
    const ramanuja = await User.findOne({ email: 'scholar@gmail.com' });
    const shankara = await User.findOne({ email: 'judge@gmail.com' });
    
    if (!vivekananda || !ramanuja) {
      console.error('Please run register-and-make-guru.js first to seed the users!');
      mongoose.connection.close();
      return;
    }
    
    // Check if debate already exists, delete it so we start fresh
    await Debate.deleteMany({ title: 'Karma vs Grace (Kripa) in Devotional Path' });
    
    const debate = new Debate({
      title: 'Karma vs Grace (Kripa) in Devotional Path',
      description: 'Does spiritual advancement rely solely on one\'s own efforts (Karma) or is it entirely dependent on the grace of the Supreme (Kripa)?',
      category: 'philosophy',
      status: 'voting', // Directly in voting phase
      creator: vivekananda._id,
      sideA: {
        label: 'Self-effort (Purushartha)',
        participants: [vivekananda._id]
      },
      sideB: {
        label: 'Divine Grace (Prasada)',
        participants: [ramanuja._id]
      },
      maxRounds: 1,
      currentRound: 1,
      arguments: [
        {
          author: vivekananda._id,
          body: 'Purushartha (self-effort) is the foundational requirement. As Sri Krishna says in the Bhagavad Gita: Uddhared atmanatmanam - one must lift oneself by one\'s own mind. Divine grace is like the wind, but you must set the sails.',
          round: 1,
          side: 'A',
          reactions: { pranam: [], pramana: [], yukti: [], sanka: [] },
          scriptureRefs: ['BG 6.5']
        },
        {
          author: ramanuja._id,
          body: 'Divine Grace (Prasada) is the ultimate cause of liberation. The Upanishads state: Yam evaisa vrnute tena labhyas - only he whom the Lord chooses attains Him. Self-effort is merely a token of surrender (Saranagati).',
          round: 1,
          side: 'B',
          reactions: { pranam: [], pramana: [], yukti: [], sanka: [] },
          scriptureRefs: ['Katha Upanishad 1.2.23']
        }
      ],
      votes: {
        sideA: [],
        sideB: []
      },
      judge: null, // Seeking judge
      likes: [],
      sharesCount: 0,
      votingEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });
    
    await debate.save();
    console.log(`Successfully seeded debate in voting phase. ID: ${debate._id}`);
    console.log(`URL to view: http://localhost:3001/debates/${debate._id}`);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
  });
