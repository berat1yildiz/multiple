const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const app = express();

const redisClient = redis.createClient({
  host: 'redis',
  port: 6379,
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

const dbUrl = process.env.MONGODB_URI || 'mongodb://mongo:27017/mydb';
mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));

app.get('/user/:id', (req, res) => {
  const userId = req.params.id;

  redisClient.get(userId, (err, cachedUser) => {
    if (cachedUser) {
      console.log('Returning cached user data');
      return res.json(JSON.parse(cachedUser));
    } else {
      const User = mongoose.model('User', { name: String, email: String });
      
      User.findById(userId, (err, user) => {
        if (err || !user) {
          return res.status(404).send('User not found');
        }

        redisClient.setex(userId, 3600, JSON.stringify(user));

        return res.json(user);
      });
    }
  });
});

app.listen(5000, () => {
  console.log('API service running on port 5000');
});
