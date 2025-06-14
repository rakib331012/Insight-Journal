const express = require('express');
const mysql = require('mysql2');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
//app.use(express.json());
app.use(express.json({ limit: '50mb' }));

// MySQL Connection
const mysqlConn = mysql.createConnection({
  host: '127.0.0.1',
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
    mysqlConn.query('SELECT 1', (err) => {
      if (err) console.error('MySQL test query failed:', err);
      else console.log('MySQL test query successful');
    });
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
    user: 'thein.journal@gmail.com',
    pass: 'uwcb ackf cywv tggn'
  }
});

// API Routes
app.get('/api/articles', (req, res) => {
  mysqlConn.query('SELECT id, title, content, category, author_name, author_email, featured_image FROM articles WHERE status = "Published"', (err, results) => {
    if (err) return res.status(500).send('Database error');
    res.json(results);
  });
});

app.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  mysqlConn.query('SELECT id, title, content, category, author_name, author_email, featured_image FROM articles WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('MySQL query error:', err);
      return res.status(500).send('Database error');
    }
    if (results.length === 0) return res.status(404).send('Article not found');
    res.json(results[0]);
  });
});

app.post('/api/articles/submit', async (req, res) => {
  const { title, content, category, tags, authorName, authorEmail, featuredImage } = req.body;
  if (!title || !content || !category || !tags || !authorName || !authorEmail) {
    return res.status(400).json({ message: 'All fields (title, content, category, tags, authorName, authorEmail) are required' });
  }
  const article = { 
    title, 
    content, 
    category, 
    tags, 
    authorName, 
    authorEmail, 
    featuredImage, 
    status: 'Pending', 
    created_at: new Date() 
  };
  try {
    await submissionsCollection.insertOne(article);
    await transporter.sendMail({
      from: 'thein.journal@gmail.com',
      to: authorEmail,
      subject: 'Article Submission Received',
      text: 'Your article has been submitted and is pending review.'
    });
    res.status(200).json({ message: 'Article submitted successfully' });
  } catch (error) {
    console.error('Error submitting article:', error);
    res.status(500).json({ message: 'Submission failed' });
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
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    // Validate featuredImage
    const featuredImage = submission.featuredImage && typeof submission.featuredImage === 'string' && submission.featuredImage.startsWith('data:image/') 
      ? submission.featuredImage 
      : null;

    if (action === 'approve') {
      // Use Promise-based MySQL query for better control
      const insertQuery = 'INSERT INTO articles (title, content, category, tags, status, author_name, author_email, featured_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
      const values = [
        submission.title,
        submission.content,
        submission.category,
        JSON.stringify(submission.tags),
        'Published',
        submission.authorName,
        submission.authorEmail,
        featuredImage
      ];

      await new Promise((resolve, reject) => {
        mysqlConn.query(insertQuery, values, (err, results) => {
          if (err) {
            console.error('MySQL insert error:', err);
            return reject(new Error('Database error: Failed to insert article'));
          }
          resolve(results);
        });
      });

      // Only delete from MongoDB after successful MySQL insert
      await submissionsCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      await submissionsCollection.deleteOne({ _id: new ObjectId(id) });
    }

    await transporter.sendMail({
      from: 'thein.journal@gmail.com',
      to: submission.authorEmail,
      subject: `Article ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      text: action === 'approve' ? 'Your article has been approved!' : `Your article was rejected: ${comment}`
    });

    res.status(200).json({ message: 'Action completed' });
  } catch (error) {
    console.error('Error processing moderation action:', error);
    res.status(500).json({ message: `Action failed: ${error.message}` });
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

const PORT = 5001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));