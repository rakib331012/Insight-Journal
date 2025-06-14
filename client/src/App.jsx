import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';
import ArticleForm from './components/ArticleForm';
import ModeratorDashboard from './components/ModeratorDashboard';
import ArticleDetail from './components/ArticleDetail';
import parse from 'html-react-parser';

function App() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/articles');
        setArticles(res.data);
        const uniqueCategories = ['All', ...new Set(res.data.map(article => article.category))];
        setCategories(uniqueCategories);
      } catch (err) {
        console.error('Error fetching articles:', err);
      }
    };
    fetchArticles();
  }, []);

  const filteredArticles = selectedCategory === 'All'
    ? articles
    : articles.filter(article => article.category === selectedCategory);

  return (
    <Router>
      <div className="App min-h-screen">
        <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50">
          <div className="container mx-auto flex justify-between items-center">
            <h2 className="text-2xl font-bold text-green-400">The Insight Journal</h2>
            <div>
              <Link to="/" className="text-white hover:text-green-300 mr-4">Home</Link>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary mr-4"
              >
                Submit Article
              </button>
              <Link to="/moderation" className="text-white hover:text-green-300">Moderation</Link>
              <Link to="/analytics" className="text-white hover:text-green-300 ml-4">Analytics</Link>
            </div>
          </div>
        </nav>

        <header className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-20 text-center">
          <h1 className="text-5xl font-bold mb-4">Welcome to Insight Journal</h1>
          <p className="text-xl mb-6">Explore thought-provoking articles from around the world.</p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            Contribute Your Story
          </button>
        </header>

        <section className="container mx-auto py-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Filter by Category</h3>
          <div className="flex justify-center space-x-4">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded ${selectedCategory === category ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'} hover:bg-green-500 hover:text-white transition`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <main className="container mx-auto py-10">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <h2 className="text-3xl font-semibold mb-8 text-center text-gray-800">Featured Articles</h2>
                  {filteredArticles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredArticles.map((article, index) => (
                        <div key={index} className="card">
                          {article.featured_image && (
                            <img
                              src={article.featured_image}
                              alt={article.title}
                              className="w-full h-48 object-cover rounded-t-lg mb-4"
                            />
                          )}
                          <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
                          <p className="text-gray-600 mb-4">{article.category}</p>
                          <p className="text-gray-500 text-sm mb-4">By {article.author_name || 'Anonymous'}</p>
                          <div className="text-gray-700 line-clamp-3 prose max-w-none">{parse(article.content)}</div>
                          <Link to={`/article/${article.id}`} className="text-green-600 hover:underline mt-4 inline-block">Read More</Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-600">No articles available in this category.</p>
                  )}
                </>
              }
            />
            <Route path="/moderation" element={<ModeratorDashboard />} />
            <Route path="/article/:id" element={<ArticleDetail />} />
          </Routes>
        </main>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <ArticleForm onClose={() => setShowForm(false)} />
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;