const express = require('express');
const mysql = require('mysql2');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

// app.use(cors());
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// MySQL Connection
const mysqlConn = mysql.createConnection({
  //host: '127.0.0.1',
  host: 'localhost',
  user: 'root',
  password: '@Rakib112358',
  database: 'insight_journal'
});

// MongoDB Connection
const mongoUri = 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);
let submissionsCollection;

async function connectDBs() {
    try {
      await mysqlConn.connect();
      console.log('Successfully connected to MySQL');
      await client.connect();
      submissionsCollection = client.db('insight_journal').collection('submissions');
      console.log('Successfully connected to MongoDB');
      // Test MySQL query
      mysqlConn.query('SELECT 1', (err) => {
        if (err) console.error('MySQL test query failed:', err);
        else console.log('MySQL test query successful');
      });
      // Test MongoDB query
      const collections = await client.db('insight_journal').listCollections().toArray();
      console.log('MongoDB collections:', collections.map(c => c.name));
    } catch (error) {
      console.error('Database connection error:', error);
      process.exit(1);
    }
}
connectDBs();

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your_email@gmail.com',
    pass: 'your_app_password'
  }
});

// API Routes
app.get('/api/articles', (req, res) => {
  mysqlConn.query('SELECT * FROM articles WHERE status = "Published"', (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

app.get('/api/articles/:id', (req, res) => {
    const { id } = req.params;
    mysqlConn.query('SELECT * FROM articles WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error('MySQL query error:', err);
        return res.status(500).send('Database error');
      }
      if (results.length === 0) {
        return res.status(404).send('Article not found');
      }
      res.json(results[0]);
    });
  });
  
  app.post('/api/articles/submit', async (req, res) => {
    const { title, content, category, tags } = req.body;
    const article = { title, content, category, tags, status: 'Pending', created_at: new Date() };
    
    try {
      await submissionsCollection.insertOne(article);
      await transporter.sendMail({
        from: 'your_email@gmail.com',
        to: 'contributor@example.com',
        subject: 'Article Submission Received',
        text: 'Your article has been submitted and is pending review.'
      });
      res.status(200).send('Article submitted');
    } catch (error) {
      console.error('Error submitting article:', error);
      res.status(500).send('Submission failed');
    }
  });
  
  app.get('/api/moderation/submissions', async (req, res) => {
    try {
      const submissions = await submissionsCollection.find({ status: 'Pending' }).toArray();
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      res.status(500).send('Failed to fetch submissions');
    }
  });
  
  app.post('/api/moderation/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const { comment } = req.body;
    
    try {
      const submission = await submissionsCollection.findOne({ _id: new ObjectId(id) });
      if (!submission) {
        return res.status(404).send('Submission not found');
      }
      
      if (action === 'approve') {
        mysqlConn.query(
          'INSERT INTO articles (title, content, category, tags, status) VALUES (?, ?, ?, ?, "Published")',
          [submission.title, submission.content, submission.category, JSON.stringify(submission.tags)],
          (err) => {
            if (err) {
              console.error('MySQL insert error:', err);
              return res.status(500).send('Database error');
            }
          }
        );
      }
      
      await submissionsCollection.deleteOne({ _id: new ObjectId(id) });
      await transporter.sendMail({
        from: 'your_email@gmail.com',
        to: 'contributor@example.com',
        subject: `Article ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        text: action === 'approve' ? 'Your article has been approved!' : `Your article was rejected: ${comment}`
      });
      res.status(200).send('Action completed');
    } catch (error) {
      console.error('Error processing moderation action:', error);
      res.status(500).send('Action failed');
    }
  });
  
  app.get('/api/analytics', (req, res) => {
    mysqlConn.query('SELECT title, views, likes, shares FROM articles', (err, results) => {
      if (err) {
        console.error('MySQL query error:', err);
        return res.status(500).send('Database error');
      }
      res.json(results);
    });
  });
  
  app.post('/api/comments', async (req, res) => {
    const { article_id, content, user_id } = req.body;
    try {
      mysqlConn.query(
        'INSERT INTO comments (article_id, content, user_id, status) VALUES (?, ?, ?, "Pending")',
        [article_id, content, user_id || 'anonymous'],
        (err) => {
          if (err) {
            console.error('MySQL insert error:', err);
            return res.status(500).send('Database error');
          }
          res.status(200).send('Comment submitted');
        }
      );
    } catch (error) {
      console.error('Error submitting comment:', error);
      res.status(500).send('Comment submission failed');
    }
  });
  
  app.get('/api/comments/:article_id', (req, res) => {
    const { article_id } = req.params;
    mysqlConn.query(
      'SELECT * FROM comments WHERE article_id = ? AND status = "Approved"',
      [article_id],
      (err, results) => {
        if (err) {
          console.error('MySQL query error:', err);
          return res.status(500).send('Database error');
        }
        res.json(results);
      }
    );
  });
  
  app.get('/api/moderation/comments', (req, res) => {
    mysqlConn.query(
      'SELECT * FROM comments WHERE status = "Pending"',
      (err, results) => {
        if (err) {
          console.error('MySQL query error:', err);
          return res.status(500).send('Database error');
        }
        res.json(results);
      }
    );
  });
  
  app.post('/api/moderation/comments/:id/:action', (req, res) => {
    const { id, action } = req.params;
    const { comment } = req.body;
    try {
      mysqlConn.query(
        'UPDATE comments SET status = ? WHERE id = ?',
        [action === 'approve' ? 'Approved' : 'Rejected', id],
        (err) => {
          if (err) {
            console.error('MySQL update error:', err);
            return res.status(500).send('Database error');
          }
          res.status(200).send('Comment action completed');
        }
      );
    } catch (error) {
      console.error('Error processing comment action:', error);
      res.status(500).send('Action failed');
    }
  });

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});