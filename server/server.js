require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const { MongoClient, ObjectId } = require('mongodb');
const nodemailer = require('nodemailer');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json({ limit: '50mb' }));

// MySQL Connection
const mysqlConn = mysql.createConnection({
  host: '127.0.0.1', // Explicitly use IPv4
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '@Rakib112358',
  database: process.env.MYSQL_DATABASE || 'insight_journal',
  port: 3306
});

mysqlConn.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Successfully connected to MySQL');
});

// MongoDB Connection
const mongoUri = 'mongodb://localhost:27017';
const client = new MongoClient(mongoUri);
let submissionsCollection;

async function connectDBs() {
  try {
    await client.connect();
    submissionsCollection = client.db('insight_journal').collection('submissions');
    console.log('Successfully connected to MongoDB');
    const collections = await client.db('insight_journal').listCollections().toArray();
    console.log('MongoDB collections:', collections.map(c => c.name));
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}
connectDBs();

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env');
  process.exit(1);
}

// Middleware to verify JWT and role
const authenticateJWT = (roles = []) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient role' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
  };
};

// User Signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = { username, password: hashedPassword, role: role || 'user' };

  mysqlConn.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [user.username, user.password, user.role],
    (err) => {
      if (err) {
        console.error('MySQL insert error:', err);
        return res.status(500).json({ message: 'Signup failed' });
      }
      res.status(201).json({ message: 'User created successfully' });
    }
  );
});

// User Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  mysqlConn.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err) {
        console.error('MySQL query error:', err);
        return res.status(500).json({ message: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, role: user.role });
    }
  );
});

// API Routes
app.get('/api/articles', (req, res) => {
  mysqlConn.query('SELECT id, title, content, category, author_name, author_email, featured_image FROM articles WHERE status = "Published"', (err, results) => {
    if (err) {
      console.error('MySQL query error:', err);
      return res.status(500).send('Database error');
    }
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
      from: process.env.GMAIL_USER,
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

app.get('/api/moderation/submissions', authenticateJWT(['moderator', 'admin']), async (req, res) => {
  try {
    const submissions = await submissionsCollection.find({ status: 'Pending' }).toArray();
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).send('Failed to fetch submissions');
  }
});

app.post('/api/moderation/:id/:action', authenticateJWT(['moderator', 'admin']), async (req, res) => {
  const { id, action } = req.params;
  const { comment } = req.body;
  try {
    const submission = await submissionsCollection.findOne({ _id: new ObjectId(id) });
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const featuredImage = submission.featuredImage && typeof submission.featuredImage === 'string' && submission.featuredImage.startsWith('data:image/') 
      ? submission.featuredImage 
      : null;

    if (action === 'approve') {
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

      await submissionsCollection.deleteOne({ _id: new ObjectId(id) });
    } else {
      await submissionsCollection.deleteOne({ _id: new ObjectId(id) });
    }

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
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

app.get('/api/moderation/comments', authenticateJWT(['moderator', 'admin']), (req, res) => {
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

app.post('/api/moderation/comments/:id/:action', authenticateJWT(['moderator', 'admin']), (req, res) => {
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